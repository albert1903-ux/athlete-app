import { renderHook, waitFor } from '@testing-library/react'
import { useCombinedChartData } from '../../hooks/useCombinedChartData'

// Module-level constants
const EMPTY_ARRAY = []
const EMPTY_OBJECT = {}

const CHART_DATA_EMPTY = { datos: [], pruebas: [] }

const CHART_DATA = {
  datos: [
    { fecha: 'abr 2025', fechaTimestamp: 1745000000000, marca: 11.5, edad: 19.1 },
    { fecha: 'jun 2025', fechaTimestamp: 1748000000000, marca: 11.2, edad: 19.3 }
  ],
  pruebas: [{ nombre: '100m', unidad: 's', color: '#1976d2' }]
}

const COMPARATOR_DATA_WITH_PRUEBA = {
  99: {
    '100m': {
      data: [
        { fecha: 'abr 2025', fechaTimestamp: 1745000000000, marca: 12.0, edad: 18.5 },
        { fecha: 'may 2025', fechaTimestamp: 1747000000000, marca: 11.8, edad: 18.7 }
      ]
    }
  }
}

const COMPARATOR_ATHLETE = [{ atleta_id: 99, nombre: 'Comparador' }]

describe('useCombinedChartData', () => {
  it('falls through to main datos when no selectedPrueba', () => {
    const { result } = renderHook(() =>
      useCombinedChartData({
        chartData: CHART_DATA,
        comparatorAthletes: EMPTY_ARRAY,
        comparatorData: EMPTY_OBJECT,
        selectedPrueba: null,
        viewMode: 'fecha'
      })
    )
    // When no selectedPrueba, hook returns chartData.datos directly
    expect(result.current.combinedChartData).toHaveLength(2)
  })

  it('returns main datos when no comparators', async () => {
    const { result } = renderHook(() =>
      useCombinedChartData({
        chartData: CHART_DATA,
        comparatorAthletes: EMPTY_ARRAY,
        comparatorData: EMPTY_OBJECT,
        selectedPrueba: '100m',
        viewMode: 'fecha'
      })
    )
    await waitFor(() => expect(result.current.combinedChartData).toHaveLength(2))
    expect(result.current.combinedChartData[0].marca).toBe(11.5)
    expect(result.current.combinedChartData[1].marca).toBe(11.2)
  })

  it('merges comparator data into combined result (fecha mode)', async () => {
    const { result } = renderHook(() =>
      useCombinedChartData({
        chartData: CHART_DATA,
        comparatorAthletes: COMPARATOR_ATHLETE,
        comparatorData: COMPARATOR_DATA_WITH_PRUEBA,
        selectedPrueba: '100m',
        viewMode: 'fecha'
      })
    )
    // main has apr+jun; comparator has apr+may = 3 unique dates total
    await waitFor(() => expect(result.current.combinedChartData).toHaveLength(3))

    const aprEntry = result.current.combinedChartData.find((d) => d.fecha === 'abr 2025')
    expect(aprEntry?.marca).toBe(11.5)  // main athlete
    expect(aprEntry?.marca_comp_99).toBe(12.0)  // comparator
  })

  it('merges by edad in edad mode', async () => {
    const { result } = renderHook(() =>
      useCombinedChartData({
        chartData: CHART_DATA,
        comparatorAthletes: COMPARATOR_ATHLETE,
        comparatorData: COMPARATOR_DATA_WITH_PRUEBA,
        selectedPrueba: '100m',
        viewMode: 'edad'
      })
    )
    await waitFor(() => expect(result.current.combinedChartData.length).toBeGreaterThan(0))
    // All entries should have numeric edad
    result.current.combinedChartData.forEach((entry) => {
      if (entry.edad !== null && entry.edad !== undefined) {
        expect(typeof entry.edad).toBe('number')
      }
    })
  })

  it('sorts combined data by fechaTimestamp in fecha mode', async () => {
    const { result } = renderHook(() =>
      useCombinedChartData({
        chartData: CHART_DATA,
        comparatorAthletes: COMPARATOR_ATHLETE,
        comparatorData: COMPARATOR_DATA_WITH_PRUEBA,
        selectedPrueba: '100m',
        viewMode: 'fecha'
      })
    )
    await waitFor(() => expect(result.current.combinedChartData).toHaveLength(3))
    const timestamps = result.current.combinedChartData.map((d) => d.fechaTimestamp)
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b))
  })
})
