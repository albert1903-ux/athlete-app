-- Migration: Phase 1 — Rename roles + new tables for group-based access
-- Date: 2026-03-30
--
-- Changes:
--   1. Rename roles in auth.users.raw_app_meta_data: admin→superadmin, club_admin→club
--   2. Drop + recreate all RLS policies with new role names
--   3. Recreate all RPCs with new role names
--   4. Update invitations.role CHECK constraint
--   5. Add club_id FK to organizations
--   6. Create trainer_groups and group_athletes tables with RLS

-- ============================================================
-- 1. RENAME EXISTING ROLES IN app_metadata
-- ============================================================
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"superadmin"')
WHERE raw_app_meta_data ->> 'role' = 'admin';

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"club"')
WHERE raw_app_meta_data ->> 'role' = 'club_admin';


-- ============================================================
-- 2. DROP ALL OLD RLS POLICIES (using old role names)
-- ============================================================

-- (a) Core data tables — admin-only INSERT/UPDATE/DELETE
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['resultados','atleta_club_hist','atletas','categorias','clubes','pruebas'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for admins only" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update for admins only" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable delete for admins only" ON public.%I', tbl);
  END LOOP;
END $$;

-- (b) organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admin creates organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admin and club_admin update organization" ON public.organizations;
DROP POLICY IF EXISTS "Admin deletes organizations" ON public.organizations;

-- (c) invitations
DROP POLICY IF EXISTS "Admin and club_admin view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admin and club_admin create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admin and club_admin update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admin and club_admin delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anon can view pending invitations by token" ON public.invitations;

-- (d) notifications
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;


-- ============================================================
-- 3. RECREATE RLS POLICIES WITH NEW ROLE NAMES
-- ============================================================

-- (a) Core data tables: superadmin INSERT/UPDATE/DELETE
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['resultados','atleta_club_hist','atletas','categorias','clubes','pruebas'])
  LOOP
    EXECUTE format(
      'CREATE POLICY "superadmin_insert" ON public.%I FOR INSERT WITH CHECK (
        ((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''superadmin''::text
      )', tbl);
    EXECUTE format(
      'CREATE POLICY "superadmin_update" ON public.%I FOR UPDATE
        USING (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''superadmin''::text)
        WITH CHECK (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''superadmin''::text)
      ', tbl);
    EXECUTE format(
      'CREATE POLICY "superadmin_delete" ON public.%I FOR DELETE
        USING (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''superadmin''::text)
      ', tbl);
  END LOOP;
END $$;

-- (b) organizations
CREATE POLICY "org_select_own_or_superadmin"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
  );

CREATE POLICY "org_insert_superadmin"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
  );

CREATE POLICY "org_update_superadmin_or_club"
  ON public.organizations FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

CREATE POLICY "org_delete_superadmin"
  ON public.organizations FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
  );

-- (c) invitations
CREATE POLICY "inv_select_superadmin_or_club"
  ON public.invitations FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

CREATE POLICY "inv_insert_superadmin_or_club"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

CREATE POLICY "inv_update_superadmin_or_club"
  ON public.invitations FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

CREATE POLICY "inv_delete_superadmin_or_club"
  ON public.invitations FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

CREATE POLICY "inv_select_anon_pending"
  ON public.invitations FOR SELECT TO anon
  USING (status = 'pending');

-- (d) notifications
CREATE POLICY "notifications_insert_superadmin"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
  );


-- ============================================================
-- 4. RECREATE ALL RPCs WITH NEW ROLE NAMES
-- ============================================================

-- RPC: update_user_role (superadmin only)
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied. Must be superadmin.';
  END IF;

  IF new_role NOT IN ('superadmin', 'club', 'trainer', 'athlete', 'consulta') THEN
    RAISE EXCEPTION 'Invalid role: %. Allowed: superadmin, club, trainer, athlete, consulta', new_role;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$;

-- RPC: get_all_users (superadmin only)
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
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied. Must be superadmin.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, u.raw_user_meta_data, u.raw_app_meta_data, u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- RPC: approve_user (superadmin only)
CREATE OR REPLACE FUNCTION approve_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied. Must be superadmin.';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"status": "approved"}'::jsonb
  WHERE auth.users.id = target_user_id;
END;
$$;

-- RPC: reject_user (superadmin only)
CREATE OR REPLACE FUNCTION reject_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied. Must be superadmin.';
  END IF;

  DELETE FROM auth.users WHERE auth.users.id = target_user_id;
END;
$$;

-- RPC: get_pending_users (superadmin only)
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
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied. Must be superadmin.';
  END IF;

  RETURN QUERY
  SELECT au.id, au.email::text, au.created_at, au.raw_user_meta_data, au.raw_app_meta_data
  FROM auth.users au
  WHERE (au.raw_app_meta_data ->> 'status') = 'pending'
     OR (au.raw_app_meta_data ->> 'status') IS NULL;
