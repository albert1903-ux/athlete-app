---
title: "MOC: Map of Content"
description: "Índice principal de la documentación del proyecto."
tags: [moc, index, mapa]
---

# 🗺️ MOC: Map of Content - Athlete App

Bienvenido al mapa central del proyecto. Desde aquí puedes navegar a todas las áreas clave del sistema, organizadas según su naturaleza.

### 🧩 1. Arquitectura y Datos
Definen el cimiento del sistema, cómo fluyen los datos y cómo se estructuran las entidades clave.
- **[[Diagramas-Mermaid]]:** Flujos visuales de usuario y backend (Sincronización Dual BBDD).
- **[[Estructura-Datos]]:** Esquema real de la base de datos Extraído de Migraciones (`atletas`, `resultados`, `medidas_corporales`).
- **[[Decisiones-Diseño]]:** Registro de decisiones (ADRs), como por qué usamos doble base de datos.
- **[[Estrategia-Testing-y-Calidad]]:** Protocolos de QA para scripts de ingesta y Front-End.

### ⚙️ 2. Módulos y Lógica
Implementación en el código, separación de responsabilidades y themathization.
- **[[Autenticacion]]:** Gestión de perfiles y seguridad RLS para acceso.
- **[[API-Endpoints]]:** La comunicación entre el SPA de Vite, y la base de datos (Supabase JS Client).
- **[[Frontend-Componentes]]:** Configuración de MUI, tokens de diseño y UI general.
- **[[Roles-Permisos]]:** Matriz de RBAC (Control de Acceso Basado en Roles) detallando los privilegios de `admin` y `consulta`.

### 🛠️ 3. Guías y Operaciones
Manuales prácticos para el desarrollador e integrador de datos.
- **[[Instalacion]]:** Cómo levantar el entorno Frontend y Local de Python.
- **[[Despliegue]]:** Pasos del Data Pipeline semanal para no inyectar datos corruptos.
- **[[Convenciones-Codigo]]:** Normas para mantener el ecosistema de Theming y la DB limpia.
- **[[Troubleshooting-Common-Errors]]:** Diccionario de resolución rápida (Errores OCR, Cache React, RLS).

### 🧠 4. Capa Funcional y de Negocio
Reglas lógicas, experiencia de usuario y ciclo global, escritos en lenguaje agnóstico al código.
- **[[Mapa-de-Usuarios]]:** Definición de actores (Administrador, Atleta/Consulta) y sus *User Stories*.
- **[[Flujos-de-Pantalla]]:** Diagramas Mermaid del Onboarding y la navegación dentro de la Single Page Application.
- **[[Ciclo-de-Vida-del-Dato]]:** El pipeline de proceso: desde la ingesta en PDF hasta el renderizado visual de React.
- **[[Reglas-de-Negocio]]:** Criterios de detección de *Outliers*, categorías de edad y cálculo lógico del "Mejor Resultado".
- **[[Glosario-Terminologia]]:** Definiciones técnicas inconfundibles para Inteligencias Artificiales y nuevos desarrolladores.

### 📓 5. Bitácora de Cambios
- Últimos registros e histórico de las decisiones e hitos del proyecto.
- **[[2026-03-09-Inicio-Boveda]]**

### 📋 6. Plantillas
- **[[Plantilla-Bitacora]]:** Molde estandarizado para documentar los hitos diarios.
- **[[User-Story-Template]]:** Plantilla para documentar nuevas funcionalidades manteniendo coherencia técnica y de negocio.
