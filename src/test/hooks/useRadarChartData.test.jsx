import { renderHook, waitFor } from '@testing-library/react'
import { useRadarChartData } from '../../hooks/useRadarChartData'

const ATHLETE_A = { atleta_id: 1, nombre: 'Atleta A' }
const ATHLETES_SINGLE = [ATHLETE_A]

const ATHLETE_DATA = {
  '1': {
    categorias: {
      'cat1': {
        pruebas: {
          '100m': { valor: 11.5, isTimeBased: true, unidad: 's', pruebaId: 'p1' }
        }
      }
    }
  }
}

const ALL_PRUEBAS = ['100m']
const REFERENCE_MAX = { '100m': { maxValor: 10.0, unidad: 's', pruebaId: 'p1' } }
const EMPTY_ARRAY = []
const EMPTY_OBJECT = {}

describe('useRadarChartData (basic)', () => {
  it('returns empty array when no selectedCategory', () => {
    const { result } = renderHook(() =>
      useRadarChartData({
        allPruebas: EMPTY_ARRAY,
        athleteData: EMPTY_OBJECT,
        allAthletes: EMPTY_ARRAY,
        selectedCategory: null,
        referenceMaxByPrueba: EMPTY_OBJECT
      })
    )
    expect(result.current.radarData).toEqual([])
  })

  it('returns empty array when allPruebas is empty', () => {
    const { result } = renderHook(() =>
      useRadarChartData({
        allPruebas: EMPTY_ARRAY,
        athleteData: ATHLETE_DATA,
        allAthletes: ATHLETES_SINGLE,
        selectedCategory: 'cat1',
        referenceMaxByPrueba: REFERENCE_MAX
      })
    )
    expect(result.current.radarData).toEqual([])
  })

  it('normalizes time-based prueba using referenceMax', async () => {
    const { result } = renderHook(() =>
      useRadarChartData({
        allPruebas: ALL_PRUEBAS,
        athleteData: ATHLETE_DATA,
        allAthletes: ATHLETES_SINGLE,
        selectedCategory: 'cat1',
        referenceMaxByPrueba: REFERENCE_MAX
      })
    )
    await waitFor(() => expect(result.current.radarData).toHaveLength(1))
    const entry = result.current.radarData[0]
    expect(entry.prueba).toBe('100m')
    expect(entry['1']).toBeCloseTo(86.96, 0)
    expect(entry['1_real']).toBe(11.5)
    expect(entry.unidad).toBe('s')
  })
})
