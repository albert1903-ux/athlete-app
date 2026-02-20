import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { TbPlus, TbEye, TbCalendarPlus, TbHeartPlus } from 'react-icons/tb'
import BottomNavigationBar from './components/BottomNavigationBar'
import SeguimientoPage from './pages/SeguimientoPage'
import AnalisisPage from './pages/AnalisisPage'
import CalendarioPage from './pages/CalendarioPage'
import MasPage from './pages/MasPage'
import AddAthleteDialog from './components/AddAthleteDialog'


function AppContent() {
  const location = useLocation()
  const [dialogOpen, setDialogOpen] = useState(false)

  const isSeguimientoPage = location.pathname === '/seguimiento'
  const isAnalisisPage = location.pathname === '/analisis'
  const isCalendarioPage = location.pathname === '/calendario'

  // Función para obtener el título de la página actual
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/seguimiento':
        return 'Seguimiento Deportivo'
      case '/analisis':
        return 'Análisis Físico'
      case '/calendario':
        return 'Calendario'
      case '/mas':
        return 'Más Opciones'
      default:
        return 'Athlete App'
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }



  const handleAddAthlete = (athlete) => {
    try {
      const stored = localStorage.getItem('comparatorAthletes')
      const comparators = stored ? JSON.parse(stored) : []
      const updated = [...comparators, athlete]
      localStorage.setItem('comparatorAthletes', JSON.stringify(updated))
      // Disparar evento personalizado para que SeguimientoPage se actualice
      window.dispatchEvent(new Event('comparatorAthletesChanged'))
    } catch (error) {
      console.error('Error al añadir atleta:', error)
    }
  }

  // Handlers para los botones de AnalisisPage
  const handleAddMeasurement = () => {
    window.dispatchEvent(new Event('openAddMeasurementDialog'))
  }

  const handleViewMeasurements = () => {
    window.dispatchEvent(new Event('openViewMeasurementsDialog'))
  }

  // Handler para el botón de CalendarioPage
  const handleAddEvent = () => {
    window.dispatchEvent(new Event('openAddEventDialog'))
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* AppBar mobile-optimized */}
      {!isSeguimientoPage && (
        <AppBar position="fixed" sx={{ width: '100%', zIndex: 1100, pt: 'env(safe-area-inset-top)' }}>
          <Toolbar sx={{ minHeight: { xs: 56 }, px: 2, display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontSize: { xs: '1.1rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {getPageTitle()}
            </Typography>

            {isAnalisisPage && (
              <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
                <IconButton
                  onClick={handleAddMeasurement}
                  sx={{
                    bgcolor: 'white',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' }
                  }}
                  aria-label="añadir nueva medición"
                >
                  <TbHeartPlus />
                </IconButton>
                <IconButton
                  onClick={handleViewMeasurements}
                  sx={{
                    bgcolor: 'white',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' }
                  }}
                  aria-label="visualizar mediciones"
                >
                  <TbEye />
                </IconButton>
              </Box>
            )}
            {isCalendarioPage && (
              <IconButton
                onClick={handleAddEvent}
                sx={{
                  bgcolor: 'white',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' },
                  ml: 1
                }}
                aria-label="añadir evento"
              >
                <TbCalendarPlus />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
      )}

      {/* Spacer para compensar AppBar fixed (56px + safe area), NO en seguimiento */}
      {!isSeguimientoPage && (
        <Box sx={{ height: 'calc(56px + env(safe-area-inset-top))' }} />
      )}

      {/* Diálogo para añadir atleta */}
      <AddAthleteDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onAdd={handleAddAthlete}
      />

      {/* Contenido principal con rutas */}
      <Box
        sx={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          // Dejamos que el scroll lo maneje la ventana (window)
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/seguimiento" replace />} />
          <Route path="/seguimiento" element={<SeguimientoPage />} />
          <Route path="/analisis" element={<AnalisisPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/mas" element={<MasPage />} />
        </Routes>
      </Box>

      {/* Bottom Navigation Bar - fijo en la parte inferior */}
      <BottomNavigationBar />
    </Box>
  )
}

function App() {
  // Obtener el base path desde import.meta.env.BASE_URL (configurado por Vite)
  const basename = import.meta.env.BASE_URL || '/'

  return (
    <Router
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AppContent />
    </Router>
  )
}

export default App

