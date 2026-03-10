import { useState, useEffect, useMemo } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  useTheme
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
import { TbChevronDown } from 'react-icons/tb'
import { PiRanking } from 'react-icons/pi'
import { initializeColorsForComparators, getColorForAthlete } from '../utils/athleteColors'
import { normalizePruebaNombre, formatValue } from '../utils/pruebaUtils'
import { useAthletesComparison } from '../hooks/useAthletesComparison'
import { usePruebaMetrics } from '../hooks/usePruebaMetrics'
import RankingDialog from './RankingDialog'

const STORAGE_KEY = 'selectedAthlete'

function AthleteSpiderChart({ comparatorAthletes = [] }) {
  const theme = useTheme()

  const [selectedAthlete, setSelectedAthlete] = useState(null)
  
  // Custom hooks taking over data fetching and business logic
  const { athleteData, categoryLabels, loading: dataLoading, error: dataError } = useAthletesComparison(selectedAthlete, comparatorAthletes)
  const { referenceMaxByPrueba, loading: metricsLoading } = usePruebaMetrics()
  
  const loading = dataLoading || metricsLoading
  const error = dataError
  
  const [allPruebas, setAllPruebas] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [radarData, setRadarData] = useState([])
  const [chartDimensions, setChartDimensions] = useState({
    width: typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 40) : 300,
    height: 400
  })

  // State for Ranking Dialog
  const [rankingDialogState, setRankingDialogState] = useState({
    open: false,
    prueba: null,
    categoria: null
  })

  // Determine gender of selected athlete
  const selectedAthleteGender = useMemo(() => {
    if (!selectedAthlete || !athleteData) return null

    const athleteKey = String(selectedAthlete.atleta_id)
    const data = athleteData[athleteKey]

    // Scan categories and proofs to find any result with gender
    if (data && data.categorias) {
      for (const catKey in data.categorias) {
        const pruebas = data.categorias[catKey].pruebas
        for (const pruebaKey in pruebas) {
          const resultados = pruebas[pruebaKey].resultados
          if (resultados && resultados.length > 0) {
            const firstRes = resultados[0]
            if (firstRes.genero) return firstRes.genero
          }
        }
      }
    }
    return null
  }, [selectedAthlete, athleteData])

  // Handler to open ranking
  const handleOpenRanking = (prueba, categoriaId) => {
    // Find category info
    const catInfo = athleteData[String(selectedAthlete.atleta_id)]?.categorias?.[categoriaId] || {
      label: categoryLabels[categoriaId] || 'Categoría'
    }

    // Find prueba info to get ID
    // We need prueba_id. It might be in 'allPruebas' range or we search in athlete data.
    // The 'prueba' argument is the name.

    // Try to find the prueba ID from the data we have
    let foundPruebaId = null
    let foundIsTimeBased = true

    const athleteKey = String(selectedAthlete.atleta_id)
    const pruebaData = athleteData[athleteKey]?.categorias?.[categoriaId]?.pruebas?.[prueba]

    if (pruebaData) {
      foundPruebaId = pruebaData.pruebaId || pruebaData.prueba_id || pruebaData.resultado?.prueba_id || pruebaData.resultado?.pruebaId
      if (pruebaData.isTimeBased !== undefined) foundIsTimeBased = pruebaData.isTimeBased
    }

    // If not found in main athlete, try comparators
    if (!foundPruebaId && comparatorAthletes.length > 0) {
      for (const comp of comparatorAthletes) {
        const cKey = String(comp.atleta_id)
        const pData = athleteData[cKey]?.categorias?.[categoriaId]?.pruebas?.[prueba]
        if (pData) {
          foundPruebaId = pData.pruebaId || pData.prueba_id || pData.resultado?.prueba_id || pData.resultado?.pruebaId
          if (pData.isTimeBased !== undefined) foundIsTimeBased = pData.isTimeBased
          break
        }
      }
    }

    if (!foundPruebaId) {
      // Fallback: Check referenceMaxByPrueba
      const ref = referenceMaxByPrueba[prueba] || referenceMaxByPrueba[normalizePruebaNombre(prueba)]
      if (ref && ref.pruebaId) foundPruebaId = ref.pruebaId
    }

    if (foundPruebaId) {
      setRankingDialogState({
        open: true,
        prueba: {
          nombre: prueba,
          pruebaId: foundPruebaId,
          isTimeBased: foundIsTimeBased
        },
        categoria: {
          categoriaId: catInfo?.categoriaId || categoriaId,
          label: catInfo.label || categoryLabels[categoriaId] || String(categoriaId)
        }
      })
    } else {
      console.warn('No se pudo encontrar ID para la prueba:', prueba)
    }
  }

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

  useEffect(() => {
    if (!selectedAthlete) {
      setAvailableCategories([])
      setSelectedCategory(null)
      setAllPruebas([])
      return
    }

    const selectedAthleteKey = String(selectedAthlete.atleta_id)
    const selectedAthleteData = athleteData[selectedAthleteKey]

    if (!selectedAthleteData || !selectedAthleteData.categorias) {
      setAvailableCategories([])
      setSelectedCategory(null)
      setAllPruebas([])
      return
    }

    const categoriasDisponibles =
      (selectedAthleteData.categoriaOrden && selectedAthleteData.categoriaOrden.length > 0)
        ? selectedAthleteData.categoriaOrden
        : Object.keys(selectedAthleteData.categorias)

    // Ordenar por nivel numérico descendente (e.g., SUB12 > SUB10 > SUB8)
    const getRank = (key) => {
      const label = categoryLabels[key] || key
      const match = /\d+/.exec(String(label))
      return match ? parseInt(match[0], 10) : -Infinity
    }
    const sortedDisponibles = [...categoriasDisponibles].sort((a, b) => {
      const ra = getRank(a)
      const rb = getRank(b)
      if (rb !== ra) return rb - ra
      const la = (categoryLabels[a] || a).toString()
      const lb = (categoryLabels[b] || b).toString()
      return lb.localeCompare(la, 'es', { sensitivity: 'base' })
    })

    setAvailableCategories(sortedDisponibles)

    if (!selectedCategory || !sortedDisponibles.includes(selectedCategory)) {
      setSelectedCategory(sortedDisponibles[0] || null)
    }
  }, [athleteData, selectedAthlete, selectedCategory, categoryLabels])

  useEffect(() => {
    if (!selectedAthlete || !selectedCategory) {
      setAllPruebas([])
      return
    }

    const selectedAthleteKey = String(selectedAthlete.atleta_id)
    const pruebasMap =
      athleteData[selectedAthleteKey]?.categorias?.[selectedCategory]?.pruebas || {}

    setAllPruebas(Object.keys(pruebasMap))
  }, [athleteData, selectedAthlete, selectedCategory])

  // Lista de todos los atletas (principal + comparadores) - DEFINIR ANTES DEL useEffect
  const allAthletes = useMemo(() => {
    if (!selectedAthlete) return []
    return [selectedAthlete, ...comparatorAthletes]
  }, [selectedAthlete, comparatorAthletes])

  // Preparar datos para el gráfico de araña
  useEffect(() => {
    if (
      !selectedCategory ||
      allPruebas.length === 0 ||
      Object.keys(athleteData).length === 0 ||
      allAthletes.length === 0
    ) {
      setRadarData([])
      return
    }

    const referencesLoaded = Object.keys(referenceMaxByPrueba).length > 0
    const allValues = {}

    allPruebas.forEach((prueba) => {
      const valores = []
      let isTimeBased = true
      let unidad = ''
      const referenceKeys = new Set()

      allAthletes.forEach((athlete) => {
        const atletaIdKey = String(athlete.atleta_id)
        const pruebaInfo =
          athleteData[atletaIdKey]?.categorias?.[selectedCategory]?.pruebas?.[prueba]

        if (pruebaInfo) {
          valores.push(pruebaInfo.valor)
          if (pruebaInfo.isTimeBased !== undefined) {
            isTimeBased = pruebaInfo.isTimeBased
          }
          if (!unidad && pruebaInfo.unidad) {
            unidad = pruebaInfo.unidad
          }

          const posibleIds = [
            pruebaInfo?.resultado?.prueba_id,
            pruebaInfo?.resultado?.pruebaId,
            pruebaInfo?.prueba_id,
            pruebaInfo?.pruebaId
          ].filter((id) => id !== null && id !== undefined)

          posibleIds.forEach((id) => {
            referenceKeys.add(String(id))
          })
        }
      })

      const normalizedName = normalizePruebaNombre(prueba)
      let referenceInfo =
        referenceMaxByPrueba[prueba] ||
        referenceMaxByPrueba[normalizedName]

      if (!referenceInfo && referenceKeys.size > 0) {
        for (const key of referenceKeys) {
          if (referenceMaxByPrueba[key]) {
            referenceInfo = referenceMaxByPrueba[key]
            break
          }
        }
      }

      if (!referenceInfo && referencesLoaded) {
        // No se encontró referencia global para la prueba; se recurrirá a rangos locales si es posible.
      }

      const min = valores.length > 0 ? Math.min(...valores) : null
      const max = valores.length > 0 ? Math.max(...valores) : null

      allValues[prueba] = {
        min,
        max,
        isTimeBased,
        unidad: referenceInfo?.unidad || unidad,
        referenceMax: referenceInfo?.maxValor ?? null,
        referenceInfo
      }
    })

    const radarDataArray = allPruebas.map((prueba) => {
      const range = allValues[prueba]
      const entry = {
        prueba,
        unidad: range?.unidad || ''
      }

      allAthletes.forEach((athlete) => {
        const atletaIdKey = String(athlete.atleta_id)
        const pruebaInfo =
          athleteData[atletaIdKey]?.categorias?.[selectedCategory]?.pruebas?.[prueba]

        if (pruebaInfo) {
          const valor = pruebaInfo.valor
          const referenceMax = range?.referenceMax
          const referenciaValida = referenceMax !== null && referenceMax !== undefined && Number(referenceMax) > 0

          if (range && referenciaValida) {
            let normalizedValue = 0

            if (range.isTimeBased) {
              normalizedValue = valor > 0 ? referenceMax / valor : 0
            } else {
              normalizedValue = valor >= 0 ? valor / referenceMax : 0
            }

            const normalizedClamped = Math.max(0, Math.min(1, normalizedValue))
            entry[atletaIdKey] = normalizedClamped * 100

            // Se prioriza la referencia global para normalizar el valor.
          } else if (
            range &&
            range.max !== range.min &&
            range.max !== -Infinity &&
            range.min !== Infinity
          ) {
            const clampedValor = Math.max(Math.min(valor, range.max), range.min)
            const normalized01 = (clampedValor - range.min) / (range.max - range.min)
            const normalizedValue = range.isTimeBased ? 1 - normalized01 : normalized01
            entry[atletaIdKey] = Math.max(0, Math.min(100, normalizedValue * 100))

          } else {
            entry[atletaIdKey] = 0
          }

          entry[`${atletaIdKey}_real`] = valor
          entry[`${atletaIdKey}_unidad`] = pruebaInfo.unidad || range?.unidad || ''
        } else {
          entry[atletaIdKey] = 0
        }
      })

      return entry
    })

    setRadarData(radarDataArray)
  }, [allPruebas, athleteData, allAthletes, selectedCategory, referenceMaxByPrueba])

  // Colores para los atletas usando el módulo compartido
  const athleteColors = useMemo(() => {
    const colorMap = {}

    // Color para el atleta principal
    if (selectedAthlete) {
      colorMap[selectedAthlete.atleta_id] = getColorForAthlete(selectedAthlete.atleta_id, true, theme.palette.primary.main)
    }

    // Inicializar colores para comparadores y obtener el mapa completo
    if (comparatorAthletes.length > 0) {
      const comparatorColorMap = initializeColorsForComparators(comparatorAthletes)
      comparatorColorMap.forEach((color, atletaId) => {
        colorMap[atletaId] = color
      })
    }

    return colorMap
  }, [selectedAthlete, comparatorAthletes, theme])

  // Tooltip personalizado para el gráfico de araña
  const CustomTooltip = useMemo(() => {
    return ({ active, payload }) => {
      if (active && payload && payload.length) {
        const prueba = payload[0]?.payload?.prueba || ''
        const unidad = payload[0]?.payload?.unidad || ''

        return (
          <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }} elevation={3}>
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

              const isTimeBased =
                athleteData[atletaId]?.categorias?.[selectedCategory]?.pruebas?.[prueba]?.isTimeBased ??
                true
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
  }, [allAthletes, athleteData, selectedCategory])

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
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header Row: Title and Pill Selector */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '20px', mb: 0, color: 'text.primary' }}>
          Mejores Marcas
        </Typography>

        {availableCategories.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedCategory || ''}
              onChange={(event) => setSelectedCategory(event.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) return 'Categoría';
                return categoryLabels[selected] || selected;
              }}
              sx={{
                borderRadius: '20px',
                bgcolor: 'action.hover',
                border: 'none',
                fontWeight: 'medium',
                color: 'text.primary',
                px: 1,
                py: 0.5,
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover': { bgcolor: 'action.selected' },
                '& .MuiSelect-select': { py: 0.5, pr: '32px !important' }, // Adjust padding for pill shape
                boxShadow: 'none',
              }}
              IconComponent={(props) => (
                <Box {...props} sx={{ ...props.sx, right: '10px !important', top: '0 !important', bottom: '0 !important', height: '100%', display: 'flex !important', alignItems: 'center' }}>
                  <TbChevronDown size={20} color="#000" />
                </Box>
              )}
            >
              {(() => {
                const getRank = (key) => {
                  const label = categoryLabels[key] || key
                  const match = /\d+/.exec(label)
                  return match ? parseInt(match[0], 10) : -Infinity
                }
                const sorted = [...availableCategories].sort((a, b) => {
                  const ra = getRank(a)
                  const rb = getRank(b)
                  if (rb !== ra) return rb - ra
                  const la = (categoryLabels[a] || a).toString()
                  const lb = (categoryLabels[b] || b).toString()
                  return lb.localeCompare(la, 'es', { sensitivity: 'base' })
                })
                return sorted.map((categoriaKey) => (
                  <MenuItem key={categoriaKey} value={categoriaKey}>
                    {categoryLabels[categoriaKey] || categoriaKey}
                  </MenuItem>
                ))
              })()}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Chart Card */}
      <Card
        sx={{
          width: '100%',
          bgcolor: 'action.hover',
          borderRadius: '20px',
          boxShadow: 'none',
          overflow: 'visible' // Ensure tooltips aren't clipped if possible, though Card usually clips
        }}
      >
        <CardContent sx={{ px: { xs: 1, sm: 2 }, py: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
            <Box sx={{ width: '100%', height: chartDimensions.height, display: 'flex', justifyContent: 'center' }}>
              <RadarChart width={chartDimensions.width} height={chartDimensions.height} data={radarData}>
                <PolarGrid stroke="#d1d1d1" />
                <PolarAngleAxis
                  dataKey="prueba"
                  tick={{ fontSize: 12, fill: theme.palette?.text?.primary || '#333333' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: theme.palette?.text?.secondary || '#555555' }}
                  axisLine={false}
                />
                <Tooltip content={CustomTooltip} />
                <Legend iconType="circle" wrapperStyle={{ color: 'text.primary', paddingTop: '20px' }} />
                {allAthletes.map((athlete) => {
                  const atletaIdKey = String(athlete.atleta_id)
                  const isMain = athlete.atleta_id === selectedAthlete?.atleta_id
                  return (
                    <Radar
                      key={athlete.atleta_id}
                      name={athlete.nombre}
                      dataKey={atletaIdKey}
                      stroke={athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, isMain, theme.palette.primary.main) || '#8884d8'}
                      fill={athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, isMain, theme.palette.primary.main) || '#8884d8'}
                      fillOpacity={isMain ? 0.5 : 0.15}
                      connectNulls={true}
                      isAnimationActive={false}
                    />
                  )
                })}
              </RadarChart>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Accordion Pills */}
      <Accordion
        disableGutters
        sx={{
          borderRadius: '20px !important',
          bgcolor: 'action.hover',
          boxShadow: 'none',
          '&:before': { display: 'none' }, // Remove default divider
          '&.Mui-expanded': { margin: 0, borderRadius: '20px !important' } // Change shape when expanded
        }}
      >
        <AccordionSummary
          expandIcon={<Box sx={{ bgcolor: 'transparent', borderRadius: '50%', border: 2, borderColor: 'text.primary', display: 'flex', p: 0.5, color: 'text.primary' }}><TbChevronDown size={14} color="currentColor" /></Box>}
          sx={{
            px: 3,
            minHeight: '60px',
            '& .MuiAccordionSummary-content': { margin: '16px 0' }
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'text.primary' }}>
            Mejores Resultados por Prueba
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
          {radarData.map((entry, idx) => (
            <Box key={idx} sx={{ mt: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {/* Header with Title and Ranking Button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight="bold" color="text.primary">
                  {entry.prueba} {entry.unidad && `(${entry.unidad})`}
                </Typography>

                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenRanking(entry.prueba, selectedCategory)
                  }}
                  title="Ver Ranking Top 50"
                  sx={{ transition: 'background-color 0.2s', bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <PiRanking size={18} />
                </IconButton>
              </Box>

              {allAthletes.map((athlete) => {
                const atletaIdKey = String(athlete.atleta_id)
                const realKey = `${atletaIdKey}_real`
                const unidadKey = `${atletaIdKey}_unidad`
                const valorReal = entry[realKey]
                const unidadReal = entry[unidadKey]

                if (valorReal === undefined || valorReal === null) {
                  return (
                    <Typography
                      key={athlete.atleta_id}
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        ml: 1
                      }}
                    >
                      {athlete.nombre}: -
                    </Typography>
                  )
                }

                const isTimeBased =
                  athleteData[atletaIdKey]?.categorias?.[selectedCategory]?.pruebas?.[entry.prueba]
                    ?.isTimeBased ?? true
                const valorFormateado = formatValue(valorReal, unidadReal, isTimeBased)

                return (
                  <Typography
                    key={athlete.atleta_id}
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: athleteColors[athlete.atleta_id] || getColorForAthlete(athlete.atleta_id, athlete.atleta_id === selectedAthlete?.atleta_id, theme.palette.primary.main) || 'text.primary',
                      fontWeight: 'bold',
                      ml: 1
                    }}
                  >
                    {athlete.nombre}: <span style={{ fontWeight: 'normal', color: 'text.primary' }}>{valorFormateado} {unidadReal || ''}</span>
                  </Typography>
                )
              })}
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      <RankingDialog
        open={rankingDialogState.open}
        onClose={() => setRankingDialogState(prev => ({ ...prev, open: false }))}
        prueba={rankingDialogState.prueba}
        categoria={rankingDialogState.categoria}
        mainAthleteId={selectedAthlete ? selectedAthlete.atleta_id : null}
        comparatorAthletes={comparatorAthletes}
        genderFilter={selectedAthleteGender}
        onAthleteSelect={(athlete) => {
          setSelectedAthlete(athlete)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(athlete))
          // Dispatch custom event for same-window updates
          window.dispatchEvent(new Event('localStorageChange'))
          // Close dialog
          setRankingDialogState(prev => ({ ...prev, open: false }))
        }}
        onAthleteCompare={(athlete) => {
          const stored = localStorage.getItem('comparatorAthletes')
          let current = stored ? JSON.parse(stored) : []
          if (!Array.isArray(current)) current = []

          // Check for duplicates
          if (!current.some(c => c.atleta_id === athlete.atleta_id)) {
            const updated = [...current, athlete]
            localStorage.setItem('comparatorAthletes', JSON.stringify(updated))
            // Dispatch event for other components (like AthleteComparator and SeguimientoPage)
            window.dispatchEvent(new Event('comparatorAthletesChanged'))
            // Close dialog
            setRankingDialogState(prev => ({ ...prev, open: false }))
          }
        }}
      />
    </Box>
  )
}

export default AthleteSpiderChart
