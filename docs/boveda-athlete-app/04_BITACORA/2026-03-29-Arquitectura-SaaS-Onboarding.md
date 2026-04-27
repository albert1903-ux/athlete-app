---
title: "2026-03-29: Arquitectura de comunicación y SaaS Onboarding"
date: "2026-03-29"
tags: [bitácora, arquitectura, react, saas, supabase, migracion, base-de-datos]
---

# Bitácora: 29 de Marzo 2026 — Arquitectura y SaaS Onboarding

## Objetivo

Dos bloques de la hoja de ruta ejecutados en la misma sesión:

1. **Mes 2 — Arquitectura**: Eliminar el antipatrón `window.addEventListener('storage')` + polling en componentes de medidas corporales, migrando al store reactivo `selectedAthleteStore.js`.
2. **Mes 2-3 — Onboarding SaaS**: Implementar la UI y backend para crear organizaciones, invitar miembros y aceptar invitaciones, activando la infraestructura de tablas que ya existía en BD.

---

## Acciones Ejecutadas

### 1. Migración del antipatrón `storage` event → `useSelectedAthlete()`

**Problema:** Tres componentes leían el atleta seleccionado desde `localStorage` usando `setInterval` + `window.addEventListener('storage')`:
- `AddMeasurementDialog.jsx` — polling cada 500 ms
- `AthleteBodyMeasurements.jsx` — polling cada 500 ms
- `ViewMeasurementsDialog.jsx` — polling cada 2000 ms + `lastAthleteIdRef` para evitar re-renders

**Solución:** El store `src/store/selectedAthleteStore.js` ya existía y usaba `useSyncExternalStore` — la infraestructura correcta estaba lista. Los 3 componentes simplemente no lo habían adoptado.

**Cambios por archivo:**

| Componente | Eliminado | Añadido |
|---|---|---|
| `AddMeasurementDialog.jsx` | `useEffect` + `setInterval(500ms)` + `window.addEventListener('storage')` + `STORAGE_KEY` | `import { useSelectedAthlete }` + `const selectedAthlete = useSelectedAthlete()` |
| `AthleteBodyMeasurements.jsx` | Mismo patrón | Mismo reemplazo |
| `ViewMeasurementsDialog.jsx` | Mismo + `lastAthleteIdRef` | Mismo reemplazo (sin necesidad del ref) |

**Resultado:** ✅ Build + 125/125 tests pasando

**Nota:** Los `window.addEventListener('resize')` en `AthleteBodyMeasurementsChart.jsx` y `AthleteHeightWeightScatter.jsx` **no se tocaron** — son eventos de browser legítimos para layout responsivo, no antipatrón de comunicación.

---

### 2. SaaS Onboarding — Migración SQL (10 RPCs)

**Archivo:** `supabase/migrations/20260328200000_saas_organizations_rpcs.sql`

Las tablas `organizations` e `invitations` ya existían (migración `20260311114500`). Se añadieron 10 funciones SECURITY DEFINER:

| RPC | Rol mínimo | Descripción |
|---|---|---|
| `create_organization(org_name, admin_user_id)` | admin | Crea org y asigna club_admin vía app_metadata |
| `get_organizations()` | admin | Lista todas las orgs con su club_admin |
| `get_approved_users_without_org()` | admin | Candidatos a club_admin para el selector |
| `invite_member(invite_email, invite_role)` | club_admin / admin | Revoca invitación anterior pendiente e inserta nueva; devuelve **token** (no UUID) |
| `get_organization_invitations()` | club_admin / admin | Lista invitaciones de la propia org |
| `revoke_invitation(invitation_id)` | club_admin / admin | Revoca invitación pendiente |
| `get_invitation_by_token(invite_token)` | **anon + authenticated** | Lookup público para la página `/join` |
| `accept_invitation(invite_token)` | authenticated | Actualiza app_metadata del usuario (role + organization_id + status='approved') y marca invitación como accepted |
| `get_organization_members()` | club_admin / admin | Lista miembros de la propia org |
| `remove_organization_member(target_user_id)` | club_admin / admin | Desasocia usuario (quita organization_id, degrada a 'consulta') |

**Decisiones de diseño:**
- `invite_member` devuelve el **token** (TEXT) en lugar del UUID, para que el frontend pueda construir el link directamente sin hacer una segunda query.
- Antes de insertar nueva invitación, se revocan las pendientes anteriores para el mismo email+org (en lugar de añadir constraint UNIQUE, que impediría tener histórico de invitaciones revocadas).
- `get_invitation_by_token` calcula expiración en SQL (`created_at < now() - interval '7 days'`) devolviendo `status = 'expired'` — el frontend no necesita lógica de fechas.
- `remove_organization_member` **no borra** el usuario, solo lo desasocia (quita `organization_id`, asigna rol `consulta`). Decisión de diseño reversible.

---

### 3. AuthContext — exponer `organization_id`

**Archivo:** `src/context/AuthContext.jsx`

Añadida la línea:
```js
currentUser.organization_id = currentUser.app_metadata?.organization_id || null
```
En los dos bloques del contexto (`getSession` y `onAuthStateChange`).

---

### 4. Componentes frontend creados

| Componente | Descripción |
|---|---|
| `CreateOrganizationDialog.jsx` | Admin: TextField nombre + Select de usuarios aprobados sin org → llama `create_organization` |
| `OrganizationsDialog.jsx` | Admin: lista de orgs con Chip de subscription_status; abre `CreateOrganizationDialog` |
| `InviteMemberDialog.jsx` | club_admin: email + Select rol → `invite_member` → muestra link copiable con `TbCopy` |
| `OrganizationPanelDialog.jsx` | club_admin: Tabs Miembros/Invitaciones; eliminar miembro, revocar invitación, abrir `InviteMemberDialog` |

