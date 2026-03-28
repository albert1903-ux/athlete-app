/**
 * useAthletesComparison — Part 1: sync tests + basic fetch tests
 * Split into two files because each async hook test accumulates
 * React/JSDOM state that can't be GC'd within a single worker.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { useAthletesComparison } from '../../hooks/useAthletesComparison'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

function mockQuery(result) {
  return new Proxy(Promise.resolve(result), {
    get(target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return target[prop].bind(target)
      }
      return () => mockQuery(result)
    }
  })
}

const EMPTY = { data: [], error: null }
const athlete1 = { atleta_id: 1, nombre: 'Maria' }
const athlete2 = { atleta_id: 2, nombre: 'Joan' }
const NO_COMPARATORS = []
const WITH_COMPARATORS = [athlete2]
const athleteNoId = { nombre: 'Maria' }

describe('useAthletesComparison (basic)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    supabase.from.mockReturnValue(mockQuery(EMPTY))
  })

  it('returns empty data when selectedAthlete is null', () => {
    const { result } = renderHook(() => useAthletesComparison(null, NO_COMPARATORS))
    expect(result.current.athleteData).toEqual({})
    expect(result.current.categoryLabels).toEqual({})
    expect(result.current.loading).toBe(false)
  })

  it('returns empty data when selectedAthlete has no atleta_id', () => {
    const { result } = renderHook(() => useAthletesComparison(athleteNoId, NO_COMPARATORS))
    expect(result.current.athleteData).toEqual({})
    expect(result.current.loading).toBe(false)
  })

  it('fetches and groups results for a single athlete', async () => {
    const resultados = [
      { resultado_id: 1, atleta_id: 1, categoria_id: 3, valor: 12.5, prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' } }
    ]
    supabase.from.mockReturnValueOnce(mockQuery({ data: resultados, error: null }))

    const { result } = renderHook(() => useAthletesComparison(athlete1, NO_COMPARATORS))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athleteData['1']).toBeDefined()
    expect(result.current.athleteData['1'].nombre).toBe('Maria')
    expect(result.current.athleteData['1'].atleta_id).toBe(1)
  })

  it('groups results for multiple athletes (selected + comparators)', async () => {
    const resultados = [
      { resultado_id: 1, atleta_id: 1, categoria_id: 3, valor: 12.5, prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' } },
      { resultado_id: 2, atleta_id: 2, categoria_id: 3, valor: 13.0, prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' } }
    ]
    supabase.from.mockReturnValueOnce(mockQuery({ data: resultados, error: null }))

    const { result } = renderHook(() => useAthletesComparison(athlete1, WITH_COMPARATORS))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athleteData['1']).toBeDefined()
    expect(result.current.athleteData['2']).toBeDefined()
  })
})
