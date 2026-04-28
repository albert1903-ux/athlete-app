---
title: "Pipeline de Actualización de Resultados a Producción"
description: "Procedimiento paso a paso para importar nuevos CSVs de resultados deportivos a producción de forma segura."
tags: [pipeline, datos, csv, produccion, sync, etl, resultados]
---

# 📊 Pipeline de Actualización de Resultados a Producción

> ⚠️ **Leer completo antes de ejecutar.** Hay un riesgo de colisión de IDs que puede sobreescribir datos reales de producción si se salta el orden.

---

## Contexto: Por qué el orden importa

`DBManager` genera los IDs de nuevos resultados con:
```sql
SELECT COALESCE(MAX(resultado_id), 0) + 1 FROM resultados
```

La BD local de TEST tiene ~4.588 resultados (IDs hasta ~4.588).  
Producción tiene ~178.548 resultados (IDs hasta ~178.548).

**Si se importa el CSV a local antes de sincronizar con producción:**
- Los nuevos registros obtendrán IDs 4.589, 4.590, 4.591...
- Esos IDs **ya existen en producción** con datos de otros atletas
- El UPSERT final **sobreescribirá datos reales de producción**

**La solución:** Siempre bajar producción a local primero, para que el `MAX(resultado_id)` local sea ~178.548 antes de insertar nada nuevo.

---

## Mapa de la infraestructura (post 2026-04-28)

|  | **TEST** 🧪 | **MIRROR** 🪞 |
|---|---|---|
| **Workdir Supabase** | `/Users/albert/Documents/athlete-app/supabase/` | `/Users/albert/Documents/bbdd-athlete-app/supabase/` |
| **`project_id`** | `athlete-test` | `athlete-prod-mirror` |
| **Container Postgres** | `supabase_db_athlete-test` | `supabase_db_athlete-prod-mirror` |
| **Puerto BD** | `54322` | `54422` |
| **Puerto API/Kong** | `54321` | `54421` |
| **Puerto Studio** | `54323` | `54423` |
| **Puerto Inbucket** | `54324` | `54424` |
| **Puerto Analytics** | `54327` | `54427` |
| **Marker `_meta_environment`** | `'test'` | `'prod-mirror'` |
| **Datos** | ~2.745 atletas, ~4.605 resultados (inventados) | espejo de prod (~15k atletas, ~175k resultados) |
| **Linked a producción (`doibexyiiayjiijxziqm`)** | ✅ Sí | ❌ No |
| **Migrations** | `supabase/migrations/` (24 ficheros, canónicas) | symlink → `athlete-app/supabase/migrations/` |
| **`db push` posible** | ✅ Solo desde aquí | ❌ Falla con "Cannot find project ref" |
| **`DATABASE_URL` por defecto en scripts ETL** | ❌ 54322 — los scripts abortan si lo detectan como origen/destino erróneo | ✅ 54422 |
| **Rol** | Desarrollo frontend (`npm run dev`) | Carga masiva ETL + sync a prod |

---

## Flujo Completo (Paso a Paso)

```
[Producción: ~178.548 resultados]
         │
         ▼
  1. import_from_supabase ──→ [MIRROR: se llena hasta ~178.548]
         │
         ▼
  2. Importar CSV preview ──→ [MIRROR: nuevos IDs desde 178.549+]
         │
         ▼
  3. sync_to_supabase ──────→ [Producción: 178.548 + nuevos]
```

> El stack TEST nunca participa en este flujo. Si los scripts detectan TEST como origen o destino vía el marker `_meta_environment`, abortan automáticamente.

---

## Comandos

### Opción A: Todo automático (recomendado)

```bash
cd /Users/albert/Documents/bbdd-athlete-app
source .venv/bin/activate

python3 scripts/main.py 2026-04 --import-csv preview_2026-04.csv
```

