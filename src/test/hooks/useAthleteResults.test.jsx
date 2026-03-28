import { renderHook, waitFor } from '@testing-library/react'
import { useAthleteResults } from '../../hooks/useAthleteResults'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

/**
 * Creates a chainable + thenable Supabase query mock.
 * Every chain method returns `chain` so any method can be terminal.
 * `single()` returns a Promise directly (as Supabase does).
 */
function createChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    in: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return chain
}

describe('useAthleteResults', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty results and no loading when atletaId is null', () => {
    const { result } = renderHook(() => useAthleteResults(null))
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading=true during fetch, resolves to results on success', async () => {
    const mockData = [
      {
        resultado_id: 1,
        atleta_id: 42,
        valor: 12.5,
        prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' }
      }
    ]
    supabase.from.mockReturnValue(createChain({ data: mockData, error: null }))

    const { result } = renderHook(() => useAthleteResults(42))
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('sets error and clears loading when all fallback fetches fail', async () => {
    // All three fallback levels return an error object
    const err = { message: 'database error' }
    supabase.from.mockReturnValue(createChain({ data: null, error: err }))

    const { result } = renderHook(() => useAthleteResults(99))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('database error')
    expect(result.current.results).toEqual([])
  })

  it('uses plain select + pruebas join as fallback when join queries fail', async () => {
    const joinError = { message: 'relation pruebas not found' }
    const rawData = [{ resultado_id: 1, atleta_id: 42, prueba_id: 10, valor: 12.5 }]
    const pruebasData = [{ prueba_id: 10, nombre: '100m', unidad_default: 's' }]

    supabase.from
      .mockReturnValueOnce(createChain({ data: null, error: joinError }))  // 1st join attempt
      .mockReturnValueOnce(createChain({ data: null, error: joinError }))  // 2nd join attempt
      .mockReturnValueOnce(createChain({ data: rawData, error: null }))    // plain select
      .mockReturnValueOnce(createChain({ data: pruebasData, error: null })) // pruebas fetch

    const { result } = renderHook(() => useAthleteResults(42))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    // Results should be enriched with prueba object
    expect(result.current.results[0].prueba).toEqual(pruebasData[0])
  })

  it('resets results to empty when atletaId changes to null', async () => {
    const mockData = [{ resultado_id: 1, atleta_id: 42, valor: 12.5 }]
    supabase.from.mockReturnValue(createChain({ data: mockData, error: null }))

    const { result, rerender } = renderHook(({ id }) => useAthleteResults(id), {
      initialProps: { id: 42 }
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toHaveLength(1)

    rerender({ id: null })
    expect(result.current.results).toEqual([])
  })

  it('exposes setResults for external state updates', () => {
    const { result } = renderHook(() => useAthleteResults(null))
    expect(typeof result.current.setResults).toBe('function')
  })
})
