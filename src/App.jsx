import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
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

  const handleOpenDialog = () => {
    setDialogOpen(true)
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
      <AppBar position="sticky" sx={{ width: '100%', zIndex: 1100 }}>
        <Toolbar sx={{ minHeight: { xs: 56 }, px: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1.1rem' } }}>
            {getPageTitle()}
          </Typography>
          {isSeguimientoPage && (
            <IconButton
              onClick={handleOpenDialog}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'secondary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                },
                fontSize: '0.875rem',
                fontWeight: 700,
                ml: 1,
                textTransform: 'none',
                minWidth: 40,
                padding: 0
              }}
              aria-label="añadir atleta para comparar"
            >
              VS
            </IconButton>
          )}
          {isAnalisisPage && (
            <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
              <IconButton
                onClick={handleAddMeasurement}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'secondary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'secondary.dark',
                  },
                }}
                aria-label="añadir nueva medición"
              >
                <AddIcon />
              </IconButton>
              <IconButton
                onClick={handleViewMeasurements}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'secondary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'secondary.dark',
                  },
                }}
                aria-label="visualizar mediciones"
              >
                <VisibilityIcon />
              </IconButton>
            </Box>
          )}
          {isCalendarioPage && (
            <IconButton
              onClick={handleAddEvent}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'secondary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                },
                ml: 1
              }}
              aria-label="añadir evento"
            >
              <AddIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

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
          overflowY: 'auto',
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
  return (
    <Router
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
