import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Searches athletes by name with optional scope restriction.
 *
 * @param {string}   inputValue       – current text in the athlete autocomplete
 * @param {boolean}  open             – whether the parent dialog is open
 * @param {object}   selectedAthlete  – already-selected athlete (shown when input is short)
 * @param {object}   resultToEdit     – result being edited (skips search when input matches name)
 * @param {number[]|null} scopeAthleteIds – when provided, restricts search to these atleta_ids
 */
export function useAthleteSearch({ inputValue, open, selectedAthlete, resultToEdit, scopeAthleteIds = null }) {
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    // In edit mode, if input matches the loaded athlete, no need to search
    if (resultToEdit && inputValue === resultToEdit.atleta?.nombre) {
      return
    }

    // Scoped to empty list — no results possible
    if (scopeAthleteIds !== null && scopeAthleteIds.length === 0) {
      setAtletas([])
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
        let query = supabase
          .from('atletas')
          .select('atleta_id, nombre, licencia')
          .ilike('nombre', `%${term}%`)
          .order('nombre', { ascending: true })
          .limit(scopeAthleteIds ? 50 : 100)

        if (scopeAthleteIds?.length > 0) {
          query = query.in('atleta_id', scopeAthleteIds)
        }

        const { data, error } = await query
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
  }, [inputValue, open, selectedAthlete, resultToEdit, scopeAthleteIds])

  return { atletas, loading }
}
