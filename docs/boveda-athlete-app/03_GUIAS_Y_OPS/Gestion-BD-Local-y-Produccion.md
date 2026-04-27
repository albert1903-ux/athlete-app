---
title: "Gestión de BD Local y Producción"
description: "Mapa de bases de datos del proyecto, qué sincroniza con producción y cómo evitar errores críticos."
tags: [base-de-datos, supabase, docker, migraciones, produccion, seguridad]
---

# 🗄️ Gestión de Bases de Datos: Local y Producción

> ⚠️ **Leer antes de ejecutar cualquier migración o sync.** Un error aquí afecta a datos reales de usuarios en producción.

---

## Mapa de Bases de Datos

Hay **dos contenedores PostgreSQL locales** corriendo simultáneamente:

### 1. `supabase_db_athlete-app` — Puerto 54322 ⭐

```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Esta es la BD de staging/TEST desde donde se sincroniza hacia producción.** Es el stack completo de Supabase local (con Auth, Storage, Studio, etc.). En estado normal tiene solo ~4.588 resultados (TEST), **no es un espejo de producción**. Se convierte en espejo solo después de ejecutar `import_from_supabase.py`.

**Contiene dos tipos de tablas mezcladas:**

| Tabla | Estado | Sincroniza con producción |
|---|---|---|
| `atletas` | ✅ Estable | ✅ Sí |
| `clubes` | ✅ Estable | ✅ Sí |
| `categorias` | ✅ Estable | ✅ Sí |
| `pruebas` | ✅ Estable | ✅ Sí |
| `resultados` | ✅ Estable | ✅ Sí |
| `atleta_club_hist` | ✅ Estable | ✅ Sí |
| `medidas_corporales` | ✅ Estable | ✅ Sí |
| `eventos` | ✅ Estable | ✅ Sí |
| `participantes_eventos` | ✅ Estable | ✅ Sí |
| `atletas_favoritos` | ✅ Estable | ✅ Sí |
| `calendar_shares` | ✅ Estable | ✅ Sí |
| `notifications` | ✅ Estable | ✅ Sí |
| `group_athletes` | 🚧 En desarrollo | ❌ NO todavía |
| `invitations` | 🚧 En desarrollo | ❌ NO todavía |
| `organizations` | 🚧 En desarrollo | ❌ NO todavía |
| `trainer_groups` | 🚧 En desarrollo | ❌ NO todavía |

### 2. `athlete-app-db` — Puerto 5432

```
postgresql://postgres:postgres@127.0.0.1:5432/athlete_db
```

BD de otro proyecto / pruebas aisladas. **No tiene relación con el sync a producción.** Actualmente vacía.

---

## Producción (Supabase Cloud)

- **Proyecto:** `athlete-app`
- **Ref:** `doibexyiiayjiijxziqm`
- **Región:** EU West (Irlanda)
- **Dashboard:** https://supabase.com/dashboard/project/doibexyiiayjiijxziqm
- **API URL:** `https://doibexyiiayjiijxziqm.supabase.co`

> ⚠️ El host directo de la BD (`db.doibexyiiayjiijxziqm.supabase.co`) **no resuelve DNS** desde la red local. Usar siempre la Management API o el CLI como intermediario.

---

## Scripts de Sincronización

### `sync_to_supabase.py` — Subir datos a producción

```bash
python3 scripts/sync_to_supabase.py
python3 scripts/sync_to_supabase.py --year 2025  # Solo un año
```

✅ **Seguro:** tiene una `TABLES_ORDER` explícita con solo las tablas estables. Las tablas en desarrollo nunca se subirán con este script.

### `import_from_supabase.py` — Bajar datos de producción a local

```bash
python3 scripts/import_from_supabase.py
```

Descarga desde Supabase a la BD local (puerto 54322). Útil para sincronizar local con el estado de producción.

---

## Gestión de Migraciones — Reglas Críticas

### ✅ Flujo correcto antes de hacer `db push`

```bash
# 1. Ver exactamente qué cambios se aplicarían
supabase db diff --linked

# 2. Revisar si alguna migración incluye tablas en desarrollo
# (group_athletes, invitations, organizations, trainer_groups)

# 3. Solo si todo está claro, hacer push
supabase db push
```

### ❌ Nunca hacer

```bash
# PELIGROSO: aplica todas las migraciones pendientes sin revisión
supabase db push

# PELIGROSO: resetea y reaaplica todo desde cero en producción
supabase db reset --linked
```

### 🚧 Migraciones de tablas en desarrollo

Las migraciones para `group_athletes`, `invitations`, `organizations`, `trainer_groups` **deben vivir en una rama Git separada** hasta estar listas para producción. Nunca en `main` mientras no estén aprobadas.

---

## Backups

Los backups se generan automáticamente al ejecutar `sync_to_supabase.py` o `import_from_supabase.py`:

```
backups/pg_backup_YYYYMMDD_HHMMSS.sql
```

**Backup de referencia verificado:** `backups/pg_backup_20260328_193553.sql` (28 marzo, 11 MB, estado limpio)

> 💡 Crear un backup manual antes de cualquier operación de riesgo:
> ```bash
> docker exec supabase_db_athlete-app pg_dump -U postgres -d postgres --clean > backups/pg_backup_MANUAL_$(date +%Y%m%d_%H%M%S).sql
> ```

---

## Proceso de Restauración de Emergencia

Si se sube algo incorrecto a producción, usar el script:

```bash
python3 scripts/restore_via_management_api.py
```

Este script (creado tras el incidente del 25 Abr 2026):
- Obtiene el token automáticamente del Keychain de macOS
- No necesita `psql` ni contraseña de la BD
- Extrae los datos del backup y los sube tabla por tabla
- Trunca antes de insertar para limpiar datos incorrectos

Ver detalles completos en [[2026-04-25-Incidente-BD-Produccion-Restauracion]].

---

## Checklist de Seguridad para Agentes y Desarrolladores

Antes de cualquier operación sobre la BD, responde estas preguntas:

- [ ] ¿He ejecutado `supabase db diff --linked` para ver qué cambia exactamente?
- [ ] ¿Las migraciones pendientes incluyen solo tablas de producción estables?
- [ ] ¿He creado un backup manual previo?
- [ ] ¿Estoy usando `SUPABASE_SERVICE_KEY` (y no la anon key) en los scripts ETL?
- [ ] Si el script falla, ¿sé desde qué backup restaurar?
