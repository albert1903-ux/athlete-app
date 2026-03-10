import { useMemo, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  extractCategoriaFromResultado,
  isTimeBasedPrueba,
  getBestResult,
  CATEGORY_ID_FALLBACK_LABELS
} from '../utils/pruebaUtils'

export function useGroupedResults(results) {
  const [categoriaMetadataMap, setCategoriaMetadataMap] = useState(new Map())

  useEffect(() => {
    if (!results || results.length === 0) return

    const categoriaIdSet = new Set()
    results.forEach((resultado) => {
      if (resultado && resultado.categoria_id !== null && resultado.categoria_id !== undefined) {
        categoriaIdSet.add(resultado.categoria_id)
      } else if (resultado && resultado.categoriaId !== null && resultado.categoriaId !== undefined) {
        categoriaIdSet.add(resultado.categoriaId)
      }
    })

    if (categoriaIdSet.size > 0) {
      const fetchCategorias = async () => {
        try {
          const { data, error } = await supabase
            .from('categorias')
            .select('categoria_id, nombre')
            .in('categoria_id', Array.from(categoriaIdSet))
            
          if (!error && Array.isArray(data)) {
            const newMap = new Map()
            data.forEach(cat => {
              if (cat && cat.categoria_id !== undefined && cat.categoria_id !== null) {
                newMap.set(cat.categoria_id, cat)
                newMap.set(String(cat.categoria_id), cat)
              }
            })
            setCategoriaMetadataMap(newMap)
          }
        } catch (e) {
          console.warn('Error fetching category metadata', e)
        }
      }
      fetchCategorias()
    }
  }, [results])

  const groupedData = useMemo(() => {
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
  }, [results, categoriaMetadataMap])

  return groupedData
}
