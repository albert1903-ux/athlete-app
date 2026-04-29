import { useState, useEffect, useMemo } from 'react'

const RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1A': 12 }

export function useChartBrush(combinedChartData, viewMode, selectedPrueba) {
  const len = combinedChartData?.length ?? 0

  const [activeRange, setActiveRange] = useState('Todo')
  const [brushRange, setBrushRange] = useState({ startIndex: 0, endIndex: Math.max(0, len - 1) })

  // Resetear solo al cambiar de prueba
  useEffect(() => {
    setActiveRange('Todo')
    setBrushRange({ startIndex: 0, endIndex: Math.max(0, (combinedChartData?.length ?? 1) - 1) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrueba])

  // Ajustar endIndex cuando llegan nuevos datos
  useEffect(() => {
    if (len === 0) return
    setBrushRange(prev => prev.endIndex === len - 1 ? prev : { ...prev, endIndex: len - 1 })
  }, [len])

  const handleRangeButton = (range) => {
    if (!range) return
    setActiveRange(range)
    if (!combinedChartData || combinedChartData.length === 0) return

    const months = RANGE_MONTHS[range]
    if (!months) {
      setBrushRange({ startIndex: 0, endIndex: combinedChartData.length - 1 })
      return
    }

    const lastTs = combinedChartData[combinedChartData.length - 1]?.fechaTimestamp
    if (!lastTs) {
      setBrushRange({ startIndex: 0, endIndex: combinedChartData.length - 1 })
      return
    }

    const cutoffTs = lastTs - months * 30 * 24 * 60 * 60 * 1000
    const startIdx = combinedChartData.findIndex(d => d.fechaTimestamp >= cutoffTs)
    setBrushRange({
      startIndex: Math.max(0, startIdx === -1 ? 0 : startIdx),
      endIndex: combinedChartData.length - 1
    })
  }

  const filteredData = useMemo(() => {
    if (!combinedChartData || combinedChartData.length === 0) return combinedChartData
    return combinedChartData.slice(brushRange.startIndex, brushRange.endIndex + 1)
  }, [combinedChartData, brushRange.startIndex, brushRange.endIndex])

  const hasRangeControls = len >= 5

  return { activeRange, filteredData, hasRangeControls, handleRangeButton }
}
