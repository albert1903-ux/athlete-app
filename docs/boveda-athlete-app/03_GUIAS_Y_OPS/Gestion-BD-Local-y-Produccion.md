---
title: "Gestión de BD Local y Producción"
description: "Mapa de bases de datos del proyecto, qué sincroniza con producción y cómo evitar errores críticos."
tags: [base-de-datos, supabase, docker, migraciones, produccion, seguridad]
---

# 🗄️ Gestión de Bases de Datos: Local y Producción

> ⚠️ **Leer antes de ejecutar cualquier migración o sync.** Un error aquí afecta a datos reales de usuarios en producción.

---

## Mapa de Bases de Datos (actualizado 2026-04-28)

Hay **dos stacks Supabase locales** corriendo en Docker, físicamente separados con nombres autodescriptivos:

### 1. `supabase_db_athlete-test` — Puerto 54322 🧪 (TEST)

```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

BD de **desarrollo del frontend**, con datos inventados (~2.745 atletas, ~4.605 resultados, 132 clubes, usuarios test). Conecta el `npm run dev` y permite probar features sin tocar nada real.

- Marker en BD: `_meta_environment.environment = 'test'`.
- **NUNCA usar como origen de `sync_to_supabase.py`**. Si se intenta, los scripts ETL abortan automáticamente leyendo el marker.
- **NUNCA usar como destino de `import_from_supabase.py`**. Si se intenta, los scripts abortan también.
- Stack completo: kong (54321), studio (54323), inbucket (54324), analytics (54327).

### 2. `supabase_db_athlete-prod-mirror` — Puerto 54422 🪞 (PROD MIRROR)

```
postgresql://postgres:postgres@127.0.0.1:54422/postgres
```

**Espejo de producción.** Hidratado desde `pg_dump_produccion_*.sql` y mantenido en línea con `import_from_supabase.py`. Datos reales (~15.569 atletas, ~175.048 resultados, 511 clubes).

- Marker en BD: `_meta_environment.environment = 'prod-mirror'`.
- **Único origen permitido** para `sync_to_supabase.py`.
- **Único destino permitido** para `import_from_supabase.py`.
- `DATABASE_URL` por defecto en `bbdd-athlete-app/.env` apunta aquí.
- Stack completo: kong (54421), studio (54423), inbucket (54424), analytics (54427).

### Defensas activas anti-incidente

Tras el incidente del 25-Abr-2026 (3 ocurrencias previas de subir TEST a prod), se añadieron 5 capas de defensa:

1. **Marker `_meta_environment` en cada BD**: los scripts ETL leen `value` antes de cualquier escritura. Si no coincide con el esperado, abortan con `sys.exit(2)`.
2. **`DATABASE_URL` por defecto en código** apunta a 54422 (mirror), no a 54322 (test). El `.env` lo refuerza.
3. **Confirmación interactiva en `sync_to_supabase.py`**: muestra origen y destino y exige escribir literal `subir-a-produccion` antes de continuar.
4. **Backup defensivo arreglado**: `backup_local_db()` apunta al container correcto (`supabase_db_athlete-prod-mirror`), no al container inexistente que tenía antes (fallo silencioso histórico).
5. **Solo `athlete-app/supabase/` está linked a prod**: `bbdd-athlete-app/supabase/` no tiene `.temp/project-ref`, así que `supabase db push` desde el directorio del mirror falla con "Cannot find project ref". Para mantener migraciones sincronizadas entre los dos workdirs, `bbdd-athlete-app/supabase/migrations/` es un symlink absoluto a `athlete-app/supabase/migrations/` — imposible que diverjan.

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
