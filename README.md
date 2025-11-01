# Athlete App

Aplicación web responsive en formato mobile-first desarrollada con React y Material Design, conectada a Supabase.

## 🚀 Tecnologías

- **React 19** - Biblioteca de UI
- **Vite** - Build tool y bundler
- **Material-UI (MUI)** - Componentes Material Design
- **Supabase** - Backend y base de datos
- **React Router** - Navegación
- **Emotion** - Styled components para MUI

## 📋 Requisitos Previos

- Node.js 20+ (preferiblemente) o 18+
- npm o yarn

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview
```

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
│   ├── main.jsx        # Entry point
│   └── index.css       # Estilos globales
├── .env                # Variables de entorno
├── index.html          # HTML principal
└── package.json        # Dependencias
```

## 🔐 Configuración de Supabase

Las credenciales de Supabase están configuradas en el archivo `.env`:

```
VITE_SUPABASE_URL=https://doibexyiiayjiijxziqm.supabase.co
VITE_SUPABASE_KEY=tu_clave_aqui
```

## 🎨 Material Design Mobile-First

La aplicación está configurada con un enfoque mobile-first:

- **Breakpoints** configurados para diferentes tamaños de pantalla
- **Tema** personalizado con colores Material Design
- **Componentes responsive** que se adaptan automáticamente
- **Touch-friendly** optimizado para dispositivos móviles

## 📱 Características

- ✅ Diseño responsive mobile-first
- ✅ Material Design UI
- ✅ Conexión con Supabase
- ✅ Hot Module Replacement (HMR)
- ✅ Optimizado para producción

## 🚦 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo en http://localhost:5173
- `npm run build` - Crea build de producción
- `npm run preview` - Previsualiza build de producción
- `npm run lint` - Ejecuta ESLint

## 🔄 Control de Versiones

Este proyecto usa Git para el control de versiones. Consulta [GIT_WORKFLOW.md](GIT_WORKFLOW.md) para una guía completa de comandos y flujo de trabajo.

### Comandos básicos:

```bash
# Ver estado actual
git status

# Agregar cambios
git add .

# Hacer commit
git commit -m "descripción del cambio"

# Ver historial
git log --oneline
```

## 📝 Próximos Pasos

1. Crear componentes específicos en `/src/components`
2. Implementar rutas en `/src/pages`
3. Crear hooks personalizados en `/src/hooks`
4. Configurar autenticación con Supabase
5. Implementar manejo de datos y queries

## 📚 Recursos

- [Documentación React](https://react.dev)
- [Documentación MUI](https://mui.com)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación Vite](https://vite.dev)
