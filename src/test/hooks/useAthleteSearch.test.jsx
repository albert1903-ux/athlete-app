import { renderHook, act } from '@testing-library/react'
import { useAthleteSearch } from '../../hooks/useAthleteSearch'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

// Module-level constants to avoid React 19 infinite loops (object refs change on each render)
const SELECTED_ATHLETE = { atleta_id: 5, nombre: 'Maria García', licencia: 'CAT-001' }
const RESULT_TO_EDIT = { atleta: { atleta_id: 5, nombre: 'Maria García' } }

const mockAtletas = [
  { atleta_id: 1, nombre: 'Abel Torres', licencia: 'CAT-002' },
  { atleta_id: 2, nombre: 'Abelardo Vidal', licencia: 'CAT-003' }
]

function createChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (fn) => Promise.resolve(result).catch(fn),
  }
  return chain
}

describe('useAthleteSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('returns empty list when open is false', () => {
    const { result } = renderHook(() =>
      useAthleteSearch({ inputValue: 'test', open: false, selectedAthlete: null, resultToEdit: null })
    )
    expect(result.current.atletas).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns empty list when input is shorter than 2 chars and no selectedAthlete', () => {
    const { result } = renderHook(() =>
      useAthleteSearch({ inputValue: 'a', open: true, selectedAthlete: null, resultToEdit: null })
    )
    expect(result.current.atletas).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns [selectedAthlete] when input is short and athlete is selected', () => {
    const { result } = renderHook(() =>
      useAthleteSearch({ inputValue: '', open: true, selectedAthlete: SELECTED_ATHLETE, resultToEdit: null })
    )
    expect(result.current.atletas).toEqual([SELECTED_ATHLETE])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('skips search in edit mode when input matches the athlete name', () => {
    const { result } = renderHook(() =>
      useAthleteSearch({
        inputValue: 'Maria García',
        open: true,
        selectedAthlete: SELECTED_ATHLETE,
        resultToEdit: RESULT_TO_EDIT
      })
    )
    expect(result.current.atletas).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('searches after 250ms debounce when term >= 2 chars', async () => {
    supabase.from.mockImplementation(() => createChain({ data: mockAtletas, error: null }))

    const { result } = renderHook(() =>
      useAthleteSearch({ inputValue: 'ab', open: true, selectedAthlete: null, resultToEdit: null })
    )

    expect(supabase.from).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    // After act + timer advancement, React state is flushed — no waitFor needed with fake timers
    expect(result.current.loading).toBe(false)
    expect(result.current.atletas).toEqual(mockAtletas)
  })

  it('returns empty list on supabase error', async () => {
    supabase.from.mockImplementation(() =>
      createChain({ data: null, error: { message: 'Search error' } })
    )

    const { result } = renderHook(() =>
      useAthleteSearch({ inputValue: 'ab', open: true, selectedAthlete: null, resultToEdit: null })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.atletas).toEqual([])
  })
})
