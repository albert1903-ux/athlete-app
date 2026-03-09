---
title: "Estructura de Datos"
description: "Modelado relacional y esquema oficial de PostgreSQL exportado."
tags: [esquema, base-de-datos, supabase, postgres]
---

# 🗄️ Estructura de Datos (Esquema PostgreSQL)

El sistema opera sobre PostgreSQL alojado en Supabase, definido a través de migraciones (ej. `20260221000000_init_schema.sql`). La base de datos es fuertemente tipada y con *Triggers* para cálculos automáticos.

## Entidades Principales

### 1. `atletas`
Corazón del sistema. Cada atleta tiene características inmutables base.
- `atleta_id` (PK)
- `nombre` (VARCHAR)
- `fecha_nac` (DATE)
- `licencia` (VARCHAR)

### 2. `resultados`
Registros históricos de todas las marcas en competiciones aprobadas.
- `resultado_id` (PK)
- `atleta_id` (FK a `atletas`)
- `prueba_id` (FK a `pruebas` - IMPORTANTE: Diferencia entre 60 mvallas 0.50 y estándar)
- `club_id` (FK a `clubes`)
- `marca_valor` (NUMERIC), `marca_texto` (VARCHAR)
- `unidad` (VARCHAR), `superficie` (VARCHAR)

### 3. `medidas_corporales`
Seguimiento temporal evolutivo físico.
- `medida_id` (PK)
- `atleta_id` (FK)
- `peso` (NUMERIC), `altura` (NUMERIC), `envergadura` (NUMERIC)
- **`imc`**: Calculado automáticamente por un **Trigger** PostgreSQL `calculate_imc()` al insertar peso y altura.

### 4. `pruebas` y `eventos`
Diccionarios transaccionales para enrutado de campeonatos y estandarización.
- `pruebas`: `nombre` único, `tipo_marca` (tiempo/distancia).
- `eventos`: `fecha`, `ubicacion` y `user_id` para control RLS.

## Seguridad RLS y Permisos (Row Level Security)
Las tablas (como `medidas_corporales` o `eventos`) manejan RLS estricto basado en `user_id`:
```sql
CREATE POLICY "medidas_insert_own" ON "public"."medidas_corporales" 
FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);
```
