# 🚀 Guía de Instalación - Athlete App

## Instalación Rápida

### 1. Instalar dependencias

```bash
cd /Users/albert/Documents/athlete-app
npm install
```

### 2. Configurar variables de entorno

El archivo `.env` ya está configurado con las credenciales de Supabase:
- ✅ URL de Supabase configurada
- ✅ API Key configurada

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173**

## 📱 Características Implementadas

### ✅ Material Design
- Componentes Material-UI completamente configurados
- Tema personalizado con colores Material Design
- Diseño mobile-first responsive

### ✅ Supabase
- Cliente configurado y funcionando
- Credenciales importadas desde tu proyecto Python
- Prueba de conexión automática

### ✅ Estructura del Proyecto
```
src/
├── lib/supabase.js      ← Configuración Supabase
├── components/          ← Componentes reutilizables
├── pages/              ← Páginas de la app
├── hooks/              ← Custom hooks
├── utils/              ← Utilidades
├── App.jsx             ← Componente principal
└── main.jsx            ← Entry point con tema MUI
```

## 🎨 Personalización

### Cambiar colores del tema

Edita `src/main.jsx`:

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',  // Cambia este color
    },
    secondary: {
      main: '#dc004e',  // Cambia este color
    },
  },
})
```

### Añadir más componentes MUI

```javascript
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
// etc.
```

## 📦 Dependencias Instaladas

- **@mui/material** - Componentes Material Design
- **@mui/icons-material** - Iconos Material
- **@emotion/react & @emotion/styled** - Styling para MUI
- **@supabase/supabase-js** - Cliente Supabase
- **react-router-dom** - Navegación

## 🐛 Solución de Problemas

### Error de conexión a Supabase

1. Verifica que el archivo `.env` esté en la raíz del proyecto
2. Comprueba que las credenciales sean correctas
3. Reinicia el servidor de desarrollo

### Problemas con el tema

Si los componentes no se ven con Material Design:
1. Verifica que `CssBaseline` esté importado en `main.jsx`
2. Asegúrate de que `ThemeProvider` envuelve tu app

## 🎯 Próximos Pasos

1. Crear componentes específicos de athletes
2. Implementar autenticación
3. Añadir rutas y navegación
4. Crear queries para obtener datos de Supabase
5. Implementar formularios de alta/modificación

## 📞 Soporte

¿Necesitas ayuda? Consulta:
- [Documentación MUI](https://mui.com)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación React](https://react.dev)


