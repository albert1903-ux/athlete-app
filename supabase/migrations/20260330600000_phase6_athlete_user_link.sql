-- ============================================================
-- Phase 6: Vincular atletas.user_id con la cuenta auth del atleta
-- ============================================================
-- Objetivos:
--   1. Añadir user_id UUID a atletas (1:1 con auth.users)
--   2. RPCs para listar, vincular y desvincular cuentas (acceso club/superadmin)
--   3. RPC get_my_athlete() para que el atleta obtenga su propio registro
--   4. Corregir política SELECT de medidas_corporales para atleta:
--      Debe ver TODAS sus medidas (incluidas las insertadas por entrenador/club),
--      no solo las que insertó él mismo.
-- ============================================================

-- ============================================================
-- 1. Columna atletas.user_id
-- ============================================================
ALTER TABLE public.atletas
  ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.atletas
  ADD CONSTRAINT atletas_user_id_key UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_atletas_user_id ON public.atletas(user_id);

-- ============================================================
-- 2. RPC: get_my_athlete() — atleta obtiene su propio registro
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_athlete()
RETURNS TABLE(atleta_id INTEGER, nombre TEXT, fecha_nac DATE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT a.atleta_id, a.nombre::TEXT, a.fecha_nac
  FROM public.atletas a
  WHERE a.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_my_athlete() TO authenticated;

-- ============================================================
-- 3. RPC: get_athlete_users() — lista usuarios con rol athlete (para el club)
-- ============================================================
CREATE OR REPLACE FUNCTION get_athlete_users()
RETURNS TABLE(id UUID, email TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := (auth.jwt()->'app_metadata'->>'role');
  IF caller_role NOT IN ('superadmin', 'club') THEN
    RAISE EXCEPTION 'Acceso denegado: rol no permitido (%)' , caller_role;
  END IF;

  RETURN QUERY
    SELECT
      u.id,
      u.email::TEXT,
      COALESCE(u.raw_user_meta_data->>'full_name', u.email::TEXT) AS display_name
    FROM auth.users u
    WHERE (u.raw_app_meta_data->>'role') = 'athlete'
      AND (u.raw_app_meta_data->>'status') = 'approved'
    ORDER BY display_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_athlete_users() TO authenticated;

-- ============================================================
-- 4. RPC: link_athlete_to_user(p_atleta_id, p_user_id) — club/superadmin vincula
-- ============================================================
CREATE OR REPLACE FUNCTION link_athlete_to_user(p_atleta_id INTEGER, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  org_club_id INTEGER;
  atleta_in_club BOOLEAN;
BEGIN
  caller_role := (auth.jwt()->'app_metadata'->>'role');

  IF caller_role = 'superadmin' THEN
    UPDATE public.atletas SET user_id = p_user_id WHERE atleta_id = p_atleta_id;
    RETURN;
  END IF;

  IF caller_role = 'club' THEN
    -- Verificar que el atleta tiene resultados bajo el club del caller
    SELECT o.club_id INTO org_club_id
    FROM public.organizations o
    WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid);

    SELECT EXISTS(
      SELECT 1 FROM public.resultados r
      WHERE r.atleta_id = p_atleta_id AND r.club_id = org_club_id
    ) INTO atleta_in_club;

    IF NOT atleta_in_club THEN
      RAISE EXCEPTION 'Acceso denegado: el atleta no pertenece a tu club';
    END IF;

    UPDATE public.atletas SET user_id = p_user_id WHERE atleta_id = p_atleta_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Acceso denegado: rol no permitido (%)' , caller_role;
END;
$$;

GRANT EXECUTE ON FUNCTION link_athlete_to_user(INTEGER, UUID) TO authenticated;

-- ============================================================
-- 5. RPC: unlink_athlete_user(p_atleta_id) — club/superadmin desvincula
-- ============================================================
CREATE OR REPLACE FUNCTION unlink_athlete_user(p_atleta_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  org_club_id INTEGER;
  atleta_in_club BOOLEAN;
BEGIN
  caller_role := (auth.jwt()->'app_metadata'->>'role');

  IF caller_role = 'superadmin' THEN
    UPDATE public.atletas SET user_id = NULL WHERE atleta_id = p_atleta_id;
    RETURN;
  END IF;

  IF caller_role = 'club' THEN
    SELECT o.club_id INTO org_club_id
    FROM public.organizations o
    WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid);

    SELECT EXISTS(
      SELECT 1 FROM public.resultados r
      WHERE r.atleta_id = p_atleta_id AND r.club_id = org_club_id
    ) INTO atleta_in_club;

    IF NOT atleta_in_club THEN
      RAISE EXCEPTION 'Acceso denegado: el atleta no pertenece a tu club';
    END IF;

    UPDATE public.atletas SET user_id = NULL WHERE atleta_id = p_atleta_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Acceso denegado: rol no permitido (%)' , caller_role;
END;
$$;

GRANT EXECUTE ON FUNCTION unlink_athlete_user(INTEGER) TO authenticated;

-- ============================================================
-- 6. Corregir políticas de medidas_corporales para el atleta
--    Problema actual: el atleta solo ve medidas donde user_id = auth.uid()
--    (las que insertó él mismo). Las insertadas por entrenador/club son invisibles.
--    Solución: filtrar por atleta_id usando atletas.user_id como lookup.
-- ============================================================

-- DROP y recrear las 4 políticas scoped de Phase 2
DROP POLICY IF EXISTS "medidas_select_scoped" ON public.medidas_corporales;
DROP POLICY IF EXISTS "medidas_insert_scoped" ON public.medidas_corporales;
DROP POLICY IF EXISTS "medidas_update_scoped" ON public.medidas_corporales;
DROP POLICY IF EXISTS "medidas_delete_scoped" ON public.medidas_corporales;

-- SELECT: atleta ve TODAS las medidas de su atleta_id (incluyendo las de entrenador/club)
CREATE POLICY "medidas_select_scoped"
  ON public.medidas_corporales FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND atleta_id IN (
        SELECT ach.atleta_id FROM public.atleta_club_hist ach
        WHERE ach.club_id = (
          SELECT o.club_id FROM public.organizations o
          WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
        )
        AND ach.fecha_fin IS NULL
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'athlete'
      AND atleta_id = (
        SELECT a.atleta_id FROM public.atletas a WHERE a.user_id = auth.uid()
      )
    )
  );

-- INSERT: atleta solo puede insertar para su propio atleta_id
CREATE POLICY "medidas_insert_scoped"
  ON public.medidas_corporales FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND atleta_id IN (
        SELECT ach.atleta_id FROM public.atleta_club_hist ach
        WHERE ach.club_id = (
          SELECT o.club_id FROM public.organizations o
          WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
        )
        AND ach.fecha_fin IS NULL
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'athlete'
      AND user_id = auth.uid()
      AND atleta_id = (
        SELECT a.atleta_id FROM public.atletas a WHERE a.user_id = auth.uid()
      )
    )
  );

