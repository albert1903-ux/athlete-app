-- Migration: add admin_id to get_organizations + RPC to change contact user
-- Date: 2026-04-01

-- ============================================================
-- 1. UPDATE get_organizations() — add admin_id to response
-- ============================================================
DROP FUNCTION IF EXISTS get_organizations();

CREATE OR REPLACE FUNCTION get_organizations()
RETURNS TABLE (
    id UUID,
    name TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ,
    admin_id UUID,
    admin_email VARCHAR,
    admin_name TEXT,
    club_id INTEGER,
    club_name TEXT,
    is_active BOOLEAN
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
        u.id AS admin_id,
        u.email AS admin_email,
        (u.raw_user_meta_data ->> 'name')::TEXT AS admin_name,
        o.club_id,
        c.nombre::TEXT AS club_name,
        o.is_active
    FROM public.organizations o
    LEFT JOIN auth.users u
        ON (u.raw_app_meta_data ->> 'organization_id') = o.id::text
        AND (u.raw_app_meta_data ->> 'role') = 'club'
    LEFT JOIN public.clubes c ON c.club_id = o.club_id
    ORDER BY o.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_organizations() TO authenticated;


-- ============================================================
-- 2. RPC: update_organization_contact (superadmin only)
-- Replaces the contact user (role='club') for an organization.
-- The previous contact user is demoted to 'consulta'.
-- ============================================================
CREATE OR REPLACE FUNCTION update_organization_contact(
    p_contact_user_id UUID,
    p_org_id UUID
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

    -- Demote current club user for this org (if any)
    UPDATE auth.users
    SET raw_app_meta_data = (raw_app_meta_data - 'organization_id')
        || jsonb_build_object('role', 'consulta', 'status', 'approved')
    WHERE (raw_app_meta_data ->> 'organization_id') = p_org_id::text
      AND (raw_app_meta_data ->> 'role') = 'club';

    -- Assign new contact user
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', 'club', 'organization_id', p_org_id::text, 'status', 'approved')
    WHERE id = p_contact_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION update_organization_contact(UUID, UUID) TO authenticated;


-- ============================================================
-- 3. RPC: get_club_users_for_club (superadmin only)
-- Returns users with role='club' whose app_metadata.club_id matches
-- the given club. Used to populate the contact user dropdown when
-- editing an organization.
-- ============================================================
CREATE OR REPLACE FUNCTION get_club_users_for_club(p_club_id INTEGER)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    name TEXT
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
    SELECT
        u.id,
        u.email,
        (u.raw_user_meta_data ->> 'name')::TEXT AS name
    FROM auth.users u
    WHERE (u.raw_app_meta_data ->> 'role') = 'club'
      AND (u.raw_app_meta_data ->> 'club_id')::integer = p_club_id
    ORDER BY u.email;
END;
$$;
GRANT EXECUTE ON FUNCTION get_club_users_for_club(INTEGER) TO authenticated;
