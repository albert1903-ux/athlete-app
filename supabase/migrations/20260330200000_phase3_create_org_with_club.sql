-- Phase 3: Update create_organization RPC to accept club_id
-- Links the new organization to an existing club in the clubes table

-- Drop old 2-param signature
DROP FUNCTION IF EXISTS create_organization(TEXT, UUID);

-- Recreate with club_id parameter
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT,
    admin_user_id UUID,
    club_id INTEGER DEFAULT NULL
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

    INSERT INTO public.organizations (name, subscription_status, club_id)
    VALUES (org_name, 'trial', club_id)
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

GRANT EXECUTE ON FUNCTION create_organization(TEXT, UUID, INTEGER) TO authenticated;
