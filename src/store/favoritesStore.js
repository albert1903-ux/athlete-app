import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook to manage the current user's favourite athletes.
 *
 * Returns:
 *   favorites     – array of athlete objects { atleta_id, nombre, fecha_nacimiento, club }
 *   isFavorite    – fn(atletaId) => boolean
 *   toggleFavorite – fn(athlete) => void  (adds if not present, removes if present)
 *   loading       – boolean
 */
export function useFavorites() {
    const [favorites, setFavorites] = useState([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            // Join atletas_favoritos → atletas → atleta_club_hist + clubes
            // We fetch the basic info and then enrich with club via a separate query
            // to keep it simple (atletas table has no direct club column).
            const { data, error } = await supabase
                .from('atletas_favoritos')
                .select(`
          atleta_id,
          atletas (
            atleta_id,
            nombre,
            fecha_nac,
            licencia
          )
        `)
                .order('created_at', { ascending: true })

            if (error) throw error

            // Build base list
            const base = (data || []).map(row => ({
                atleta_id: row.atleta_id,
                nombre: row.atletas?.nombre ?? '',
                fecha_nacimiento: row.atletas?.fecha_nac ?? null,
                licencia: row.atletas?.licencia ?? null,
                club: null,
            }))

            if (base.length === 0) {
                setFavorites([])
                return
            }

            // Enrich with latest club for each athlete
            const ids = base.map(a => a.atleta_id)
            const { data: clubData } = await supabase
                .from('atleta_club_hist')
                .select('atleta_id, clubs:clubes(nombre), fecha_inicio, fecha_fin')
                .in('atleta_id', ids)

            // Build a map atletaId -> latest club name
            const clubMap = {}
            if (clubData) {
                clubData.forEach(row => {
                    const prev = clubMap[row.atleta_id]
                    // prefer open-ended (fecha_fin is null) or the most recent start
                    const isBetter = !prev ||
                        (!row.fecha_fin && prev.fecha_fin) ||
                        (row.fecha_inicio > prev.fecha_inicio)
                    if (isBetter) {
                        clubMap[row.atleta_id] = { nombre: row.clubs?.nombre ?? null, fecha_fin: row.fecha_fin, fecha_inicio: row.fecha_inicio }
                    }
                })
            }

            const enriched = base.map(a => ({
                ...a,
                club: clubMap[a.atleta_id]?.nombre ?? null,
            }))

            setFavorites(enriched)
        } catch (err) {
            console.error('Error loading favorites:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const isFavorite = useCallback(
        (atletaId) => favorites.some(f => f.atleta_id === atletaId),
        [favorites]
    )

    const toggleFavorite = useCallback(async (athlete) => {
        const alreadyFav = favorites.some(f => f.atleta_id === athlete.atleta_id)

        if (alreadyFav) {
            const { error } = await supabase
                .from('atletas_favoritos')
                .delete()
                .eq('atleta_id', athlete.atleta_id)
            if (!error) {
                setFavorites(prev => prev.filter(f => f.atleta_id !== athlete.atleta_id))
            }
        } else {
            const { error } = await supabase
                .from('atletas_favoritos')
                .insert({ atleta_id: athlete.atleta_id })
            if (!error) {
                // Optimistic: add to list with what we know, then reload to get full data
                setFavorites(prev => [...prev, {
                    atleta_id: athlete.atleta_id,
                    nombre: athlete.nombre,
                    fecha_nacimiento: athlete.fecha_nacimiento ?? athlete.fecha_nac ?? null,
                    club: athlete.club ?? null,
                    licencia: athlete.licencia ?? null,
                }])
            }
        }
    }, [favorites])

    return { favorites, isFavorite, toggleFavorite, loading, reload: load }
}
