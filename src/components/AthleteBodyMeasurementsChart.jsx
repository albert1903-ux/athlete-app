import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'selectedAthlete'

const MEASUREMENT_TYPES = {
  peso: { label: 'Peso', unit: 'kg', color: '#1976d2' },
  altura: { label: 'Altura', unit: 'cm', color: '#d32f2f' },
  imc: { label: 'IMC', unit: '', color: '#388e3c' },
  envergadura: { label: 'Envergadura', unit: 'cm', color: '#f57c00' }
}

function AthleteBodyMeasurementsChart() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [selectedMeasurement, setSelectedMeasurement] = useState('peso')
  const [chartData, setChartData] = useState([])
  const [chartWidth, setChartWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      // Calcular ancho considerando padding y márgenes
      const padding = 32 // 16px a cada lado (px: 2 = 16px)
      return Math.max(300, window.innerWidth - padding)
    }
    return 300
  })

  // Calcular ancho del gráfico
  useEffect(() => {
    const updateWidth = () => {
      // Calcular ancho considerando padding y márgenes para evitar overflow
      const padding = 32 // 16px a cada lado (px: 2 = 16px)
      const width = window.innerWidth - padding
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
          if (athlete.atleta_id !== lastAthleteId) {
            lastAthleteId = athlete.atleta_id
            setSelectedAthlete(athlete)
          }
        } else {
          if (lastAthleteId !== null) {
            lastAthleteId = null
            setSelectedAthlete(null)
            setChartData([])
          }
        }
      } catch (error) {
        console.error('Error al cargar atleta desde localStorage:', error)
        if (lastAthleteId !== null) {
          lastAthleteId = null
          setSelectedAthlete(null)
        }
      }
    }

    loadAthlete()

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadAthlete()
      }
    }

    const handleCustomStorageChange = () => {
      loadAthlete()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
    }
  }, [])

  // Cargar datos de medidas corporales
  useEffect(() => {
    const fetchMeasurements = async () => {
      if (!selectedAthlete || !selectedAthlete.atleta_id) {
        setChartData([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('medidas_corporales')
          .select('*')
          .eq('atleta_id', selectedAthlete.atleta_id)
          .order('fecha', { ascending: true })

        if (fetchError) {
          throw fetchError
        }

        if (!data || data.length === 0) {
          setChartData([])
          setLoading(false)
          return
        }

        // Procesar datos para el gráfico
        const processedData = data.map((medida) => {
          // Formatear fecha a solo mes y año
          const fecha = medida.fecha ? new Date(medida.fecha) : null
          const fechaFormateada = fecha && !isNaN(fecha.getTime())
            ? fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
            : 'Fecha desconocida'

          return {
            fecha: fechaFormateada,
            fechaTimestamp: fecha && !isNaN(fecha.getTime()) ? fecha.getTime() : 0,
            peso: medida.peso || null,
            altura: medida.altura || null,
            imc: medida.imc || null,
            envergadura: medida.envergadura || null
          }
        })

        // Ordenar por fecha
        processedData.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp)

        setChartData(processedData)
      } catch (err) {
        console.error('Error al obtener medidas corporales:', err)
        setError(err.message || 'Error al cargar las medidas corporales')
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchMeasurements()
  }, [selectedAthlete])

  // Manejar cambio de tipo de medida
  const handleMeasurementChange = (event, newMeasurement) => {
    if (newMeasurement !== null) {
      setSelectedMeasurement(newMeasurement)
    }
  }

  // Función para formatear el tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const measurementType = MEASUREMENT_TYPES[selectedMeasurement]
      const unit = measurementType.unit ? ` ${measurementType.unit}` : ''
      
      return (
        <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)' }} elevation={3}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry, index) => {
            if (entry.value !== null && entry.value !== undefined) {
              const valorFormateado = typeof entry.value === 'number' 
                ? entry.value.toFixed(2) 
                : entry.value
              return (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ color: entry.color }}
                >
                  {entry.name}: {valorFormateado}{unit}
                </Typography>
              )
            }
            return null
          })}
        </Paper>
      )
    }
    return null
  }

  if (!selectedAthlete) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Selecciona un atleta para ver sus medidas corporales
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
            Evolución de Medidas Corporales - {selectedAthlete.nombre}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No se encontraron medidas corporales para este atleta
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const measurementType = MEASUREMENT_TYPES[selectedMeasurement]
  const dataKey = selectedMeasurement
  const hasData = chartData.some(point => point[dataKey] !== null && point[dataKey] !== undefined)

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
          Evolución de Medidas Corporales - {selectedAthlete.nombre}
        </Typography>
        
        {/* Segmented Control para seleccionar tipo de medida */}
        <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
          <ToggleButtonGroup
            value={selectedMeasurement}
            exclusive
            onChange={handleMeasurementChange}
            aria-label="seleccionar medida"
            size="small"
            sx={{
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                fontSize: '0.875rem',
                px: 1.5,
                py: 0.75,
              }
            }}
          >
            {Object.keys(MEASUREMENT_TYPES).map((key) => (
              <ToggleButton key={key} value={key} aria-label={MEASUREMENT_TYPES[key].label}>
                {MEASUREMENT_TYPES[key].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Gráfico */}
        {hasData && chartWidth > 0 ? (
          <Box sx={{ mt: 2, width: '100%', overflow: 'hidden' }}>
            <LineChart
              width={chartWidth}
              height={300}
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="fecha"
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
                label={{
                  value: 'Fecha',
                  position: 'insideBottom',
                  offset: -10,
                  style: { textAnchor: 'middle', fontSize: '10px' }
                }}
              />
              <YAxis
                label={{
                  value: measurementType.unit ? `Valor (${measurementType.unit})` : 'Valor',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '10px' }
                }}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  return typeof value === 'number' ? value.toFixed(2) : value
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={measurementType.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
                name={measurementType.label}
              />
            </LineChart>
          </Box>
        ) : (
          <Box sx={{ mt: 2, p: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              No hay datos disponibles para {measurementType.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default AthleteBodyMeasurementsChart

