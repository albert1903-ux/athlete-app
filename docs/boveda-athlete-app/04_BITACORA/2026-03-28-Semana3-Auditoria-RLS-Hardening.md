---
title: "2026-03-28: Semana 3 — Auditoría RLS y Hardening de Seguridad"
date: "2026-03-28"
tags: [bitácora, seguridad, rls, supabase, migracion]
---

# Bitácora: 28 de Marzo 2026 — Semana 3: Auditoría RLS y Hardening

## Objetivo

Auditoría completa de las políticas RLS (Row-Level Security) de todas las tablas Supabase, identificación de gaps de seguridad, y aplicación de migraciones correctivas tanto en local como en producción.

## Contexto de Partida

La auditoría previa (Hoja de Ruta 2026-03-27) identificaba como pendiente:
- Cobertura de políticas por operación (SELECT/INSERT/UPDATE/DELETE) para cada rol
- RPCs con `SECURITY DEFINER` sin validación de rol en el cuerpo
- Aislamiento multitenancy por `organization_id` en tablas SaaS
- La migración `20260311114500_add_organizations_for_saas.sql` existía pero **nunca se había aplicado** y tenía bugs

## Acciones Ejecutadas

### 1. Lectura completa del esquema de producción

- **Herramienta:** `supabase db dump --schema public`
- **Proyecto linked:** `doibexyiiayjiijxziqm` (athlete-app, West EU Ireland)
- **Resultado:** Inventario completo de 12 tablas en producción con estado RLS real vs. esperado

### 2. Análisis de historial de migraciones

**Problema encontrado:** El historial de migraciones estaba desincronizado.
- Remote tenía 11 migraciones no trackeadas localmente (aplicadas vía dashboard)
- Local tenía 3 migraciones no aplicadas a remote

**Reparación:**
```bash
# Marcar remote-only como reverted (no requieren copia local)
supabase migration repair --status reverted 20260221000000 20260221185113 ... 20260311095205

# Marcar local-only (ya aplicadas vía dashboard con otro ID) como applied
supabase migration repair --status applied 20260307161900 20260311000000
```

### 3. Corrección de migración 20260311114500

La migración `add_organizations_for_saas.sql` tenía 4 bugs antes de su primera aplicación:

| Bug | Descripción | Fix |
|-----|-------------|-----|
| `super_admin` role | Rol inexistente en el proyecto → admin nunca vería sus organizaciones | Cambiado a `admin` |
| `ALTER TABLE profiles` | Tabla `profiles` no existe → migración hubiera fallado | Eliminada la línea |
| Falta INSERT y DELETE en `organizations` | Nadie podía crear ni eliminar organizaciones | Añadidas políticas |
| `FOR ALL` en `invitations` | Solo club_admin, admin excluido | Separado en 4 políticas individuales + acceso admin |
| `gen_random_bytes(16)` | Función no disponible sin pgcrypto | Reemplazado con `replace(gen_random_uuid()::text, '-', '')` |

### 4. Migración de hardening 20260328120000

Gaps adicionales encontrados en producción y corregidos:

```sql
-- notifications: INSERT explícita para admin
CREATE POLICY "Admin can insert notifications" ON notifications FOR INSERT ...

-- atletas_favoritos: UPDATE (cobertura CRUD completa)
CREATE POLICY "Usuarios actualizan favoritos" ON atletas_favoritos FOR UPDATE ...

-- update_user_role RPC: ampliar roles aceptados
-- Antes: solo 'admin', 'consulta'
-- Después: 'admin', 'consulta', 'trainer', 'athlete', 'club_admin'
```

### 5. Aplicación a producción

```bash
supabase db push --dry-run  # Confirmado: solo 2 migraciones pendientes
supabase db push            # Aplicadas con éxito
```

Resultado: `Finished supabase db push.` sin errores (2 NOTICE de DROP IF EXISTS sin match = esperado).

## Resultados