`main.py` ejecuta en orden:
1. **Backup** del MIRROR (ahora apunta al container correcto, antes fallaba en silencio).
2. **`import_from_supabase.py`** → baja producción al MIRROR. Aborta si destino tiene `environment='test'`.
3. **`DBManager.update()`** → importa CSV al MIRROR (genera IDs `MAX+1`, sin colisión).
4. **`sync_to_supabase.py`** → sube MIRROR → producción. Aborta si origen no es `'prod-mirror'`. Pide confirmación interactiva escribiendo `subir-a-produccion`.

### Opción B: Manual paso a paso (para mayor control)

```bash
cd /Users/albert/Documents/bbdd-athlete-app
source .venv/bin/activate

# Paso 1: Sincronizar producción → MIRROR (OBLIGATORIO antes del CSV)
python3 scripts/import_from_supabase.py

# Verificar que el MIRROR tiene el volumen correcto antes de continuar:
docker exec supabase_db_athlete-prod-mirror psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM resultados;"
# Esperado: ~178.000+ (no ~4.000 — eso significaría que el script apuntó al TEST por error)

# Paso 2: Importar CSV al MIRROR sin sync automático
python3 scripts/main.py 2026-04 --import-csv preview_2026-04.csv --skip-sync

# Paso 3: Inspeccionar el resultado en Studio del MIRROR (http://127.0.0.1:54423)
#   o vía SQL:
docker exec supabase_db_athlete-prod-mirror psql -U postgres -d postgres \
  -c "SELECT MAX(resultado_id), COUNT(*) FROM resultados WHERE anio = 2026;"

# Paso 4: Sincronizar MIRROR → producción (solo año actual, más rápido)
python3 scripts/sync_to_supabase.py --year 2026
# Pedirá confirmación interactiva: escribir literal `subir-a-produccion`
```

---

## Defensas activas (post-incidente 25-Abr-2026)

Cinco capas garantizan que sea muy difícil repetir el incidente:

1. **Marker `_meta_environment` en cada BD**: los scripts ETL leen `value` antes de cualquier escritura. `sync_to_supabase` exige `'prod-mirror'`; `import_from_supabase` rehúsa si encuentra `'test'`.
2. **`DATABASE_URL` por defecto** en `sync_to_supabase.py:30`, `import_from_supabase.py:32`, `src/db_manager.py:11` y `bbdd-athlete-app/.env` apunta a `54422` (MIRROR), nunca a `54322` (TEST).
3. **Confirmación interactiva** en `sync_to_supabase.py`: muestra origen y destino y exige escribir literal `subir-a-produccion`. Cualquier otra respuesta aborta.
4. **Backup defensivo**: `backup_local_db()` apunta al container correcto. Antes apuntaba a uno inexistente y fallaba en silencio.
5. **Solo `athlete-app/supabase/` está linked a prod**: `bbdd-athlete-app/supabase/` no tiene `.temp/project-ref`, así que `supabase db push` desde el directorio del MIRROR falla con "Cannot find project ref". Migraciones imposibles de divergir gracias al symlink.

---

## Reglas de Oro

| Regla | Motivo |
|---|---|
| ✅ Siempre ejecutar `import_from_supabase.py` antes de importar un CSV | Evita colisión de IDs (necesitas `MAX(resultado_id) ≈ 178k+` en el MIRROR antes de insertar) |
| ✅ Usar `--year YYYY` en sync cuando sea posible | Más rápido y menos volumen de upsert |
| ✅ Usar `--skip-sync` para revisar el MIRROR antes de subir | Permite inspección manual entre import del CSV y sync |
| ✅ Revisar el CSV antes de importar | El CSV puede tener duplicados (mismo atleta + prueba + fecha + marca) |
| ❌ Nunca ejecutar `sync_to_supabase.py` con `DATABASE_URL` apuntando a 54322 | El marker abortará, pero el principio sigue: TEST nunca es origen del sync |
| ❌ Nunca ejecutar `import_from_supabase.py` con destino TEST | El marker abortará, pero igualmente: no debe sobrescribir TEST con datos reales |
| ❌ Nunca truncar el MIRROR sin antes hacer `import_from_supabase` | Necesitas el estado de producción como base para que los IDs nuevos no colisionen |

