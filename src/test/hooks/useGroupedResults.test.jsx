import { renderHook, waitFor } from '@testing-library/react'
import { useGroupedResults } from '../../hooks/useGroupedResults'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

function createChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return chain
}

// A result with a named category and prueba object (most common case)
function makeResult(overrides = {}) {
  return {
    resultado_id: 1,
    atleta_id: 42,
    categoria_id: 3,
    categoria_nombre: 'SUB12',
    valor: 12.5,
    prueba: { prueba_id: 1, nombre: '100m', unidad_default: 's' },
    ...overrides
  }
}

describe('useGroupedResults', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty structure when results is empty array', () => {
    const { result } = renderHook(() => useGroupedResults([]))
    expect(result.current.categorias).toEqual({})
    expect(result.current.categoriaOrden).toEqual([])
    expect(result.current.categoriaLabels).toEqual({})
  })

  it('returns empty structure when results is null', () => {
    const { result } = renderHook(() => useGroupedResults(null))
    expect(result.current.categorias).toEqual({})
    expect(result.current.categoriaOrden).toEqual([])
  })

  it('groups a single result under its category and prueba', async () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))

    const results = [makeResult()]
    const { result } = renderHook(() => useGroupedResults(results))

    await waitFor(() => {
      expect(Object.keys(result.current.categorias).length).toBeGreaterThan(0)
    })

    const categoriaKey = result.current.categoriaOrden[0]
    const categoria = result.current.categorias[categoriaKey]
    expect(categoria).toBeDefined()
    expect(categoria.pruebas['100m']).toBeDefined()
    expect(categoria.pruebas['100m'].valor).toBe(12.5)
  })

  it('picks the best (lowest) time for time-based pruebas', () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))

    const results = [
      makeResult({ resultado_id: 1, valor: 12.5 }),
      makeResult({ resultado_id: 2, valor: 11.8 }), // better time
      makeResult({ resultado_id: 3, valor: 13.0 }),
    ]
    const { result } = renderHook(() => useGroupedResults(results))

    const categoriaKey = result.current.categoriaOrden[0]
    expect(result.current.categorias[categoriaKey].pruebas['100m'].valor).toBe(11.8)
    expect(result.current.categorias[categoriaKey].pruebas['100m'].isTimeBased).toBe(true)
  })

  it('picks the best (highest) value for distance/field pruebas', () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))

    const distancePrueba = { prueba_id: 2, nombre: 'Longitud', unidad_default: 'm' }
    const results = [
      makeResult({ resultado_id: 1, valor: 4.50, prueba: distancePrueba }),
      makeResult({ resultado_id: 2, valor: 5.10, prueba: distancePrueba }), // best distance
      makeResult({ resultado_id: 3, valor: 4.80, prueba: distancePrueba }),
    ]
    const { result } = renderHook(() => useGroupedResults(results))

    const categoriaKey = result.current.categoriaOrden[0]
    expect(result.current.categorias[categoriaKey].pruebas['Longitud'].valor).toBe(5.10)
    expect(result.current.categorias[categoriaKey].pruebas['Longitud'].isTimeBased).toBe(false)
  })

  it('skips results with no identifiable prueba name', () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))

    // No prueba object and no prueba_nombre → skipped
    const results = [
      { resultado_id: 1, atleta_id: 42, categoria_id: 3, categoria_nombre: 'SUB12', valor: 12.5 }
    ]
    const { result } = renderHook(() => useGroupedResults(results))

    // Category has no valid pruebas, so it should be excluded entirely
    expect(Object.keys(result.current.categorias)).toHaveLength(0)
  })

  it('groups results from multiple categories correctly', () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))

    const results = [
      makeResult({ resultado_id: 1, categoria_id: 3, categoria_nombre: 'SUB12' }),
      makeResult({ resultado_id: 2, categoria_id: 5, categoria_nombre: 'SUB14', valor: 13.1 }),
    ]
    const { result } = renderHook(() => useGroupedResults(results))

    expect(result.current.categoriaOrden).toHaveLength(2)
  })

  it('fetches category metadata from Supabase when categoria_id is present', async () => {
    const categoriasMock = [{ categoria_id: 3, nombre: 'SUB12 Oficial' }]
    supabase.from.mockReturnValue(createChain({ data: categoriasMock, error: null }))

    const results = [makeResult()]
    renderHook(() => useGroupedResults(results))

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('categorias')
    })
  })

  it('categoriaOrden is sorted alphabetically', () => {
    supabase.from.mockReturnValue(createChain({ data: [], error: null }))

    const results = [
      makeResult({ resultado_id: 1, categoria_nombre: 'SUB16', categoria_id: 7 }),
      makeResult({ resultado_id: 2, categoria_nombre: 'SUB12', categoria_id: 3 }),
      makeResult({ resultado_id: 3, categoria_nombre: 'ABS', categoria_id: 6 }),
    ]
    const { result } = renderHook(() => useGroupedResults(results))

    expect(result.current.categoriaOrden[0]).toBe('ABS')
    expect(result.current.categoriaOrden[1]).toBe('SUB12')
    expect(result.current.categoriaOrden[2]).toBe('SUB16')
  })
})
