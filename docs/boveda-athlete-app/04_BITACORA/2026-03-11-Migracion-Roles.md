---
title: "Bitácora: Migración de user_metadata a app_metadata"
date: 2026-03-11
description: "Resolución de problemas de seguridad RLS detectados por el Linter de Supabase"
tags: [auth, supabase, rls, seguridad, refactor]
---

# 📝 2026-03-11 - Migración de Roles a `app_metadata`

## 🎯 Objetivo
Hacer frente a la advertencia de seguridad crítica proveniente del linter de la base de datos de Supabase: `rls_references_user_metadata`. Las políticas RLS de todas las tablas estaban validando a los administradores leyendo el rol desde los metadatos de usuario (`user_metadata`), que es inyectable desde el cliente web.

## 🛠️ Acciones Realizadas
1. **Auditoría de Políticas y RPCs:**
   Se consultó a la BBDD de producción (`athlete-app`) y se descubrieron 18 RLS policies que utilizaban `user_metadata->'role' = 'admin'`. Además, funciones clave (RPCs) como `update_user_role`, `approve_user`, `reject_user`, `get_all_users` y `get_pending_users` también estaban vulnerables.

2. **Creación del Plan de Migración y SQL:**
   Se generó y testeó el script en `supabase/migrations/20260311000000_migrate_roles_to_app_metadata.sql`.
   Este script implementa un bucle `DO` para extraer los pares clave-valor `role` y `status` de todos los usuarios actuales presentes en `raw_user_meta_data`, reasignándolos con total seguridad a la columna `raw_app_meta_data`, que es inmutable desde el cliente API. Finalmente, la migración reconstruye las 18 políticas para hacer el check utilizando `app_metadata`.

3. **Correcciones del Cliente React:**
   Se reescribió la lógica del estado global en `AuthContext.jsx` para instanciar las variables de sesión del `currentUser` a partir de `currentUser.app_metadata`. Las vistas administrativas de `RoleManagementDialog` y `AdminApprovalDialog` también fueron parcheadas adecuadamente.

4. **Despliegue y Resolución de Conflictos SQL:**
   Al aplicar la migración en Producción (`supabase migration up`) nos encontramos con el error `42P13: cannot change return type of existing function` en `get_all_users`. Se resolvió usando la inyección `DROP FUNCTION IF EXISTS...` antes del `CREATE OR REPLACE`.

## 🧠 Aprendizajes (Lessons Learned)
* **Principio de Mínimo Privilegio (Supabase):** 
  En Supabase / GoTrue, `user_metadata` = editable por el propietario (útil para perfiles, nombres, avatares), mientras que `app_metadata` = de solo escritura para el servidor (ideal para Claims, roles y subscripciones). Nunca usar el metadata del usuario en el payload JWT como factor autorizativo en RLS.

## 🔗 Enlaces Relacionados
- [[Roles-Permisos]]
- [[Autenticacion]]
