---
title: "2026-03-10: Refactorización a Custom Hooks y Skills de Agente"
date: "2026-03-10"
tags: [bitácora, arquitectura, hooks, react, ai]
---

# 📝 Bitácora: 10 de Marzo 2026 - Refactorización de Arquitectura y Skills

## Contexto
Durante el análisis de las peticiones históricas del proyecto (relacionadas con limpieza de datos, arreglos visuales y errores de base de datos) se evidenció que componentes gráficos clave como `AthleteSpiderChart` y páginas como `SeguimientoPage` habían absorbido demasiada responsabilidad. Estaban calculando grupos, filtrando datos atípicos, determinando el *isTimeBased* e interaccionando directamente con el cliente de Supabase.

Adicionalmente, se detectó que los Agentes de IA podían cometer errores conceptuales al no comprender las reglas del negocio atlético o romper políticas de Supabase.

## Acciones Tomadas

### 1. Instrucción para IAs (Skills)
Se introdujeron instrucciones de contexto explícitas en el directorio `.agent/skills/` para fortificar a los asistentes:
- `supabase-data-architect`: Restringe y asegura las consultas.
- `athletics-data-analyst`: Enseña terminología de atletismo (Outliers, qué significa cada prueba, submúltiplos).
- `obsidian-sync-master`: Exige actualización de esta misma bóveda documental como "fuente de la verdad".

### 2. Capa de Datos Abstraída (Custom Hooks)
Se ha aislado toda lógica de negocio y llamadas de Supabase hacia el directorio `src/hooks/` y `src/utils/`:
- `useAthleteProfile`: Para enriquecimiento base del corredor.
- `useAthleteResults` y `useGroupedResults`: Extracción cruda y particionado por sub-categorías.
- `usePruebaMetrics`: Para recuperar y normalizar contra los máximos históricos de las pruebas.
- `useAthletesComparison`: Un agregador inteligente para el gráfico Radar.
- `pruebaUtils.js`: Funciones puras de formateo.

### 3. Limpieza UI (Refactoring)
- `AthleteSpiderChart` vio su tamaño y lógica reducida casi a la mitad al delegar y usar los nuevos *hooks*.
- `SeguimientoPage` delega el cálculo del perfil y sincroniza mejor su estado y la caché local.

## Estado
La arquitectura de la Interfaz de Usuario es ahora mucho más resistente. Validado correctamente con el pipeline de Vite sin reportes críticos en las dependencias reactivas de compilación.
