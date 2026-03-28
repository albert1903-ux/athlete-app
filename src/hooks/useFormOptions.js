import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useFormOptions({ open }) {
  const [clubes, setClubes] = useState([])
  const [pruebas, setPruebas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return

    let isMounted = true
    const loadOptions = async () => {
      setLoading(true)
      setError(null)
      try {
        const [
          { data: clubesData, error: clubesError },
          { data: pruebasData, error: pruebasError },
          { data: categoriasData, error: categoriasError }
        ] = await Promise.all([
          supabase.from('clubes').select('club_id, nombre').order('nombre', { ascending: true }),
          supabase
            .from('pruebas')
            .select('prueba_id, nombre, tipo_prueba, tipo_marca, unidad_default')
            .order('nombre', { ascending: true }),
          supabase.from('categorias').select('categoria_id, nombre').order('nombre', { ascending: true })
        ])

        if (clubesError) throw clubesError
        if (pruebasError) throw pruebasError
        if (categoriasError) throw categoriasError

        if (!isMounted) return
        setClubes(clubesData || [])
        setPruebas(pruebasData || [])
        setCategorias(categoriasData || [])
      } catch (err) {
        console.error('Error al cargar opciones del formulario:', err)
        if (isMounted) setError(err.message || 'No se pudieron cargar las opciones del formulario')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadOptions()
    return () => {
      isMounted = false
    }
  }, [open])

  const addClub = (club) => {
    setClubes((prev) => {
      if (prev.some((c) => c.club_id === club.club_id)) return prev
      return [...prev, club]
    })
  }

  return { clubes, pruebas, categorias, loading, error, addClub }
}
