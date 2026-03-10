import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  extractCategoriaFromResultado,
  isTimeBasedPrueba,
  getBestResult,
  CATEGORY_ID_FALLBACK_LABELS
} from '../utils/pruebaUtils'

// Helper function to group results for a single athlete
function groupAthleteResults(results, categoriaMetadataMap) {
  if (!results || results.length === 0) {
    return { categorias: {}, categoriaLabels: {}, categoriaOrden: [] }
  }

  const groupedByCategoria = {}

  results.forEach((resultado) => {
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

    if (!pruebaNombre || pruebaNombre === 'Prueba desconocida') return

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

  // Calculate best result per category and prueba
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
}

export function useAthletesComparison(selectedAthlete, comparatorAthletes = []) {
  const [athleteData, setAthleteData] = useState({})
  const [categoryLabels, setCategoryLabels] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadAllData = async () => {
      if (!selectedAthlete || !selectedAthlete.atleta_id) {
        setAthleteData({})
        setCategoryLabels({})
        return
      }

      setLoading(true)
      setError(null)

      try {
        const allAthletes = [selectedAthlete, ...comparatorAthletes]
        const athleteIds = allAthletes.map(a => a.atleta_id)

        // 1. Fetch raw resultados for all athletes in a single query (batching)
        // using a fallback mechanism similar to useAthleteResults
        let data = null
        try {
          const { data: resData, error: refError } = await supabase
            .from('resultados')
            .select(`
                *,
                prueba:pruebas(prueba_id, nombre, unidad_default)
              `)
            .in('atleta_id', athleteIds)
            .order('fecha', { ascending: true })

          if (refError) throw refError
          data = resData
        } catch (err1) {
          const { data: resData, error: refError2 } = await supabase
            .from('resultados')
            .select('*')
            .in('atleta_id', athleteIds)
            .order('fecha', { ascending: true })

          if (refError2) throw refError2
          data = resData

          if (data && data.length > 0) {
            const pruebaIds = [...new Set(data.map(r => r.prueba_id).filter(Boolean))]
            if (pruebaIds.length > 0) {
              const { data: pruebasData } = await supabase
                .from('pruebas')
                .select('prueba_id, nombre, unidad_default')
                .in('prueba_id', pruebaIds)

              const pruebasMap = new Map()
              if (pruebasData) {
                pruebasData.forEach(p => pruebasMap.set(p.prueba_id, p))
              }
              data = data.map(r => ({ ...r, prueba: pruebasMap.get(r.prueba_id) || null }))
            }
          }
        }

        if (!data) data = []

        // 2. Extract unique categoria_ids to fetch metadata
        const categoriaIdSet = new Set()
        data.forEach((resultado) => {
          if (resultado && resultado.categoria_id != null) {
            categoriaIdSet.add(resultado.categoria_id)
          } else if (resultado && resultado.categoriaId != null) {
            categoriaIdSet.add(resultado.categoriaId)
          }
        })

        const categoriaMetadataMap = new Map()
        if (categoriaIdSet.size > 0) {
          const { data: categoriasData } = await supabase
            .from('categorias')
            .select('categoria_id, nombre')
            .in('categoria_id', Array.from(categoriaIdSet))

          if (categoriasData) {
            categoriasData.forEach(cat => {
              categoriaMetadataMap.set(cat.categoria_id, cat)
              categoriaMetadataMap.set(String(cat.categoria_id), cat)
            })
          }
        }

        // 3. Partition data per athlete and group
        const resultsByAthlete = {}
        athleteIds.forEach(id => { resultsByAthlete[id] = [] })

        data.forEach(row => {
          if (resultsByAthlete[row.atleta_id]) {
            resultsByAthlete[row.atleta_id].push(row)
          }
        })

        const athleteResults = {}
        const accumulatedCategoryLabels = {}

        for (const athlete of allAthletes) {
          const rawAthleteResults = resultsByAthlete[athlete.atleta_id] || []
          const grouped = groupAthleteResults(rawAthleteResults, categoriaMetadataMap)

          const atletaIdKey = String(athlete.atleta_id)
          athleteResults[atletaIdKey] = {
            nombre: athlete.nombre,
            categorias: grouped.categorias,
            categoriaOrden: grouped.categoriaOrden,
            atleta_id: athlete.atleta_id
          }

          Object.assign(accumulatedCategoryLabels, grouped.categoriaLabels)
        }

        if (isMounted) {
          setAthleteData(athleteResults)
          setCategoryLabels(accumulatedCategoryLabels)
          setError(null)
        }
      } catch (err) {
        console.error('Error al cargar datos agrupados de atletas:', err)
        if (isMounted) setError(err.message || 'Error al cargar los resultados')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadAllData()

    return () => {
      isMounted = false
    }
  }, [selectedAthlete, comparatorAthletes])

  return { athleteData, categoryLabels, loading, error }
}
