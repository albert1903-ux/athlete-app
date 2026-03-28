import { renderHook, waitFor } from '@testing-library/react'
import { useRankingData } from '../../hooks/useRankingData'

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../../lib/supabase'

function makeRankingChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(result))
  }
  return chain
}

// Module-level constants
const PRUEBA = { pruebaId: 'p1', isTimeBased: true }
const CATEGORIA = { categoriaId: 'cat1', label: 'Sub20' }
const STICKY_IDS = new Set()

const ROW_BASE = {
  atleta_id: 1,
  marca_valor: 11.5,
  marca_texto: '11.50',
  unidad: 's',
  fecha: '2025-05-01',
  club_id: 10,
  genero: 'MASC',
  anio: 2025,
  atletas: { atleta_id: 1, nombre: 'Carlos', fecha_nac: '2006-03-01', licencia: 'L1' },
  clubes: { club_id: 10, nombre: 'Club A' }
}

describe('useRankingData', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns empty state when not open', () => {
    const { result } = renderHook(() =>
      useRankingData({
        open: false,
        prueba: PRUEBA,
        categoria: CATEGORIA,
        stickyAthleteIds: STICKY_IDS,
        genderFilter: 'MASC',
        selectedYear: 'historic',
        mainAthleteId: null
      })
    )
    expect(result.current.top50).toEqual([])
    expect(result.current.stickyList).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('loads ranking top50', async () => {
    supabase.from.mockImplementation(() =>
      makeRankingChain({ data: [ROW_BASE], error: null })
    )

    const { result } = renderHook(() =>
      useRankingData({
        open: true,
        prueba: PRUEBA,
        categoria: CATEGORIA,
        stickyAthleteIds: STICKY_IDS,
        genderFilter: 'MASC',
        selectedYear: 'historic',
        mainAthleteId: null
      })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.top50).toHaveLength(1)
    expect(result.current.top50[0].rank).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('deduplicates by athlete keeping best mark (time-based: lower is better)', async () => {
    const rows = [
      { ...ROW_BASE, marca_valor: 11.5 }, // athlete 1, slower
      { ...ROW_BASE, marca_valor: 11.2 }  // athlete 1, faster (best)
    ]
    supabase.from.mockImplementation(() =>
      makeRankingChain({ data: rows, error: null })
    )

    const { result } = renderHook(() =>
      useRankingData({
        open: true,
        prueba: PRUEBA,
        categoria: CATEGORIA,
        stickyAthleteIds: STICKY_IDS,
        genderFilter: 'MASC',
        selectedYear: 'historic',
        mainAthleteId: null
      })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    // Only one entry (deduped)
    expect(result.current.top50).toHaveLength(1)
    expect(result.current.top50[0].marca_valor).toBe(11.2)
  })

  it('sets error when supabase query fails', async () => {
    supabase.from.mockImplementation(() =>
      makeRankingChain({ data: null, error: new Error('query failed') })
    )

    const { result } = renderHook(() =>
      useRankingData({
        open: true,
        prueba: PRUEBA,
        categoria: CATEGORIA,
        stickyAthleteIds: STICKY_IDS,
        genderFilter: 'MASC',
        selectedYear: 'historic',
        mainAthleteId: null
      })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatch(/Error/)
    expect(result.current.top50).toEqual([])
  })

  it('sets stickyList for athletes outside top50', async () => {
    // Create 51+ athletes with decreasing marks
    const rows = Array.from({ length: 52 }, (_, i) => ({
      ...ROW_BASE,
      atleta_id: i + 1,
      marca_valor: 10 + i * 0.1,
      atletas: { ...ROW_BASE.atletas, atleta_id: i + 1, nombre: `Atleta ${i + 1}` }
    }))
    supabase.from.mockImplementation(() =>
      makeRankingChain({ data: rows, error: null })
    )

    // Athlete 52 is at rank 52, should go to stickyList
    const stickyIds = new Set(['52'])
    const { result } = renderHook(() =>
      useRankingData({
        open: true,
        prueba: PRUEBA,
        categoria: CATEGORIA,
        stickyAthleteIds: stickyIds,
        genderFilter: 'MASC',
        selectedYear: 'historic',
        mainAthleteId: null
      })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.top50).toHaveLength(50)
    expect(result.current.stickyList).toHaveLength(1)
    expect(result.current.stickyList[0].rank).toBeGreaterThan(50)
  })
})
