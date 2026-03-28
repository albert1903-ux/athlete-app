import { renderHook, waitFor } from '@testing-library/react'
import { useRankingYears } from '../../hooks/useRankingYears'

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../../lib/supabase'

function makeYearsChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(result))
  }
  return chain
}

describe('useRankingYears', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('initializes with historic selected and empty years', () => {
    // Never resolves so we observe initial state
    supabase.from.mockImplementation(() => makeYearsChain(new Promise(() => {})))
    const { result } = renderHook(() => useRankingYears())
    expect(result.current.selectedYear).toBe('historic')
    expect(result.current.years).toEqual([])
  })

  it('loads years iteratively and selects current year', async () => {
    const currentYear = new Date().getFullYear()
    supabase.from
      .mockImplementationOnce(() => makeYearsChain({ data: [{ anio: currentYear }], error: null }))
      .mockImplementationOnce(() => makeYearsChain({ data: [{ anio: currentYear - 1 }], error: null }))
      .mockImplementationOnce(() => makeYearsChain({ data: [], error: null })) // stop

    const { result } = renderHook(() => useRankingYears())
    await waitFor(() => expect(result.current.years.length).toBeGreaterThan(0))

    expect(result.current.years).toContain(currentYear)
    expect(result.current.years).toContain(currentYear - 1)
    expect(result.current.selectedYear).toBe(currentYear)
    // Sorted descending
    expect(result.current.years[0]).toBeGreaterThanOrEqual(result.current.years[1])
  })

  it('prepends currentYear even if not returned by supabase', async () => {
    const currentYear = new Date().getFullYear()
    const oldYear = 2020
    supabase.from
      .mockImplementationOnce(() => makeYearsChain({ data: [{ anio: oldYear }], error: null }))
      .mockImplementationOnce(() => makeYearsChain({ data: [], error: null }))

    const { result } = renderHook(() => useRankingYears())
    await waitFor(() => expect(result.current.years.length).toBeGreaterThan(0))
    expect(result.current.years).toContain(currentYear)
  })

  it('does not crash on supabase error', async () => {
    supabase.from.mockImplementation(() =>
      makeYearsChain({ data: null, error: new Error('DB error') })
    )
    const { result } = renderHook(() => useRankingYears())
    // Should remain in initial state without throwing
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.years).toEqual([])
    expect(result.current.selectedYear).toBe('historic')
  })

  it('setSelectedYear allows manual year selection', async () => {
    supabase.from.mockImplementation(() => makeYearsChain({ data: [], error: null }))
    const { result } = renderHook(() => useRankingYears())
    await waitFor(() => expect(supabase.from).toHaveBeenCalled())
    const { act } = await import('@testing-library/react')
    act(() => { result.current.setSelectedYear(2022) })
    expect(result.current.selectedYear).toBe(2022)
  })
})