-- UPDATE: atleta solo puede actualizar medidas de su atleta_id
CREATE POLICY "medidas_update_scoped"
  ON public.medidas_corporales FOR UPDATE
  TO authenticated
  USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND atleta_id IN (
        SELECT ach.atleta_id FROM public.atleta_club_hist ach
        WHERE ach.club_id = (
          SELECT o.club_id FROM public.organizations o
          WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
        )
        AND ach.fecha_fin IS NULL
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'athlete'
      AND user_id = auth.uid()
      AND atleta_id = (
        SELECT a.atleta_id FROM public.atletas a WHERE a.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND atleta_id IN (
        SELECT ach.atleta_id FROM public.atleta_club_hist ach
        WHERE ach.club_id = (
          SELECT o.club_id FROM public.organizations o
          WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
        )
        AND ach.fecha_fin IS NULL
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'athlete'
      AND user_id = auth.uid()
      AND atleta_id = (
        SELECT a.atleta_id FROM public.atletas a WHERE a.user_id = auth.uid()
      )
    )
  );

-- DELETE: atleta solo puede borrar medidas de su atleta_id
CREATE POLICY "medidas_delete_scoped"
  ON public.medidas_corporales FOR DELETE
  TO authenticated
  USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND atleta_id IN (
        SELECT ach.atleta_id FROM public.atleta_club_hist ach
        WHERE ach.club_id = (
          SELECT o.club_id FROM public.organizations o
          WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
        )
        AND ach.fecha_fin IS NULL
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'athlete'
      AND user_id = auth.uid()
      AND atleta_id = (
        SELECT a.atleta_id FROM public.atletas a WHERE a.user_id = auth.uid()
      )
    )
  );
