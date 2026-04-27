---
title: "Post-Mortem: Restauración de BD Producción (25 Abr 2026)"
description: "Incidente crítico: migraciones incorrectas subidas a producción. Proceso de restauración desde backup."
tags: [incidente, base-de-datos, supabase, migraciones, produccion, post-mortem]
---

# 🚨 Post-Mortem: Restauración de BD Producción

**Fecha:** 25 de Abril de 2026  
**Severidad:** Crítica  
**Duración del incidente:** ~3 horas (detección → restauración completa)  
**Estado:** ✅ Resuelto

---

## ¿Qué ocurrió?

Se subieron a producción migraciones SQL incorrectas desde el entorno local. La BD de Supabase local (`supabase_db_athlete-app`, puerto 54322) contenía tablas en desarrollo que aún **no estaban listas para producción** (`group_athletes`, `invitations`, `organizations`, `trainer_groups`). Al ejecutar `supabase db push`, estas migraciones llegaron al proyecto de producción `doibexyiiayjiijxziqm`.

## Causa Raíz

La BD local de Supabase actúa como **entorno de staging y de desarrollo simultáneamente**. Hay tablas de producción estable mezcladas con tablas de funcionalidades en desarrollo. Al no haber separación clara, un `db push` sin revisión previa arrastra todo.

```
supabase_db_athlete-app (puerto 54322)
├── ✅ Tablas en producción: atletas, resultados, clubes...
└── 🚧 Tablas en desarrollo: group_athletes, invitations, organizations, trainer_groups
```

**Lo que NO causó el error:**
- `sync_to_supabase.py` → tiene lista explícita de tablas, no es el responsable
- Datos de resultados deportivos → no se corrompieron

**Lo que SÍ causó el error:**
- Ejecución de `supabase db push` o equivalente sin revisar las migraciones pendientes

---

## Proceso de Restauración

### Backup restaurado
`backups/pg_backup_20260328_193553.sql` — 28 de marzo de 2026, 11 MB

### Por qué no funcionaron las opciones habituales

| Método intentado | Resultado | Motivo |
|---|---|---|
| `psql` directo | ❌ DNS no resuelve | `db.xxx.supabase.co` no accesible desde esta red |
| Pooler (`aws-0-eu-west-1.pooler.supabase.com`) | ❌ Tenant not found | Requiere contraseña no disponible localmente |
| SQL Editor del Dashboard | ❌ Query too large | Límite de tamaño (~2MB), backup de 11MB |
| `pg_restore` | ❌ Formato incorrecto | El backup es texto plano, no custom format |
| `supabase db pull/push` | ⚠️ Parcial | Solo gestiona schema, no datos |

### Solución final

Script Python `scripts/restore_via_management_api.py` que:
1. Obtiene el token del CLI de Supabase desde macOS Keychain
2. Extrae bloques `COPY public.tablename FROM stdin` del backup
3. Los convierte a `INSERT INTO ... ON CONFLICT DO NOTHING`
4. Los envía en batches de 200 filas a `api.supabase.com/v1/projects/{ref}/database/query`
5. Respeta el orden de claves foráneas (FK)

```bash
python3 scripts/restore_via_management_api.py
```

### Tablas restauradas
`categorias` → `clubes` → `atletas` → `pruebas` → `atleta_club_hist` → `medidas_corporales` → `resultados` → `eventos` → `participantes_eventos` → `atletas_favoritos` → `calendar_shares` → `notifications`

---

## Lecciones Aprendidas

1. **Nunca ejecutar `supabase db push` sin revisar primero** con `supabase db diff --linked`
2. **El backup del 28 de marzo era el correcto** — los backups diarios son esenciales
3. **La contraseña de la BD de producción no está guardada localmente** — obtenerla desde el Dashboard cada vez es un fricción que retrasa la recuperación
4. **El DNS del host directo (`db.xxx.supabase.co`) no es accesible** desde esta red — usar siempre la Management API o el CLI como intermediario

---

## Acciones Tomadas Post-Incidente

- [x] BD producción restaurada al estado del 28 de marzo
- [x] Documentada la arquitectura de BDs locales → ver [[Gestion-BD-Local-y-Produccion]]
- [x] Documentado proceso de restauración → ver [[Gestion-BD-Local-y-Produccion]]
- [ ] Pendiente: Separar migraciones de desarrollo de las de producción en ramas Git distintas
