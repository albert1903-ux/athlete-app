import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const getEligibleBirthYears = (catCode, rankYear) => {
  const rYear = Number(rankYear)
  if (isNaN(rYear)) return []

  const code = catCode ? catCode.toUpperCase().replace(/\s/g, '') : ''

  let ageMin = 0
  let ageMax = 0

  if (code.includes('SUB8') || code.includes('PRE')) { ageMin = 6; ageMax = 7 }
  else if (code.includes('SUB10')) { ageMin = 8; ageMax = 9 }
  else if (code.includes('SUB12')) { ageMin = 10; ageMax = 11 }
  else if (code.includes('SUB14')) { ageMin = 12; ageMax = 13 }
  else if (code.includes('SUB16')) { ageMin = 14; ageMax = 15 }
  else if (code.includes('SUB18')) { ageMin = 16; ageMax = 17 }
  else if (code.includes('SUB20')) { ageMin = 18; ageMax = 19 }
  else if (code.includes('SUB23')) { ageMin = 20; ageMax = 22 }
  else if (code.includes('SENIOR') || code.includes('ABSOLUT')) { ageMin = 23; ageMax = 99 }
  else if (code.includes('MASTER') || code.includes('VET')) { ageMin = 35; ageMax = 99 }
  else return []

  const maxBirthYear = rYear - ageMin
  const minBirthYear = rYear - ageMax

  const years = []
  for (let y = minBirthYear; y <= maxBirthYear; y++) years.push(y)
  return years
}

export function useRankingData({
  open,
  prueba,
  categoria,
  stickyAthleteIds,
  genderFilter,
  selectedYear,
  mainAthleteId
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [top50, setTop50] = useState([])
  const [stickyList, setStickyList] = useState([])

  useEffect(() => {
    if (!open || !prueba || !categoria) {
      setTop50([])
      setStickyList([])
      return
    }

    const fetchRanking = async () => {
      setLoading(true)
      setError(null)

      try {
        const pruebaId = prueba.pruebaId || prueba.prueba_id
        const categoriaId = categoria.categoriaId || categoria.categoria_id
        const categoriaLabel = categoria.label || categoria.nombre

        if (!pruebaId || !categoriaId) {
          throw new Error('Información de prueba o categoría incompleta')
        }

        let effectiveGender = genderFilter
        if (!effectiveGender && mainAthleteId) {
          const { data: athleteRes } = await supabase
            .from('resultados')
            .select('genero')
            .eq('atleta_id', mainAthleteId)
            .limit(1)
          if (athleteRes && athleteRes.length > 0) effectiveGender = athleteRes[0].genero
        }

        const isHistoric = selectedYear === 'historic'
        let minDate = null
        let maxDate = null
        let targetYears = []

        if (!isHistoric) {
          const rYear = Number(selectedYear)
          targetYears = [rYear, rYear - 1]

          const eligibleBirthYears = getEligibleBirthYears(categoriaLabel, selectedYear)
          if (eligibleBirthYears.length > 0) {
            minDate = `${Math.min(...eligibleBirthYears)}-01-01`
            maxDate = `${Math.max(...eligibleBirthYears)}-12-31`
          } else {
            console.warn('Could not determine birth years for category:', categoriaLabel)
          }
        }

        let query = supabase
          .from('resultados')
          .select(`
            atleta_id,
            marca_valor,
            marca_texto,
            unidad,
            fecha,
            club_id,
            genero,
            anio,
            atletas!inner (
              atleta_id, nombre, fecha_nac, licencia
            ),
            clubes (
              club_id, nombre
            )
          `)
          .eq('prueba_id', pruebaId)

        if (!isHistoric) {
          if (minDate && maxDate) {
            query = query.gte('atletas.fecha_nac', minDate).lte('atletas.fecha_nac', maxDate)
          } else {
            query = query.eq('categoria_id', categoriaId)
          }
          query = query.in('anio', targetYears)
          const seasonStartDate = `${Number(selectedYear) - 1}-09-01`
          const seasonEndDate = `${selectedYear}-08-31`
          query = query.gte('fecha', seasonStartDate).lte('fecha', seasonEndDate)
        } else {
          query = query.eq('categoria_id', categoriaId)
        }

        if (effectiveGender) query = query.eq('genero', effectiveGender)

        const isTimeBased =
          prueba.isTimeBased ??
          (prueba.tipo_marca === 'tiempo' || prueba.tipo_marca === 'crono') ??
          true

        query = query.order('marca_valor', { ascending: isTimeBased }).limit(5000)

        const { data: resultsData, error: resultsError } = await query
        if (resultsError) throw resultsError

        if (!resultsData || resultsData.length === 0) {
          setTop50([])
          setStickyList([])
          return
        }

        const bestMarksMap = new Map()
        resultsData.forEach((row) => {
          const atletaId = String(row.atleta_id)
          let valor = Number(row.marca_valor)
          if (row.marca_valor === null || row.marca_valor === undefined || isNaN(valor)) {
            valor = isTimeBased ? Infinity : -Infinity
          }

          const enrichedRow = {
            ...row,
            numericValue: valor,
            atletas: row.atletas || { nombre: 'Desconocido' },
            clubes: row.clubes || { nombre: '-' }
          }

          if (!bestMarksMap.has(atletaId)) {
            bestMarksMap.set(atletaId, enrichedRow)
          } else {
            const currentVal = bestMarksMap.get(atletaId).numericValue
            const isNewBest = isTimeBased ? valor < currentVal : valor > currentVal
            if (isNewBest) bestMarksMap.set(atletaId, enrichedRow)
          }
        })

        const allAthletes = Array.from(bestMarksMap.values())

        allAthletes.forEach((item) => {
          if (item.fecha && item.atletas?.fecha_nac) {
            const diffTime = Math.abs(new Date(item.fecha) - new Date(item.atletas.fecha_nac))
            item.age = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)
          }
        })

        allAthletes.sort((a, b) =>
          isTimeBased ? a.numericValue - b.numericValue : b.numericValue - a.numericValue
        )
        allAthletes.forEach((item, index) => {
          item.rank = index + 1
        })

        const top50Result = allAthletes.slice(0, 50)
        const stickyResult = []
        stickyAthleteIds.forEach((id) => {
          const found = allAthletes.find((a) => String(a.atleta_id) === id)
          if (found && found.rank > 50) stickyResult.push(found)
        })

        setTop50(top50Result)
        setStickyList(stickyResult)
      } catch (err) {
        console.error('Error fetching ranking:', err)
        setError('Error cargando el ranking')
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [open, prueba, categoria, stickyAthleteIds, genderFilter, selectedYear, mainAthleteId])

  return { loading, error, top50, stickyList }
}
