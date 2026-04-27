-- Phase 4: RPC for fetching athletes scoped to the caller's club
-- Used by the Groups tab and scoped athlete selectors

CREATE OR REPLACE FUNCTION get_club_athletes()
RETURNS TABLE (atleta_id INTEGER, nombre TEXT, fecha_nac DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
    org_club_id INTEGER;
BEGIN
    caller_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF caller_role NOT IN ('superadmin', 'club') THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin or club.';
    END IF;

    SELECT o.club_id INTO org_club_id
    FROM public.organizations o
    WHERE o.id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid;

    IF org_club_id IS NULL THEN
        RETURN; -- org has no club linked yet
    END IF;

    RETURN QUERY
    SELECT DISTINCT
        a.atleta_id,
        a.nombre::TEXT,
        a.fecha_nac
    FROM public.atletas a
    JOIN public.resultados r ON r.atleta_id = a.atleta_id
    WHERE r.club_id = org_club_id
    ORDER BY a.nombre::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION get_club_athletes() TO authenticated;
