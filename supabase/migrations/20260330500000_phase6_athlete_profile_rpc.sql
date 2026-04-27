-- ============================================================
-- Phase 6: RPC para vincular un usuario atleta con su registro en la tabla atletas
-- ============================================================
-- set_athlete_profile(p_atleta_id INTEGER):
--   - Solo puede ser llamada por el propio usuario (o superadmin asignando)
--   - Guarda atleta_id en app_metadata del usuario autenticado
--   - SECURITY DEFINER porque solo service role puede escribir app_metadata
-- ============================================================

CREATE OR REPLACE FUNCTION set_athlete_profile(p_atleta_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  atleta_exists boolean;
BEGIN
  -- Extraer rol del llamante
  caller_role := (auth.jwt()->'app_metadata'->>'role');

  -- Solo athlete o superadmin pueden usar esta función
  IF caller_role NOT IN ('athlete', 'superadmin') THEN
    RAISE EXCEPTION 'Acceso denegado: rol no permitido (%)' , caller_role;
  END IF;

  -- Verificar que el atleta_id existe en la tabla atletas
  SELECT EXISTS(SELECT 1 FROM public.atletas WHERE atleta_id = p_atleta_id)
  INTO atleta_exists;

  IF NOT atleta_exists THEN
    RAISE EXCEPTION 'Atleta no encontrado: %', p_atleta_id;
  END IF;

  -- Guardar atleta_id en app_metadata del usuario autenticado
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('atleta_id', p_atleta_id)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION set_athlete_profile(INTEGER) TO authenticated;

-- ============================================================
-- get_athlete_profile():
--   Devuelve el atleta_id vinculado al usuario autenticado (desde app_metadata).
--   Útil para debug o para confirmar el vínculo desde el cliente.
-- ============================================================
CREATE OR REPLACE FUNCTION get_athlete_profile()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'atleta_id')::INTEGER;
$$;

GRANT EXECUTE ON FUNCTION get_athlete_profile() TO authenticated;