### Matriz de cobertura RLS final — 14/14 tablas ✅

| Tabla | RLS | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|--------|--------|--------|--------|
| atletas | ✅ | ✅ | ✅ | ✅ | ✅ |
| resultados | ✅ | ✅ | ✅ | ✅ | ✅ |
| atleta_club_hist | ✅ | ✅ | ✅ | ✅ | ✅ |
| categorias | ✅ | ✅ | ✅ | ✅ | ✅ |
| clubes | ✅ | ✅ | ✅ | ✅ | ✅ |
| pruebas | ✅ | ✅ | ✅ | ✅ | ✅ |
| eventos | ✅ | ✅ | ✅ | ✅ | ✅ |
| medidas_corporales | ✅ | ✅ | ✅ | ✅ | ✅ |
| participantes_eventos | ✅ | ✅ | ✅ | ✅ | ✅ |
| calendar_shares | ✅ | ✅ | ✅ | ✅ | ✅ |
| notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| atletas_favoritos | ✅ | ✅ | ✅ | ✅ | ✅ |
| organizations | ✅ | ✅ | ✅ | ✅ | ✅ |
| invitations | ✅ | ✅ | ✅ | ✅ | ✅ |

### RPCs con SECURITY DEFINER auditadas

| RPC | Validación de rol | Estado |
|-----|------------------|--------|
| `share_calendar_by_email` | `auth.uid() != null` | ✅ |
| `accept_calendar_share` | `auth.uid() != null` | ✅ |
| `reject_calendar_share` | `auth.uid() != null` | ✅ |
| `get_all_users` | `app_metadata role = admin` | ✅ |
| `update_user_role` | `app_metadata role = admin` | ✅ (roles ampliados) |
| `approve_user` | `app_metadata role = admin` | ✅ |
| `reject_user` | `app_metadata role = admin` | ✅ |
| `get_pending_users` | `app_metadata role = admin` | ✅ |

## Estado Final

```
supabase db push    → ✅ Aplicadas 2 migraciones
supabase migration list → ✅ Todo sincronizado (Local = Remote para todas las migraciones activas)
npm run build       → ✅ (verificado por Stop hook)
```

## Próximos Pasos

- [ ] **Semana 4** — Refactorización de componentes grandes con `/split-component`
  - `AddResultDialog.jsx` (~650 líneas)
  - `AthleteResultsChart.jsx` (~500 líneas)
  - `RankingDialog.jsx` (~400 líneas)
  - `AthleteSpiderChart.jsx` (~380 líneas)

## Notas Técnicas

**Por qué `supabase db push` falló inicialmente:**
El CLI detectó migraciones en remoto que no existían localmente (aplicadas vía dashboard de Supabase con IDs diferentes). El CLI rechaza el push para evitar conflictos. Solución: `migration repair` para sincronizar los metadatos de historial sin tocar el esquema real.

**Por qué `gen_random_bytes` no estaba disponible:**
La función pertenece a la extensión `pgcrypto`. Aunque Supabase la incluye por defecto, este proyecto no la tenía habilitada. Reemplazado con `replace(gen_random_uuid()::text, '-', '')` que produce un token de 32 caracteres hexadecimales usando la función UUID nativa de PostgreSQL.

**Política `notifications` INSERT:**
Intencionalmente sin política de usuario regular (solo admin). Los RPCs SECURITY DEFINER (`share_calendar_by_email`, `accept_calendar_share`) son los únicos puntos de entrada para crear notificaciones de usuario — esto es correcto por diseño para evitar spam de notificaciones.

**Multitenancy `organization_id`:**
Las tablas de datos deportivos (atletas, resultados, etc.) no tienen aislamiento por `organization_id` — son datos públicos dentro del sistema, accesibles a todos los usuarios autenticados. El aislamiento multitenancy aplica solo a `organizations` e `invitations`. Esta decisión de diseño es intencional para el caso de uso (sistema de rankings compartidos).
