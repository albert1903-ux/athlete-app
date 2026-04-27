-- ============================================================
-- Phase 2: RLS scoped por club/grupo en resultados y medidas_corporales
-- ============================================================
-- Objetivo:
--   - resultados SELECT: todos los autenticados pueden leer (sin cambio)
--   - resultados INSERT/UPDATE/DELETE: superadmin (todo), club (su club_id), trainer (atletas de sus grupos)
--   - medidas_corporales: superadmin (todo), club (atletas de su club), trainer (atletas de sus grupos), athlete (solo propias)
--   - consulta: solo lectura de resultados, sin acceso a medidas_corporales
-- ============================================================

-- ============================================================
-- 1. RESULTADOS — Drop existing policies
-- ============================================================
DROP POLICY IF EXISTS "Global Authenticated Access" ON public.resultados;
DROP POLICY IF EXISTS "superadmin_insert" ON public.resultados;
DROP POLICY IF EXISTS "superadmin_update" ON public.resultados;
DROP POLICY IF EXISTS "superadmin_delete" ON public.resultados;

-- ============================================================
-- 2. RESULTADOS — SELECT: all authenticated can read (matrix says everyone)
-- ============================================================
CREATE POLICY "resultados_select_all"
  ON public.resultados FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 3. RESULTADOS — INSERT: superadmin || club (scoped) || trainer (scoped)
-- ============================================================
CREATE POLICY "resultados_insert_scoped"
  ON public.resultados FOR INSERT
  TO authenticated
  WITH CHECK (
    -- superadmin: full access
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    -- club: only results for their club
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND club_id = (
        SELECT o.club_id FROM public.organizations o
        WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
      )
    )
    OR
    -- trainer: only athletes in their groups
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. RESULTADOS — UPDATE: superadmin || club (scoped) || trainer (scoped)
-- ============================================================
CREATE POLICY "resultados_update_scoped"
  ON public.resultados FOR UPDATE
  TO authenticated
  USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND club_id = (
        SELECT o.club_id FROM public.organizations o
        WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
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
  )
  WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND club_id = (
        SELECT o.club_id FROM public.organizations o
        WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
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
  );

-- ============================================================
-- 5. RESULTADOS — DELETE: superadmin || club (scoped) || trainer (scoped)
-- ============================================================
CREATE POLICY "resultados_delete_scoped"
  ON public.resultados FOR DELETE
  TO authenticated
  USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    (
      (auth.jwt()->'app_metadata'->>'role') = 'club'
      AND club_id = (
        SELECT o.club_id FROM public.organizations o
        WHERE o.id = ((auth.jwt()->'app_metadata'->>'organization_id')::uuid)
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
  );

-- ============================================================
-- 6. MEDIDAS_CORPORALES — Drop existing policies
-- ============================================================
DROP POLICY IF EXISTS "Private Read Access" ON public.medidas_corporales;
DROP POLICY IF EXISTS "Private Insert Access" ON public.medidas_corporales;
DROP POLICY IF EXISTS "Private Update Access" ON public.medidas_corporales;
DROP POLICY IF EXISTS "Private Delete Access" ON public.medidas_corporales;

-- ============================================================
-- 7. MEDIDAS_CORPORALES — SELECT: superadmin || club (atletas de su club) || trainer (atletas de sus grupos) || athlete (propias)
-- ============================================================
CREATE POLICY "medidas_select_scoped"
  ON public.medidas_corporales FOR SELECT
  TO authenticated
  USING (
    -- superadmin: all
    ((auth.jwt()->'app_metadata'->>'role') = 'superadmin')
    OR
    -- club: athletes in their club (via atleta_club_hist, current membership)
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
    -- trainer: athletes in their groups
    (
      (auth.jwt()->'app_metadata'->>'role') = 'trainer'
      AND atleta_id IN (
        SELECT ga.atleta_id FROM public.group_athletes ga
        JOIN public.trainer_groups tg ON ga.group_id = tg.id
        WHERE tg.trainer_user_id = auth.uid()
      )
    )
    OR
    -- athlete: own measurements only
    (
      (auth.jwt()->'app_metadata'->>'role') = 'athlete'
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. MEDIDAS_CORPORALES — INSERT: superadmin || club (scoped) || trainer (scoped) || athlete (propias)
-- ============================================================
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
    )
  );

-- ============================================================
-- 9. MEDIDAS_CORPORALES — UPDATE: superadmin || club (scoped) || trainer (scoped) || athlete (propias)
-- ============================================================
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
    )
  );

-- ============================================================
-- 10. MEDIDAS_CORPORALES — DELETE: superadmin || club (scoped) || trainer (scoped) || athlete (propias)
-- ============================================================
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
    )
  );
