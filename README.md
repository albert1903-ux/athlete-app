# Athlete App

Aplicación web responsive en formato mobile-first desarrollada con React 19 y Material Design, conectada a Supabase.

## 🚀 Tecnologías

- **React 19** - Biblioteca de UI
- **Vite** - Build tool y bundler
- **Material-UI (MUI)** - Componentes Material Design
- **Supabase** - Backend y base de datos PostgreSQL
- **React Router** - Navegación
- **Emotion** - Styled components para MUI

## 📋 Requisitos Previos

- **Node.js 20+** (preferiblemente) o 18+
- **npm** o yarn
- **Docker** y **Docker Compose** (opcional, para base de datos local)

## 🛠️ Instalación Rápida

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

El archivo `.env` debe contener las credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://doibexyiiayjiijxziqm.supabase.co
VITE_SUPABASE_KEY=tu_clave_aqui
VITE_API_URL=http://localhost:5001
```

Copia `.env.example` si necesitas un archivo base:

```bash
cp .env.example .env
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173**

## 🐳 Base de Datos Local con Docker

Para desarrollar localmente usando una base de datos PostgreSQL en Docker (sin depender de Supabase cloud):

### Requisitos

- Docker Desktop instalado y corriendo

### Pasos de configuración

1. **Crear archivo `docker-compose.yml`** en la raíz del proyecto:

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    container_name: athlete-app-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: athlete_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

2. **Iniciar la base de datos**:

```bash
docker-compose up -d
```

3. **Verificar que está corriendo**:

```bash
docker-compose ps
```

4. **Detener la base de datos** (cuando termines):

```bash
docker-compose down
```

5. **Limpieza completa** (elimina datos):

```bash
docker-compose down -v
```

### Conexión a la base de datos local

Para conectarte a la BD desde la línea de comandos:

```bash
psql -h localhost -U postgres -d athlete_db
```

Contraseña: `postgres`

## 📁 Estructura del Proyecto

```
athlete-app/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Configuraciones (Supabase, etc.)
│   ├── pages/          # Páginas de la aplicación
│   ├── utils/          # Utilidades y helpers
│   ├── App.jsx         # Componente principal
│   ├── main.jsx        # Entry point con tema MUI
│   └── index.css       # Estilos globales
├── .env                # Variables de entorno
├── index.html          # HTML principal
└── package.json        # Dependencias
```

## 🎨 Material Design Mobile-First

La aplicación está configurada con:

- **Breakpoints** responsivos para diferentes tamaños de pantalla
- **Tema personalizado** con colores Material Design
- **Componentes responsive** que se adaptan automáticamente
- **Optimización touch** para dispositivos móviles

## 📱 Características

- ✅ Diseño responsive mobile-first
- ✅ Material Design UI con MUI
- ✅ Conexión con Supabase (o BD local con Docker)
- ✅ Hot Module Replacement (HMR) en desarrollo
- ✅ Build optimizado para producción

## 🚦 Scripts Disponibles

| Script            | Descripción                                            |
| ----------------- | ------------------------------------------------------ | ----------------- | -------------------- | ------------------ |
| `npm run dev`     | Inicia servidor de desarrollo en http://localhost:5173 |
| `npm run build`   | Crea build optimizado para producción                  |
| `npm run preview` | Previsualiza build de producción localmente            |
| `npm run lint`    | Ejecuta ESLint para validar código                     |
| `npm run seed`    | Ejecuta el seed para crear usuarios de prueba          |
| bbdd local        | 127.0.0.1:54323/                                       | usuario: postgres | contraseña: postgres | nombre: athlete_db |

## 🔄 Control de Versiones

Este proyecto usa Git para el control de versiones. Consulta [GIT_WORKFLOW.md](GIT_WORKFLOW.md) para guías completas de comandos y flujo de trabajo.

## 📚 Documentación Adicional

- [INSTALACION.md](INSTALACION.md) - Guía detallada de instalación
- [DEPLOYMENT.md](DEPLOYMENT.md) - Instrucciones de despliegue
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Flujo de trabajo con Git

## 📖 Recursos Externos

- [Documentación React](https://react.dev)
- [Documentación MUI](https://mui.com)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación Vite](https://vite.dev)
- [Documentación Docker](https://docs.docker.com)
