import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { normalizePruebaNombre } from '../utils/pruebaUtils'

export function usePruebaMetrics() {
  const [referenceMaxByPrueba, setReferenceMaxByPrueba] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadReferenceMaxValues = async () => {
      try {
        const { data, error } = await supabase
          .from('pruebas')
          .select('prueba_id, nombre, max_valor, max_texto, unidad_default')

        if (error) {
          console.error('Error al cargar referencias de pruebas:', error)
          if (!cancelled) setLoading(false)
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
          setLoading(false)
        }
      } catch (refError) {
        console.error('Excepción al cargar referencias de pruebas:', refError)
        if (!cancelled) setLoading(false)
      }
    }

    loadReferenceMaxValues()

    return () => {
      cancelled = true
    }
  }, [])

  return { referenceMaxByPrueba, loading }
}
