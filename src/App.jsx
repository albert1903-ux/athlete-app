import { useState, useEffect, useCallback } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { supabase } from './lib/supabase'
import AthleteSelector from './components/AthleteSelector'
import AthleteResultsChart from './components/AthleteResultsChart'
import AthleteComparator from './components/AthleteComparator'
import AthleteSpiderChart from './components/AthleteSpiderChart'

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [comparatorAthletes, setComparatorAthletes] = useState([])

  const handleComparatorsChange = useCallback((comparators) => {
    setComparatorAthletes(comparators)
  }, [])


  const testConnection = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Test simple de conexión usando una tabla real de Supabase
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .limit(1)
      
      if (error) throw error
      
      setConnected(true)
    } catch (err) {
      setError(err.message)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Verificar conexión al cargar
  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Box 
      sx={{ 
        width: '100%',
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* AppBar mobile-optimized */}
      <AppBar position="sticky" sx={{ width: '100%' }}>
        <Toolbar sx={{ minHeight: { xs: 56 }, px: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1.1rem' } }}>
            My Athlete
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Contenido principal - columna única para mobile */}
      <Box
        sx={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          px: 2,
          py: 2,
          gap: 2
        }}
      >
        {/* Componente selector de atleta */}
        <Box sx={{ width: '100%' }}>
          <AthleteSelector />
        </Box>

        {/* Componente comparador de atletas */}
        <Box sx={{ width: '100%' }}>
          <AthleteComparator onComparatorsChange={handleComparatorsChange} />
        </Box>

        {/* Componente gráfico de araña */}
        <Box sx={{ width: '100%' }}>
          <AthleteSpiderChart comparatorAthletes={comparatorAthletes} />
        </Box>

        {/* Componente gráfico de resultados */}
        <Box sx={{ width: '100%' }}>
          <AthleteResultsChart comparatorAthletes={comparatorAthletes} />
        </Box>

        {/* Card de estado de conexión */}
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ px: 2, py: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
              Estado de Conexión
            </Typography>
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Error: {error}
              </Alert>
            )}
            
            {connected && !loading && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Conectado a Supabase correctamente
              </Alert>
            )}
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button 
              size="small" 
              onClick={testConnection}
              disabled={loading}
              fullWidth
              variant="outlined"
            >
              Probar Conexión
            </Button>
          </CardActions>
        </Card>
      </Box>

      {/* Footer mobile-optimized */}
      <Box
        component="footer"
        sx={{
          width: '100%',
          py: 2,
          px: 2,
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center"
          sx={{ fontSize: { xs: '0.75rem' } }}
        >
          Athlete App - © {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  )
}

export default App
