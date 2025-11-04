import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import SportsScoreIcon from '@mui/icons-material/SportsScore'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { useTheme, useMediaQuery } from '@mui/material'

const BottomNavigationBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  // Determinar el valor actual basado en la ruta
  const getRouteValue = (pathname) => {
    if (pathname === '/' || pathname.startsWith('/seguimiento')) return 'seguimiento'
    if (pathname.startsWith('/analisis')) return 'analisis'
    if (pathname.startsWith('/calendario')) return 'calendario'
    if (pathname.startsWith('/mas')) return 'mas'
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
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <BottomNavigation
        value={value}
        onChange={handleChange}
        showLabels={!isMobile}
      >
        <BottomNavigationAction
          label="Seguimiento"
          value="seguimiento"
          icon={<SportsScoreIcon />}
          aria-label="Seguimiento deportivo"
        />
        <BottomNavigationAction
          label="Análisis"
          value="analisis"
          icon={<MonitorHeartIcon />}
          aria-label="Análisis físico"
        />
        <BottomNavigationAction
          label="Calendario"
          value="calendario"
          icon={<CalendarMonthIcon />}
          aria-label="Calendario"
        />
        <BottomNavigationAction
          label="Más"
          value="mas"
          icon={<MoreHorizIcon />}
          aria-label="Más opciones"
        />
      </BottomNavigation>
    </Box>
  )
}

export default BottomNavigationBar

