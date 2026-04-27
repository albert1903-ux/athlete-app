---
title: "2026-04-24: Entorno local Docker, corrección seed y bugs en RPCs"
date: "2026-04-24"
tags: [bitácora, supabase, base-de-datos, infraestructura, docker, seed, rpc, bug]
---

# Bitácora: 24 de Abril 2026 — Entorno Local Docker, Seed y RPCs

## Objetivo

Poner en marcha el entorno de pruebas local (Supabase Docker), corregir la configuración de usuarios de test, y resolver los bugs que impedían buscar atletas en la app.

---

## Acciones Ejecutadas

### 1. Actualización del README.md

- Eliminada información duplicada (scripts repetidos en dos secciones)
- Añadida sección completa **"Base de Datos Local con Docker"** con instrucciones paso a paso
- Scripts reorganizados en tabla
- Referencias a archivos de documentación adicionales
- **Archivos afectados:** `README.md`, `docker-compose.yml` (nuevo)

### 2. Verificación de contenedores Docker locales

- Identificado el stack completo de Supabase local ya corriendo en Docker:
  - `supabase_db_athlete-app` — PostgreSQL en puerto `54322`
  - `supabase_kong_athlete-app` — API Gateway en puerto `54321`
  - `supabase_studio_athlete-app` — Studio en puerto `54323`
- Verificados los 5 usuarios de test con contraseña `test`
- Creado `TEST_USERS.md` como referencia rápida (archivo ignorado por git)

### 3. Bug: Mi Organización > Miembros no mostraba usuarios

**Causa raíz (dos partes):**

a) El `seed.sql` usaba `ON CONFLICT (id) DO NOTHING`, por lo que actualizaciones posteriores al seed inicial (añadir `organization_id` al entrenador) no se aplicaban a la BD local. Resultado: entrenador, atleta y consulta tenían `organization_id = null` en `raw_app_meta_data`.

b) El RPC `get_organization_members()` filtra con `WHERE org_id = caller_org_id` donde `caller_org_id` viene del JWT. Si el JWT no lleva `organization_id` (sesión antigua), la cláusula `= null` nunca coincide → lista vacía.

**Fixes aplicados:**
- `supabase/seed.sql`: añadido `organization_id` a `user-atleta` y `user-consulta`
- `supabase/seed.sql`: `ON CONFLICT (id) DO NOTHING` → `DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data`
- UPDATE directo en BD local para los 3 usuarios afectados (entrenador, atleta, consulta)
- **Archivos afectados:** `supabase/seed.sql`

### 4. Atleta de prueba vinculado a CA Fondistas Barcelona

El atleta de seed (`atleta_id = 99999`, "Atleta Test") estaba vinculado al club test genérico (`club_id = 9999`) en lugar de al club real de pruebas (CA Fondistas Barcelona, `club_id = 2`).

**Fix:**
- UPDATE en `public.resultados` cambiando `club_id` de 9999 → 2
- `supabase/seed.sql` corregido para usar `club_id = 2` desde el inicio
- **Archivos afectados:** `supabase/seed.sql`, BD local

### 5. Atleta añadido al grupo SUB12

El grupo "Grupo Test" del seed había sido eliminado. Se añadió `atleta_id = 99999` al grupo "SUB12" (creado durante pruebas) directamente vía INSERT en `public.group_athletes`.

### 6. Bug crítico: RPCs `get_club_athletes` y `get_trainer_athletes` fallaban en silencio

**Síntoma:** "Seleccionar Atleta" mostraba "No hay atletas asignados" aunque los datos eran correctos. El hook `useScopedAthletes` tragaba el error haciendo `data || []`.

**Causa raíz:** Error PostgreSQL `42P10`:
```
for SELECT DISTINCT, ORDER BY expressions must appear in select list
```

Ambas funciones tenían:
```sql
SELECT DISTINCT a.nombre::TEXT ...
ORDER BY a.nombre;   -- ❌ a.nombre ≠ a.nombre::TEXT en contexto DISTINCT
```

PostgreSQL trata `a.nombre` (VARCHAR) y `a.nombre::TEXT` (TEXT explícito) como expresiones distintas cuando hay `SELECT DISTINCT`. El error se producía silenciosamente: el hook recibía `data = null` y establecía `scopedAthletes = []`.

**Fix:** `ORDER BY a.nombre::TEXT` en ambas funciones.
- **Archivos afectados:** `supabase/migrations/20260330300000_phase4_group_rpcs.sql`, `supabase/migrations/20260330400000_phase5_trainer_athletes_rpc.sql`, BD local (funciones recreadas)

### 7. CLAUDE.md creado con regla de idioma

Creado `CLAUDE.md` en la raíz del proyecto con la regla: los documentos de plan generados deben escribirse siempre en castellano.

---

## Resultados

| Métrica | Valor |
|---------|-------|
| Tests pasando | 165 / 165 |
| Archivos de test | 24 |
| Build status | ✅ |
| Usuarios de test corregidos | 3 (entrenador, atleta, consulta) |
| RPCs corregidas | 2 (get_club_athletes, get_trainer_athletes) |
| Bugs resueltos | 3 |

## Estado Final

```
npm test   → ✅ 165/165
BD local   → ✅ Supabase stack corriendo en Docker
Seed       → ✅ ON CONFLICT DO UPDATE, organization_id completo
RPCs       → ✅ ORDER BY corregido en get_club_athletes y get_trainer_athletes
```

## Próximos Pasos

- [ ] Verificar que `user-entrenador` puede ver sus atletas en "Seleccionar Atleta" (después de re-login)
- [ ] Comprobar que Mi Organización > Grupos muestra correctamente el atleta en SUB12 para user-club
- [ ] Revisar si hay otros RPCs con el mismo patrón `SELECT DISTINCT ... ORDER BY` sin `::TEXT`
- [ ] Considerar añadir manejo de errores explícito en `useScopedAthletes` para no tragar errores silenciosamente

## Notas Técnicas

**Trampas del entorno local con Supabase Docker:**
- El contenedor activo es `supabase_db_athlete-app` (puerto 54322), distinto del `athlete-app-db` de PostgreSQL básico que se creó al principio de la sesión (puerto 5432). Ambos coexisten; el relevante para la app es el de Supabase.
- El JWT de GoTrue en local usa ES256 con clave ECDSA (no HS256). Las sesiones no se actualizan automáticamente cuando cambia `raw_app_meta_data` — es necesario logout/login para obtener un token fresco.

**Patrón `ON CONFLICT DO UPDATE` en seeds:**
Usar `DO NOTHING` en seeds de desarrollo es una trampa: cualquier cambio posterior al seed no se propaga al entorno local sin borrar y recrear los registros. `DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data` es más seguro para campos de metadatos que evolucionan.

**Bug PostgreSQL `42P10` y hooks silenciosos:**
El patrón `.then(({ data }) => setScopedAthletes(data || []))` sin manejar `error` provoca que los fallos del RPC sean invisibles para el usuario (lista vacía en lugar de mensaje de error). Pendiente añadir logging o propagación del error.
