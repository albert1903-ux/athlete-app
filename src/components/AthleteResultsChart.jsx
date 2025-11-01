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

function AthleteResultsChart() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState({ datos: [], pruebas: [] })
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [selectedPrueba, setSelectedPrueba] = useState(null)
  const [allPruebasData, setAllPruebasData] = useState({}) // Almacenar datos agrupados por prueba
  const [chartWidth, setChartWidth] = useState(300)

  // Calcular ancho del gráfico
  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth - 40 // Restar padding
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
            setChartData({ datos: [], pruebas: [] })
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

    // Cargar inicialmente
    loadAthlete()

    // Escuchar cambios en localStorage (entre pestañas)
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadAthlete()
      }
    }

    // Escuchar cambios mediante un evento personalizado (misma pestaña)
    const handleCustomStorageChange = () => {
      loadAthlete()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange)

    // Polling cada 500ms para detectar cambios en la misma pestaña
    const interval = setInterval(() => {
      loadAthlete()
    }, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Cargar resultados cuando cambia el atleta seleccionado
  useEffect(() => {
    if (selectedAthlete && selectedAthlete.atleta_id) {
      setSelectedPrueba(null) // Resetear selección de prueba al cambiar atleta
      fetchAthleteResults(selectedAthlete.atleta_id)
    } else {
      setChartData({ datos: [], pruebas: [] })
      setAllPruebasData({})
      setSelectedPrueba(null)
    }
  }, [selectedAthlete])

  const fetchAthleteResults = async (atletaId) => {
    setLoading(true)
    setError(null)

    try {
      // Intentar obtener todos los campos disponibles de resultados
      // Primero intentamos con relación a pruebas, luego sin ella
      let data = null
      let queryError = null

      // Intentar con relación a pruebas, obteniendo específicamente nombre y unidad_default
      // Probar diferentes formatos de relación posibles
      let result1 = null
      
      // Intentar formato 1: prueba:pruebas(...)
      try {
        result1 = await supabase
          .from('resultados')
          .select(`
            *,
            prueba:pruebas(prueba_id, nombre, unidad_default)
          `)
          .eq('atleta_id', atletaId)
          .order('fecha', { ascending: true })
        
        if (!result1.error) {
          data = result1.data
          queryError = null
        } else {
          throw result1.error
        }
      } catch (err1) {
        // Intentar formato 2: pruebas(...) directamente
        try {
          result1 = await supabase
            .from('resultados')
            .select(`
              *,
              pruebas(prueba_id, nombre, unidad_default)
            `)
            .eq('atleta_id', atletaId)
            .order('fecha', { ascending: true })
          
          if (!result1.error) {
            data = result1.data
            queryError = null
          } else {
            throw result1.error
          }
        } catch (err2) {
          // Si ambas relaciones fallan, obtener solo resultados y luego buscar pruebas por separado
          const result2 = await supabase
            .from('resultados')
            .select('*')
            .eq('atleta_id', atletaId)
            .order('fecha', { ascending: true })
          
          data = result2.data
          queryError = result2.error
          
          // Si tenemos datos pero sin relación, intentar obtener información desde tabla pruebas
          if (data && !queryError && data.length > 0) {
            // Obtener IDs únicos de pruebas
            const pruebaIds = [...new Set(data.map(r => r.prueba_id).filter(Boolean))]
            if (pruebaIds.length > 0) {
              try {
                const { data: pruebasData } = await supabase
                  .from('pruebas')
                  .select('prueba_id, nombre, unidad_default')
                  .in('prueba_id', pruebaIds)
                
                // Crear un mapa de prueba_id -> información de prueba
                const pruebasMap = new Map()
                if (pruebasData) {
                  pruebasData.forEach(p => {
                    if (p.prueba_id) {
                      pruebasMap.set(p.prueba_id, {
                        nombre: p.nombre,
                        unidad_default: p.unidad_default
                      })
                    }
                  })
                  
                  // Agregar información de pruebas a los resultados
                  data = data.map(resultado => ({
                    ...resultado,
                    prueba: pruebasMap.get(resultado.prueba_id) || null
                  }))
                }
              } catch (err3) {
                console.warn('No se pudo obtener información desde tabla pruebas:', err3)
              }
            }
          }
        }
      }

      if (queryError) throw queryError

      if (!data || data.length === 0) {
        setChartData({ datos: [], pruebas: [] })
        setLoading(false)
        return
      }

      // Procesar y agrupar datos por nombre de prueba
      const groupedByPrueba = {}

      data.forEach((resultado) => {
        // Obtener nombre de la prueba - intentar diferentes campos posibles
        let pruebaNombre = 'Prueba desconocida'
        let unidad = ''
        let marcaValor = null

        // Obtener nombre de prueba desde la tabla Pruebas (campo 'nombre')
        // Esta es la fuente de verdad para agrupar los resultados
        if (resultado.prueba && typeof resultado.prueba === 'object') {
          // Si hay relación con tabla pruebas - usar el campo 'nombre' de la tabla Pruebas
          pruebaNombre = resultado.prueba.nombre || resultado.prueba.prueba_nombre || 'Prueba desconocida'
          // Usar unidad_default de la tabla pruebas (prioridad más alta)
          unidad = resultado.prueba.unidad_default || ''
        } else if (resultado.prueba_nombre) {
          // Fallback: si no hay relación, intentar obtener desde campo directo
          pruebaNombre = resultado.prueba_nombre
        } else if (resultado.prueba) {
          // Último fallback
          pruebaNombre = typeof resultado.prueba === 'string' ? resultado.prueba : 'Prueba desconocida'
        }
        
        // Si no tenemos nombre de prueba válido, saltar este resultado
        if (!pruebaNombre || pruebaNombre === 'Prueba desconocida') {
          console.warn('Resultado sin nombre de prueba válido:', resultado)
          return
        }

        // Intentar obtener marca de diferentes campos
        if (resultado.marca_valor !== null && resultado.marca_valor !== undefined) {
          marcaValor = parseFloat(resultado.marca_valor)
        } else if (resultado.marca !== null && resultado.marca !== undefined) {
          // Si marca es string, intentar parsearlo
          const marcaStr = String(resultado.marca).trim()
          const marcaParsed = parseFloat(marcaStr.replace(',', '.'))
          if (!isNaN(marcaParsed)) {
            marcaValor = marcaParsed
          }
        }

        // Obtener unidad solo si no se obtuvo desde la tabla pruebas
        // unidad_default de pruebas tiene prioridad máxima
        if (!unidad) {
          unidad = resultado.marca_unidad || resultado.unidad || resultado.unidad_default || ''
        }

        // Si no hay valor de marca, saltar este resultado
        if (marcaValor === null || isNaN(marcaValor)) {
          return
        }

        // Crear clave única para la prueba
        if (!groupedByPrueba[pruebaNombre]) {
          groupedByPrueba[pruebaNombre] = {
            name: pruebaNombre,
            //unidad: unidad,
            data: []
          }
        }

        // Convertir fecha a formato adecuado para el gráfico
        let fecha = null
        if (resultado.fecha) {
          fecha = new Date(resultado.fecha)
        } else if (resultado.año && resultado.mes) {
          // Si hay año y mes pero no fecha completa
          fecha = new Date(resultado.año, resultado.mes - 1, 1)
        }

        const fechaFormateada = fecha && !isNaN(fecha.getTime())
          ? fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: fecha.getDate() === 1 ? undefined : 'numeric' })
          : resultado.año && resultado.mes
          ? `${new Date(resultado.año, resultado.mes - 1).toLocaleDateString('es-ES', { month: 'short' })} ${resultado.año}`
          : 'Fecha desconocida'

        // Agregar punto de datos
        groupedByPrueba[pruebaNombre].data.push({
          fecha: fechaFormateada,
          fechaTimestamp: fecha && !isNaN(fecha.getTime()) ? fecha.getTime() : (resultado.año ? new Date(resultado.año, resultado.mes || 0, 1).getTime() : 0),
          marca: marcaValor
        })
      })

      // Ordenar datos por fecha dentro de cada grupo
      Object.keys(groupedByPrueba).forEach(prueba => {
        groupedByPrueba[prueba].data.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp)
      })

      // Guardar datos agrupados para uso posterior
      setAllPruebasData(groupedByPrueba)

      // Crear lista de pruebas disponibles
      const pruebasList = Object.values(groupedByPrueba).map(grupo => ({
        nombre: grupo.name,
        unidad: grupo.unidad,
        color: getColorForPrueba(grupo.name)
      }))

      // Preparar datos para el gráfico de la prueba seleccionada (o primera si no hay selección)
      const pruebaAUsar = selectedPrueba || (pruebasList.length > 0 ? pruebasList[0].nombre : null)
      
      if (pruebaAUsar && groupedByPrueba[pruebaAUsar]) {
        const pruebaData = groupedByPrueba[pruebaAUsar]
        const datosGrafico = pruebaData.data.map(punto => ({
          fecha: punto.fecha,
          fechaTimestamp: punto.fechaTimestamp,
          marca: punto.marca
        }))
        
        setChartData({
          datos: datosGrafico,
          pruebas: [{
            nombre: pruebaData.name,
            unidad: pruebaData.unidad,
            color: getColorForPrueba(pruebaData.name)
          }]
        })
        
        // Seleccionar la primera prueba por defecto si no hay ninguna seleccionada
        if (!selectedPrueba && pruebasList.length > 0) {
          setSelectedPrueba(pruebasList[0].nombre)
        }
      } else {
        setChartData({
          datos: [],
          pruebas: pruebasList
        })
      }
    } catch (err) {
      console.error('Error al obtener resultados:', err)
      setError(err.message || 'Error al cargar los resultados del atleta')
      setChartData({ datos: [], pruebas: [] })
      setAllPruebasData({})
    } finally {
      setLoading(false)
    }
  }

  // Función para preparar datos del gráfico según la prueba seleccionada
  const prepareChartData = (groupedByPrueba, pruebaSeleccionada, pruebasList) => {
    if (!pruebaSeleccionada || !groupedByPrueba[pruebaSeleccionada]) {
      setChartData({
        datos: [],
        pruebas: pruebasList || []
      })
      return
    }

    // Obtener datos solo de la prueba seleccionada
    const pruebaData = groupedByPrueba[pruebaSeleccionada]
    
    // Preparar datos para el gráfico
    const datosGrafico = pruebaData.data.map(punto => ({
      fecha: punto.fecha,
      fechaTimestamp: punto.fechaTimestamp,
      marca: punto.marca
    }))

    setChartData({
      datos: datosGrafico,
      pruebas: [{
        nombre: pruebaData.name,
        unidad: pruebaData.unidad,
        color: getColorForPrueba(pruebaData.name)
      }]
    })
  }

  // Manejar cambio de prueba seleccionada
  const handlePruebaChange = (event, newPrueba) => {
    if (newPrueba !== null) {
      setSelectedPrueba(newPrueba)
      prepareChartData(allPruebasData, newPrueba, Object.values(allPruebasData).map(grupo => ({
        nombre: grupo.name,
        unidad: grupo.unidad,
        color: getColorForPrueba(grupo.name)
      })))
    }
  }

  // Actualizar gráfico cuando cambia la prueba seleccionada manualmente
  useEffect(() => {
    if (selectedPrueba && Object.keys(allPruebasData).length > 0) {
      prepareChartData(allPruebasData, selectedPrueba, Object.values(allPruebasData).map(grupo => ({
        nombre: grupo.name,
        unidad: grupo.unidad,
        color: getColorForPrueba(grupo.name)
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrueba])

  // Función para asignar colores a las pruebas
  const getColorForPrueba = (nombrePrueba) => {
    const colors = [
      '#1976d2', // Azul
      '#d32f2f', // Rojo
      '#388e3c', // Verde
      '#f57c00', // Naranja
      '#7b1fa2', // Púrpura
      '#0288d1', // Azul claro
      '#c2185b', // Rosa
      '#00796b', // Verde azulado
      '#e64a19', // Rojo oscuro
      '#5d4037'  // Marrón
    ]
    
    // Hash simple para asignar color consistente
    let hash = 0
    for (let i = 0; i < nombrePrueba.length; i++) {
      hash = nombrePrueba.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Función para formatear valores en segundos
  const formatTiempo = (segundos, unidad) => {
    if (segundos === null || segundos === undefined || isNaN(segundos)) {
      return ''
    }

    // Solo formatear si la unidad es segundos (s)
    const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
    const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'
    
    if (!esSegundos) {
      // Si no es segundos, formatear como número normal
      return segundos % 1 === 0 ? segundos.toString() : segundos.toFixed(2)
    }

    // Si es mayor o igual a 60 segundos: Minutos:Segundos.Milisegundos
    if (segundos >= 60) {
      const minutos = Math.floor(segundos / 60)
      const segundosRestantes = segundos % 60
      
      // Formatear segundos con centésimas (2 decimales)
      const segundosFormateados = segundosRestantes.toFixed(2).padStart(5, '0')
      
      return `${minutos}:${segundosFormateados}`
    } else {
      // Si es menor a 60 segundos: Segundos.Milisegundos
      return segundos.toFixed(2)
    }
  }

  // Función para formatear el tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const entry = payload[0]
      if (entry.value !== null && entry.value !== undefined) {
        const prueba = chartData.pruebas?.[0]
        const unidad = prueba?.unidad || ''
        const valorFormateado = formatTiempo(entry.value, unidad)
        // Para tiempos en segundos, no agregar la unidad "s" ya que está implícita en el formato
        const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
        const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'
        const textoUnidad = esSegundos ? '' : (unidad ? ` ${unidad}` : '')
        
        return (
          <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)' }} elevation={3}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: entry.color }}
            >
              {prueba ? `${prueba.nombre}: ${valorFormateado}${textoUnidad}` : `Marca: ${valorFormateado}${textoUnidad}`}
            </Typography>
          </Paper>
        )
      }
    }
    return null
  }

  if (!selectedAthlete) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Selecciona un atleta para ver sus resultados
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

  if (!chartData.datos || chartData.datos.length === 0) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
            Resultados de {selectedAthlete.nombre}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No se encontraron resultados para este atleta
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const pruebasDisponibles = Object.keys(allPruebasData).length > 0
    ? Object.values(allPruebasData).map(grupo => grupo.name)
    : []

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
          Evolución de Resultados - {selectedAthlete.nombre}
        </Typography>
        
        {/* Segmented Control para seleccionar prueba */}
        {pruebasDisponibles.length > 0 && (
          <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
            <ToggleButtonGroup
              value={selectedPrueba}
              exclusive
              onChange={handlePruebaChange}
              aria-label="seleccionar prueba"
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
              {pruebasDisponibles.map((pruebaNombre) => (
                <ToggleButton key={pruebaNombre} value={pruebaNombre} aria-label={pruebaNombre}>
                  {pruebaNombre}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Gráfico */}
        {chartData.datos && chartData.datos.length > 0 ? (
          <>
            <Box sx={{ mt: 2, width: '100%', overflow: 'auto' }}>
              <LineChart
                width={chartWidth}
                height={300}
                data={chartData.datos}
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
                    />
                    <YAxis 
                      label={{ 
                        value: chartData.pruebas?.[0]?.unidad ? `Valor (${chartData.pruebas[0].unidad})` : 'Valor', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: '10px' }
                      }}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const unidad = chartData.pruebas?.[0]?.unidad || ''
                        return formatTiempo(value, unidad)
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {chartData.pruebas && chartData.pruebas.length > 0 ? (
                      chartData.pruebas.map((prueba, index) => (
                        <Line
                          key={index}
                          type="monotone"
                          dataKey="marca"
                          stroke={prueba.color || '#1976d2'}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                          name={prueba.nombre}
                        />
                      ))
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="marca"
                        stroke="#1976d2"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    )}
              </LineChart>
            </Box>

            {chartData.pruebas && chartData.pruebas.length > 0 && chartData.pruebas[0].unidad && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Unidad:</strong> {chartData.pruebas[0].unidad}
                </Typography>
              </Box>
            )}
          </>
        ) : selectedPrueba && (
          <Box sx={{ mt: 2, p: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              No hay datos disponibles para esta prueba
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default AthleteResultsChart
