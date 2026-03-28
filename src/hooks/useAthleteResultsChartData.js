import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const calcularEdad = (fechaNacimiento, fechaResultado) => {
  if (!fechaNacimiento || !fechaResultado) return null
  try {
    const nacimiento =
      typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento
    const resultado =
      fechaResultado instanceof Date ? fechaResultado : new Date(fechaResultado)
    if (isNaN(nacimiento.getTime()) || isNaN(resultado.getTime())) return null
    const dias = (resultado.getTime() - nacimiento.getTime()) / (1000 * 60 * 60 * 24)
    return Math.round((dias / 365.25) * 100) / 100
  } catch {
    return null
  }
}

const getColorForPrueba = (nombrePrueba, primaryColor) => {
  const colors = [
    primaryColor,
    '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#0288d1', '#c2185b', '#00796b', '#e64a19', '#5d4037'
  ]
  let hash = 0
  for (let i = 0; i < nombrePrueba.length; i++) {
    hash = nombrePrueba.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const hydratePruebaInfo = async (data) => {
  const pruebaIds = [...new Set(data.map((r) => r.prueba_id).filter(Boolean))]
  if (pruebaIds.length === 0) return data
  try {
    const { data: pruebasData } = await supabase
      .from('pruebas')
      .select('prueba_id, nombre, unidad_default')
      .in('prueba_id', pruebaIds)
    if (!pruebasData) return data
    const map = new Map()
    pruebasData.forEach((p) => {
      if (p.prueba_id) map.set(p.prueba_id, { nombre: p.nombre, unidad_default: p.unidad_default })
    })
    return data.map((r) => ({
      ...r,
      prueba: map.get(r.prueba_id) || r.prueba || null
    }))
  } catch {
    return data
  }
}

export const fetchWithFallbacks = async (atletaId) => {
  const isLocalDB = import.meta.env.VITE_USE_LOCAL_DB === 'true'
  let data = null

  if (!isLocalDB) {
    for (const selectStr of [
      '*, prueba:pruebas(prueba_id, nombre, unidad_default)',
      '*, pruebas(prueba_id, nombre, unidad_default)'
    ]) {
      try {
        const result = await supabase
          .from('resultados')
          .select(selectStr)
          .eq('atleta_id', atletaId)
          .order('fecha', { ascending: true })
        if (!result.error) { data = result.data; break }
      } catch { /* try next format */ }
    }
  }

  if (!data) {
    const result = await supabase
      .from('resultados')
      .select('*')
      .eq('atleta_id', atletaId)
      .order('fecha', { ascending: true })
    if (result.error) throw result.error
    data = result.data
  }

  if (data && data.length > 0) {
    data = await hydratePruebaInfo(data)
  }
  return data || []
}

export const groupByPrueba = (data, fechaNacimiento) => {
  const grouped = {}

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

    if (!pruebaNombre || pruebaNombre === 'Prueba desconocida') return

    if (resultado.marca_valor !== null && resultado.marca_valor !== undefined) {
      marcaValor = parseFloat(resultado.marca_valor)
    } else if (resultado.marca !== null && resultado.marca !== undefined) {
      const parsed = parseFloat(String(resultado.marca).trim().replace(',', '.'))
      if (!isNaN(parsed)) marcaValor = parsed
    }

    if (!unidad) {
      unidad = resultado.marca_unidad || resultado.unidad || resultado.unidad_default || ''
    }

    if (marcaValor === null || isNaN(marcaValor)) return

    if (!grouped[pruebaNombre]) {
      grouped[pruebaNombre] = { name: pruebaNombre, unidad, data: [] }
    }

    const anio = resultado.anio || resultado.año
    let fecha = null
    if (resultado.fecha) {
      fecha = new Date(resultado.fecha)
    } else if (anio && resultado.mes) {
      fecha = new Date(anio, resultado.mes - 1, 15)
    }

    const fechaFormateada =
      fecha && !isNaN(fecha.getTime())
        ? fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
        : anio && resultado.mes
          ? `${new Date(anio, resultado.mes - 1).toLocaleDateString('es-ES', { month: 'short' })} ${anio}`
          : 'Fecha desconocida'

    const fechaNacimientoParaEdad = resultado.fecha_nacimiento || fechaNacimiento || null
    const edad =
      fechaNacimientoParaEdad && fecha && !isNaN(fecha.getTime())
        ? calcularEdad(fechaNacimientoParaEdad, fecha)
        : null

    const anioTs = resultado.anio || resultado.año
    grouped[pruebaNombre].data.push({
      fecha: fechaFormateada,
      fechaTimestamp:
        fecha && !isNaN(fecha.getTime())
          ? fecha.getTime()
          : anioTs
            ? new Date(anioTs, resultado.mes || 0, 15).getTime()
            : 0,
      marca: marcaValor,
      edad,
      fechaNacimiento: fechaNacimientoParaEdad
    })
  })

  Object.keys(grouped).forEach((prueba) => {
    grouped[prueba].data.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp)
  })

  return grouped
}

