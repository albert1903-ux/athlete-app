---
title: "API Endpoints & RPC"
description: "Comunicación base de datos y scripts RPC de Supabase para manipulación bulk."
tags: [api, rpc, persistencia, endpoints]
---

# 🔌 Módulo: API y Persistencia de Datos (RPC)

Dado que es una Single Page Application (SPA), desaparece la necesidad de tener APIs REST masivas tradicionales. El sistema interactúa directamente con **Supabase PostgREST** a través del cliente tipado autogenerado de lado cliente (`@supabase/supabase-js`).

## Funciones Almacenadas en Servidor (RPC)
Cuando la manipulación del lado del cliente requiere escalar permisos u operar datos masivos ignorando ciertas barreras de latencia, se han creado funciones SQL explícitas en `bbdd-athlete-app/migrations`:

- **Aprobación y Gestión de Roles:** Ej. la migración de `admin_approve_user`. Funciona sobrepasando el contexto habitual para setear la propiedad a un usuario externo.
- **Triggers Auto-computacionales:** Ej. `calculate_imc()`. El frontend no envía el IMC y no calcula matemáticas dependientes del cliente. La DB se suscribe a su propio update y lo regenera in-situ en `medidas_corporales`.

## Arquitectura de Sincronización
La actualización de la base de datos corre a cargo de scripts locales en Python (ver `bbdd-athlete-app/.venv` y `test_conn.py`) que funcionan como un **Data Ingestion API**:
- Se cargan y sanitizan grandes ficheros CSV/JSON con las marcas y atletas (`bbdd-athlete-app/data_dump.sql`, `Ranking Outliers.md`, etc.).
- Las actualizaciones fluyen de forma asíncrona hacia Producción eludiendo políticas RLS agresivas asumiendo control absoluto (vía `service_role_key`).