END;
$$;

-- RPC: create_organization (superadmin only — assigns role 'club')
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT,
    admin_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin.';
    END IF;

    INSERT INTO public.organizations (name, subscription_status)
    VALUES (org_name, 'trial')
    RETURNING id INTO new_org_id;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'role', 'club',
            'organization_id', new_org_id::text,
            'status', 'approved'
        )
    WHERE id = admin_user_id;

    RETURN new_org_id;
END;
$$;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, UUID) TO authenticated;

-- RPC: get_organizations (superadmin only — finds club admin)
CREATE OR REPLACE FUNCTION get_organizations()
RETURNS TABLE (
    id UUID,
    name TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ,
    admin_email VARCHAR,
    admin_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin.';
    END IF;

    RETURN QUERY
    SELECT
        o.id,
        o.name::TEXT,
        o.subscription_status::TEXT,
        o.created_at,
        u.email AS admin_email,
        (u.raw_user_meta_data ->> 'name')::TEXT AS admin_name
    FROM public.organizations o
    LEFT JOIN auth.users u
        ON (u.raw_app_meta_data ->> 'organization_id') = o.id::text
        AND (u.raw_app_meta_data ->> 'role') = 'club'
    ORDER BY o.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_organizations() TO authenticated;

-- RPC: get_approved_users_without_org (superadmin only)
CREATE OR REPLACE FUNCTION get_approved_users_without_org()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email,
        (u.raw_user_meta_data ->> 'name')::TEXT AS name
    FROM auth.users u
    WHERE (u.raw_app_meta_data ->> 'status') = 'approved'
      AND (u.raw_app_meta_data ->> 'organization_id') IS NULL
      AND u.id != auth.uid()
    ORDER BY u.email;
END;
$$;
GRANT EXECUTE ON FUNCTION get_approved_users_without_org() TO authenticated;

-- RPC: invite_member (club or superadmin)
CREATE OR REPLACE FUNCTION invite_member(
    invite_email TEXT,
    invite_role TEXT DEFAULT 'trainer'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
    caller_org_id UUID;
    new_token TEXT;
BEGIN
    caller_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF caller_role NOT IN ('superadmin', 'club') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID;
    IF caller_org_id IS NULL THEN
        RAISE EXCEPTION 'Caller has no organization assigned.';
    END IF;

    IF invite_role NOT IN ('trainer', 'athlete', 'club') THEN
        RAISE EXCEPTION 'Invalid role. Allowed: trainer, athlete, club.';
    END IF;

    -- Revocar invitaciones pendientes anteriores para este email en la misma org
    UPDATE public.invitations
    SET status = 'revoked'
    WHERE organization_id = caller_org_id
      AND email = invite_email
      AND status = 'pending';

    -- Generar token único
    new_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO public.invitations (organization_id, email, role, token, status, invited_by)
    VALUES (caller_org_id, invite_email, invite_role, new_token, 'pending', auth.uid());

    RETURN new_token;
END;
$$;
GRANT EXECUTE ON FUNCTION invite_member(TEXT, TEXT) TO authenticated;

-- RPC: get_organization_invitations (club or superadmin)
CREATE OR REPLACE FUNCTION get_organization_invitations()
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
    caller_org_id UUID;
BEGIN
    caller_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF caller_role NOT IN ('superadmin', 'club') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID;

    RETURN QUERY
    SELECT
        i.id,
        i.email::TEXT,
        i.role::TEXT,
        i.status::TEXT,
        i.created_at
    FROM public.invitations i
    WHERE i.organization_id = caller_org_id
    ORDER BY i.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_organization_invitations() TO authenticated;

-- RPC: revoke_invitation (club or superadmin)
CREATE OR REPLACE FUNCTION revoke_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
    caller_org_id UUID;
BEGIN
    caller_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF caller_role NOT IN ('superadmin', 'club') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID;

    UPDATE public.invitations
    SET status = 'revoked'
    WHERE id = invitation_id
      AND organization_id = caller_org_id
      AND status = 'pending';

    RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION revoke_invitation(UUID) TO authenticated;

-- RPC: get_invitation_by_token (public — anon + authenticated)
CREATE OR REPLACE FUNCTION get_invitation_by_token(invite_token TEXT)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    organization_name TEXT,
    email TEXT,
    role TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.organization_id,
        o.name::TEXT AS organization_name,
        i.email::TEXT,
        i.role::TEXT,
        CASE
            WHEN i.status = 'pending'
             AND i.created_at < now() - interval '7 days'
            THEN 'expired'
            ELSE i.status::TEXT
        END AS status
    FROM public.invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.token = invite_token;
END;
$$;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO anon, authenticated;

-- RPC: accept_invitation (authenticated)
CREATE OR REPLACE FUNCTION accept_invitation(invite_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inv RECORD;
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Must be authenticated to accept invitation.';
    END IF;

    SELECT i.*
    INTO inv
    FROM public.invitations i
    WHERE i.token = invite_token
      AND i.status = 'pending'
      AND i.created_at >= now() - interval '7 days';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found, already used, or expired.';
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'role', inv.role,
            'organization_id', inv.organization_id::text,
            'status', 'approved'
        )
    WHERE id = caller_id;

    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = inv.id;

    RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;

-- RPC: get_organization_members (club or superadmin)
CREATE OR REPLACE FUNCTION get_organization_members()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    name TEXT,
    role TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
    caller_org_id TEXT;
BEGIN
    caller_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF caller_role NOT IN ('superadmin', 'club') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := auth.jwt() -> 'app_metadata' ->> 'organization_id';

    RETURN QUERY
    SELECT
        u.id,
        u.email,
        (u.raw_user_meta_data ->> 'name')::TEXT AS name,
        (u.raw_app_meta_data ->> 'role')::TEXT AS role,
        (u.raw_app_meta_data ->> 'status')::TEXT AS status
    FROM auth.users u
    WHERE (u.raw_app_meta_data ->> 'organization_id') = caller_org_id
    ORDER BY u.email;
END;
$$;
GRANT EXECUTE ON FUNCTION get_organization_members() TO authenticated;

-- RPC: remove_organization_member (club or superadmin — degrades to consulta)
CREATE OR REPLACE FUNCTION remove_organization_member(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
    caller_org_id TEXT;
    target_org_id TEXT;
BEGIN
    caller_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF caller_role NOT IN ('superadmin', 'club') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := auth.jwt() -> 'app_metadata' ->> 'organization_id';

    SELECT raw_app_meta_data ->> 'organization_id'
    INTO target_org_id
    FROM auth.users WHERE id = target_user_id;

    IF target_org_id IS DISTINCT FROM caller_org_id THEN
        RAISE EXCEPTION 'Cannot remove member from a different organization.';
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = (raw_app_meta_data - 'organization_id')
        || jsonb_build_object('role', 'consulta', 'status', 'approved')
    WHERE id = target_user_id;

    RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION remove_organization_member(UUID) TO authenticated;


-- ============================================================
-- 5. UPDATE invitations.role CHECK CONSTRAINT
-- ============================================================
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check
  CHECK (role IN ('athlete', 'trainer', 'club'));


-- ============================================================
-- 6. ADD club_id FK TO organizations
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS club_id integer REFERENCES public.clubes(club_id);


-- ============================================================
-- 7. CREATE trainer_groups TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trainer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trainer_groups ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; club y miembros de la org ven los de su org
CREATE POLICY "tg_select"
  ON public.trainer_groups FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
  );

-- INSERT: superadmin y club pueden crear grupos
CREATE POLICY "tg_insert"
  ON public.trainer_groups FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

-- UPDATE: superadmin y club
CREATE POLICY "tg_update"
  ON public.trainer_groups FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );

-- DELETE: superadmin y club
CREATE POLICY "tg_delete"
  ON public.trainer_groups FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
    )
  );


