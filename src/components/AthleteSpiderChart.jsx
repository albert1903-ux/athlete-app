import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
const CATEGORY_ID_FALLBACK_LABELS = {
  '1': 'SUB8',
  '2': 'SUB10',
  '3': 'SUB12',
  '4': '-',
  '5': 'SUB14',
  '6': 'ABS',
  '7': 'SUB16',
  '8': 'SUB18',
  '9': 'SUB20',
  '10': 'SUB23'
}

const normalizePruebaNombre = (value) => {
  if (!value && value !== 0) return ''
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function AthleteSpiderChart({ comparatorAthletes = [] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [athleteData, setAthleteData] = useState({})
  const [allPruebas, setAllPruebas] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryLabels, setCategoryLabels] = useState({})
  const [radarData, setRadarData] = useState([])
  const [chartDimensions, setChartDimensions] = useState({
    width: typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 40) : 300,
    height: 400
  })
  const [referenceMaxByPrueba, setReferenceMaxByPrueba] = useState({})

  const normalizeCategoriaKey = (value, id) => {
    if (value && typeof value === 'string') {
      return value.trim().replace(/\s+/g, '_').toUpperCase()
    }
    if (value !== null && value !== undefined) {
      return String(value).trim().replace(/\s+/g, '_').toUpperCase()
    }
    if (id !== null && id !== undefined) {
      return `CAT_${String(id).trim()}`
    }
    return 'SIN_CATEGORIA'
  }

  const extractCategoriaFromResultado = (resultado, categoriaMetadataMap) => {
    if (!resultado) {
      return { key: 'SIN_CATEGORIA', label: 'Sin categoría', categoriaId: null }
    }

    const categoriaId =
      resultado.categoria_id ??
      resultado.categoriaId ??
      resultado.categoria ??
      null

    const metadata =
      categoriaId !== null && categoriaMetadataMap
        ? categoriaMetadataMap.get(categoriaId) || categoriaMetadataMap.get(String(categoriaId))
        : null

    const categoriaCodigo = resultado.categoria_codigo || metadata?.codigo || metadata?.codigo_categoria
    const categoriaNombreCorto =
      resultado.categoria_nombre_corto ||
      metadata?.nombre_corto ||
      metadata?.nombreCorto ||
      null
    const categoriaNombre =
      resultado.categoria_nombre ||
      metadata?.nombre ||
      metadata?.nombre_largo ||
      null

    const fallbackLabel =
      categoriaId !== null
        ? CATEGORY_ID_FALLBACK_LABELS[String(categoriaId)] ||
          CATEGORY_ID_FALLBACK_LABELS[categoriaId]
        : null

    const keyBase = categoriaCodigo || categoriaNombreCorto || categoriaNombre || fallbackLabel || categoriaId
    const key = normalizeCategoriaKey(keyBase, categoriaId)
    const label =
      categoriaNombreCorto ||
      categoriaNombre ||
      categoriaCodigo ||
      fallbackLabel ||
      (categoriaId ? `Categoría ${categoriaId}` : 'Sin categoría')

    return { key, label, categoriaId }
  }

  const parseResultadoValor = (resultado) => {
    if (!resultado) return null

    const candidates = [
      resultado.valor_numerico,
      resultado.valor,
      resultado.valorBruto,
      resultado.marca_valor,
      resultado.marca
    ]

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === '') continue

      if (typeof candidate === 'number') {
        if (!Number.isNaN(candidate)) {
          return candidate
        }
        continue
      }

      if (typeof candidate === 'string') {
        const normalized = candidate.trim()
        if (!normalized) continue

        const withDot = normalized.replace(',', '.')
        if (withDot.includes(':')) {
          const parts = withDot.split(':')
          let total = 0
          for (const part of parts) {
            const parsed = parseFloat(part)
            if (Number.isNaN(parsed)) {
              total = NaN
              break
            }
            total = total * 60 + parsed
          }
          if (!Number.isNaN(total)) {
            return total
          }
        } else {
          const parsed = parseFloat(withDot)
          if (!Number.isNaN(parsed)) {
            return parsed
          }
        }
      }
    }

    return null
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
    const distanceKeywords = [
      'longitud',
      'altura',
      'peso',
      'pes',
      'disco',
      'jabalina',
      'martillo',
      'pértiga',
      'perxa',
      'garrocha',
      'triple',
      'vortex'
    ]
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

    let bestValue = null
    let bestResultado = null

    results.forEach((resultado) => {
      const valor = parseResultadoValor(resultado)
      if (valor === null || Number.isNaN(valor)) {
        return
      }

      if (bestValue === null) {
        bestValue = valor
        bestResultado = resultado
        return
      }

      if (isTimeBased) {
        if (valor < bestValue) {
          bestValue = valor
          bestResultado = resultado
        }
      } else {
        if (valor > bestValue) {
          bestValue = valor
          bestResultado = resultado
        }
      }
    })

    if (bestValue === null || bestResultado === null) {
      return null
    }

    return { valor: bestValue, resultado: bestResultado }
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

        const categoriaIdSet = new Set()
        data.forEach((resultado) => {
          if (
            resultado &&
            resultado.categoria_id !== null &&
            resultado.categoria_id !== undefined
          ) {
            categoriaIdSet.add(resultado.categoria_id)
          } else if (
            resultado &&
            resultado.categoriaId !== null &&
            resultado.categoriaId !== undefined
          ) {
            categoriaIdSet.add(resultado.categoriaId)
          }
        })

        const categoriaMetadataMap = new Map()
        if (categoriaIdSet.size > 0) {
          try {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from('categorias')
              .select('categoria_id, nombre')
              .in('categoria_id', Array.from(categoriaIdSet))

            if (!categoriasError && Array.isArray(categoriasData)) {
              categoriasData.forEach((categoria) => {
                if (categoria && categoria.categoria_id !== undefined && categoria.categoria_id !== null) {
                  categoriaMetadataMap.set(categoria.categoria_id, categoria)
                  categoriaMetadataMap.set(String(categoria.categoria_id), categoria)
                }
              })
            }
          } catch (categoriaError) {
            console.warn('No se pudo obtener información adicional de categorías:', categoriaError)
          }
        }

        // Agrupar por categoría y prueba
        const groupedByCategoria = {}

        data.forEach((resultado) => {
          const { key: categoriaKey, label: categoriaLabel, categoriaId } = extractCategoriaFromResultado(
            resultado,
            categoriaMetadataMap
          )
          if (!groupedByCategoria[categoriaKey]) {
            groupedByCategoria[categoriaKey] = {
              key: categoriaKey,
              label: categoriaLabel,
              categoriaId,
              pruebas: {}
            }
          }

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

          if (!groupedByCategoria[categoriaKey].pruebas[pruebaNombre]) {
            groupedByCategoria[categoriaKey].pruebas[pruebaNombre] = {
              nombre: pruebaNombre,
              unidad: unidad,
              resultados: []
            }
          }

          const pruebaGroup = groupedByCategoria[categoriaKey].pruebas[pruebaNombre]
          if (!pruebaGroup.unidad && unidad) {
            pruebaGroup.unidad = unidad
          }

          pruebaGroup.resultados.push(resultado)
        })

        // Calcular mejor resultado por prueba dentro de cada categoría
        const categoriasProcesadas = {}
        const categoriaLabels = {}

        Object.entries(groupedByCategoria).forEach(([categoriaKey, categoriaData]) => {
          const pruebasProcesadas = {}

          Object.entries(categoriaData.pruebas).forEach(([pruebaNombre, pruebaData]) => {
            const isTimeBased = isTimeBasedPrueba(pruebaNombre, pruebaData.unidad)
            const bestResult = getBestResult(pruebaData.resultados, isTimeBased)

            if (bestResult) {
              pruebasProcesadas[pruebaNombre] = {
                nombre: pruebaNombre,
                unidad: pruebaData.unidad,
                valor: bestResult.valor,
                isTimeBased,
                resultado: bestResult.resultado
              }
            }
          })

          if (Object.keys(pruebasProcesadas).length > 0) {
            const categoriaId = categoriaData.categoriaId ?? null
            const fallbackLabelFromId =
              categoriaId !== null
                ? CATEGORY_ID_FALLBACK_LABELS[String(categoriaId)] ||
                  CATEGORY_ID_FALLBACK_LABELS[categoriaId]
                : null
            const resolvedLabel =
              categoriaData.label && !/^Categoría\s+\d+$/i.test(categoriaData.label)
                ? categoriaData.label
                : fallbackLabelFromId || categoriaData.label || 'Sin categoría'

            categoriasProcesadas[categoriaKey] = {
              key: categoriaKey,
              label: resolvedLabel,
              categoriaId,
              pruebas: pruebasProcesadas
            }
            categoriaLabels[categoriaKey] = resolvedLabel
          }
        })

        const categoriaOrden = Object.keys(categoriasProcesadas).sort((a, b) => {
          const labelA = categoriasProcesadas[a]?.label || a
          const labelB = categoriasProcesadas[b]?.label || b
          return labelA.localeCompare(labelB, 'es', { sensitivity: 'base' })
        })

        return {
          categorias: categoriasProcesadas,
          categoriaLabels,
          categoriaOrden
        }
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
        const accumulatedCategoryLabels = {}

        // Cargar resultados de cada atleta
        for (const athlete of allAthletes) {
          const results = await fetchAthleteResults(athlete.atleta_id)
          const categorias = results?.categorias || {}
          const categoriaOrden = results?.categoriaOrden || []
          const categoriaLabels = results?.categoriaLabels || {}

          // Usar string como clave para consistencia
          const atletaIdKey = String(athlete.atleta_id)
          athleteResults[atletaIdKey] = {
            nombre: athlete.nombre,
            categorias,
            categoriaOrden,
            atleta_id: athlete.atleta_id // Guardar también el ID original
          }

          Object.assign(accumulatedCategoryLabels, categoriaLabels)
        }

        setAthleteData(athleteResults)
        if (Object.keys(accumulatedCategoryLabels).length > 0) {
          setCategoryLabels((prev) => ({
            ...prev,
            ...accumulatedCategoryLabels
          }))
        }
      } catch (err) {
        console.error('Error al cargar datos:', err)
        setError(err.message || 'Error al cargar los resultados')
      } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [selectedAthlete, comparatorAthletes])

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
  }, [allAthletes, athleteData, formatValue, selectedCategory])

  useEffect(() => {
    let cancelled = false

    const loadReferenceMaxValues = async () => {
      try {
        const { data, error } = await supabase
          .from('pruebas')
          .select('prueba_id, nombre, max_valor, max_texto, unidad_default')

        if (error) {
          console.error('Error al cargar referencias de pruebas:', error)
          return
        }

        const referencesMap = {}

        if (Array.isArray(data)) {
          data.forEach((row) => {
            const parsedMaxValor =
              row?.max_valor !== null && row?.max_valor !== undefined
                ? Number(row.max_valor)
                : null

            if (parsedMaxValor === null || Number.isNaN(parsedMaxValor)) {
              return
            }

            const info = {
              pruebaId: row?.prueba_id ?? null,
              nombre: row?.nombre ?? '',
              maxValor: parsedMaxValor,
              maxTexto: row?.max_texto || null,
              unidad: row?.unidad_default || ''
            }

            if (row?.nombre) {
              referencesMap[row.nombre] = info
              const normalizedKey = normalizePruebaNombre(row.nombre)
              if (normalizedKey) {
                referencesMap[normalizedKey] = info
              }
            }

            if (row?.prueba_id !== null && row?.prueba_id !== undefined) {
              referencesMap[String(row.prueba_id)] = info
            }
          })
        }

        if (!cancelled) {
          setReferenceMaxByPrueba(referencesMap)
        }
      } catch (refError) {
        console.error('Excepción al cargar referencias de pruebas:', refError)
      }
    }

    loadReferenceMaxValues()

    return () => {
      cancelled = true
    }
  }, [])

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' }, mb: 0 }}>
            Mejores Marcas
          </Typography>
          {availableCategories.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 160, ml: 'auto' }}>
              <InputLabel id="radar-category-select-label">Categoría</InputLabel>
              <Select
                labelId="radar-category-select-label"
                value={selectedCategory || ''}
                label="Categoría"
                onChange={(event) => setSelectedCategory(event.target.value)}
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
                domain={[0, 100]}
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
                    fillOpacity={0.4}
                    connectNulls={true}
                    isAnimationActive={false}
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

