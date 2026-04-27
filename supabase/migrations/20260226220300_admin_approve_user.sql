-- Funciones RPC para la gestión manual de usuarios por parte de un admin

-- 1. Obtener panel de usuarios pendientes
CREATE OR REPLACE FUNCTION get_pending_users()
RETURNS TABLE (
    id uuid,
    email varchar,
    created_at timestamp with time zone,
    raw_user_meta_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the invoking user is an admin
    IF (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    RETURN QUERY
    SELECT au.id, au.email, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    WHERE (au.raw_user_meta_data ->> 'status') = 'pending'
       OR (au.raw_user_meta_data ->> 'status') IS NULL;
END;
$$;

-- 2. Aprobar a un usuario
CREATE OR REPLACE FUNCTION approve_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the invoking user is an admin
    IF (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"status": "approved"}'::jsonb
    WHERE auth.users.id = target_user_id;
END;
$$;

-- 3. Rechazar (y borrar) un usuario
CREATE OR REPLACE FUNCTION reject_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the invoking user is an admin
    IF (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    DELETE FROM auth.users WHERE auth.users.id = target_user_id;
END;
$$;
