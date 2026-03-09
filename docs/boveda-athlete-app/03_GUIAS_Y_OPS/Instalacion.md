---
title: "Guía de Instalación"
description: "Cómo levantar los repositorios de Frontend (React) y Backend Local (Python + DB)."
tags: [instalacion, setup, dev-environment]
---

# 💻 Guía de Instalación Local

Debido a su naturaleza particionada de Doble Base de Datos, el proyecto se inicializa en dos entornos diferentes.

## 1. Frontend (React / Vite) (`/athlete-app`)
1. Instalar un gestor de paquetes moderno (se prefiere npm/pnpm).
2. Clona el repositorio `athlete-app`.
3. Renombra o duplica un archivo `.env` configurando los *anon keys* y URLs públicas.
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Ejecutar localmente.
   ```bash
   pnpm install
   pnpm run dev
   ```

## 2. Entorno Local de Limpieza DB (Python) (`/bbdd-athlete-app`)
1. Accede al repositorio `bbdd-athlete-app`.
2. Crea e inicia un entorno virtual.
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. Instala librerías locales que controlan `psycopg2` y parseos:
   ```bash
   pip install -r requirements.txt
   ```
4. Define el `.env` local con strings directos de conexión PSQL puros y `SUPABASE_SERVICE_ROLE_KEY` para esquivar el RLS si deseas sincronizar después:
   ```env
   SUPABASE_URL_LOCAL=http://127.0.0.1:54321
   SUPABASE_SERVICE_KEY_LOCAL=ey...
   ```
   **Tip:** Para testear, ejecuta `test_conn.py`.