-- ============================================================
-- 8. CREATE group_athletes TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.trainer_groups(id) ON DELETE CASCADE,
  atleta_id integer NOT NULL REFERENCES public.atletas(atleta_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, atleta_id)
);

ALTER TABLE public.group_athletes ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; miembros de la org ven los de su org (via join)
CREATE POLICY "ga_select"
  ON public.group_athletes FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR group_id IN (
      SELECT tg.id FROM public.trainer_groups tg
      WHERE tg.organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
    )
  );

-- INSERT: superadmin y club
CREATE POLICY "ga_insert"
  ON public.group_athletes FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
      AND group_id IN (
        SELECT tg.id FROM public.trainer_groups tg
        WHERE tg.organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      )
    )
  );

-- UPDATE: superadmin y club
CREATE POLICY "ga_update"
  ON public.group_athletes FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
      AND group_id IN (
        SELECT tg.id FROM public.trainer_groups tg
        WHERE tg.organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      )
    )
  );

-- DELETE: superadmin y club
CREATE POLICY "ga_delete"
  ON public.group_athletes FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'club'
      AND group_id IN (
        SELECT tg.id FROM public.trainer_groups tg
        WHERE tg.organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      )
    )
  );


-- ============================================================
-- 9. MIGRATE EXISTING invitations WITH OLD ROLE VALUES
-- ============================================================
UPDATE public.invitations SET role = 'club' WHERE role = 'club_admin';
