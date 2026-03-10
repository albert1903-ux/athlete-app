import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAthleteProfile(initialAthlete) {
  const [athlete, setAthlete] = useState(initialAthlete || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setAthlete(initialAthlete || null)
  }, [initialAthlete])

  useEffect(() => {
    let isMounted = true

    const fetchProfileData = async () => {
      if (!athlete || !athlete.atleta_id) return
      
      // Si ya tenemos el club u otros datos enriquecidos, podemos omitir
      if (athlete.club && athlete.fecha_nacimiento) return

      setLoading(true)
      try {
        let currentAthlete = { ...athlete }

        // Si falta fecha_nacimiento u otros campos base, buscar en tabla atletas
        if (!currentAthlete.fecha_nacimiento || !currentAthlete.nombre) {
          const { data: baseData, error: baseError } = await supabase
            .from('atletas')
            .select('*')
            .eq('atleta_id', currentAthlete.atleta_id)
            .single()
            
          if (baseError && baseError.code !== 'PGRST116') {
             console.warn('Error fetching base athlete', baseError)
          } else if (baseData) {
             currentAthlete = { ...currentAthlete, ...baseData }
          }
        }

        // Si falta club, buscar el club del resultado más reciente
        if (!currentAthlete.club) {
          const { data: resultados } = await supabase
            .from('resultados')
            .select('club_id, fecha')
            .eq('atleta_id', currentAthlete.atleta_id)
            .order('fecha', { ascending: false })
            .limit(1)
            
          const clubId = resultados?.[0]?.club_id
          
          if (clubId) {
            const { data: clubData } = await supabase
              .from('clubes')
              .select('nombre')
              .eq('club_id', clubId)
              .single()
              
            if (clubData?.nombre) {
              currentAthlete.club = clubData.nombre
            }
          }
        }

        if (isMounted) {
          setAthlete(currentAthlete)
          setError(null)
        }
      } catch (err) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfileData()

    return () => {
      isMounted = false
    }
  }, [athlete?.atleta_id]) // Depend explicitly on ID to avoid loop if object ref changes

  return { athlete, loading, error, setAthlete }
}
