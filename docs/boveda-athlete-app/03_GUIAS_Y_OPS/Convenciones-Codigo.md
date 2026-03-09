---
title: "Convenciones de Código"
description: "Pautas estrictas sobre Theming UI y buenas prácticas."
tags: [convenciones, estilo, clean-code]
---

# 📏 Convenciones de Estilo

Mantener el UI prolijo depende enteramente de seguir directrices rígidas con respecto a la capa de Presentación y de Datos.

## 1. Nomenclatura Theming y Modo Oscuro (REGLA CRÍTICA)
**NUNCA USES COLORES DUROS.** A diferencia del enfoque inicial de TailwindCSS, el sistema actual abstrae mediante Custom Hooks de *Material UI*. 

**Bad (Prohibido):**
```jsx
// React DOM - Erróneo. No se acoplará al Modo Oscuro y rompe MUI design pattern
<div style={{ backgroundColor: '#ffffff', color: '#dc004e' }}>Hola</div>
```

**Good:**
```jsx
import { useTheme } from '@mui/material/styles'
const theme = useTheme();

// Usa Palette, garantizando inversión para Dark Mode en Recharts y Divs. 
<div style={{ backgroundColor: theme.palette.background.paper, color: theme.palette.secondary.main }}>
  Dashboard Box
</div>
```
Todas las variables de color provienen explícitamente de *[`src/theme/tokens.js`]*

## 2. Tipado Front/Back End (Typescript vs Python)
- En `athlete-app/`: Usar exclusivamente `TypeScript` en interfaces de las consultas a Supabase JS, y `jsx/tsx` de Vite.
- En `bbdd-athlete-app/`: Nombrar limpiamente funciones de clases Python (ej: `DBManager` en `src/db_manager.py`).

## 3. Consultas a DB Supabase
A excepción de lecturas públicas (`is_approved = true`), toda escritura a un componente central como `marcas` debe usar RPC de validaciones que chequeen si el UID de la transacción corresponde a un Admin.
