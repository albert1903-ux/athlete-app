import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAthleteSearch({ inputValue, open, selectedAthlete, resultToEdit }) {
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    // In edit mode, if input matches the loaded athlete, no need to search
    if (resultToEdit && inputValue === resultToEdit.atleta?.nombre) {
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    const term = inputValue?.trim()
    if (!term || term.length < 2) {
      setLoading(false)
      setAtletas(selectedAthlete ? [selectedAthlete] : [])
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('atletas')
          .select('atleta_id, nombre, licencia')
          .ilike('nombre', `%${term}%`)
          .order('nombre', { ascending: true })
          .limit(100)

        if (error) throw error
        if (signal.aborted) return
        setAtletas(data || [])
      } catch (err) {
        if (!signal.aborted) {
          setAtletas([])
        }
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [inputValue, open, selectedAthlete, resultToEdit])

  return { atletas, loading }
}
