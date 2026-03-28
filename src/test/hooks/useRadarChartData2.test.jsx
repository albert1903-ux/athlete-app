import { renderHook, waitFor } from '@testing-library/react'
import { useRadarChartData } from '../../hooks/useRadarChartData'

const ATHLETE_A = { atleta_id: 1, nombre: 'Atleta A' }
const ATHLETE_B = { atleta_id: 2, nombre: 'Atleta B' }

const ATHLETE_DATA_MULTI = {
  '1': {
    categorias: {
      'cat1': {
        pruebas: {
          '100m': { valor: 11.5, isTimeBased: true, unidad: 's', pruebaId: 'p1' }
        }
      }
    }
  },
  '2': {
    categorias: {
      'cat1': {
        pruebas: {
          '100m': { valor: 12.0, isTimeBased: true, unidad: 's', pruebaId: 'p1' }
        }
      }
    }
  }
}

const ATHLETE_DATA_SINGLE = {
  '1': {
    categorias: {
      'cat1': {
        pruebas: {
          '100m': { valor: 11.5, isTimeBased: true, unidad: 's', pruebaId: 'p1' },
          'Salto Long': { valor: 6.0, isTimeBased: false, unidad: 'm', pruebaId: 'p2' }
        }
      }
    }
  }
}

const PRUEBA_100M = ['100m']
const PRUEBAS_TWO = ['100m', 'Salto Long']
const EMPTY_REFERENCE = {}
const ATHLETES_MULTI = [ATHLETE_A, ATHLETE_B]
const ATHLETES_SINGLE = [ATHLETE_A]

describe('useRadarChartData (multi-athlete)', () => {
  it('falls back to local min/max when no referenceMax (time-based)', async () => {
    const { result } = renderHook(() =>
      useRadarChartData({
        allPruebas: PRUEBA_100M,
        athleteData: ATHLETE_DATA_MULTI,
        allAthletes: ATHLETES_MULTI,
        selectedCategory: 'cat1',
        referenceMaxByPrueba: EMPTY_REFERENCE
      })
    )
    await waitFor(() => expect(result.current.radarData).toHaveLength(1))
    const entry = result.current.radarData[0]
    // time-based: faster (11.5) → score 100; slower (12.0) → score 0
    expect(entry['1']).toBe(100)
    expect(entry['2']).toBe(0)
  })

  it('builds radarData with one entry per prueba', async () => {
    const { result } = renderHook(() =>
      useRadarChartData({
        allPruebas: PRUEBAS_TWO,
        athleteData: ATHLETE_DATA_SINGLE,
        allAthletes: ATHLETES_SINGLE,
        selectedCategory: 'cat1',
        referenceMaxByPrueba: EMPTY_REFERENCE
      })
    )
    await waitFor(() => expect(result.current.radarData).toHaveLength(2))
    const pruebasInData = result.current.radarData.map((e) => e.prueba)
    expect(pruebasInData).toContain('100m')
    expect(pruebasInData).toContain('Salto Long')
  })
})
