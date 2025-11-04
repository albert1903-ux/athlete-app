import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'selectedAthlete'

// Tooltip personalizado
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {new Date(data.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Altura:</strong> {data.altura} cm
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Peso:</strong> {data.peso} kg
        </Typography>
      </Paper>
    )
  }
  return null
}

function AthleteHeightWeightScatter() {
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartWidth, setChartWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(300, window.innerWidth - 40)
    }
    return 300
  })

  // Calcular ancho del gráfico
  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth - 40
      setChartWidth(Math.max(300, width))
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Cargar atleta seleccionado desde localStorage
  useEffect(() => {
    let lastAthleteId = null

    const loadAthlete = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const athlete = JSON.parse(stored)
          // Solo actualizar si el atleta realmente cambió
          if (athlete.atleta_id !== lastAthleteId) {
            lastAthleteId = athlete.atleta_id
            setSelectedAthlete(athlete)
          }
        } else {
          if (lastAthleteId !== null) {
            lastAthleteId = null
            setSelectedAthlete(null)
          }
        }
      } catch (error) {
        console.error('Error al cargar atleta:', error)
        if (lastAthleteId !== null) {
          lastAthleteId = null
          setSelectedAthlete(null)
        }
      }
    }

    // Cargar inicialmente
    loadAthlete()

    const interval = setInterval(loadAthlete, 500)

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadAthlete()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Cargar mediciones cuando cambia el atleta
  useEffect(() => {
    const fetchMeasurements = async () => {
      if (!selectedAthlete?.atleta_id) {
        setMeasurements([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('medidas_corporales')
          .select('*')
          .eq('atleta_id', selectedAthlete.atleta_id)
          .not('altura', 'is', null)
          .not('peso', 'is', null)
          .order('fecha', { ascending: true })

        if (fetchError) throw fetchError

        setMeasurements(data || [])
      } catch (err) {
        console.error('Error al cargar mediciones:', err)
        setError('Error al cargar las mediciones corporales')
      } finally {
        setLoading(false)
      }
    }

    fetchMeasurements()
  }, [selectedAthlete?.atleta_id])

  // Preparar datos para el gráfico
  const chartData = measurements.map(m => ({
    altura: Number(m.altura),
    peso: Number(m.peso),
    fecha: m.fecha
  }))

  // Calcular dominios para los ejes
  const alturaDomain = chartData.length > 0
    ? [
        Math.min(...chartData.map(d => d.altura)) - 5,
        Math.max(...chartData.map(d => d.altura)) + 5
      ]
    : [0, 200]

  const pesoDomain = chartData.length > 0
    ? [
        Math.min(...chartData.map(d => d.peso)) - 5,
        Math.max(...chartData.map(d => d.peso)) + 5
      ]
    : [0, 100]

  if (!selectedAthlete) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <ScatterPlotIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h6">Relación Altura-Peso</Typography>
          </Box>
          <Alert severity="info">
            Selecciona un atleta para ver su gráfico de altura vs peso
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <ScatterPlotIcon color="primary" sx={{ fontSize: 40 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h2">
              Relación Altura-Peso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedAthlete.nombre}
            </Typography>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            {chartData.length > 0 && chartWidth > 0 ? (
              <Box
                sx={{
                  width: '100%',
                  mt: 2,
                  overflow: 'auto'
                }}
              >
                <ScatterChart
                  width={chartWidth}
                  height={400}
                  margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis
                      type="number"
                      dataKey="altura"
                      name="Altura"
                      unit=" cm"
                      domain={alturaDomain}
                      label={{
                        value: 'Altura (cm)',
                        position: 'insideBottom',
                        offset: -5
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="peso"
                      name="Peso"
                      unit=" kg"
                      domain={pesoDomain}
                      label={{
                        value: 'Peso (kg)',
                        angle: -90,
                        position: 'insideLeft'
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter
                      name="Mediciones"
                      data={chartData}
                      fill="#1976d2"
                    />
                  </ScatterChart>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No hay mediciones disponibles con altura y peso para este atleta.
              </Alert>
            )}

            {chartData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Mostrando {chartData.length} medición(es)
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default AthleteHeightWeightScatter

