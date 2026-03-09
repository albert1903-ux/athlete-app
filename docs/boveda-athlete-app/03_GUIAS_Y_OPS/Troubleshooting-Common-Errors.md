---
title: "Troubleshooting y Errores Comunes"
description: "Diccionario de los sospechosos habituales y soluciones rápidas para Athlete App"
tags: [errores, soporte, debug, rls, supabase, parseo]
---

# 🚨 Troubleshooting: Guía de Supervivencia

Este documento recopila los bugs más frecuentes y casos borde técnicos que ocurren en el proyecto, diseñados para que un desarrollador (o una IA de mantenimiento) pueda resolver incidencias en minutos en lugar de horas.

## 1. Problemas de Base de Datos y Seguridad (Supabase)

### Error: "Row-Level Security (RLS) Policy Violation" al insertar
- **Síntoma:** Requests de inserción/actualización desde el frontend o scripts locales devuelven un error `403 Forbidden` o silenciosamente no insertan.
- **Causa Habitual:** 
  1. En el script de Python, estás usando la `ANON_KEY` en vez de la `SERVICE_ROLE_KEY`. (Recordatorio: La Service Key *bypassea* RLS, ideal para tareas ETL de admin).
  2. En el Frontend, el usuario no tiene una sesión activa o la política RLS está exigiendo `auth.uid() = user_id` pero estás intentando insertar un resultado público.
- **Solución rápida:** Revisa `supabase/migrations` para la política exacta. Si es un script ETL, asegura que el `.env` apunta `SUPABASE_KEY` a la Service Role, no al Anon.

### Error: "duplicate key value violates unique constraint"
- **Síntoma:** El pipeline de importación falla con `UNIQUE constraint failed`.
- **Causa Habitual:** Intentar insertar un `resultado` que ya existe. La tabla suele tener una restricción para evitar duplicar (atleta_id + prueba_id + fecha).
- **Solución rápida:** Usar la función de Upsert o purgar los CSVs previos antes de hacer `DBManager.update()`.

## 2. Ingesta de Datos (Scripts ETL y OCR)

### Error: Atletas que desaparecen o se duplican el "Spider Graph"
- **Síntoma:** El rendimiento de un atleta no se pinta en el gráfico radar `AthleteSpiderChart.jsx`, pero sus marcas existen en BBDD.
- **Causa Habitual:** Problemas de Normalización de Nombres. El ID original de la prueba ('60m vallas (0.50)') en BBDD difiere gramaticalmente del nombre extraído del PDF.
- **Solución rápida:** Revisar el archivo `valid_events.txt` y asegurar que la función de "Auto-Fix" en `scripts/fix_events.py` está mapeando la variante incorrecta a la tipificación oficial. Comprobar la función `normalizePruebaNombre` en JS.

### Error: Tiempos irreales (Ej: 100m en 1.1s o en 110s)
- **Síntoma:** Marcas que rompen visualmente el gráfico creando picos inmensos.
- **Causa Habitual:** El script OCR ha leído `110` en vez de `11.0` (ausencia de coma).
- **Solución rápida:** Revisar la sección de "Outliers" en los scripts locales. No borrar directamente en Producción; purga el resultado en la Db Local SQLite y repite el `sync_to_supabase.py`.

## 3. Caché y Frontend (Vite + React)

### Error: Interfaz desfasada tras publicar nueva versión (Pantalla Blanca o Datos Viejos)
- **Síntoma:** El usuario no ve las últimas gráficas añadidas.
- **Causa Habitual:** Service Workers agresivos o caché del navegador en aplicaciones SPA React/Vite.
- **Solución rápida:** Indicar a los usuarios "Forzar Recarga" (Ctrl+F5). Asegurarse que el build de Vite genera hashes nuevos (`[name].[hash].js`) en la configuración de `vite.config.js`.

### Error: Parpadeos (Flickering) de Temas Claros a Oscuros
- **Síntoma:** La página se carga blanca y de repente es negra (Dark Mode).
- **Causa Habitual:** Material UI está evaluando las *preferences* del sistema ligeramente tarde respecto al renderizado del DOM principal.
- **Solución rápida:** Revisa el Theme Provider en `index.js`. Mantener el color de fondo principal `bgcolor: 'background.default'` inyectado en el componente raíz lo antes posible o en el HTML `body`.
