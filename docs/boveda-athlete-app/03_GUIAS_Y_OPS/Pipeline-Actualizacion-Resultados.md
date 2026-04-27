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

## Flujo Completo (Paso a Paso)

```
[Producción: 178.548 resultados]
         │
         ▼
  1. import_from_supabase ──→ [Local: se llena hasta ~178.548]
         │
         ▼
  2. Importar CSV preview ──→ [Local: nuevos IDs desde 178.549+]
         │
         ▼
  3. sync_to_supabase ──────→ [Producción: 178.548 + nuevos]
```

---

## Comandos

### Opción A: Todo automático (recomendado)

```bash
cd /Users/albert/Documents/bbdd-athlete-app
source .venv/bin/activate

python3 scripts/main.py 2026-04 --import-csv preview_2026-04.csv
```

`main.py` ejecuta automáticamente en este orden:
1. Backup de la BD local
2. `import_from_supabase.py` → sincroniza producción → local
3. `DBManager.update()` → importa CSV a local
4. `sync_to_supabase.py` → sube cambios a producción

### Opción B: Manual paso a paso (para mayor control)

```bash
cd /Users/albert/Documents/bbdd-athlete-app
source .venv/bin/activate

# Paso 1: Sincronizar producción → local (OBLIGATORIO PRIMERO)
python3 scripts/import_from_supabase.py

# Verificar que local tiene el volumen correcto antes de continuar:
# docker exec supabase_db_athlete-app psql -U postgres -d postgres \
#   -c "SELECT COUNT(*) FROM resultados;"
# Debe ser ~178.000+, no 4.588

# Paso 2: Importar CSV a local
python3 scripts/main.py 2026-04 --import-csv preview_2026-04.csv --skip-sync

# Paso 3: Sincronizar local → producción (solo año actual)
python3 scripts/sync_to_supabase.py --year 2026
```

---

## Reglas de Oro

| Regla | Motivo |
|---|---|
| ✅ Siempre ejecutar `import_from_supabase.py` antes de importar un CSV | Evita colisión de IDs |
| ✅ Usar `--year YYYY` en sync cuando sea posible | Más rápido y menos riesgo |
| ❌ Nunca ejecutar `sync_to_supabase.py` directamente con la BD en estado TEST | Sobreescribirá datos de producción con IDs incorrectos |
| ❌ Nunca truncar la BD local antes de bajar producción | Necesitas el estado de producción como base |
| ✅ Revisar el CSV antes de importar | El CSV puede tener duplicados (mismo atleta, misma marca, misma fecha) |

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
docker exec supabase_db_athlete-app psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM resultados;"

# Ver los últimos IDs insertados (deben ser > 178.548)
docker exec supabase_db_athlete-app psql -U postgres -d postgres \
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
