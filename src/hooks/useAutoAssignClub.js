import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAutoAssignClub({ clubes, addClub }) {
  const [autoAssigning, setAutoAssigning] = useState(false)

  const getClubForAthlete = async (atletaId) => {
    if (!atletaId) return null

    setAutoAssigning(true)
    try {
      let clubId = null

      const fetchLatestClub = async (onlyActive = false) => {
        let query = supabase
          .from('atleta_club_hist')
          .select('club_id, fecha_inicio, fecha_fin')
          .eq('atleta_id', atletaId)
          .order('fecha_inicio', { ascending: false, nullsFirst: false })
          .limit(1)

        if (onlyActive) query = query.is('fecha_fin', null)

        const { data, error } = await query
        if (error) throw error
        return data?.[0] || null
      }

      try {
        const latestActive = await fetchLatestClub(true)
        if (latestActive?.club_id) {
          clubId = latestActive.club_id
        } else {
          const latestAny = await fetchLatestClub(false)
          clubId = latestAny?.club_id || null
        }
      } catch (histFetchError) {
        console.warn('No se pudo obtener historial de clubes:', histFetchError)
      }

      if (!clubId) {
        const { data, error } = await supabase
          .from('resultados')
          .select('club_id')
          .eq('atleta_id', atletaId)
          .order('fecha', { ascending: false, nullsFirst: false })
          .limit(1)

        if (!error) clubId = data?.[0]?.club_id || null
      }

      if (!clubId) return null

      let resolvedClub = clubes.find((c) => c.club_id === clubId)

      if (!resolvedClub) {
        const { data: clubData, error: clubError } = await supabase
          .from('clubes')
          .select('club_id, nombre')
          .eq('club_id', clubId)
          .maybeSingle()

        if (!clubError && clubData) {
          addClub(clubData)
          resolvedClub = clubData
        }
      }

      return resolvedClub || null
    } catch (error) {
      console.warn('No se pudo asignar el club automáticamente:', error)
      return null
    } finally {
      setAutoAssigning(false)
    }
  }

  return { autoAssigning, getClubForAthlete }
}
