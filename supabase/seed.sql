-- =============================================================================
-- SEED: Usuarios de prueba para cada rol
-- =============================================================================
-- Usuarios creados:
--   user-admin@test.com       → superadmin   (password: test)
--   user-club@test.com        → club         (password: test)
--   user-entrenador@test.com  → trainer      (password: test)
--   user-atleta@test.com      → athlete      (password: test)
--   user-consulta@test.com    → consulta     (password: test)
-- =============================================================================

-- UUIDs fijos para reproducibilidad
-- usuarios
-- 00000000-0000-0000-0000-000000000001  user-admin
-- 00000000-0000-0000-0000-000000000002  user-club
-- 00000000-0000-0000-0000-000000000003  user-entrenador
-- 00000000-0000-0000-0000-000000000004  user-atleta
-- 00000000-0000-0000-0000-000000000005  user-consulta
-- 00000000-0000-0000-0000-000000000010  organization (test)
-- 00000000-0000-0000-0000-000000000020  trainer_group (test)

-- -----------------------------------------------------------------------------
-- 1. Datos de soporte: club, categoría, prueba
-- -----------------------------------------------------------------------------

INSERT INTO public.clubes (club_id, nombre)
VALUES (9999, 'Club Test Seed')
ON CONFLICT (club_id) DO NOTHING;

INSERT INTO public.categorias (categoria_id, nombre)
VALUES (9999, 'Categoría Test')
ON CONFLICT (categoria_id) DO NOTHING;

INSERT INTO public.pruebas (prueba_id, nombre, tipo_marca, unidad_default)
VALUES (9999, '100m Test', 'tiempo', 's')
ON CONFLICT (prueba_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Organización de prueba (vinculada al Club Test)
-- -----------------------------------------------------------------------------

INSERT INTO public.organizations (id, name, subscription_status, club_id)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'Organización Test Seed',
    'trial',
    9999
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Atleta de prueba
-- -----------------------------------------------------------------------------

INSERT INTO public.atletas (atleta_id, nombre, fecha_nac)
VALUES (99999, 'Atleta Test', '2000-06-15')
ON CONFLICT (atleta_id) DO NOTHING;

-- Resultado mínimo que vincula el atleta al club (necesario para get_club_athletes)
INSERT INTO public.resultados (
    resultado_id, atleta_id, club_id, prueba_id,
    fecha, anio, mes, marca_texto, marca_valor,
    unidad, genero, superficie, categoria_id
)
VALUES (
    99999, 99999, 2, 9999,
    '2025-06-01', 2025, 6, '12.50', 12.50,
    's', 'MASC', 'AL', 9999
)
ON CONFLICT (resultado_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Usuarios auth (password: 'test' en bcrypt)
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
)
VALUES
    -- 4a. superadmin
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated',
        'user-admin@test.com',
        crypt('test', gen_salt('bf', 10)),
        now(),
        '', '', '', '',
        '{"role":"superadmin","status":"approved","provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Admin Test"}'::jsonb,
        now(), now(), false, false
    ),
    -- 4b. club (vinculado a la organización de prueba)
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated',
        'user-club@test.com',
        crypt('test', gen_salt('bf', 10)),
        now(),
        '', '', '', '',
        '{"role":"club","status":"approved","organization_id":"00000000-0000-0000-0000-000000000010","provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Club Test"}'::jsonb,
        now(), now(), false, false
    ),
    -- 4c. trainer (misma organización)
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated',
        'user-entrenador@test.com',
        crypt('test', gen_salt('bf', 10)),
        now(),
        '', '', '', '',
        '{"role":"trainer","status":"approved","organization_id":"00000000-0000-0000-0000-000000000010","provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Entrenador Test"}'::jsonb,
        now(), now(), false, false
    ),
    -- 4d. athlete
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000004',
        'authenticated', 'authenticated',
        'user-atleta@test.com',
        crypt('test', gen_salt('bf', 10)),
        now(),
        '', '', '', '',
        '{"role":"athlete","status":"approved","organization_id":"00000000-0000-0000-0000-000000000010","provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Atleta Test"}'::jsonb,
        now(), now(), false, false
    ),
    -- 4e. consulta
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000005',
        'authenticated', 'authenticated',
        'user-consulta@test.com',
        crypt('test', gen_salt('bf', 10)),
        now(),
        '', '', '', '',
        '{"role":"consulta","status":"approved","organization_id":"00000000-0000-0000-0000-000000000010","provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Consulta Test"}'::jsonb,
        now(), now(), false, false
    )
ON CONFLICT (id) DO UPDATE SET
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  updated_at = now();

-- También registrar en auth.identities (requerido para login con email+password)
-- IMPORTANTE: provider_id debe ser el UUID del usuario (no el email) para GoTrue v2+
INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.id::text,                              -- provider_id = user UUID (requisito GoTrue v2)
    u.id,
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
    ),
    'email',
    now(), now(), now()
FROM auth.users u
WHERE u.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Vincular atleta de prueba → user-atleta (Phase 6: atletas.user_id)
-- -----------------------------------------------------------------------------

UPDATE public.atletas
SET user_id = '00000000-0000-0000-0000-000000000004'
WHERE atleta_id = 99999;

-- -----------------------------------------------------------------------------
-- 6. Grupo de entrenador (trainer_group + athlete asignado)
-- -----------------------------------------------------------------------------

INSERT INTO public.trainer_groups (id, organization_id, trainer_user_id, name)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000003',
    'Grupo Test'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_athletes (group_id, atleta_id)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    99999
)
ON CONFLICT (group_id, atleta_id) DO NOTHING;

-- =============================================================================
-- Verificación final
-- =============================================================================
DO $$
DECLARE
    v_users  int;
    v_atleta int;
    v_grupo  int;
BEGIN
    SELECT COUNT(*) INTO v_users
    FROM auth.users
    WHERE id IN (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005'
    );

    SELECT COUNT(*) INTO v_atleta
    FROM public.atletas WHERE user_id = '00000000-0000-0000-0000-000000000004';

    SELECT COUNT(*) INTO v_grupo
    FROM public.group_athletes ga
    JOIN public.trainer_groups tg ON tg.id = ga.group_id
    WHERE tg.trainer_user_id = '00000000-0000-0000-0000-000000000003';

    RAISE NOTICE '✅ Seed completado:';
    RAISE NOTICE '   Usuarios creados    : % / 5', v_users;
    RAISE NOTICE '   Atleta vinculado    : %', CASE WHEN v_atleta = 1 THEN 'SI' ELSE 'NO' END;
    RAISE NOTICE '   Atleta en grupo     : %', CASE WHEN v_grupo = 1 THEN 'SI' ELSE 'NO' END;
    RAISE NOTICE '';
    RAISE NOTICE '   user-admin@test.com      → superadmin  (pw: test)';
    RAISE NOTICE '   user-club@test.com       → club        (pw: test)';
    RAISE NOTICE '   user-entrenador@test.com → trainer     (pw: test)';
    RAISE NOTICE '   user-atleta@test.com     → athlete     (pw: test)';
    RAISE NOTICE '   user-consulta@test.com   → consulta    (pw: test)';
END $$;