---

## Gestión de Duplicados

El sistema tiene protección en múltiples capas:

### En el CSV (`preview_YYYY-MM.csv`)
- El CSV puede contener filas repetidas (mismo atleta, misma prueba, misma fecha)
- **No se filtran automáticamente** — revisar manualmente antes de importar

### En `DBManager.insert_result()` (local)
```python
# Comprueba si ya existe: atleta + prueba + fecha + marca
SELECT resultado_id FROM resultados 
WHERE atleta_id = %s AND prueba_id = %s AND fecha = %s 
  AND (marca_valor = %s OR marca_texto = %s)
```
→ Si existe, **no inserta** (skip silencioso)

### En `sync_to_supabase.py` (hacia producción)
```python
supabase.table(table).upsert(batch).execute()
```
→ Si el `resultado_id` ya existe en producción, **actualiza** el registro

### En `import_from_supabase.py` (desde producción)
```sql
INSERT INTO tabla (...) VALUES (...) ON CONFLICT DO NOTHING
```
→ Si el ID ya existe en local, **no modifica** el registro local

---

## Resultados añadidos manualmente desde el Frontend

Cuando un usuario añade un resultado desde la aplicación web, este se crea directamente en producción con un `resultado_id` que puede ser:
- Un UUID (si Supabase lo genera automáticamente) 
- O un ID secuencial si la inserción usa la misma lógica

**El flujo propuesto los preserva** porque:
1. `import_from_supabase.py` baja esos resultados a local primero
2. `sync_to_supabase.py` hace UPSERT (no DELETE), nunca borra registros existentes

---

## Verificación Pre-Sync

Antes del paso 3 (sync a producción), verificar:

```bash
# Contar resultados locales (debe ser ~178.000+, no 4.588)
docker exec supabase_db_athlete-prod-mirror psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM resultados;"

# Ver los últimos IDs insertados (deben ser > 178.548)
docker exec supabase_db_athlete-prod-mirror psql -U postgres -d postgres \
  -c "SELECT MAX(resultado_id), COUNT(*) FROM resultados WHERE anio = 2026;"
```

Si el COUNT es ~4.588, **no continuar** — significa que `import_from_supabase.py` no se ejecutó correctamente.

---

## Estructura del CSV (`preview_YYYY-MM.csv`)

| Columna | Ejemplo | Descripción |
|---|---|---|
| `name` | MARC MARTÍN FERNANDEZ | Nombre completo del atleta |
| `club` | GEiE Gironí | Nombre del club |
| `dob` | 1/11/2013 | Fecha de nacimiento (DD/MM/YYYY) |
| `license` | CL6450 | Número de licencia federativa |
| `category` | SUB14 | Categoría de competición |
| `gender` | MASC | Género (MASC / FEM) |
| `event` | 80m | Nombre de la prueba |
| `environment` | AL | Aire Libre (AL) o Pista Cubierta (PC) |
| `mark` | 11.03 | Marca (valor numérico o texto tipo 1:23.45) |
| `mark_type` | tiempo | Tipo de marca |
| `default_unit` | s | Unidad (s = segundos, m = metros) |
| `date` | 19/04/2026 | Fecha de la competición (DD/MM/YYYY) |
| `season_year` | 2026 | Año de temporada |

---

## Relación con otros documentos

- [[Gestion-BD-Local-y-Produccion]] — Mapa de BDs y reglas de migraciones
- [[Despliegue]] — Flujo general de despliegue semanal
- [[2026-04-25-Incidente-BD-Produccion-Restauracion]] — Incidente y cómo restaurar si algo sale mal
