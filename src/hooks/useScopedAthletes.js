import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Returns a scoped athlete list based on the current user's role:
 * - 'club'    → athletes with results under the org's linked club
 * - 'trainer' → athletes in the trainer's assigned groups
 * - 'athlete' → their own athlete record (via atletas.user_id = auth.uid())
 * - others    → null (no scoping — global search applies)
 *
 * Returns:
 *   scopedAthletes  – [{atleta_id, nombre, fecha_nac}] | null
 *   loading         – boolean
 */
export function useScopedAthletes() {
  const { user } = useAuth()
  const [scopedAthletes, setScopedAthletes] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const role = user?.role

    if (role === 'club' && user?.organization_id) {
      setLoading(true)
      supabase.rpc('get_club_athletes').then(({ data }) => {
        setScopedAthletes(data || [])
        setLoading(false)
      })
    } else if (role === 'trainer') {
      setLoading(true)
      supabase.rpc('get_trainer_athletes').then(({ data }) => {
        setScopedAthletes(data || [])
        setLoading(false)
      })
    } else if (role === 'athlete') {
      setLoading(true)
      supabase.rpc('get_my_athlete').then(({ data }) => {
        setScopedAthletes(data || [])
        setLoading(false)
      })
    } else {
      setScopedAthletes(null)
    }
  }, [user?.role, user?.organization_id])

  return { scopedAthletes, loading }
}
