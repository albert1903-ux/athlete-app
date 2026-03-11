-- Supabase Migration: Migrate roles to app_metadata and secure RLS policies.

-- 1. Migrate existing users from user_metadata to app_metadata
DO $$
DECLARE
    u RECORD;
    v_role TEXT;
    v_status TEXT;
BEGIN
    FOR u IN SELECT id, raw_user_meta_data, raw_app_meta_data FROM auth.users LOOP
        -- Extract role and status
        v_role := u.raw_user_meta_data->>'role';
        v_status := u.raw_user_meta_data->>'status';
        
        IF v_role IS NOT NULL OR v_status IS NOT NULL THEN
            -- Add to app_metadata
            UPDATE auth.users
            SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
                jsonb_build_object(
                    'role', COALESCE(v_role, raw_app_meta_data->>'role', 'consulta'),
                    'status', COALESCE(v_status, raw_app_meta_data->>'status', 'pending')
                ),
                -- Remove from user_metadata
                raw_user_meta_data = raw_user_meta_data - 'role' - 'status'
            WHERE id = u.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop and Recreate RLS Policies
-- First drop existing admin policies created previously
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.resultados;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.resultados;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.resultados;

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.atleta_club_hist;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.atleta_club_hist;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.atleta_club_hist;

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.atletas;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.atletas;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.atletas;

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.categorias;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.categorias;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.categorias;

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.clubes;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.clubes;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.clubes;

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.pruebas;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.pruebas;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.pruebas;

-- Create new secure policies using app_metadata
-- (1) resultados
CREATE POLICY "Enable insert for admins only" ON public.resultados FOR INSERT WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable update for admins only" ON public.resultados FOR UPDATE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
) WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable delete for admins only" ON public.resultados FOR DELETE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);

-- (2) atleta_club_hist
CREATE POLICY "Enable insert for admins only" ON public.atleta_club_hist FOR INSERT WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable update for admins only" ON public.atleta_club_hist FOR UPDATE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
) WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable delete for admins only" ON public.atleta_club_hist FOR DELETE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);

-- (3) atletas
CREATE POLICY "Enable insert for admins only" ON public.atletas FOR INSERT WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable update for admins only" ON public.atletas FOR UPDATE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
) WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable delete for admins only" ON public.atletas FOR DELETE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);

-- (4) categorias
CREATE POLICY "Enable insert for admins only" ON public.categorias FOR INSERT WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable update for admins only" ON public.categorias FOR UPDATE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
) WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable delete for admins only" ON public.categorias FOR DELETE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);

-- (5) clubes
CREATE POLICY "Enable insert for admins only" ON public.clubes FOR INSERT WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable update for admins only" ON public.clubes FOR UPDATE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
) WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable delete for admins only" ON public.clubes FOR DELETE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);

-- (6) pruebas
CREATE POLICY "Enable insert for admins only" ON public.pruebas FOR INSERT WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable update for admins only" ON public.pruebas FOR UPDATE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
) WITH CHECK (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);
CREATE POLICY "Enable delete for admins only" ON public.pruebas FOR DELETE USING (
  ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
);


-- 3. Replace RPCs to use app_metadata

-- update_user_role
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Check if caller is admin by examining their session token's app_metadata directly
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Must be admin.';
  END IF;

  IF new_role NOT IN ('admin', 'consulta') THEN
    RAISE EXCEPTION 'Rol no válido: %', new_role;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$;

-- get_all_users
DROP FUNCTION IF EXISTS get_all_users();
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Must be admin.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, u.raw_user_meta_data, u.raw_app_meta_data, u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- approve_user
CREATE OR REPLACE FUNCTION approve_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"status": "approved"}'::jsonb
    WHERE auth.users.id = target_user_id;
END;
$$;

-- reject_user
CREATE OR REPLACE FUNCTION reject_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    DELETE FROM auth.users WHERE auth.users.id = target_user_id;
END;
$$;

-- get_pending_users
DROP FUNCTION IF EXISTS get_pending_users();
CREATE OR REPLACE FUNCTION get_pending_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    RETURN QUERY
    SELECT au.id, au.email::text, au.created_at, au.raw_user_meta_data, au.raw_app_meta_data
    FROM auth.users au
    WHERE (au.raw_app_meta_data ->> 'status') = 'pending'
       OR (au.raw_app_meta_data ->> 'status') IS NULL;
END;
$$;
