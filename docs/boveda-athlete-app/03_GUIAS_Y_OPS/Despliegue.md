---
title: "Flujo de Despliegue y ETL"
description: "El pipeline de datos y despliegue semanal del sistema."
tags: [deploy, etl, workflow]
---

# 🚀 Guía de Despliegue de Datos Reales

El código de React se despliega automáticamente en Push sobre la rama `main` a través de Vercel (o plataforma equivalente para Vite SPA). No obstante, "Desplegar el Proyecto" también tiene connotaciones en cuanto a la Base de Datos.

## Data Pipeline: Evitar Polución de la DB Producción
Al menos una vez a la semana, la *Athlete App* recibe cientos de resultados compilados de federaciones territoriales. **La injección directa está proscrita.**

1. **Dump Semanal:** Cargas un archivo grande CSV (como `preview_2026-03.csv`) o descargas desde Python en `bbdd-athlete-app`.
2. **Sanitización & Scripts:** Corremos generadores como `club_cleaning_report`. Limpiamos IDs huérfanos.
3. **Dry-Run:** Utilizamos la instancia local y validamos. Observamos si un sub-12 tardó "8 segundos en correr 60m vallas" y comprobamos si usó la longitud real `prueba_id = 3` (Vallas 0.50m) en lugar de `prueba_id = 89`.
4. **Disparo de Integración:** Hacemos uso del Service Key (`SUPABASE_SERVICE_ROLE_KEY`) e inyectamos a la nube. Este Token burla la Row Level Security, volcando los resultados con total jerarquía. 

Leer el porqué de esta medida en los [[Decisiones-Diseño]].
