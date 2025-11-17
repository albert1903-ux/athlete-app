import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'

// Tema Material Design 3 para mobile
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f0f0f0',
      paper: '#ffffff',
    },
    // Colores MD3
    surface: '#ffffff',
    onSurface: '#1c1b1f',
    onSurfaceVariant: '#49454f',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  // Configuración responsive para mobile-first
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    // Estilos para Cards
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          borderRadius: 10,
        },
      },
    },
    // Estilos para BottomNavigation según MD3
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: 'background.paper',
          height: '80px',
          paddingTop: '8px',
          paddingBottom: '8px',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: 'text.secondary',
          paddingTop: '8px',
          paddingBottom: '8px',
          minWidth: '64px',
          transition: 'color 0.2s ease-in-out',
          '&.Mui-selected': {
            color: 'primary.main',
          },
        },
        label: {
          fontSize: '0.75rem',
          fontWeight: 500,
          marginTop: '4px',
          transition: 'font-size 0.2s ease-in-out, font-weight 0.2s ease-in-out',
          '&.Mui-selected': {
            fontSize: '0.75rem',
            fontWeight: 600,
          },
        },
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
