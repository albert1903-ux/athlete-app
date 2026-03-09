---
title: "Stack Técnico"
description: "Listado actualizado del stack tecnológico basado en package.json y estructura de carpetas."
tags: [stack, dependencias, frameworks]
---

# 🚀 Stack Técnico de Athlete App

Tras auditar directamente los repositorios (Frontend en js/jsx y DB-Pipeline en Python), se define el siguiente stack oficial.

## Frontend (Application Client)
A diferencia de estimaciones de Next.js, el proyecto funciona como una SPA moderna muy estructurada:
- **Core Builder:** Vite (`vite build`, `vite preview`) v5.4.
- **Framework Reactivo:** React 19 (`react`, `react-dom`).
- **Enrutamiento:** React Router DOM v6.

### UI & UX (Visual Layer)
- **Framework de UI:** Material UI (MUI v7) (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`).
- **CSS-in-JS Engine:** Emotion (`@emotion/react`, `@emotion/styled`).
- **Gráficos:** Recharts v3.3.0.
- **Tipografía:** `@fontsource/poppins`, `@fontsource/barlow`.
- **Misc:** TailwindCSS (v4) está instalado como dependencia de desarrollo, pero el control absoluto y centralizado del tipado recae en la instanciación de MUI (`theme/index.js`).

## Backend & Base de Datos
- **BaaS Core:** Supabase (`@supabase/supabase-js`).
- **Database Engine:** PostgreSQL (Hosteado en Supabase Cloud / Instancia Local PostgreSQL DB).
- **Client State:** React Context y mutaciones en tiempo real manejadas por las suscripciones nativas de Supabase.

## Operaciones de Datos (Directorio `bbdd-athlete-app`)
Entorno utilizado puramente para extracción, transformación y limpieza de datos (ETL) antes de atacar Supabase producción.
- **Lenguaje:** Python 3 (`.venv`).
- **Funciones:** Scripting para limpieza de clubs (`club_cleaning_report.md`), parseo de grandes volúmenes de CSV y test de conectividad (`test_conn.py`, `test_policies.py`).
