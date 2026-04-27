-- Migration: SaaS Organizations RPCs
-- Añade las funciones RPC necesarias para el onboarding SaaS:
--   - Gestión de organizaciones (admin)
--   - Flujo de invitaciones (club_admin)
--   - Aceptación de invitaciones (usuario autenticado / anon lookup)
--   - Panel de miembros (club_admin)

-- ============================================================
-- RPC 1: admin crea una organización y asigna un club_admin
-- ============================================================
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
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
    END IF;

    INSERT INTO public.organizations (name, subscription_status)
    VALUES (org_name, 'trial')
    RETURNING id INTO new_org_id;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'role', 'club_admin',
            'organization_id', new_org_id::text,
            'status', 'approved'
        )
    WHERE id = admin_user_id;

    RETURN new_org_id;
END;
$$;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, UUID) TO authenticated;

-- ============================================================
-- RPC 2: admin lista todas las organizaciones con su club_admin
-- ============================================================
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
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
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
        AND (u.raw_app_meta_data ->> 'role') = 'club_admin'
    ORDER BY o.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_organizations() TO authenticated;

-- ============================================================
-- RPC 3: admin lista usuarios aprobados sin organización asignada
-- ============================================================
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
    IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Must be admin.';
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

-- ============================================================
-- RPC 4: club_admin o admin envía invitación por email
-- Revoca la invitación pendiente anterior para ese email+org (si existe)
-- y crea una nueva. Devuelve el token para construir el link.
-- ============================================================
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
    IF caller_role NOT IN ('admin', 'club_admin') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID;
    IF caller_org_id IS NULL THEN
        RAISE EXCEPTION 'Caller has no organization assigned.';
    END IF;

    IF invite_role NOT IN ('trainer', 'athlete', 'club_admin') THEN
        RAISE EXCEPTION 'Invalid role. Allowed: trainer, athlete, club_admin.';
    END IF;

    -- Revocar invitaciones pendientes anteriores para este email en la misma org
    UPDATE public.invitations
    SET status = 'revoked'
    WHERE organization_id = caller_org_id
      AND email = invite_email
      AND status = 'pending';

    -- Generar token único (hex de 32 bytes)
    new_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO public.invitations (organization_id, email, role, token, status, invited_by)
    VALUES (caller_org_id, invite_email, invite_role, new_token, 'pending', auth.uid());

    RETURN new_token;
END;
$$;
GRANT EXECUTE ON FUNCTION invite_member(TEXT, TEXT) TO authenticated;

-- ============================================================
-- RPC 5: club_admin lista las invitaciones de su organización
-- ============================================================
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
    IF caller_role NOT IN ('admin', 'club_admin') THEN
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

-- ============================================================
-- RPC 6: club_admin revoca una invitación pendiente
-- ============================================================
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
    IF caller_role NOT IN ('admin', 'club_admin') THEN
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

-- ============================================================
-- RPC 7: consulta invitación por token (pública, accesible por anon)
-- Considera expirada si tiene más de 7 días.
-- ============================================================
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

-- ============================================================
-- RPC 8: usuario autenticado acepta una invitación
-- Actualiza app_metadata del usuario con role y organization_id
-- ============================================================
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

-- ============================================================
-- RPC 9: club_admin lista miembros de su organización
-- ============================================================
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
    IF caller_role NOT IN ('admin', 'club_admin') THEN
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

-- ============================================================
-- RPC 10: club_admin elimina un miembro de su organización
-- Desasocia el usuario (no lo borra), asignándole role 'consulta'
-- ============================================================
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
    IF caller_role NOT IN ('admin', 'club_admin') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    caller_org_id := auth.jwt() -> 'app_metadata' ->> 'organization_id';

    SELECT raw_app_meta_data ->> 'organization_id'
    INTO target_org_id
    FROM auth.users WHERE id = target_user_id;

    IF target_org_id IS DISTINCT FROM caller_org_id THEN
        RAISE EXCEPTION 'Cannot remove member from a different organization.';
    END IF;

    -- Desasociar: quitar organization_id y degradar a consulta
    UPDATE auth.users
    SET raw_app_meta_data = (raw_app_meta_data - 'organization_id')
        || jsonb_build_object('role', 'consulta', 'status', 'approved')
    WHERE id = target_user_id;

    RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION remove_organization_member(UUID) TO authenticated;
