import { useState, useEffect, useMemo, useCallback } from 'react'
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts'
import { supabase } from '../lib/supabase'
import { initializeColorsForComparators, getColorForAthlete } from '../utils/athleteColors'

const STORAGE_KEY = 'selectedAthlete'

function AthleteSpiderChart({ comparatorAthletes = [] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [athleteData, setAthleteData] = useState({})
  const [allPruebas, setAllPruebas] = useState([])
  const [radarData, setRadarData] = useState([])
  const [chartDimensions, setChartDimensions] = useState({
    width: typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 40) : 300,
    height: 400
  })

  // Calcular dimensiones del gráfico
  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.max(300, window.innerWidth - 40)
      setChartDimensions({ width, height: 400 })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
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
            setAthleteData({})
            setAllPruebas([])
            setRadarData([])
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

    const interval = setInterval(() => {
      loadAthlete()
    }, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Determinar si una prueba es de tiempo (menor es mejor) o distancia/altura (mayor es mejor)
  const isTimeBasedPrueba = (pruebaNombre, unidad) => {
    const nombreLower = pruebaNombre.toLowerCase()
    const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
    
    // Pruebas de campo donde mayor es mejor
    const distanceKeywords = ['longitud', 'altura', 'peso', 'disco', 'jabalina', 'martillo', 'pértiga', 'garrocha', 'triple']
    if (distanceKeywords.some(keyword => nombreLower.includes(keyword))) {
      return false
    }
    
    // Si la unidad indica segundos o tiempo
    if (unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos') {
      return true
    }
    
    // Si el nombre contiene 'm' pero no es de campo, probablemente es de tiempo
    // (60m, 100m, 200m, 600m, 1000m son de tiempo)
    if (/\d+m\b/.test(nombreLower) && !distanceKeywords.some(keyword => nombreLower.includes(keyword))) {
      return true
    }
    
    // Por defecto, si no está claro, asumir que es tiempo
    return true
  }

  // Obtener el mejor resultado de una prueba
  const getBestResult = (results, isTimeBased) => {
    if (!results || results.length === 0) return null
    
    const validResults = results
      .map(r => {
        let valor = null
        if (r.marca_valor !== null && r.marca_valor !== undefined) {
          valor = parseFloat(r.marca_valor)
        } else if (r.marca !== null && r.marca !== undefined) {
          const marcaStr = String(r.marca).trim().replace(',', '.')
          // Convertir formato tiempo (MM:SS.mm) a segundos
          if (marcaStr.includes(':')) {
            const parts = marcaStr.split(':')
            if (parts.length === 2) {
              const minutos = parseFloat(parts[0]) || 0
              const segundos = parseFloat(parts[1]) || 0
              valor = minutos * 60 + segundos
            } else {
              valor = parseFloat(marcaStr)
            }
          } else {
            valor = parseFloat(marcaStr)
          }
        }
        return !isNaN(valor) ? valor : null
      })
      .filter(v => v !== null)
    
    if (validResults.length === 0) return null
    
    return isTimeBased 
      ? Math.min(...validResults) // Menor tiempo es mejor
      : Math.max(...validResults) // Mayor distancia/altura es mejor
  }

  // Cargar resultados de un atleta
  const fetchAthleteResults = async (atletaId) => {
    try {
        let data = null
        let result1 = null
        
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
          } else {
            throw result1.error
          }
        } catch (err1) {
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
            } else {
              throw result1.error
            }
          } catch (err2) {
            const result2 = await supabase
              .from('resultados')
              .select('*')
              .eq('atleta_id', atletaId)
              .order('fecha', { ascending: true })
            
            data = result2.data
            
            if (data && !result2.error && data.length > 0) {
              const pruebaIds = [...new Set(data.map(r => r.prueba_id).filter(Boolean))]
              if (pruebaIds.length > 0) {
                try {
                  const { data: pruebasData } = await supabase
                    .from('pruebas')
                    .select('prueba_id, nombre, unidad_default')
                    .in('prueba_id', pruebaIds)
                  
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
                  }
                  
                  data = data.map(resultado => ({
                    ...resultado,
                    prueba: pruebasMap.get(resultado.prueba_id) || null
                  }))
                } catch (err3) {
                  console.warn('No se pudo obtener información desde tabla pruebas:', err3)
                }
              }
            }
          }
        }

        if (!data || data.length === 0) return {}

        // Agrupar por prueba y obtener el mejor resultado
        const groupedByPrueba = {}

        data.forEach((resultado) => {
          let pruebaNombre = 'Prueba desconocida'
          let unidad = ''

          if (resultado.prueba && typeof resultado.prueba === 'object') {
            pruebaNombre = resultado.prueba.nombre || resultado.prueba.prueba_nombre || 'Prueba desconocida'
            unidad = resultado.prueba.unidad_default || ''
          } else if (resultado.prueba_nombre) {
            pruebaNombre = resultado.prueba_nombre
          }

          if (!pruebaNombre || pruebaNombre === 'Prueba desconocida') {
            return
          }

          if (!unidad) {
            unidad = resultado.marca_unidad || resultado.unidad || resultado.unidad_default || ''
          }

          if (!groupedByPrueba[pruebaNombre]) {
            groupedByPrueba[pruebaNombre] = {
              nombre: pruebaNombre,
              unidad: unidad,
              resultados: []
            }
          }

          groupedByPrueba[pruebaNombre].resultados.push(resultado)
        })

        // Calcular el mejor resultado para cada prueba
        const bestResults = {}
        Object.keys(groupedByPrueba).forEach(pruebaNombre => {
          const grupo = groupedByPrueba[pruebaNombre]
          const isTimeBased = isTimeBasedPrueba(pruebaNombre, grupo.unidad)
          const bestResult = getBestResult(grupo.resultados, isTimeBased)
          
          if (bestResult !== null) {
            bestResults[pruebaNombre] = {
              nombre: pruebaNombre,
              unidad: grupo.unidad,
              valor: bestResult,
              isTimeBased: isTimeBased
            }
          }
        })

        return bestResults
      } catch (err) {
        console.error('Error al obtener resultados:', err)
        return null
      }
  }

  // Cargar datos de todos los atletas
  useEffect(() => {
    const loadAllData = async () => {
      if (!selectedAthlete || !selectedAthlete.atleta_id) {
        setAthleteData({})
        setAllPruebas([])
        setRadarData([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const allAthletes = [selectedAthlete, ...comparatorAthletes]
        const athleteResults = {}

        // Cargar resultados de cada atleta
        for (const athlete of allAthletes) {
          const results = await fetchAthleteResults(athlete.atleta_id)
          if (results) {
            // Usar string como clave para consistencia
            const atletaIdKey = String(athlete.atleta_id)
            athleteResults[atletaIdKey] = {
              nombre: athlete.nombre,
              resultados: results,
              atleta_id: athlete.atleta_id // Guardar también el ID original
            }
            // Debug: verificar que los datos se cargaron
            console.log(`[SpiderChart] Datos cargados para ${athlete.nombre}:`, {
              atletaIdKey,
              pruebas: Object.keys(results),
              cantidadPruebas: Object.keys(results).length
            })
          } else {
            console.warn(`[SpiderChart] No se encontraron resultados para ${athlete.nombre} (${athlete.atleta_id})`)
          }
        }

        // Verificar que se cargaron datos para TODOS los atletas esperados
        const expectedAthletes = [selectedAthlete, ...comparatorAthletes]
        const loadedAthleteIds = Object.keys(athleteResults).map(k => parseInt(k))
        const expectedAthleteIds = expectedAthletes.map(a => a.atleta_id)
        
        console.log(`[SpiderChart] Verificación de carga:`, {
          esperados: expectedAthleteIds,
          cargados: loadedAthleteIds,
          todosCargados: expectedAthleteIds.every(id => loadedAthleteIds.includes(id))
        })

        setAthleteData(athleteResults)

        // Encontrar todas las pruebas únicas (de TODOS los atletas)
        const pruebasSet = new Set()
        Object.values(athleteResults).forEach(athlete => {
          Object.keys(athlete.resultados).forEach(prueba => {
            pruebasSet.add(prueba)
          })
        })

        const pruebasList = Array.from(pruebasSet)
        console.log(`[SpiderChart] Todas las pruebas encontradas:`, pruebasList)
        console.log(`[SpiderChart] Datos por atleta en athleteResults:`, Object.keys(athleteResults).map(k => ({
          key: k,
          nombre: athleteResults[k]?.nombre,
          pruebas: Object.keys(athleteResults[k]?.resultados || {})
        })))
        setAllPruebas(pruebasList)
      } catch (err) {
        console.error('Error al cargar datos:', err)
        setError(err.message || 'Error al cargar los resultados')
      } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [selectedAthlete, comparatorAthletes])

  // Lista de todos los atletas (principal + comparadores) - DEFINIR ANTES DEL useEffect
  const allAthletes = useMemo(() => {
    if (!selectedAthlete) return []
    return [selectedAthlete, ...comparatorAthletes]
  }, [selectedAthlete, comparatorAthletes])

  // Preparar datos para el gráfico de araña
  useEffect(() => {
    if (allPruebas.length === 0 || Object.keys(athleteData).length === 0 || allAthletes.length === 0) {
      setRadarData([])
      return
    }

    // Recopilar todos los valores para normalización (por cada prueba individualmente)
    // Añadir un margen del 20% para mejorar la comparación visual
    const allValues = {}
    allPruebas.forEach(prueba => {
      const valores = []
      let isTimeBased = true
      let unidad = ''
      
      // Recopilar valores de todos los atletas que tienen esta prueba
      Object.values(athleteData).forEach(athlete => {
        if (athlete.resultados[prueba]) {
          valores.push(athlete.resultados[prueba].valor)
          isTimeBased = athlete.resultados[prueba].isTimeBased ?? true
          unidad = athlete.resultados[prueba].unidad || unidad
        }
      })
      
      if (valores.length > 0) {
        const min = Math.min(...valores)
        const max = Math.max(...valores)
        
        // Usar los valores mínimo y máximo reales sin márgenes adicionales
        allValues[prueba] = {
          min: min,
          max: max,
          isTimeBased: isTimeBased,
          unidad: unidad
        }
      }
    })

    // Crear datos del gráfico
    const radarDataArray = allPruebas.map(prueba => {
      const range = allValues[prueba]
      const entry = {
        prueba: prueba,
        unidad: range?.unidad || ''
      }

      // Añadir valor para cada atleta (normalizado a 0-100)
      // IMPORTANTE: iterar sobre TODOS los atletas usando allAthletes para asegurar consistencia
      allAthletes.forEach(athlete => {
        const atletaIdKey = String(athlete.atleta_id)
        const athleteDataEntry = athleteData[atletaIdKey]
        
        // SIEMPRE crear la entrada para este atleta, incluso si no tiene datos
        if (athleteDataEntry && athleteDataEntry.resultados[prueba]) {
          const valor = athleteDataEntry.resultados[prueba].valor
          
          // Si hay range (hay otros atletas con esta prueba), normalizar
          if (range) {
            // Normalizar: para tiempo (menor es mejor), invertir la escala
            // Para distancia (mayor es mejor), usar escala normal
            // Usar un rango de 30-130 para dejar márgenes visuales
            // El rango expandido (con margen del 20%) permite mejor comparación visual
            const MIN_VALUE = 30  // Valor mínimo visible con margen
            const MAX_VALUE = 130
            const RANGE_SIZE = MAX_VALUE - MIN_VALUE  // 100
            
            let normalized = MIN_VALUE
            if (range.max !== range.min) {
              // Calcular la posición del valor en el rango expandido (con margen del 20%)
              const positionInExpandedRange = (valor - range.min) / (range.max - range.min)
              
              if (range.isTimeBased) {
                // Invertir: mejor tiempo (menor) = 130, peor tiempo (mayor) = 30
                // En tiempo, menor es mejor, así que invertimos la posición
                normalized = MAX_VALUE - (positionInExpandedRange * RANGE_SIZE)
              } else {
                // Normal: mejor distancia (mayor) = 130, peor distancia (menor) = 30
                normalized = MIN_VALUE + (positionInExpandedRange * RANGE_SIZE)
              }
            } else {
              // Si todos los valores son iguales (o solo hay uno), usar 130 como mejor
              normalized = MAX_VALUE
            }
            
            // Asegurar que el valor esté dentro del rango visible
            entry[atletaIdKey] = Math.max(MIN_VALUE, Math.min(MAX_VALUE, normalized))
          } else {
            // Si no hay range (solo este atleta tiene esta prueba), usar 130 (mejor)
            entry[atletaIdKey] = 130
          }
          
          // Guardar el valor real para el tooltip
          entry[`${atletaIdKey}_real`] = valor
          entry[`${atletaIdKey}_unidad`] = athleteDataEntry.resultados[prueba].unidad || (range?.unidad || '')
        } else {
          // Si el atleta no tiene esta prueba, usar 0 para diferenciarlo visualmente
          // de los atletas que sí tienen la prueba pero con resultados bajos
          entry[atletaIdKey] = 0
        }
      })

      return entry
    })

    // Debug: verificar que los datos se construyeron correctamente
    console.log(`[SpiderChart] ===== DATOS DEL GRÁFICO CONSTRUIDOS =====`)
    console.log(`[SpiderChart] Total pruebas: ${radarDataArray.length}`)
    console.log(`[SpiderChart] Pruebas:`, radarDataArray.map(e => e.prueba))
    console.log(`[SpiderChart] Atletas en allAthletes:`, allAthletes.map(a => ({ nombre: a.nombre, id: String(a.atleta_id) })))
    console.log(`[SpiderChart] Atletas en athleteData:`, Object.keys(athleteData).map(k => ({ key: k, nombre: athleteData[k]?.nombre })))
    
    // Verificar que CADA entrada tiene claves para TODOS los atletas
    console.log(`[SpiderChart] Verificación de claves por entrada:`)
    radarDataArray.forEach((entry, idx) => {
      const clavesAtletas = Object.keys(entry).filter(k => 
        !k.includes('_real') && 
        !k.includes('_unidad') && 
        k !== 'prueba' && 
        k !== 'unidad'
      )
      const atletasEsperados = allAthletes.map(a => String(a.atleta_id))
      const faltantes = atletasEsperados.filter(id => !clavesAtletas.includes(id))
      
      console.log(`[SpiderChart]   ${entry.prueba}:`, {
        clavesPresentes: clavesAtletas,
        atletasEsperados: atletasEsperados,
        faltantes: faltantes.length > 0 ? faltantes : 'NINGUNO',
        valores: clavesAtletas.map(k => ({ clave: k, valor: entry[k] }))
      })
    })
    
    // Datos por atleta para verificar valores
    console.log(`[SpiderChart] Datos por atleta (valores normalizados):`)
    allAthletes.forEach(athlete => {
      const atletaIdKey = String(athlete.atleta_id)
      const valores = radarDataArray.map(e => ({ 
        prueba: e.prueba, 
        valorNormalizado: e[atletaIdKey] !== undefined ? e[atletaIdKey] : 'NO DEFINIDO',
        valorReal: e[`${atletaIdKey}_real`] || 'NO TIENE'
      }))
      console.log(`[SpiderChart]   ${athlete.nombre} (${atletaIdKey}):`, valores)
    })
    
    console.log(`[SpiderChart] ========================================`)

    setRadarData(radarDataArray)
  }, [allPruebas, athleteData, allAthletes])

  // Colores para los atletas usando el módulo compartido
  const athleteColors = useMemo(() => {
    const colorMap = {}
    
    // Color para el atleta principal
    if (selectedAthlete) {
      colorMap[selectedAthlete.atleta_id] = getColorForAthlete(selectedAthlete.atleta_id, true)
    }
    
    // Inicializar colores para comparadores y obtener el mapa completo
    if (comparatorAthletes.length > 0) {
      const comparatorColorMap = initializeColorsForComparators(comparatorAthletes)
      comparatorColorMap.forEach((color, atletaId) => {
        colorMap[atletaId] = color
      })
    }
    
    return colorMap
  }, [selectedAthlete, comparatorAthletes])

  // Formatear valor para mostrar
  const formatValue = useCallback((valor, unidad, isTimeBased) => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 'N/A'
    }

    const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
    const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'

    if (esSegundos || isTimeBased) {
      // Si es mayor o igual a 60 segundos: Minutos:Segundos.Centésimas
      if (valor >= 60) {
        const minutos = Math.floor(valor / 60)
        const segundosRestantes = valor % 60
        const segundosFormateados = segundosRestantes.toFixed(2).padStart(5, '0')
        return `${minutos}:${segundosFormateados}`
      } else {
        return valor.toFixed(2)
      }
    } else {
      return valor % 1 === 0 ? valor.toString() : valor.toFixed(2)
    }
  }, [])

  // Tooltip personalizado para el gráfico de araña
  const CustomTooltip = useMemo(() => {
    return ({ active, payload }) => {
      if (active && payload && payload.length) {
        const prueba = payload[0]?.payload?.prueba || ''
        const unidad = payload[0]?.payload?.unidad || ''
        
        return (
          <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)' }} elevation={3}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {prueba}
            </Typography>
            {payload.map((entry, index) => {
              if (entry.value === null || entry.value === undefined) {
                return null
              }
              
              const atletaId = String(entry.dataKey)
              const athlete = allAthletes.find(a => String(a.atleta_id) === atletaId)
              if (!athlete) return null
              
              const realKey = `${atletaId}_real`
              const unidadKey = `${atletaId}_unidad`
              const valorReal = entry.payload[realKey]
              const unidadReal = entry.payload[unidadKey] || unidad
              
              if (valorReal === undefined || valorReal === null) return null
              
              const isTimeBased = athleteData[atletaId]?.resultados[prueba]?.isTimeBased ?? true
              const valorFormateado = formatValue(valorReal, unidadReal, isTimeBased)
              
              return (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ color: entry.color }}
                >
                  {athlete.nombre}: {valorFormateado} {unidadReal || ''}
                </Typography>
              )
            })}
          </Paper>
        )
      }
      return null
    }
  }, [allAthletes, athleteData, formatValue])

  if (!selectedAthlete) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Selecciona un atleta para ver el gráfico de araña
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

  if (radarData.length === 0) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
            Gráfico de Araña - Mejores Resultados
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No se encontraron resultados suficientes para generar el gráfico
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
          Gráfico de Araña - Mejores Resultados
        </Typography>
        
        <Box sx={{ mt: 2, width: '100%' }}>
          {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
            <RadarChart width={chartDimensions.width} height={chartDimensions.height} data={radarData}>
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="prueba" 
                tick={{ fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 130]}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={CustomTooltip} />
              <Legend />
              {allAthletes.map((athlete) => {
                const atletaIdKey = String(athlete.atleta_id)
                // Mostrar siempre el Radar, incluso si no hay datos (mostrará valores en 0)
                
                return (
                  <Radar
                    key={athlete.atleta_id}
                    name={athlete.nombre}
                    dataKey={atletaIdKey}
                    stroke={athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, athlete.atleta_id === selectedAthlete?.atleta_id) || '#8884d8'}
                    fill={athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, athlete.atleta_id === selectedAthlete?.atleta_id) || '#8884d8'}
                    fillOpacity={0.6}
                    connectNulls={true}
                    isAnimationActive={true}
                  />
                )
              })}
            </RadarChart>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress />
            </Box>
          )}
        </Box>

        {/* Leyenda con valores reales */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Mejores Resultados por Prueba:
          </Typography>
          {radarData.map((entry, idx) => (
            <Box key={idx} sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                {entry.prueba} {entry.unidad && `(${entry.unidad})`}
              </Typography>
              {allAthletes.map((athlete) => {
                const atletaIdKey = String(athlete.atleta_id)
                const realKey = `${atletaIdKey}_real`
                const unidadKey = `${atletaIdKey}_unidad`
                const valorReal = entry[realKey]
                const unidadReal = entry[unidadKey]
                
                // Mostrar siempre el atleta, incluso si no tiene esta prueba
                if (valorReal === undefined || valorReal === null) {
                  return (
                    <Typography 
                      key={athlete.atleta_id} 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        color: athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, athlete.atleta_id === selectedAthlete?.atleta_id) || 'text.secondary',
                        fontWeight: 'medium',
                        fontStyle: 'italic'
                      }}
                    >
                      {athlete.nombre}: No tiene esta prueba
                    </Typography>
                  )
                }
                
                const isTimeBased = athleteData[atletaIdKey]?.resultados[entry.prueba]?.isTimeBased ?? true
                const valorFormateado = formatValue(valorReal, unidadReal, isTimeBased)
                
                return (
                  <Typography 
                    key={athlete.atleta_id} 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      color: athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, athlete.atleta_id === selectedAthlete?.atleta_id) || 'text.primary',
                      fontWeight: 'medium'
                    }}
                  >
                    {athlete.nombre}: {valorFormateado} {unidadReal || ''}
                  </Typography>
                )
              })}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default AthleteSpiderChart

