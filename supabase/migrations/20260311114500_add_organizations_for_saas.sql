-- Migration: Add Organizations for SaaS Multitenancy
-- NOTA: Esta migración fue corregida en 2026-03-28 antes de su primera aplicación.
-- Correcciones aplicadas:
--   1. Eliminado ALTER TABLE profiles (tabla no existe en este proyecto)
--   2. Corregido 'super_admin' → 'admin' en políticas de organizations
--   3. Añadidas políticas INSERT y DELETE para organizations
--   4. Añadido acceso admin a invitations
--   5. FOR ALL separado en políticas individuales para claridad

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_status text DEFAULT 'trial',
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations Policies
-- SELECT: admin ve todo, club_admin y miembros ven su propia organización
CREATE POLICY "Users can view their own organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- INSERT: solo admin puede crear organizaciones (onboarding SaaS)
CREATE POLICY "Admin creates organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- UPDATE: admin siempre, club_admin solo la suya
CREATE POLICY "Admin and club_admin update organization"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin'
    )
  );

-- DELETE: solo admin puede eliminar organizaciones
CREATE POLICY "Admin deletes organizations"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- 2. Create Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('athlete', 'trainer', 'club_admin')),
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Invitations Policies
-- SELECT: admin ve todas, club_admin ve las de su organización
CREATE POLICY "Admin and club_admin view invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin'
    )
  );

-- INSERT: admin y club_admin pueden crear invitaciones (club_admin solo en su org)
CREATE POLICY "Admin and club_admin create invitations"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin'
    )
  );

-- UPDATE: admin y club_admin pueden revocar/actualizar invitaciones
CREATE POLICY "Admin and club_admin update invitations"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin'
    )
  );

-- DELETE: admin y club_admin pueden eliminar invitaciones
CREATE POLICY "Admin and club_admin delete invitations"
  ON public.invitations
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'club_admin'
    )
  );

-- SELECT anon: permite ver invitaciones pendientes por token (para el flujo de sign-up sin autenticar)
CREATE POLICY "Anon can view pending invitations by token"
  ON public.invitations
  FOR SELECT
  TO anon
  USING (status = 'pending');
