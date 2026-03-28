import { useState, useEffect } from 'react'

export function useAvailableCategories({ athleteData, selectedAthlete, categoryLabels }) {
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [allPruebas, setAllPruebas] = useState([])

  useEffect(() => {
    if (!selectedAthlete) {
      setAvailableCategories([])
      setSelectedCategory(null)
      setAllPruebas([])
      return
    }

    const selectedAthleteKey = String(selectedAthlete.atleta_id)
    const selectedAthleteData = athleteData[selectedAthleteKey]

    if (!selectedAthleteData || !selectedAthleteData.categorias) {
      setAvailableCategories([])
      setSelectedCategory(null)
      setAllPruebas([])
      return
    }

    const categoriasDisponibles =
      selectedAthleteData.categoriaOrden && selectedAthleteData.categoriaOrden.length > 0
        ? selectedAthleteData.categoriaOrden
        : Object.keys(selectedAthleteData.categorias)

    const getRank = (key) => {
      const label = categoryLabels[key] || key
      const match = /\d+/.exec(String(label))
      return match ? parseInt(match[0], 10) : -Infinity
    }

    const sortedDisponibles = [...categoriasDisponibles].sort((a, b) => {
      const ra = getRank(a)
      const rb = getRank(b)
      if (rb !== ra) return rb - ra
      const la = (categoryLabels[a] || a).toString()
      const lb = (categoryLabels[b] || b).toString()
      return lb.localeCompare(la, 'es', { sensitivity: 'base' })
    })

    setAvailableCategories(sortedDisponibles)

    if (!selectedCategory || !sortedDisponibles.includes(selectedCategory)) {
      setSelectedCategory(sortedDisponibles[0] || null)
    }
  }, [athleteData, selectedAthlete, selectedCategory, categoryLabels])

  useEffect(() => {
    if (!selectedAthlete || !selectedCategory) {
      setAllPruebas([])
      return
    }

    const selectedAthleteKey = String(selectedAthlete.atleta_id)
    const pruebasMap =
      athleteData[selectedAthleteKey]?.categorias?.[selectedCategory]?.pruebas || {}

    setAllPruebas(Object.keys(pruebasMap))
  }, [athleteData, selectedAthlete, selectedCategory])

  return { availableCategories, selectedCategory, setSelectedCategory, allPruebas }
}
