import { useState, useEffect } from 'react'

export function useCombinedChartData({ chartData, comparatorAthletes, comparatorData, selectedPrueba, viewMode }) {
  const [combinedChartData, setCombinedChartData] = useState([])

  useEffect(() => {
    if (!selectedPrueba || !chartData.datos || chartData.datos.length === 0) {
      setCombinedChartData(chartData.datos || [])
      return
    }

    const keyField = viewMode === 'edad' ? 'edad' : 'fecha'
    const dataMap = new Map()

    chartData.datos.forEach((point) => {
      const key = point[keyField]
      if (viewMode === 'edad') {
        if (key !== null && key !== undefined && typeof key === 'number') {
          dataMap.set(key, {
            fecha: point.fecha,
            fechaTimestamp: point.fechaTimestamp,
            marca: point.marca,
            edad: point.edad
          })
        }
      } else {
        if (key !== null && key !== undefined) {
          dataMap.set(key, {
            fecha: point.fecha,
            fechaTimestamp: point.fechaTimestamp,
            marca: point.marca,
            edad: point.edad
          })
        }
      }
    })

    if (comparatorAthletes.length > 0 && Object.keys(comparatorData).length > 0) {
      comparatorAthletes.forEach((athlete) => {
        const compData = comparatorData[athlete.atleta_id]
        if (compData && compData[selectedPrueba]) {
          const compPruebaData = compData[selectedPrueba]
          const atletaDataKey = `marca_comp_${athlete.atleta_id}`

          compPruebaData.data.forEach((compPoint) => {
            const compKey = compPoint[keyField]
            if (viewMode === 'edad') {
              if (compKey !== null && compKey !== undefined && typeof compKey === 'number') {
                if (dataMap.has(compKey)) {
                  dataMap.get(compKey)[atletaDataKey] = compPoint.marca
                } else {
                  dataMap.set(compKey, {
                    fecha: compPoint.fecha || '',
                    fechaTimestamp: compPoint.fechaTimestamp || 0,
                    marca: null,
                    edad: compPoint.edad,
                    [atletaDataKey]: compPoint.marca
                  })
                }
              }
            } else {
              if (compKey !== null && compKey !== undefined) {
                if (dataMap.has(compKey)) {
                  dataMap.get(compKey)[atletaDataKey] = compPoint.marca
                } else {
                  dataMap.set(compKey, {
                    fecha: compPoint.fecha || '',
                    fechaTimestamp: compPoint.fechaTimestamp || 0,
                    marca: null,
                    edad: compPoint.edad,
                    [atletaDataKey]: compPoint.marca
                  })
                }
              }
            }
          })
        }
      })
    }

    let newData = Array.from(dataMap.values())
    if (viewMode === 'edad') {
      newData.sort((a, b) => {
        if (a.edad === null || a.edad === undefined) return 1
        if (b.edad === null || b.edad === undefined) return -1
        return a.edad - b.edad
      })
    } else {
      newData.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp)
    }

    setCombinedChartData(newData)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData.datos, selectedPrueba, comparatorAthletes, comparatorData, viewMode])

  return { combinedChartData }
}
