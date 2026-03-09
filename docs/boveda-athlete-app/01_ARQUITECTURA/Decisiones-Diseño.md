---
title: "Decisiones de Diseño"
description: "Architecture Decision Records - Justificación del stack y la arquitectura de base de datos dividida."
tags: [adrs, decisiones, diseño]
---

# ⚖️ Decisiones de Diseño (ADRs)

Este documento registra por qué se tomaron decisiones fundacionales en Athlete App.

### 1. Vite (SPA) + MUI vs Next.js + Tailwind
- **Decisión:** El cliente se ha desarrollado como una Single Page Application (SPA) pura con Vite y React, usando Theming de Material UI (`src/theme/tokens.js`).
- **Justificación:** Debido al intensivo uso del dashboard interactivo y la suscripción en cliente con el cliente Realtime de Supabase, una SPA en React puro ofrece renderizados rápidos sin la fricción de SSR continuo. Se decidió usar **Material UI** por encima de **Tailwind** puro para un themathing predictivo rápido en componentes complejos (Dialogs, DataSelectors) y mantener un fichero `index.js` agnóstico que inyecta la paleta.

### 2. Aprobación Manual Restringida de Usuarios
- **Decisión:** En lugar de abrir el onboarding a cualquiera con verificación de correo, todos los registros recaen en estado suspendido. Se creó la migración `admin_approve_user.sql` y componentes de espera.
- **Justificación:** Prevención absoluta de scrapers y competidores, ya que la plataforma expone datos sensibles (Medidas corporales históricas, resultados no listados en portales públicos por fallos RFEA, análisis exhaustivos).

### 3. Estrategia de DB Local como Sandbox ETL
- **Decisión:** Mantener una capeta `bbdd-athlete-app` que ejerce de clúster local de Supabase (`bbdd.db`) atacado por scripts Python nativos.
- **Justificación:** Múltiples errores detectados del PDF parser (`Ranking Outliers`) inyectaban resultados de distancias sin comas (ej 654 metros vs 6.54m de longitud). La capa intermedia evita ensuciar la producción y permite auditar en un entorno espejo temporal. Mantenemos el control del DDL con una semilla compartida estricta (`migrations`).
