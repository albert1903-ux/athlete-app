import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import { TbChartRadar, TbHeartbeat, TbCalendar, TbDots } from 'react-icons/tb'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '@mui/material/styles'
const BottomNavigationBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const theme = useTheme()

  // Determinar el valor actual basado en la ruta
  // React Router con basename ya normaliza el pathname, pero por si acaso
  // también manejamos rutas que puedan incluir el base path
  const getRouteValue = (pathname) => {
    // Normalizar pathname removiendo el base path si está presente
    const normalizedPath = pathname.replace(/^\/athlete-app/, '') || '/'

    if (normalizedPath === '/' || normalizedPath.startsWith('/seguimiento')) return 'seguimiento'
    if (normalizedPath.startsWith('/analisis')) return 'analisis'
    if (normalizedPath.startsWith('/calendario')) return 'calendario'
    if (normalizedPath.startsWith('/mas')) return 'mas'
    return 'seguimiento'
  }

  const [value, setValue] = useState(getRouteValue(location.pathname))

  // Actualizar valor cuando cambia la ruta
  useEffect(() => {
    setValue(getRouteValue(location.pathname))
  }, [location.pathname])

  const handleChange = (event, newValue) => {
    setValue(newValue)

    // Navegar a la ruta correspondiente
    switch (newValue) {
      case 'seguimiento':
        navigate('/seguimiento')
        break
      case 'analisis':
        navigate('/analisis')
        break
      case 'calendario':
        navigate('/calendario')
        break
      case 'mas':
        navigate('/mas')
        break
      default:
        navigate('/seguimiento')
    }
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        left: 16,
        right: 16,
        zIndex: 1000,
        maxWidth: 'calc(100% - 32px)',
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          backgroundColor: 'background.paper',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 -1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.6)'
            : '0 2px 8px rgba(0, 0, 0, 0.08)',
          borderRadius: 15,
          overflow: 'hidden',
        }}
      >
        <BottomNavigation
          value={value}
          onChange={handleChange}
          showLabels={true}
        >
          <BottomNavigationAction
            label="Seguimiento"
            value="seguimiento"
            icon={<TbChartRadar size={24} />}
            aria-label="Seguimiento deportivo"
          />
          {user?.role === 'admin' && (
            <BottomNavigationAction
              label="Análisis"
              value="analisis"
              icon={<TbHeartbeat size={24} />}
              aria-label="Análisis físico"
            />
          )}
          <BottomNavigationAction
            label="Calendario"
            value="calendario"
            icon={<TbCalendar size={24} />}
            aria-label="Calendario"
          />
          <BottomNavigationAction
            label="Más"
            value="mas"
            icon={<TbDots size={24} />}
            aria-label="Más opciones"
          />
        </BottomNavigation>
      </Box>
    </Box>
  )
}

export default BottomNavigationBar

