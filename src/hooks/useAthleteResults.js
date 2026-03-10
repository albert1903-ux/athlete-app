import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAthleteResults(atletaId) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    if (!atletaId) {
      setResults([])
      return
    }

    const fetchResults = async () => {
      setLoading(true)
      try {
        let data = null
        try {
          const { data: resData, error: refError } = await supabase
            .from('resultados')
            .select(`
                *,
                prueba:pruebas(prueba_id, nombre, unidad_default)
              `)
            .eq('atleta_id', atletaId)
            .order('fecha', { ascending: true })

          if (refError) throw refError
          data = resData
        } catch (err1) {
          try {
            const { data: resData, error: refError2 } = await supabase
              .from('resultados')
              .select(`
                  *,
                  pruebas(prueba_id, nombre, unidad_default)
                `)
              .eq('atleta_id', atletaId)
              .order('fecha', { ascending: true })
              
            if (refError2) throw refError2
            data = resData
          } catch (err2) {
            const { data: resData, error: refError3 } = await supabase
              .from('resultados')
              .select('*')
              .eq('atleta_id', atletaId)
              .order('fecha', { ascending: true })

            if (refError3) throw refError3
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
        }

        if (isMounted) {
          setResults(data || [])
          setError(null)
        }
      } catch (err) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchResults()

    return () => {
      isMounted = false
    }
  }, [atletaId])

  return { results, loading, error, setResults }
}
