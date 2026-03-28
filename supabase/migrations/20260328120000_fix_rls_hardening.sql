-- Migration: Semana 3 — RLS Hardening
-- Fecha: 2026-03-28
-- Resultado de auditoría de seguridad completa sobre producción.
--
-- Gaps corregidos:
--   1. notifications: añadir política INSERT para admin
--      (los RPCs SECURITY DEFINER ya pueden insertar; esta política permite al admin
--      hacerlo también directamente cuando sea necesario)
--   2. atletas_favoritos: añadir política UPDATE (tabla de relación, no crítico pero completa la cobertura)
--   3. update_user_role RPC: ampliar roles permitidos (faltaban trainer, athlete, club_admin)
--
-- Tablas en producción con cobertura COMPLETA (no requieren cambios):
--   atletas, resultados, atleta_club_hist, categorias, clubes, pruebas
--     → SELECT (authenticated, USING true) + INSERT/UPDATE/DELETE (admin)
--   calendar_shares
--     → SELECT/INSERT/UPDATE/DELETE (user_id based) ✅
--   eventos, medidas_corporales, participantes_eventos
--     → SELECT/INSERT/UPDATE/DELETE (user_id based + calendar_shares join) ✅
--   atletas_favoritos
--     → SELECT/INSERT/DELETE (user_id based) — UPDATE añadida aquí


-- ============================================================
-- 1. notifications — política INSERT para admin
-- ============================================================
-- Sin esta política, nadie puede hacer INSERT directo.
-- Los RPCs SECURITY DEFINER (share_calendar_by_email, accept_calendar_share)
-- ya insertan notificaciones saltando RLS, lo cual es correcto.
-- Añadimos política explícita solo para admin por si necesita insertar directamente.
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
CREATE POLICY "Admin can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- ============================================================
-- 2. atletas_favoritos — política UPDATE
-- ============================================================
-- La tabla solo tiene id, user_id, atleta_id, created_at.
-- No hay columnas actualizables por el usuario, pero añadimos la política
-- para completar la cobertura CRUD y evitar el gap en la auditoría.
DROP POLICY IF EXISTS "Usuarios actualizan favoritos" ON public.atletas_favoritos;
CREATE POLICY "Usuarios actualizan favoritos"
  ON public.atletas_favoritos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 3. update_user_role RPC — ampliar roles permitidos
-- ============================================================
-- La versión anterior solo permitía 'admin' y 'consulta'.
-- Faltaban: 'trainer', 'athlete', 'club_admin'.
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Must be admin.';
  END IF;

  IF new_role NOT IN ('admin', 'consulta', 'trainer', 'athlete', 'club_admin') THEN
    RAISE EXCEPTION 'Rol no válido: %. Valores permitidos: admin, consulta, trainer, athlete, club_admin', new_role;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$;
