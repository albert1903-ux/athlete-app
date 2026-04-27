import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Returns the club_id linked to the current club user's organization.
 * Returns null for non-club roles or when no club is linked.
 */
export function useMyClubId() {
  const { user } = useAuth()
  const [clubId, setClubId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role !== 'club' || !user?.organization_id) {
      setClubId(null)
      return
    }
    setLoading(true)
    supabase
      .from('organizations')
      .select('club_id')
      .eq('id', user.organization_id)
      .single()
      .then(({ data }) => {
        setClubId(data?.club_id ?? null)
        setLoading(false)
      })
  }, [user?.role, user?.organization_id])

  return { clubId, loading }
}
