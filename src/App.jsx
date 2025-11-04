import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import BottomNavigationBar from './components/BottomNavigationBar'
import SeguimientoPage from './pages/SeguimientoPage'
import AnalisisPage from './pages/AnalisisPage'
import CalendarioPage from './pages/CalendarioPage'
import MasPage from './pages/MasPage'

function App() {

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
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
              My Athlete
            </Typography>
          </Toolbar>
        </AppBar>

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
    </Router>
  )
}

export default App