export function useAthleteResultsChartData({ atletaId, primaryColor }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allPruebasData, setAllPruebasData] = useState({})
  const [chartData, setChartData] = useState({ datos: [], pruebas: [] })
  const [selectedPrueba, setSelectedPrueba] = useState(null)

  const prepareChartData = (grouped, pruebaSeleccionada) => {
    if (!pruebaSeleccionada || !grouped[pruebaSeleccionada]) {
      setChartData({ datos: [], pruebas: Object.values(grouped).map((g) => ({
        nombre: g.name, unidad: g.unidad, color: getColorForPrueba(g.name, primaryColor)
      })) })
      return
    }
    const pruebaData = grouped[pruebaSeleccionada]
    setChartData({
      datos: pruebaData.data.map((punto) => ({
        fecha: punto.fecha,
        fechaTimestamp: punto.fechaTimestamp,
        marca: punto.marca,
        edad: punto.edad ?? null,
        fechaNacimiento: punto.fechaNacimiento ?? null
      })),
      pruebas: [{ nombre: pruebaData.name, unidad: pruebaData.unidad, color: primaryColor }]
    })
  }

  useEffect(() => {
    if (!atletaId) {
      setChartData({ datos: [], pruebas: [] })
      setAllPruebasData({})
      setSelectedPrueba(null)
      return
    }

    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setSelectedPrueba(null)

      try {
        let atletaNombre = null
        let fechaNacimiento = null

        try {
          const { data: info } = await supabase
            .from('atletas')
            .select('nombre, fecha_nac')
            .eq('atleta_id', atletaId)
            .maybeSingle()
          if (info) { atletaNombre = info.nombre; fechaNacimiento = info.fecha_nac || null }
        } catch { /* non-critical */ }

        let data = await fetchWithFallbacks(atletaId)

        // Fallback: resolve nombre/fechaNacimiento from results if not found in atletas
        if (!atletaNombre && data.length > 0) {
          const nombres = [...new Set(data.map((r) => r.nombre).filter(Boolean))]
          if (nombres.length === 1) atletaNombre = nombres[0]
          else if (nombres.length > 1) {
            const counts = {}
            nombres.forEach((n) => { counts[n] = data.filter((r) => r.nombre === n).length })
            atletaNombre = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))
          }
          if (!fechaNacimiento) {
            const fechas = [...new Set(data.map((r) => r.fecha_nacimiento).filter(Boolean))]
            if (fechas.length === 1) fechaNacimiento = fechas[0]
          }
        }

        // Additional strategies: null atleta_id
        const foundIds = new Set(data.map((r) => r.resultado_id || r.id).filter(Boolean))
        const fechasEncontradas = [...new Set(data.map((r) => r.fecha_nacimiento).filter(Boolean))]

        try {
          const resultNull = await supabase
            .from('resultados').select('*').is('atleta_id', null)
            .order('fecha', { ascending: true }).limit(200)

          if (!resultNull.error && resultNull.data?.length > 0) {
            let nuevos = resultNull.data
            if (fechasEncontradas.length > 0) {
              nuevos = nuevos.filter(
                (r) => r.fecha_nacimiento && fechasEncontradas.includes(r.fecha_nacimiento)
              )
            }
            nuevos = nuevos.filter((r) => {
              const id = r.resultado_id || r.id
              return id && !foundIds.has(id)
            })
            if (nuevos.length > 0) data = [...data, ...nuevos]
          }
        } catch { /* strategy 2 failed */ }

        // Additional strategy: similar athlete names
        if (atletaNombre && data.length === foundIds.size) {
          try {
            const { data: similares } = await supabase
              .from('atletas').select('atleta_id, nombre')
              .ilike('nombre', `%${atletaNombre.trim().replace(/\s+/g, ' ')}%`)

            const otros = (similares || []).filter((a) => a.atleta_id !== atletaId)
            if (otros.length > 0) {
              const { data: otrosResultados } = await supabase
                .from('resultados').select('*')
                .in('atleta_id', otros.map((a) => a.atleta_id))
                .order('fecha', { ascending: true })

              if (otrosResultados?.length > 0) {
                const nuevos = otrosResultados.filter((r) => {
                  const id = r.resultado_id || r.id
                  return id && !foundIds.has(id)
                })
                if (nuevos.length > 0) data = [...data, ...nuevos]
              }
            }
          } catch { /* strategy 3 failed */ }
        }

        if (!data || data.length === 0) {
          if (isMounted) {
            setChartData({ datos: [], pruebas: [] })
            setAllPruebasData({})
          }
          return
        }

        const grouped = groupByPrueba(data, fechaNacimiento)

        if (!isMounted) return
        setAllPruebasData(grouped)

        const firstPrueba = Object.keys(grouped)[0] || null
        if (firstPrueba) {
          setSelectedPrueba(firstPrueba)
          prepareChartData(grouped, firstPrueba)
        } else {
          setChartData({ datos: [], pruebas: [] })
        }
      } catch (err) {
        console.error('Error al obtener resultados:', err)
        if (isMounted) {
          setError(err.message || 'Error al cargar los resultados del atleta')
          setChartData({ datos: [], pruebas: [] })
          setAllPruebasData({})
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atletaId])

  useEffect(() => {
    if (selectedPrueba && Object.keys(allPruebasData).length > 0) {
      prepareChartData(allPruebasData, selectedPrueba)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrueba])

  return { loading, error, allPruebasData, chartData, selectedPrueba, setSelectedPrueba }
}
