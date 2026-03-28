import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRankingYears() {
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('historic')

  useEffect(() => {
    const fetchYears = async () => {
      try {
        let foundYears = []
        let currentMax = 9999

        while (true) {
          const { data, error } = await supabase
            .from('resultados')
            .select('anio')
            .lt('anio', currentMax)
            .order('anio', { ascending: false })
            .limit(1)

          if (error) throw error
          if (!data || data.length === 0) break

          const y = data[0].anio
          if (!y) break
          foundYears.push(y)
          currentMax = y
          if (foundYears.length > 20) break
        }

        const currentYear = new Date().getFullYear()
        if (!foundYears.includes(currentYear)) foundYears.unshift(currentYear)
        foundYears.sort((a, b) => b - a)
        foundYears = [...new Set(foundYears)]

        setYears(foundYears)

        if (foundYears.includes(currentYear)) {
          setSelectedYear(currentYear)
        } else if (foundYears.length > 0) {
          setSelectedYear(foundYears[0])
        }
      } catch (err) {
        console.error('Error fetching years:', err)
      }
    }
    fetchYears()
  }, [])

  return { years, selectedYear, setSelectedYear }
}
