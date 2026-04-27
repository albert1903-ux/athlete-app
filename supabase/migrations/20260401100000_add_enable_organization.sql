-- Migration: Add enable_organization RPC
-- Needed separately because the original migration (20260401000000) was already applied
-- before this function was added to it.

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
