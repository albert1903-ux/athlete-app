---
title: "Glosario de Terminología"
description: "Diccionario de conceptos técnicos e inequívocos para la lógica de negocio de la IA y desarrolladores"
tags: [diccionario, atletismo, negocio, terminos, IA]
---

# 📖 Glosario Técnico-Deportivo

En Athlete App, convergen nombres comunes atléticos con identificadores estrictos en código. Este documento alinea las definiciones para evitar que una Inteleigencia Artificial interprete semánticamente de manera errónea palabras de jerga deportiva, y pueda programar o extender funcionalidades correctamente.

## Términos Core (Datos del Atleta)

### 🏃‍♂️ Marca (Marca / Resultado)
Cualquier registro cuantitativo logrado por un atleta. 
- **Código/BBDD:** En la tabla `resultados`, este es el "input".
- **Comportamiento Lógico:** Existen dos dimensiones para dictaminar si una marca A es "Mejor" que B.
   1. **De Tiempo (Ej. 60m):** El sistema favorece el **menor valor numérico** (tiempo cronometrado más bajo).
   2. **De Distancia/Altura (Ej. Longitud):** El sistema favorece el **mayor valor numérico**.

### 🧱 Prueba (El Evento Específico)
El deporte exacto competido en esa franja horaria.
- **Dato Crítico para la IA:** Una "Prueba" no se define únicamente por la distancia. Por ejemplo, "60m vallas" y "60m vallas (0.50)" son **dos `prueba_id` únicos y mutuamente excluyentes**, ya que el "0.50" define estrictamente la altura física del obstáculo, haciendo que comparar métricas entre ambos carezca de sentido estadístico.
- *Resolución:* Un Atleta puede transicionar de "60m vallas (0.50)" a "60m vallas (0.84)" al saltar de categoría Sub-12 a Sub-14. **No mezclar sus historiales gráficos**. 

### 📛 Categorías de Edad (SUB-X)
Divisiones reguladas por la fecha de nacimiento oficial.
- **SUB12, SUB14, ABS...:** El sistema define estas franjas (en `05_FUNCIONAL/Reglas-de-Negocio.md`). En el gráfico "Radar" (Spider), la UI no cruza ejes entre Categorías ni pertrecha su *pool* de mejores marcas juntas para evitar anomalías gráficas (comparar peras con manzanas).

### 🚨 Outlier
Término de Ingeniería de Datos para un "Dato Atípico" derivado de un *Parsing Error* proveniente de archivos federativos (A menudo PDFs leídos mediante OCR).
- **En nuestro proyecto:** Un "Outlier" se clasifica a través de las heurísticas de los scripts de Python. Por ejemplo: Que el Primer clasificado de la tabla superponga por cientos de puntos estandarizados al segundo clasificado, o que un tiempo esperado de `9.55`s aparezca como entero (`955`).

## Terminología Extensa 

- **DBManager:** La interfaz central de Base de Dato local SQLite alojada en `/bbdd-athlete-app`, empleada para pre-higienizar. Nunca apunta a Producción directamente para las inserciones.
- **Service Role Key:** Llave privilegiada para el volcado final a Supabase. Se impone saltar RLS desde entornos de nodo y solo la corre un Admin vía CRON/Script seguro local.
- **Admin vs Consulta:** Dos perfiles de autorización estrictos regulados que se definen extensamente en [[Roles-Permisos]]. Admin inyecta/repara, Consulta exclusivamente consume la UI.
