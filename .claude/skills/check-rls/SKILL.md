---
name: check-rls
description: "Audita las políticas RLS (Row-Level Security) de todas las tablas Supabase del proyecto athlete-app. Verifica cobertura por rol (admin, consulta, trainer, athlete, club_admin) y operación (SELECT, INSERT, UPDATE, DELETE). Triggers: check rls, audit rls, verificar seguridad, revisar políticas, RLS check, seguridad base de datos."
---

# check-rls — Auditor de RLS para athlete-app

Analiza todos los ficheros de migración Supabase y produce un informe de cobertura de seguridad.

## Contexto del proyecto

**Roles existentes:** `admin`, `consulta`, `trainer`, `athlete`, `club_admin`
**Fuente de roles:** `auth.jwt() -> 'app_metadata' ->> 'role'` (migrado en 20260311)
**Tablas críticas:** atletas, clubes, pruebas, categorias, resultados, medidas_corporales, atleta_club_hist, eventos, participantes_eventos, calendar_shares, notifications, atletas_favoritos, organizations, invitations

## Workflow

### Paso 1 — Leer todas las migraciones

Lee todos los ficheros en `supabase/migrations/` en orden cronológico:
```
supabase/migrations/20260301*.sql
supabase/migrations/20260306*.sql
supabase/migrations/20260307*.sql
supabase/migrations/20260311*.sql
```

### Paso 2 — Construir la matriz de cobertura

Para cada tabla, extrae:
- Si RLS está habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Qué políticas existen por operación (SELECT/INSERT/UPDATE/DELETE)
- A qué roles aplica cada política
- Si usa `auth.uid()` o `app_metadata` correctamente

### Paso 3 — Detectar gaps

Gaps críticos a identificar:
1. **Tabla sin RLS habilitado** — cualquier usuario puede leer/escribir
2. **Tabla con RLS pero sin política SELECT** — nadie puede leer (bloqueo total)
3. **Tabla sin política para operaciones de escritura** — gap de protección
4. **Política que usa `user_metadata`** en lugar de `app_metadata` — vulnerable (usuario puede modificar su propio rol)
5. **Tablas SaaS sin aislamiento por `organization_id`** — datos de un tenant visibles por otro

### Paso 4 — Generar informe

Formato del informe:

```
## Informe RLS — athlete-app
Fecha: [fecha]
Migraciones analizadas: [N]

### Matriz de cobertura

| Tabla              | RLS | SELECT | INSERT | UPDATE | DELETE | Roles cubiertos     | Estado  |
|--------------------|-----|--------|--------|--------|--------|---------------------|---------|
| atletas            | ✅  | ✅     | ✅     | ✅     | ✅     | admin, consulta     | OK      |
| resultados         | ✅  | ✅     | ✅     | ✅     | ✅     | admin               | OK      |
| organizations      | ✅  | ✅     | ❌     | ❌     | ❌     | admin               | ⚠️ GAPS |
| invitations        | ✅  | ✅     | ⚠️     | ❌     | ❌     | club_admin          | ⚠️ GAPS |

### Gaps críticos
[lista numerada de cada gap con tabla, operación afectada y riesgo]

### Gaps de multitenancy
[tablas que deberían filtrar por organization_id pero no lo hacen]

### Recomendaciones
[SQL de las políticas faltantes, listas para ejecutar como nueva migración]
```

### Paso 5 — Generar la migración correctiva

Si hay gaps, crear un fichero de migración con timestamp actual:
`supabase/migrations/YYYYMMDDHHMMSS_fix_rls_gaps.sql`

Con políticas siguiendo el patrón del proyecto:
```sql
-- Ejemplo: añadir política INSERT para organizations
CREATE POLICY "club_admin puede crear recursos en su org"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'club_admin')
  AND id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
);
```

## Patrones de política válidos para este proyecto

**Solo admin puede modificar:**
```sql
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
```

**El usuario ve solo sus datos:**
```sql
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid())
```

**Aislamiento por organización:**
```sql
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
```

**Acceso de lectura para roles autorizados:**
```sql
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'consulta', 'trainer'))
```

## Señales de alerta inmediata

- `user_metadata` en lugar de `app_metadata` → CRÍTICO (el usuario controla sus propios roles)
- Tabla sin `ALTER TABLE x ENABLE ROW LEVEL SECURITY` → CRÍTICO
- RPC con `SECURITY DEFINER` sin validación de rol en el cuerpo → CRÍTICO
- Política `USING (true)` sin condición → revisar si es intencional
