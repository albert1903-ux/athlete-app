/**
 * useAthletesComparison — Part 2: error/fallback/reset tests
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

describe('useAthletesComparison (advanced)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    supabase.from.mockReturnValue(mockQuery(EMPTY))
  })

  it('falls back to plain select + pruebas fetch when join fails', async () => {
    const joinError = { message: 'join not available' }
    const rawData = [{ resultado_id: 1, atleta_id: 1, prueba_id: 1, valor: 12.5, categoria_id: 3 }]
    const pruebasData = [{ prueba_id: 1, nombre: '100m', unidad_default: 's' }]

    supabase.from
      .mockReturnValueOnce(mockQuery({ data: null, error: joinError }))
      .mockReturnValueOnce(mockQuery({ data: rawData, error: null }))
      .mockReturnValueOnce(mockQuery({ data: pruebasData, error: null }))

    const { result } = renderHook(() => useAthletesComparison(athlete1, NO_COMPARATORS))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athleteData['1']).toBeDefined()
  })

  it('sets error when both join and fallback fetch fail', async () => {
    const err = { message: 'Network failure' }
    supabase.from
      .mockReturnValueOnce(mockQuery({ data: null, error: err }))
      .mockReturnValueOnce(mockQuery({ data: null, error: err }))

    const { result } = renderHook(() => useAthletesComparison(athlete1, NO_COMPARATORS))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.athleteData).toEqual({})
  })

  it('resets data when selectedAthlete becomes null', async () => {
    const resultados = [
      { resultado_id: 1, atleta_id: 1, categoria_id: 3, valor: 12.5, prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' } }
    ]
    supabase.from.mockReturnValueOnce(mockQuery({ data: resultados, error: null }))

    const { result, rerender } = renderHook(
      ({ a }) => useAthletesComparison(a, NO_COMPARATORS),
      { initialProps: { a: athlete1 } }
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.athleteData['1']).toBeDefined()

    rerender({ a: null })
    expect(result.current.athleteData).toEqual({})
    expect(result.current.categoryLabels).toEqual({})
  })

  it('accumulates categoryLabels from multiple athletes', async () => {
    const resultados = [
      { resultado_id: 1, atleta_id: 1, categoria_id: 3, valor: 12.5, prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' } },
      { resultado_id: 2, atleta_id: 2, categoria_id: 7, valor: 11.5, prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' } }
    ]
    supabase.from.mockReturnValueOnce(mockQuery({ data: resultados, error: null }))

    const { result } = renderHook(() => useAthletesComparison(athlete1, WITH_COMPARATORS))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(Object.keys(result.current.categoryLabels).length).toBeGreaterThanOrEqual(1)
  })
})
