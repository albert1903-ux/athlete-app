-- Migration: RPC to assign a club directly to a user (superadmin only)
-- Date: 2026-04-01
-- Used in Gestión de Usuarios to link club/trainer users to a specific club
-- via club_id stored in app_metadata.

CREATE OR REPLACE FUNCTION update_user_club(
    p_club_id INTEGER,
    p_target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin.';
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('club_id', p_club_id)
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION update_user_club(INTEGER, UUID) TO authenticated;
