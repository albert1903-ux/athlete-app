import { renderHook, waitFor } from '@testing-library/react'
import { usePruebaMetrics } from '../../hooks/usePruebaMetrics'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

function createChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return chain
}

describe('usePruebaMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts with loading=true and empty referenceMaxByPrueba', () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))
    const { result } = renderHook(() => usePruebaMetrics())
    expect(result.current.loading).toBe(true)
    expect(result.current.referenceMaxByPrueba).toEqual({})
  })

  it('sets loading=false after fetching pruebas', async () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))
    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('builds referenceMaxByPrueba keyed by prueba nombre', async () => {
    const pruebas = [
      { prueba_id: 1, nombre: '100m', max_valor: 10.5, max_texto: null, unidad_default: 's' }
    ]
    supabase.from.mockReturnValue(createChain({ data: pruebas, error: null }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.referenceMaxByPrueba['100m']).toMatchObject({
      pruebaId: 1,
      nombre: '100m',
      maxValor: 10.5,
      unidad: 's'
    })
  })

  it('also keys by normalized nombre (lowercase, no accents)', async () => {
    const pruebas = [
      { prueba_id: 2, nombre: 'Longitud', max_valor: 7.0, max_texto: null, unidad_default: 'm' }
    ]
    supabase.from.mockReturnValue(createChain({ data: pruebas, error: null }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Normalized key: 'longitud'
    expect(result.current.referenceMaxByPrueba['longitud']).toBeDefined()
    expect(result.current.referenceMaxByPrueba['longitud'].maxValor).toBe(7.0)
  })

  it('also keys by String(prueba_id)', async () => {
    const pruebas = [
      { prueba_id: 5, nombre: '400m', max_valor: 55.0, max_texto: null, unidad_default: 's' }
    ]
    supabase.from.mockReturnValue(createChain({ data: pruebas, error: null }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.referenceMaxByPrueba['5']).toBeDefined()
    expect(result.current.referenceMaxByPrueba['5'].maxValor).toBe(55.0)
  })

  it('skips rows with null max_valor', async () => {
    const pruebas = [
      { prueba_id: 3, nombre: 'Altura', max_valor: null, max_texto: null, unidad_default: 'm' }
    ]
    supabase.from.mockReturnValue(createChain({ data: pruebas, error: null }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(Object.keys(result.current.referenceMaxByPrueba)).toHaveLength(0)
  })

  it('skips rows where max_valor parses to NaN', async () => {
    const pruebas = [
      { prueba_id: 4, nombre: 'Peso', max_valor: 'invalid', max_texto: null, unidad_default: 'kg' }
    ]
    supabase.from.mockReturnValue(createChain({ data: pruebas, error: null }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.referenceMaxByPrueba['Peso']).toBeUndefined()
  })

  it('handles Supabase error gracefully — sets loading=false, keeps empty map', async () => {
    supabase.from.mockReturnValue(createChain({ data: null, error: { message: 'db error' } }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.referenceMaxByPrueba).toEqual({})
  })

  it('stores max_texto when present', async () => {
    const pruebas = [
      { prueba_id: 6, nombre: '110m Vallas', max_valor: 14.0, max_texto: '14.00s', unidad_default: 's' }
    ]
    supabase.from.mockReturnValue(createChain({ data: pruebas, error: null }))

    const { result } = renderHook(() => usePruebaMetrics())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.referenceMaxByPrueba['110m Vallas'].maxTexto).toBe('14.00s')
  })
})
