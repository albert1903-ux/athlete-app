-- Migration: Superadmin can edit org's club link and toggle org active state
-- Date: 2026-04-01
--
-- Changes:
--   1. Add is_active boolean column to organizations
--   2. Update get_organizations() to return club_id, club_name, is_active
--   3. New RPC update_organization_club(org_id, new_club_id)
--   4. New RPC disable_organization(org_id) — sets is_active=false + downgrades trainers to consulta
--   5. New RPC enable_organization(org_id)  — sets is_active=true


-- ============================================================
-- 1. ADD is_active COLUMN TO organizations
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;


-- ============================================================
-- 2. UPDATE get_organizations() — add club_id, club_name, is_active
-- ============================================================
DROP FUNCTION IF EXISTS get_organizations();

CREATE OR REPLACE FUNCTION get_organizations()
RETURNS TABLE (
    id UUID,
    name TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ,
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
-- 3. RPC: update_organization (superadmin only)
-- Updates org name and/or linked club
-- ============================================================
CREATE OR REPLACE FUNCTION update_organization(
    p_club_id INTEGER,
    p_name TEXT,
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

    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Organization name cannot be empty.';
    END IF;

    UPDATE public.organizations
    SET name = trim(p_name),
        club_id = p_club_id
    WHERE id = p_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found.';
    END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION update_organization(INTEGER, TEXT, UUID) TO authenticated;


-- ============================================================
-- 4. RPC: disable_organization (superadmin only)
-- Sets is_active = false on the org.
-- Downgrades all trainer members to role 'consulta' (removes org link).
-- Athletes are NOT affected.
-- ============================================================
CREATE OR REPLACE FUNCTION disable_organization(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin.';
    END IF;

    -- Mark org as inactive
    UPDATE public.organizations
    SET is_active = false
    WHERE id = p_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found.';
    END IF;

    -- Degrade trainers: remove org link, set role to consulta
    UPDATE auth.users
    SET raw_app_meta_data = (raw_app_meta_data - 'organization_id')
        || jsonb_build_object('role', 'consulta', 'status', 'approved')
    WHERE (raw_app_meta_data ->> 'organization_id') = p_org_id::text
      AND (raw_app_meta_data ->> 'role') = 'trainer';
END;
$$;
GRANT EXECUTE ON FUNCTION disable_organization(UUID) TO authenticated;


-- ============================================================
-- 5. RPC: enable_organization (superadmin only)
-- Sets is_active = true on the org. Trainers are NOT automatically
-- restored — they must be re-invited or re-assigned manually.
-- ============================================================
CREATE OR REPLACE FUNCTION enable_organization(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin.';
    END IF;

    UPDATE public.organizations
    SET is_active = true
    WHERE id = p_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found.';
    END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION enable_organization(UUID) TO authenticated;
