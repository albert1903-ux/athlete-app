import { useState, useEffect } from 'react'
import { normalizePruebaNombre } from '../utils/pruebaUtils'

export function useRadarChartData({
  allPruebas,
  athleteData,
  allAthletes,
  selectedCategory,
  referenceMaxByPrueba
}) {
  const [radarData, setRadarData] = useState([])

  useEffect(() => {
    if (
      !selectedCategory ||
      allPruebas.length === 0 ||
      Object.keys(athleteData).length === 0 ||
      allAthletes.length === 0
    ) {
      setRadarData([])
      return
    }

    const referencesLoaded = Object.keys(referenceMaxByPrueba).length > 0
    const allValues = {}

    allPruebas.forEach((prueba) => {
      const valores = []
      let isTimeBased = true
      let unidad = ''
      const referenceKeys = new Set()

      allAthletes.forEach((athlete) => {
        const atletaIdKey = String(athlete.atleta_id)
        const pruebaInfo = athleteData[atletaIdKey]?.categorias?.[selectedCategory]?.pruebas?.[prueba]

        if (pruebaInfo) {
          valores.push(pruebaInfo.valor)
          if (pruebaInfo.isTimeBased !== undefined) isTimeBased = pruebaInfo.isTimeBased
          if (!unidad && pruebaInfo.unidad) unidad = pruebaInfo.unidad

          const posibleIds = [
            pruebaInfo?.resultado?.prueba_id,
            pruebaInfo?.resultado?.pruebaId,
            pruebaInfo?.prueba_id,
            pruebaInfo?.pruebaId
          ].filter((id) => id !== null && id !== undefined)

          posibleIds.forEach((id) => referenceKeys.add(String(id)))
        }
      })

      const normalizedName = normalizePruebaNombre(prueba)
      let referenceInfo = referenceMaxByPrueba[prueba] || referenceMaxByPrueba[normalizedName]

      if (!referenceInfo && referenceKeys.size > 0) {
        for (const key of referenceKeys) {
          if (referenceMaxByPrueba[key]) {
            referenceInfo = referenceMaxByPrueba[key]
            break
          }
        }
      }

      // Suppress unused variable warning: referencesLoaded is intentionally checked but not used further
      void referencesLoaded

      allValues[prueba] = {
        min: valores.length > 0 ? Math.min(...valores) : null,
        max: valores.length > 0 ? Math.max(...valores) : null,
        isTimeBased,
        unidad: referenceInfo?.unidad || unidad,
        referenceMax: referenceInfo?.maxValor ?? null,
        referenceInfo
      }
    })

    const radarDataArray = allPruebas.map((prueba) => {
      const range = allValues[prueba]
      const entry = { prueba, unidad: range?.unidad || '' }

      allAthletes.forEach((athlete) => {
        const atletaIdKey = String(athlete.atleta_id)
        const pruebaInfo = athleteData[atletaIdKey]?.categorias?.[selectedCategory]?.pruebas?.[prueba]

        if (pruebaInfo) {
          const valor = pruebaInfo.valor
          const referenceMax = range?.referenceMax
          const referenciaValida =
            referenceMax !== null && referenceMax !== undefined && Number(referenceMax) > 0

          if (range && referenciaValida) {
            const normalizedValue = range.isTimeBased
              ? valor > 0 ? referenceMax / valor : 0
              : valor >= 0 ? valor / referenceMax : 0
            entry[atletaIdKey] = Math.max(0, Math.min(1, normalizedValue)) * 100
          } else if (
            range &&
            range.max !== range.min &&
            range.max !== -Infinity &&
            range.min !== Infinity
          ) {
            const clampedValor = Math.max(Math.min(valor, range.max), range.min)
            const normalized01 = (clampedValor - range.min) / (range.max - range.min)
            const normalizedValue = range.isTimeBased ? 1 - normalized01 : normalized01
            entry[atletaIdKey] = Math.max(0, Math.min(100, normalizedValue * 100))
          } else {
            entry[atletaIdKey] = 0
          }

          entry[`${atletaIdKey}_real`] = valor
          entry[`${atletaIdKey}_unidad`] = pruebaInfo.unidad || range?.unidad || ''
        } else {
          entry[atletaIdKey] = 0
        }
      })

      return entry
    })

    setRadarData(radarDataArray)
  }, [allPruebas, athleteData, allAthletes, selectedCategory, referenceMaxByPrueba])

  return { radarData }
}
