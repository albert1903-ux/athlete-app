import { renderHook, waitFor } from '@testing-library/react'
import { useComparatorChartData } from '../../hooks/useComparatorChartData'

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('../../hooks/useAthleteResultsChartData', () => ({
  fetchWithFallbacks: vi.fn(),
  groupByPrueba: vi.fn()
}))
import { supabase } from '../../lib/supabase'
import { fetchWithFallbacks, groupByPrueba } from '../../hooks/useAthleteResultsChartData'

const COMPARATOR = { atleta_id: 99, nombre: 'Comparador' }
const GROUPED_DATA = { '100m': { name: '100m', unidad: 's', data: [{ marca: 11.5 }] } }

const EMPTY_ARRAY = []

describe('useComparatorChartData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty object when no comparatorAthletes', () => {
    const { result } = renderHook(() =>
      useComparatorChartData({ comparatorAthletes: EMPTY_ARRAY })
    )
    expect(result.current.comparatorData).toEqual({})
  })

  it('fetches and groups data for each comparator', async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { fecha_nac: '2006-01-01' }, error: null })
    }))
    fetchWithFallbacks.mockResolvedValue([{ resultado_id: 1 }])
    groupByPrueba.mockReturnValue(GROUPED_DATA)

    const athletes = [COMPARATOR]
    const { result } = renderHook(() =>
      useComparatorChartData({ comparatorAthletes: athletes })
    )

    await waitFor(() => expect(Object.keys(result.current.comparatorData)).toHaveLength(1))
    expect(result.current.comparatorData[99]).toEqual(GROUPED_DATA)
  })

  it('stores null for comparator that errors', async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
    fetchWithFallbacks.mockRejectedValue(new Error('fetch failed'))

    const athletes = [COMPARATOR]
    const { result } = renderHook(() =>
      useComparatorChartData({ comparatorAthletes: athletes })
    )

    await waitFor(() => expect(Object.keys(result.current.comparatorData)).toHaveLength(1))
    expect(result.current.comparatorData[99]).toBeNull()
  })

  it('stores empty object when fetchWithFallbacks returns empty array', async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
    fetchWithFallbacks.mockResolvedValue([])

    const athletes = [COMPARATOR]
    const { result } = renderHook(() =>
      useComparatorChartData({ comparatorAthletes: athletes })
    )

    await waitFor(() => expect(Object.keys(result.current.comparatorData)).toHaveLength(1))
    expect(result.current.comparatorData[99]).toEqual({})
  })
})
