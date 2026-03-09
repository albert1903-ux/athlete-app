---
title: "Reglas de Negocio Core"
description: "Lógica subyacente de la interpretación de marcas, categorías y analíticas"
tags: [negocio, reglas, graficos, categorias, validacion]
---

# 📐 Reglas de Negocio

Este documento traduce la lógica de código estricta escrita en Python y React a reglas de negocio humanas. Ayuda a comprender *por qué* la aplicación trata la información de la forma en que lo hace y prevé los casos borde. Para entender la integración técnica revisa [[API-Endpoints]] y [[Frontend-Componentes]].

## 1. Identificación y Cálculo del Mejor Resultado (Lógica de Gráficos)
El sistema genera el "Spider Graph" (Radar) y los historiales. ¿Cómo sabe el sistema cuándo una marca es "mejor" que otra?

| Tipo de Prueba | Criterio de "Mejor Marca" | Palabras clave en BBDD para detectar el tipo |
| :--- | :--- | :--- |
| **Tiempo / Carreras** | El valor **MENOR** es el mejor. | Contiene "m" y carece de nombres de campo. Su unidad es "s", "seg", "segundos". (Ej: 60m, 1000m) |
| **Campo / Saltos y Lanzamientos** | El valor **MAYOR** es el mejor. | Nombres contienen: longitud, altura, peso, disco, jabalina, martillo, pértiga, triple, vortex. |

**Regla de Parseo Decimal:**
Si un tiempo llega en formato `MM:SS.ms` (ej. `01:23.45`), el Frontend (y los scripts) lo fraccionan y multiplican los minutos por 60 para almacenarlo / graficarlo como valor numérico aséptico de segundos base.

## 2. Gestión de Categorías de Edad
Los resultados no se mezclan. Un niño no compite contra un absoluto en las mismas métricas visuales. Para ello, el sistema pre-define "Etiquetas de Retirada" que catalogan los `categoria_id`:

- `1`: SUB8
- `2`: SUB10
- `3`: SUB12
- `5`: SUB14
- `6`: ABS
- `7`: SUB16
- `8`: SUB18
- `9`: SUB20
- `10`: SUB23

> **Caso Borde Detectado:** Si un atleta compite en una categoría que no le corresponde (por invitación), se mapeará con la `categoria_id` nativa para evitar que en el radar se desconfigure su progreso.

## 3. Normalización de Cadenas de Texto (Nombres Múltiples)
Dado que los datos de la federación provienen de archivos PDFs renegados con faltas de ortografía:
- **Regla:** Antes de buscar un ID de prueba, el string se "Normaliza", eliminando acentos (`NFD`), forzando minúsculas y reduciendo los espacios múltiples a uno único (Ej. `Salto   Con Pértiga` -> `salto con pertiga`). Permite agrupar métricas consistentes en los Gráficos de Evolución sin fragmentación.

## 4. Detección de Valores Atípicos (Outliers)
Las marcas introducidas caen bajo el escrutinio de los scripts del proyecto en `bbdd-athlete-app/scripts`.
- **Regla Decimal:** Si la marca recibida al parsear un CSV es puramente *entera* sin decimales, en pruebas de tiempo normalmente representa un error grosero del OCR (Ej. `845` en lugar de `8.45` segundos en el 60m libres). Estas marcas caen en un "Ranking de Outliers" y se vetan de la inyección a Supabase a menos que un admin verifique.
