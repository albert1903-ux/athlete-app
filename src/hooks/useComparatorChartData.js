import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchWithFallbacks, groupByPrueba } from './useAthleteResultsChartData'

export function useComparatorChartData({ comparatorAthletes }) {
  const [comparatorData, setComparatorData] = useState({})

  useEffect(() => {
    if (!comparatorAthletes || comparatorAthletes.length === 0) {
      setComparatorData({})
      return
    }

    let isMounted = true

    const fetchAll = async () => {
      const newData = {}

      for (const athlete of comparatorAthletes) {
        try {
          let fechaNacimiento = null
          try {
            const { data: info } = await supabase
              .from('atletas')
              .select('fecha_nac')
              .eq('atleta_id', athlete.atleta_id)
              .maybeSingle()
            if (info?.fecha_nac) fechaNacimiento = info.fecha_nac
          } catch { /* non-critical */ }

          const data = await fetchWithFallbacks(athlete.atleta_id)
          newData[athlete.atleta_id] = data.length > 0
            ? groupByPrueba(data, fechaNacimiento)
            : {}
        } catch (err) {
          console.error(`Error al cargar datos del comparador ${athlete.nombre}:`, err)
          newData[athlete.atleta_id] = null
        }
      }

      if (isMounted) setComparatorData(newData)
    }

    fetchAll()
    return () => { isMounted = false }
  }, [comparatorAthletes])

  return { comparatorData }
}
