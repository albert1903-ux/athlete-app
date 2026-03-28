import { renderHook, waitFor, act } from '@testing-library/react'
import { useFormOptions } from '../../hooks/useFormOptions'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

const mockClubes = [{ club_id: 1, nombre: 'CA Barcelona' }]
const mockPruebas = [{ prueba_id: 1, nombre: '100m', tipo_prueba: 'velocidad', tipo_marca: 'tiempo', unidad_default: 's' }]
const mockCategorias = [{ categoria_id: 1, nombre: 'Sub-18' }]

function createChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (fn) => Promise.resolve(result).catch(fn),
  }
  return chain
}

describe('useFormOptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not load when open is false', () => {
    renderHook(() => useFormOptions({ open: false }))
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('starts loading when open becomes true', () => {
    supabase.from.mockImplementation(() => createChain({ data: [], error: null }))
    const { result } = renderHook(() => useFormOptions({ open: true }))
    expect(result.current.loading).toBe(true)
  })

  it('loads clubes, pruebas and categorias when open is true', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'clubes') return createChain({ data: mockClubes, error: null })
      if (table === 'pruebas') return createChain({ data: mockPruebas, error: null })
      if (table === 'categorias') return createChain({ data: mockCategorias, error: null })
      return createChain({ data: [], error: null })
    })

    const { result } = renderHook(() => useFormOptions({ open: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.clubes).toEqual(mockClubes)
    expect(result.current.pruebas).toEqual(mockPruebas)
    expect(result.current.categorias).toEqual(mockCategorias)
    expect(result.current.error).toBeNull()
  })

  it('sets error when supabase fails', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'clubes') return createChain({ data: null, error: { message: 'DB error' } })
      return createChain({ data: [], error: null })
    })

    const { result } = renderHook(() => useFormOptions({ open: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('DB error')
    expect(result.current.clubes).toEqual([])
  })

  it('addClub adds a new club to the list', async () => {
    supabase.from.mockImplementation(() => createChain({ data: [], error: null }))

    const { result } = renderHook(() => useFormOptions({ open: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newClub = { club_id: 99, nombre: 'Club Nuevo' }
    act(() => result.current.addClub(newClub))

    expect(result.current.clubes).toContainEqual(newClub)
  })

  it('addClub does not duplicate an existing club', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'clubes') return createChain({ data: mockClubes, error: null })
      return createChain({ data: [], error: null })
    })

    const { result } = renderHook(() => useFormOptions({ open: true }))
    await waitFor(() => expect(result.current.clubes).toHaveLength(1))

    act(() => result.current.addClub(mockClubes[0]))

    expect(result.current.clubes).toHaveLength(1)
  })
})
