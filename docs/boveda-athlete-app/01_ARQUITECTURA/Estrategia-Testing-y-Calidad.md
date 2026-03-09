---
title: "Estrategia de Testing y Calidad (QA)"
description: "Cómo validamos la integridad de los datos sensibles y el correcto renderizado del frontend"
tags: [testing, calidad, QA, validacion, frontend, etl]
---

# 🧪 Estrategia de Testing y Calidad

En "Athlete App", el principal valor es la fiabilidad del dato estadístico. Una marca mal imputada a un niño de categoría sub-12 rompe por completo la experiencia. Por tanto, nuestro foco *Tier 1* de calidad recae sobre la inyección de datos, y el *Tier 2* sobre el renderizado de gráficos UI.

## 1. Validación de la Capa ETL (Data Engineering)
Antes de que un dato toque Supabase Producción, tiene que sobrevivir a la cuarentena local.

- **Modo Preview (`main.py --preview`)**: Este es nuestro "Dry-Run" (simulacro) oficial. Exporta un CSV (`preview_YYYY-MM.csv`) sin mutar la BBDD. **Testing manual obgligatorio:** El administrador debe usar excel para revisar columnas de 'Marca' y compararlas visualmente con PDFs aleatorios, especialmente verificando el `prueba_id`.
- **Detección de Outliers (Scripts locales):** Si un valor entero es insertado para una prueba cronometrada de corta distancia (donde se esperan decimales), un script automatizado alerta en consola. Este mecanismo actúa como nuestro *Snapshot Test* para el OCR.
- **Validación referencial:** El script `fix_events.py` corrobora toda string escaneada contra `valid_events.txt`. Si no hay "match", el volcado local arroja warnings advirtiendo del error en el OCR, frenando la contaminación silenciosa.

## 2. Testing Frontend (React / Vite)
El área más sensible de UI son los gráficos compuestos (Spider Charts, Evolución).

- **Estrategia Actual (Manual & Visual Regression):** Validar la carga del componente complejo `AthleteSpiderChart.jsx`.
  - *Prueba Humana:* Seleccionar un Atleta con datos mixtos (campo y pista). Verificar que los picos del Radar de pista están en sintonía con "Menor es mejor" y velocidad/saltos "Mayor es mejor".
  - *Prueba de Extremos:* Insertar intencionalmente un valor atípico (Ej. 60m en 3s via `MarksManagementDialog`) y validar que la UI formatea adecuadamente los límites del gráfico (Ticks de Recharts).
- **Roadmap a futuro (Automatización):**
  1. Implantar tests unitarios usando **Vitest** (nativo para ecosistemas Vite) para validar funciones puras críticas (Ej. parseador de marcas en `isTimeBasedPrueba()`).
  2. Uso de **Playwright** para tests End-to-End críticos: Loguear `admin`, aprobar usuario, subir nueva marca, comprobar renderizado final.

## 3. Seguridad Base de Datos (QA Supabase)
- **RLS Policy Checks:**
  - *Test Manual de Suplantación:* Entrar con una cuenta de rol `consulta`. Interceptar token JWT e intentar hacer PUSH (POST) a endpoint HTTP de inserción de resultados o cambiar el parámetro `is_approved`. Debe arrojar `Status 403 / 401`. Solo RPCs `SECURITY DEFINER` ejecutados por un UI validado por UID saltan este control.
