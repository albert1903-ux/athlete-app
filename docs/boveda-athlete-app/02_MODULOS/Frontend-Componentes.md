---
title: "Frontend y Componentes Reusables"
description: "Ecosistema visual UI, Material UI theming y gráficos."
tags: [frontend, componenetes, mui, vite, react]
---

# 🧩 Módulo: Componentes Frontend y Theming UI

La iteración actual del interfaz de la aplicación de Atletismo está levantado y orquestado en **Vite + React (v19)** en lugar de usar Server Side Rendering con Vercel/Next.js. 

## Theming System: ¿Por qué No Usamos Tailwind Directamente?
Aunque Tailwind CSS forma parte del `package.json`, la biblioteca central visual que empodera al proyecto de inicio a fin es **Material UI (MUI)**. 
El manejo del modo oscuro y los colores vivos, se transacciona a través de un archivo centralizado `tokens.js` exportado hacia `index.js` en el `src/theme/`, dictaminando variables estandarizadas de colores (ej: `tokens.colors.primary.main` '#E11141').
- **Jamás debes hardcodear colores**. Se debe abstraer todo estilo o variable al ecosistema nativo de MUI o pasarlo como variable en emoción (`styled-components`).

## Abstracción UI y Gráficos
Las vistas complejas no se construyen desde cero. Abstracciones recurrentes:
- **Dashboard / Vista de Seguimiento:** En `src/components/`, la parte crítica de lectura reside en usar gráficos de la librería **Recharts**. Estos gráficos se renderizan acoplando las variables dinámicamente desde el Contexto (Theme provider) de la aplicación, mutando orgánicamente en `dark mode` sin requerir regenerado de la gráfica.
- **Formularios (Date Pickers):** Apalancados sobre `@mui/x-date-pickers` con soporte integrado para `dayjs`.