---

### 5. Página pública AcceptInvitationPage

**Ruta:** `/join?token=...`
**Archivo:** `src/pages/AcceptInvitationPage.jsx`

**Estados de la página:**

| Estado | Condición | UI |
|---|---|---|
| `loading` | Consultando token | CircularProgress |
| `valid` + sin sesión | Token ok, usuario no logado | Detalle org + botones Login / Crear cuenta |
| `valid` + sesión ok | Email del user coincide con invitation.email | Botón "Aceptar invitación" |
| `valid` + email mismatch | Sesión con otro email | Alert error |
| `expired` | Token > 7 días | Alert warning |
| `already_used` | status=accepted | Alert info |
| `invalid` | Token no existe / revocado | Alert error |
| `done` | Aceptado correctamente | Alert success + redirect a /seguimiento (2s) |

**Post-aceptación:** llama `supabase.auth.refreshSession()` para que el JWT se actualice con el nuevo `role` y `organization_id` antes de navegar.

---

### 6. Cambios en archivos existentes

**`App.jsx`:**
- Import de `AcceptInvitationPage`
- `const isJoinPage = location.pathname === '/join'` → añadido a `hideChrome` (sin AppBar ni BottomNav)
- `<Route path="/join" element={<AcceptInvitationPage />} />` (ruta pública, antes de las protegidas)

**`MasPage.jsx`:**
- Imports: `TbBuilding`, `OrganizationsDialog`, `OrganizationPanelDialog`
- Estados: `orgsOpen`, `orgPanelOpen`
- Items condicionales: admin ve "Organizaciones", club_admin ve "Mi Organización"
- Dialogs renderizados al final del fragment

**`LoginPage.jsx`:**
- `useSearchParams` + `const redirectTo = searchParams.get('redirect') || '/seguimiento'`
- Tras login exitoso: `navigate(decodeURIComponent(redirectTo), { replace: true })`

**`RegisterPage.jsx`:**
- `useSearchParams` + `redirectAfterVerification = searchParams.get('redirect')`
- En paso 2: Alert informativo + botón "Ir a Iniciar Sesión" navega a `/login?redirect=...` si hay redirect

---

## Resultados

| Métrica | Valor |
|---------|-------|
| Test Files | 21 / 21 ✅ |
| Tests pasando | 125 / 125 ✅ |
| Build status | ✅ sin errores |
| Archivos nuevos creados | 7 (1 SQL + 4 componentes + 1 página) |
| Archivos modificados | 6 (AuthContext, App, MasPage, LoginPage, RegisterPage) |

## Estado Final

```
npm test       → ✅ 125/125
npm run build  → ✅ sin errores de compilación
```

## Próximos Pasos

- [ ] **Aplicar migración en Supabase** — `supabase db push` o via Dashboard → ejecutar `20260328200000_saas_organizations_rpcs.sql`
- [ ] **Probar flujo E2E completo:**
  1. Admin crea organización + asigna club_admin
  2. club_admin invita por email → copia link
  3. Usuario nuevo registra cuenta → visita `/join?token=...` → acepta → comprueba app_metadata
- [ ] **Mes 3 — Integración Stripe:** webhook de pagos, portal de facturación, subscription_status real
- [ ] **Mes 3 — Límites por plan:** nº máximo de atletas, features bloqueadas según plan
- [ ] **CI/CD (Mes 3):** GitHub Actions con `npm run lint` + `npm test:coverage` (falla si <80%) + `npm run build`

## Notas Técnicas

**¿Por qué `invite_member` devuelve el token y no el UUID?**
El UUID es el ID del registro en la tabla `invitations`. El token es el secreto que autentica la invitación. Para construir el link `/join?token=X` desde el frontend, se necesita el token, no el UUID. Devolver el token directamente evita una segunda consulta.

**¿Por qué no se añadió `UNIQUE(organization_id, email)` en `invitations`?**
La tabla permite historial: una misma persona puede recibir múltiples invitaciones (revocadas, expiradas, y la nueva activa). Un constraint UNIQUE impediría esto. En su lugar, la RPC `invite_member` revoca explícitamente las invitaciones pendientes anteriores antes de crear la nueva.

**Flujo de redirect en invitaciones para usuarios nuevos:**
El registro no puede redirigir directamente porque Supabase necesita confirmar el email primero. El workaround implementado: en paso 2 del registro, si hay `?redirect=`, se muestra un Alert recordatorio y el botón "Ir a Iniciar Sesión" propaga el redirect param al login. El usuario aterriza en login con el redirect intacto y tras autenticarse va directamente a `/join?token=...`.

**Refresh de sesión post-aceptación:**
`supabase.auth.refreshSession()` es necesario porque `accept_invitation` actualiza `auth.users.raw_app_meta_data` directamente (SECURITY DEFINER). El JWT en memoria del cliente no se actualiza automáticamente — sin el refresh, `user.role` y `user.organization_id` seguirían con los valores anteriores hasta la próxima recarga.

**`remove_organization_member` degrada a `consulta`, no borra:**
Decisión deliberada para no perder datos del usuario (resultados, calendario, etc.). El usuario queda desasociado de la org pero sigue en el sistema. Si se quiere expulsar completamente, se puede usar la RPC `reject_user` existente del sistema de aprobación.
