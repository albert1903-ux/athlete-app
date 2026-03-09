---
title: "Diagramas Mermaid"
description: "Representación visual de los flujos de la aplicación Athlete App."
tags: [arquitectura, diagrama, mermaid, flujos]
---

# 📊 Diagramas de Arquitectura (Mermaid)

### 1. Flujo de Sincronización de Base de Datos (Data Pipeline Semanal)

Este sistema evita inyectar datos corruptos (fallos en parseo, missing decimals) en el Supabase de Producción pasando antes por un Validador y DB Local.

```mermaid
sequenceDiagram
    participant PDF as Resultados CSV/PDF
    participant ETL as Script ETL Python (Local)
    participant LocalDB as DB_Local (Supabase Local)
    participant ProdDB as Supabase (Producción)
    
    PDF->>ETL: Ingestar Marcas Semanales
    ETL->>LocalDB: Inserción inicial
    Note over ETL,LocalDB: Filtrado Outliers & Cleaning
    ETL-->>ETL: Run test_conn.py / club_cleaning
    LocalDB->>ProdDB: Volcado Semanal Seguro (Via Service Key)
```

### 2. Flujo de Aprobación de Registro Manual

```mermaid
graph TD
    User([Usuario Signup]) -->|Crea cuenta| Auth(Supabase Auth)
    Auth -->|Trigger / RPC| Pendiente(Tabla profiles.is_approved = false)
    Pendiente -->|Redirección Vista| UI(Waitlist View)
    Admin([Administrador]) -->|Acceso Dashboard| Pendiente
    Admin -->|Aprueba perfíl| Aprobado(Tabla profiles.is_approved = true)
    Aprobado -->|Acceso Concedido| Core(Athlete App Core)
```

### 3. Arquitectura Frontend a Backend (Vite SPA)

```mermaid
graph LR
    User([Usuario]) --> Vite(Vite SPA React App)
    Vite -->|Supabase-js Realtime| SupabaseDB[(Supabase PostgreSQL)]
    Vite -->|Config UI| MUI(Theme Tokens Material UI)
```
