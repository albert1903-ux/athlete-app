import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip as MuiTooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { TbCalendar, TbUser } from 'react-icons/tb'
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
import { initializeColorsForComparators, getColorForAthlete } from '../utils/athleteColors'

const STORAGE_KEY = 'selectedAthlete'

function AthleteResultsChart({ comparatorAthletes = [] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState({ datos: [], pruebas: [] })
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [selectedPrueba, setSelectedPrueba] = useState(null)
  const [allPruebasData, setAllPruebasData] = useState({}) // Almacenar datos agrupados por prueba
  const [comparatorData, setComparatorData] = useState({}) // Datos de atletas comparados
  const [athleteColors, setAthleteColors] = useState({}) // Mapa de atleta_id -> color consistente
  const [viewMode, setViewMode] = useState('fecha') // 'fecha' o 'edad'
  const [chartWidth, setChartWidth] = useState(() => {
    // Inicializar con un ancho razonable desde el inicio
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

  // Cargar datos de atletas comparados
  useEffect(() => {
    const fetchComparatorData = async () => {
      if (comparatorAthletes.length === 0) {
        setComparatorData({})
        return
      }

      const newComparatorData = {}
      
      for (const athlete of comparatorAthletes) {
        try {
          const data = await fetchAthleteResultsForComparator(athlete.atleta_id)
          newComparatorData[athlete.atleta_id] = data
        } catch (err) {
          console.error(`Error al cargar datos del comparador ${athlete.nombre}:`, err)
          newComparatorData[athlete.atleta_id] = null
        }
      }
      
      setComparatorData(newComparatorData)
    }

    fetchComparatorData()
  }, [comparatorAthletes])

  // Asignar colores consistentes a los atletas comparados usando el módulo compartido
  useEffect(() => {
    if (comparatorAthletes.length === 0) {
      setAthleteColors({})
      return
    }

    // Inicializar colores usando el módulo compartido
    const colorMap = initializeColorsForComparators(comparatorAthletes)
    
    // Convertir Map a objeto para el estado
    const newColors = {}
    colorMap.forEach((color, atletaId) => {
      newColors[atletaId] = color
    })

    setAthleteColors(newColors)
  }, [comparatorAthletes])

  const fetchAthleteResults = async (atletaId) => {
    setLoading(true)
    setError(null)

    try {
      // Primero obtener información del atleta (nombre y fecha de nacimiento)
      let atletaNombre = null
      let fechaNacimiento = null
      
      try {
        // Obtener nombre y fecha de nacimiento del atleta desde la tabla atletas
        const { data: atletaInfo, error: atletaError } = await supabase
          .from('atletas')
          .select('nombre, fecha_nac')
          .eq('atleta_id', atletaId)
          .maybeSingle()
        
        if (atletaError) {
          console.warn('Error al obtener información del atleta:', atletaError)
        } else if (atletaInfo) {
          atletaNombre = atletaInfo.nombre
          fechaNacimiento = atletaInfo.fecha_nac || null
        }
      } catch (err) {
        console.warn('No se pudo obtener información del atleta:', err)
      }

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

      // Inicializar data como array vacío si es null
      data = data || []
      
      // Si no pudimos obtener el nombre del atleta desde la tabla atletas,
      // intentar obtenerlo desde los resultados encontrados
      if (!atletaNombre && data.length > 0) {
        const nombresEncontrados = [...new Set(data.map(r => r.nombre).filter(Boolean))]
        if (nombresEncontrados.length === 1) {
          atletaNombre = nombresEncontrados[0]
        } else if (nombresEncontrados.length > 0) {
          // Si hay múltiples nombres, usar el más común
          const conteoNombres = {}
          nombresEncontrados.forEach(nombre => {
            const conteo = data.filter(r => r.nombre === nombre).length
            conteoNombres[nombre] = conteo
          })
          atletaNombre = Object.keys(conteoNombres).reduce((a, b) => 
            conteoNombres[a] > conteoNombres[b] ? a : b
          )
        }
        
        // Si no obtuvimos fecha_nac desde atletas, intentar desde resultados como fallback
        if (!fechaNacimiento && data.length > 0) {
          const fechasEncontradas = [...new Set(data.map(r => r.fecha_nacimiento).filter(Boolean))]
          if (fechasEncontradas.length === 1) {
            fechaNacimiento = fechasEncontradas[0]
          } else if (fechasEncontradas.length > 1) {
            // Si hay múltiples fechas, usar la más común
            const conteoFechas = {}
            fechasEncontradas.forEach(fecha => {
              const conteo = data.filter(r => r.fecha_nacimiento === fecha).length
              conteoFechas[fecha] = conteo
            })
            const fechaMasComun = Object.keys(conteoFechas).reduce((a, b) => 
              conteoFechas[a] > conteoFechas[b] ? a : b
            )
            fechaNacimiento = fechaMasComun
          }
        }
      }
      
      // Asegurarse de que todos los resultados tengan información de prueba
      // Si hay resultados sin relación, obtener información de pruebas manualmente
      const resultadosSinPrueba = data.filter(r => !r.prueba || typeof r.prueba !== 'object')
      if (resultadosSinPrueba.length > 0) {
        const pruebaIdsSinInfo = [...new Set(resultadosSinPrueba.map(r => r.prueba_id).filter(Boolean))]
        if (pruebaIdsSinInfo.length > 0) {
          try {
            const { data: pruebasDataParaResultados } = await supabase
              .from('pruebas')
              .select('prueba_id, nombre, unidad_default')
              .in('prueba_id', pruebaIdsSinInfo)
            
            const pruebasMapParaResultados = new Map()
            if (pruebasDataParaResultados) {
              pruebasDataParaResultados.forEach(p => {
                if (p.prueba_id) {
                  pruebasMapParaResultados.set(p.prueba_id, {
                    nombre: p.nombre,
                    unidad_default: p.unidad_default
                  })
                }
              })
            }
            
            // Actualizar resultados sin información de prueba
            data = data.map(resultado => {
              if (!resultado.prueba || typeof resultado.prueba !== 'object') {
                const pruebaInfo = pruebasMapParaResultados.get(resultado.prueba_id)
                if (pruebaInfo) {
                  return {
                    ...resultado,
                    prueba: pruebaInfo
                  }
                }
              }
              return resultado
            })
          } catch (errPruebas) {
            console.warn('Error al obtener información de pruebas para resultados existentes:', errPruebas)
          }
        }
      }
      
      // Obtener IDs de resultados ya encontrados para evitar duplicados
      const resultadosIdsEncontrados = new Set(
        data.map(r => r.resultado_id || r.id).filter(Boolean)
      )

      // Buscar resultados adicionales usando múltiples estrategias
      // 1. Por fecha de nacimiento si está disponible
      // 2. Por atleta_id NULL
      // 3. Por otros atletas con nombre similar
      try {
        let resultadosAdicionales = []
        
        // Nota: fecha_nacimiento probablemente no existe en la tabla atletas,
        // solo en resultados, por lo que no intentamos obtenerla desde atletas
        
        // Obtener todas las fechas de nacimiento únicas de los resultados encontrados
        const fechasNacimientoEncontradas = [...new Set(data.map(r => r.fecha_nacimiento).filter(Boolean))]
        
        // Usar fecha de nacimiento si está disponible en los resultados encontrados
        const fechaParaBuscar = fechaNacimiento || (fechasNacimientoEncontradas.length > 0 ? fechasNacimientoEncontradas[0] : null)
        
        // Estrategia 2: Buscar resultados con atleta_id NULL
        // Nota: fecha_nacimiento no existe en la tabla resultados, así que no podemos filtrar por ella
        try {
          const resultNull = await supabase
            .from('resultados')
            .select('*')
            .is('atleta_id', null)
            .order('fecha', { ascending: true })
            .limit(200)
          
          if (!resultNull.error && resultNull.data && resultNull.data.length > 0) {
            let nuevosResultados = resultNull.data
            
            // Filtrar manualmente por fecha de nacimiento si está disponible en los datos
            if (fechasNacimientoEncontradas.length > 0) {
              nuevosResultados = nuevosResultados.filter(r => 
                r.fecha_nacimiento && fechasNacimientoEncontradas.includes(r.fecha_nacimiento)
              )
            }
            
            // Filtrar duplicados
            nuevosResultados = nuevosResultados.filter(r => {
              const resultadoId = r.resultado_id || r.id
              return resultadoId && !resultadosIdsEncontrados.has(resultadoId)
            })
            
            if (nuevosResultados.length > 0) {
              resultadosAdicionales = [...resultadosAdicionales, ...nuevosResultados]
            }
          }
        } catch (errNull) {
          // Error silenciado - fecha_nacimiento no existe en resultados
        }
        
        // Estrategia 3: Buscar otros atletas con nombre similar y obtener sus resultados
        if (atletaNombre && resultadosAdicionales.length === 0) {
          try {
            // Buscar otros atletas con el mismo nombre (o similar)
            const nombreNormalizado = atletaNombre.trim().replace(/\s+/g, ' ')
            const { data: atletasSimilares } = await supabase
              .from('atletas')
              .select('atleta_id, nombre')
              .ilike('nombre', `%${nombreNormalizado}%`)
            
            if (atletasSimilares && atletasSimilares.length > 0) {
              // Filtrar para obtener solo los que no son el atleta actual
              const otrosAtletas = atletasSimilares.filter(a => a.atleta_id !== atletaId)
              
              if (otrosAtletas.length > 0) {
                const otrosAtletaIds = otrosAtletas.map(a => a.atleta_id)
                
                // Buscar resultados de estos otros atletas
                const { data: resultadosOtrosAtletas } = await supabase
                  .from('resultados')
                  .select('*')
                  .in('atleta_id', otrosAtletaIds)
                  .order('fecha', { ascending: true })
                
                if (resultadosOtrosAtletas && resultadosOtrosAtletas.length > 0) {
                  // Filtrar duplicados
                  const nuevosResultados = resultadosOtrosAtletas.filter(r => {
                    const resultadoId = r.resultado_id || r.id
                    return resultadoId && !resultadosIdsEncontrados.has(resultadoId)
                  })
                  
                  if (nuevosResultados.length > 0) {
                    resultadosAdicionales = [...resultadosAdicionales, ...nuevosResultados]
                  }
                }
              }
            }
          } catch (errAtletas) {
            // Error silenciado
          }
        }
        
        // Estrategia 4: Si tenemos fecha de nacimiento, buscar por esa fecha directamente
        // Nota: fecha_nacimiento no existe en la tabla resultados, así que esta estrategia no es viable
        // Se omite para evitar errores 400
        
        // Obtener información de pruebas para todos los resultados adicionales
        if (resultadosAdicionales.length > 0) {
          const pruebaIdsParaObtener = [...new Set(resultadosAdicionales.map(r => r.prueba_id).filter(Boolean))]
          if (pruebaIdsParaObtener.length > 0) {
            try {
              const { data: pruebasInfo } = await supabase
                .from('pruebas')
                .select('prueba_id, nombre, unidad_default')
                .in('prueba_id', pruebaIdsParaObtener)
              
              const pruebasMap = new Map()
              if (pruebasInfo) {
                pruebasInfo.forEach(p => {
                  if (p.prueba_id) {
                    pruebasMap.set(p.prueba_id, {
                      nombre: p.nombre,
                      unidad_default: p.unidad_default
                    })
                  }
                })
              }
              
              resultadosAdicionales = resultadosAdicionales.map(resultado => {
                const pruebaInfo = pruebasMap.get(resultado.prueba_id)
                if (pruebaInfo) {
                  return { ...resultado, prueba: pruebaInfo }
                }
                return resultado
              })
            } catch (errPruebas) {
              // Error silenciado
            }
          }
          
          // Continuar con el procesamiento solo si tenemos resultados
          if (resultadosAdicionales.length > 0) {
            // Ya no necesitamos filtrar por fecha porque ya lo hicimos en la consulta
            // Filtrar duplicados y resultados que ya están en data
            resultadosAdicionales = resultadosAdicionales.filter(r => {
              const resultadoId = r.resultado_id || r.id
              return resultadoId && !resultadosIdsEncontrados.has(resultadoId)
            })
            
            // Combinar con los datos existentes
            if (resultadosAdicionales.length > 0) {
              data = [...data, ...resultadosAdicionales]
            }
          }
        }
      } catch (errAdicional) {
        console.warn('Error al buscar resultados adicionales:', errAdicional)
      }

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
            unidad: unidad,
            data: []
          }
        }

        // Convertir fecha a formato adecuado para el gráfico
        // Nota: El campo puede ser 'anio' o 'año' dependiendo de la BD
        const año = resultado.anio || resultado.año
        let fecha = null
        if (resultado.fecha) {
          fecha = new Date(resultado.fecha)
        } else if (año && resultado.mes) {
          // Si hay año y mes pero no fecha completa, usar día 15 del mes para mejor precisión
          fecha = new Date(año, resultado.mes - 1, 15)
        }

        const fechaFormateada = fecha && !isNaN(fecha.getTime())
          ? fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
          : año && resultado.mes
          ? `${new Date(año, resultado.mes - 1).toLocaleDateString('es-ES', { month: 'short' })} ${año}`
          : 'Fecha desconocida'

        // Calcular edad si tenemos fecha de nacimiento y fecha del resultado
        // Usar fecha_nacimiento del resultado, o la general del atleta como fallback
        const fechaNacimientoResultado = resultado.fecha_nacimiento || null
        const fechaNacimientoParaEdad = fechaNacimientoResultado || fechaNacimiento || null
        let edad = null
        
        if (fechaNacimientoParaEdad && fecha && !isNaN(fecha.getTime())) {
          edad = calcularEdad(fechaNacimientoParaEdad, fecha)
        }

        // Agregar punto de datos
        const añoParaTimestamp = resultado.anio || resultado.año
        groupedByPrueba[pruebaNombre].data.push({
          fecha: fechaFormateada,
          fechaTimestamp: fecha && !isNaN(fecha.getTime()) ? fecha.getTime() : (añoParaTimestamp ? new Date(añoParaTimestamp, resultado.mes || 0, 15).getTime() : 0),
          marca: marcaValor,
          edad: edad,
          fechaNacimiento: fechaNacimientoResultado || fechaNacimiento // Guardar para uso posterior
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
        
        // Siempre usar el mismo color para el atleta principal
        setChartData({
          datos: datosGrafico,
          pruebas: [{
            nombre: pruebaData.name,
            unidad: pruebaData.unidad,
            color: '#0275d8'
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

  // Función para obtener datos de un atleta comparado (sin setear loading ni error)
  const fetchAthleteResultsForComparator = async (atletaId) => {
    try {
      // Obtener fecha de nacimiento del atleta desde la tabla atletas
      let fechaNacimiento = null
      try {
        const { data: atletaInfo } = await supabase
          .from('atletas')
          .select('fecha_nac')
          .eq('atleta_id', atletaId)
          .maybeSingle()
        
        if (atletaInfo && atletaInfo.fecha_nac) {
          fechaNacimiento = atletaInfo.fecha_nac
        }
      } catch (err) {
        console.warn('No se pudo obtener fecha de nacimiento del comparador:', err)
      }

      let data = null
      let queryError = null
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
          const result2 = await supabase
            .from('resultados')
            .select('*')
            .eq('atleta_id', atletaId)
            .order('fecha', { ascending: true })
          
          data = result2.data
          queryError = result2.error
          
          if (data && !queryError && data.length > 0) {
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

      if (queryError) throw queryError
      if (!data || data.length === 0) return {}

      // Procesar y agrupar datos por nombre de prueba
      const groupedByPrueba = {}

      data.forEach((resultado) => {
        let pruebaNombre = 'Prueba desconocida'
        let unidad = ''
        let marcaValor = null

        if (resultado.prueba && typeof resultado.prueba === 'object') {
          pruebaNombre = resultado.prueba.nombre || resultado.prueba.prueba_nombre || 'Prueba desconocida'
          unidad = resultado.prueba.unidad_default || ''
        } else if (resultado.prueba_nombre) {
          pruebaNombre = resultado.prueba_nombre
        } else if (resultado.prueba) {
          pruebaNombre = typeof resultado.prueba === 'string' ? resultado.prueba : 'Prueba desconocida'
        }
        
        if (!pruebaNombre || pruebaNombre === 'Prueba desconocida') {
          return
        }

        if (resultado.marca_valor !== null && resultado.marca_valor !== undefined) {
          marcaValor = parseFloat(resultado.marca_valor)
        } else if (resultado.marca !== null && resultado.marca !== undefined) {
          const marcaStr = String(resultado.marca).trim()
          const marcaParsed = parseFloat(marcaStr.replace(',', '.'))
          if (!isNaN(marcaParsed)) {
            marcaValor = marcaParsed
          }
        }

        if (!unidad) {
          unidad = resultado.marca_unidad || resultado.unidad || resultado.unidad_default || ''
        }

        if (marcaValor === null || isNaN(marcaValor)) {
          return
        }

        if (!groupedByPrueba[pruebaNombre]) {
          groupedByPrueba[pruebaNombre] = {
            name: pruebaNombre,
            unidad: unidad,
            data: []
          }
        }

        // Nota: El campo puede ser 'anio' o 'año' dependiendo de la BD
        const año = resultado.anio || resultado.año
        let fecha = null
        if (resultado.fecha) {
          fecha = new Date(resultado.fecha)
        } else if (año && resultado.mes) {
          // Si hay año y mes pero no fecha completa, usar día 15 del mes para mejor precisión
          fecha = new Date(año, resultado.mes - 1, 15)
        }

        const fechaFormateada = fecha && !isNaN(fecha.getTime())
          ? fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
          : año && resultado.mes
          ? `${new Date(año, resultado.mes - 1).toLocaleDateString('es-ES', { month: 'short' })} ${año}`
          : 'Fecha desconocida'

        // Calcular edad si tenemos fecha de nacimiento y fecha del resultado
        // Usar fecha_nac de la tabla atletas (disponible en el scope de la función)
        const fechaNacimientoParaEdad = fechaNacimiento || resultado.fecha_nacimiento || null
        const edad = fechaNacimientoParaEdad && fecha && !isNaN(fecha.getTime())
          ? calcularEdad(fechaNacimientoParaEdad, fecha)
          : null

        const añoParaTimestamp = resultado.anio || resultado.año
        groupedByPrueba[pruebaNombre].data.push({
          fecha: fechaFormateada,
          fechaTimestamp: fecha && !isNaN(fecha.getTime()) ? fecha.getTime() : (añoParaTimestamp ? new Date(añoParaTimestamp, resultado.mes || 0, 15).getTime() : 0),
          marca: marcaValor,
          edad: edad,
          fechaNacimiento: fechaNacimientoParaEdad // Guardar para uso posterior
        })
      })

      // Ordenar datos por fecha dentro de cada grupo
      Object.keys(groupedByPrueba).forEach(prueba => {
        groupedByPrueba[prueba].data.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp)
      })

      return groupedByPrueba
    } catch (err) {
      console.error('Error al obtener resultados del comparador:', err)
      return null
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
      marca: punto.marca,
      edad: punto.edad || null,
      fechaNacimiento: punto.fechaNacimiento || null
    }))

    // Siempre usar el mismo color para el atleta principal
    setChartData({
      datos: datosGrafico,
      pruebas: [{
        nombre: pruebaData.name,
        unidad: pruebaData.unidad,
        color: '#0275d8'
      }]
    })
  }

  // Manejar cambio de prueba seleccionada (soporta ToggleButtonGroup o Select)
  const handlePruebaChange = (event, newPrueba) => {
    const valorSeleccionado = newPrueba ?? event?.target?.value ?? null
    if (valorSeleccionado !== null && valorSeleccionado !== undefined && valorSeleccionado !== '') {
      setSelectedPrueba(valorSeleccionado)
      prepareChartData(allPruebasData, valorSeleccionado, Object.values(allPruebasData).map(grupo => ({
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

  // Función para calcular la distancia perceptual entre dos colores (CIE76)
  const colorDistance = (color1, color2) => {
    // Convertir hex a RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null
    }
    
    // Convertir RGB a LAB
    const rgbToLab = (rgb) => {
      const { r: red, g: green, b: blue } = rgb
      const [x, y, z] = [red / 255, green / 255, blue / 255]
        .map(val => val > 0.04045 ? Math.pow((val + 0.055) / 1.055, 2.4) : val / 12.92)
        .map((val, i) => val * [0.95047, 1.00000, 1.08883][i] * 100)
      
      function f(t) {
        return t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t + 16/116)
      }
      
      const L = 116 * f(y / 100) - 16
      const a = 500 * (f(x / 95.047) - f(y / 100))
      const b = 200 * (f(y / 100) - f(z / 108.883))
      
      return { L, a, b }
    }
    
    // Cálculo de distancia euclidiana en LAB
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)
    
    if (!rgb1 || !rgb2) return Infinity
    
    const lab1 = rgbToLab(rgb1)
    const lab2 = rgbToLab(rgb2)
    
    return Math.sqrt(
      Math.pow(lab1.L - lab2.L, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
    )
  }

  // Obtener colores para los comparadores evitando colores similares al principal
  const getColorForAthleteIndex = (index, mainColor = '#1976d2') => {
    const allColors = [
      '#d32f2f', // Rojo
      '#388e3c', // Verde
      '#f57c00', // Naranja
      '#7b1fa2', // Púrpura
      '#c2185b', // Rosa
      '#00796b', // Verde azulado
      '#e64a19', // Rojo oscuro
      '#5d4037', // Marrón
      '#0288d1', // Azul claro - podría ser similar al principal
      '#8bc34a', // Verde lima
      '#9c27b0', // Púrpura medio
      '#ff5722', // Naranja oscuro
      '#009688', // Turquesa
      '#ff9800', // Naranja medio
      '#673ab7', // Púrpura profundo
    ]
    
    // Filtrar colores que son lo suficientemente diferentes del principal
    const suitableColors = allColors.filter(color => {
      const distance = colorDistance(mainColor, color)
      // Distancia mínima de 15 puntos CIE76 para considerar colores diferentes
      return distance > 15
    })
    
    // Si tenemos suficientes colores adecuados, usar esos
    if (suitableColors.length > 0) {
      return suitableColors[index % suitableColors.length]
    }
    
    // Fallback: usar todos los colores si no se encontraron diferencias
    return allColors[index % allColors.length]
  }

  // Combinar datos de comparadores con los del atleta principal
  const [combinedChartData, setCombinedChartData] = useState([])
  
  useEffect(() => {
    if (selectedPrueba && chartData.datos && chartData.datos.length > 0) {
      // Si estamos en modo edad, usar edad como clave, si no, usar fecha
      const keyField = viewMode === 'edad' ? 'edad' : 'fecha'
      
      // Crear un mapa con todos los datos usando la clave apropiada
      const dataMap = new Map()
      
      // Añadir datos del atleta principal
      chartData.datos.forEach(point => {
        const key = point[keyField]
        // En modo edad, solo incluir puntos que tengan edad calculada
        // En modo fecha, incluir todos los puntos
        if (viewMode === 'edad') {
          if (key !== null && key !== undefined && typeof key === 'number') {
            dataMap.set(key, {
              fecha: point.fecha,
              fechaTimestamp: point.fechaTimestamp,
              marca: point.marca,
              edad: point.edad
            })
          }
        } else {
          if (key !== null && key !== undefined) {
            dataMap.set(key, {
              fecha: point.fecha,
              fechaTimestamp: point.fechaTimestamp,
              marca: point.marca,
              edad: point.edad
            })
          }
        }
      })
      
      // Añadir datos de cada comparador
      if (comparatorAthletes.length > 0 && Object.keys(comparatorData).length > 0) {
        comparatorAthletes.forEach((athlete) => {
          const compData = comparatorData[athlete.atleta_id]
          if (compData && compData[selectedPrueba]) {
            const compPruebaData = compData[selectedPrueba]
            const atletaDataKey = `marca_comp_${athlete.atleta_id}`
            
            compPruebaData.data.forEach(compPoint => {
              const compKey = compPoint[keyField]
              // En modo edad, solo incluir puntos que tengan edad calculada (número)
              // En modo fecha, incluir todos los puntos
              if (viewMode === 'edad') {
                if (compKey !== null && compKey !== undefined && typeof compKey === 'number') {
                  if (dataMap.has(compKey)) {
                    // Si la clave ya existe, añadir el dato del comparador
                    dataMap.get(compKey)[atletaDataKey] = compPoint.marca
                  } else {
                    // Si la clave no existe, crear una nueva entrada
                    const newPoint = {
                      fecha: compPoint.fecha || '',
                      fechaTimestamp: compPoint.fechaTimestamp || 0,
                      marca: null, // No hay dato del atleta principal para esta clave
                      edad: compPoint.edad,
                      [atletaDataKey]: compPoint.marca
                    }
                    dataMap.set(compKey, newPoint)
                  }
                }
              } else {
                if (compKey !== null && compKey !== undefined) {
                  if (dataMap.has(compKey)) {
                    // Si la clave ya existe, añadir el dato del comparador
                    dataMap.get(compKey)[atletaDataKey] = compPoint.marca
                  } else {
                    // Si la clave no existe, crear una nueva entrada
                    const newPoint = {
                      fecha: compPoint.fecha || '',
                      fechaTimestamp: compPoint.fechaTimestamp || 0,
                      marca: null, // No hay dato del atleta principal para esta clave
                      edad: compPoint.edad,
                      [atletaDataKey]: compPoint.marca
                    }
                    dataMap.set(compKey, newPoint)
                  }
                }
              }
            })
          }
        })
      }
      
      // Convertir el mapa a array y ordenar
      let newData = Array.from(dataMap.values())
      if (viewMode === 'edad') {
        // Ordenar por edad
        newData.sort((a, b) => {
          if (a.edad === null || a.edad === undefined) return 1
          if (b.edad === null || b.edad === undefined) return -1
          return a.edad - b.edad
        })
      } else {
        // Ordenar por fecha
        newData.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp)
      }
      
      setCombinedChartData(newData)
    } else {
      setCombinedChartData(chartData.datos || [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData.datos, selectedPrueba, comparatorAthletes, comparatorData, viewMode])

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

  // Función para calcular la edad del atleta en un momento dado
  const calcularEdad = (fechaNacimiento, fechaResultado) => {
    if (!fechaNacimiento || !fechaResultado) {
      return null
    }

    try {
      // Asegurarse de que fechaNacimiento es un string o Date válido
      let nacimiento
      if (typeof fechaNacimiento === 'string') {
        // Si es string, crear Date directamente
        nacimiento = new Date(fechaNacimiento)
      } else if (fechaNacimiento instanceof Date) {
        nacimiento = fechaNacimiento
      } else {
        return null
      }

      // fechaResultado debería ser ya un Date object
      const resultado = fechaResultado instanceof Date ? fechaResultado : new Date(fechaResultado)

      if (isNaN(nacimiento.getTime()) || isNaN(resultado.getTime())) {
        return null
      }

      // Calcular edad usando diferencia de tiempo total para mayor precisión
      const diferenciaMilisegundos = resultado.getTime() - nacimiento.getTime()
      const diferenciaDias = diferenciaMilisegundos / (1000 * 60 * 60 * 24)
      const edadEnAnos = diferenciaDias / 365.25 // Usar 365.25 para considerar años bisiestos

      // Redondear a 2 decimales
      return Math.round(edadEnAnos * 100) / 100
    } catch (error) {
      return null
    }
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
      const prueba = chartData.pruebas?.[0]
      const unidad = prueba?.unidad || ''
      const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
      const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'
      const textoUnidad = esSegundos ? '' : (unidad ? ` ${unidad}` : '')
      
      // Obtener el punto de datos completo para mostrar fecha y edad
      const dataPoint = payload[0]?.payload
      const mostrarFecha = dataPoint?.fecha || label
      const mostrarEdad = dataPoint?.edad !== null && dataPoint?.edad !== undefined 
        ? `${dataPoint.edad.toFixed(1)} años`
        : null
      
      return (
        <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)' }} elevation={3}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {viewMode === 'edad' ? mostrarEdad || label : mostrarFecha}
          </Typography>
          {viewMode === 'edad' && mostrarFecha && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              {mostrarFecha}
            </Typography>
          )}
          {viewMode === 'fecha' && mostrarEdad && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Edad: {mostrarEdad}
            </Typography>
          )}
          {payload.map((entry, index) => {
            if (entry.value !== null && entry.value !== undefined) {
              const valorFormateado = formatTiempo(entry.value, unidad)
              return (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ color: entry.color }}
                >
                  {entry.name}: {valorFormateado}{textoUnidad}
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
        {/* Fila superior: título a la izquierda, desplegable de pruebas a la derecha */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
            gap: 1
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontSize: { xs: '1.1rem' }, mb: 0 }}
          >
            Evolución de Marcas
          </Typography>
          {pruebasDisponibles.length > 0 && (
            <FormControl
              size="small"
              sx={{ minWidth: 160 }}
            >
              <InputLabel id="prueba-select-label">Prueba</InputLabel>
              <Select
                labelId="prueba-select-label"
                id="prueba-select"
                value={selectedPrueba || ''}
                label="Prueba"
                onChange={(event) => handlePruebaChange(event, event.target.value)}
              >
                {pruebasDisponibles.map((pruebaNombre) => (
                  <MenuItem key={pruebaNombre} value={pruebaNombre}>
                    {pruebaNombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Fila inferior: botones para cambiar entre vista por fecha y por edad, debajo del título */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 0.5,
            mb: 1
          }}
        >
          <MuiTooltip title="Vista por Fecha">
            <IconButton
              size="small"
              onClick={() => setViewMode('fecha')}
              color={viewMode === 'fecha' ? 'primary' : 'default'}
              sx={{
                backgroundColor: viewMode === 'fecha' ? 'action.selected' : 'transparent'
              }}
            >
              <TbCalendar size={20} />
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Vista por Edad">
            <IconButton
              size="small"
              onClick={() => setViewMode('edad')}
              color={viewMode === 'edad' ? 'primary' : 'default'}
              sx={{
                backgroundColor: viewMode === 'edad' ? 'action.selected' : 'transparent'
              }}
            >
              <TbUser size={20} />
            </IconButton>
          </MuiTooltip>
        </Box>

        {/* Gráfico */}
        {combinedChartData && combinedChartData.length > 0 && chartWidth > 0 ? (
          <>
            <Box sx={{ mt: 2, width: '100%', overflow: 'hidden' }}>
              <LineChart
                width={chartWidth}
                height={300}
                data={combinedChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 80 }}
              >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={viewMode === 'edad' ? 'edad' : 'fecha'}
                      angle={viewMode === 'edad' ? 0 : -45}
                      textAnchor={viewMode === 'edad' ? 'middle' : 'end'}
                      height={viewMode === 'edad' ? 40 : 80}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 10 }}
                      label={{
                        value: viewMode === 'edad' ? 'Edad (años)' : 'Fecha',
                        position: 'insideBottom',
                        offset: viewMode === 'edad' ? -5 : -10,
                        style: { textAnchor: 'middle', fontSize: '10px' }
                      }}
                      tickFormatter={(value) => {
                        if (viewMode === 'edad') {
                          // Formatear edad como número con un decimal
                          return typeof value === 'number' ? value.toFixed(1) : value
                        }
                        return value
                      }}
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
                    <Legend wrapperStyle={{ bottom: 60 }} />
                    {chartData.pruebas && chartData.pruebas.length > 0 ? (
                      chartData.pruebas.map((prueba, index) => (
                        <Line
                          key={index}
                          type="monotone"
                          dataKey="marca"
                          stroke={prueba.color || '#0275d8'}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={true}
                          name={selectedAthlete?.nombre || 'Atleta Principal'}
                        />
                      ))
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="marca"
                        stroke="#0275d8"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                        name={selectedAthlete?.nombre || 'Atleta Principal'}
                      />
                    )}
                    {/* Líneas para cada comparador */}
                    {comparatorAthletes.map((athlete, index) => {
                      const compData = comparatorData[athlete.atleta_id]
                      if (compData && compData[selectedPrueba]) {
                        const compPruebaData = compData[selectedPrueba]
                        const atletaDataKey = `marca_comp_${athlete.atleta_id}`
                        // Usar el color consistente asignado al atleta desde el módulo compartido
                        const athleteColor = getColorForAthlete(athlete.atleta_id) || athleteColors[athlete.atleta_id] || '#0275d8'
                        return (
                          <Line
                            key={`comp_${athlete.atleta_id}`}
                            type="monotone"
                            dataKey={atletaDataKey}
                            stroke={athleteColor}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls={true}
                            name={athlete.nombre}
                          />
                        )
                      }
                      return null
                    })}
              </LineChart>
            </Box>

            
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
