import { renderHook, act } from '@testing-library/react'
import { useAutoAssignClub } from '../../hooks/useAutoAssignClub'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

// Module-level constants
const CLUBES = [
  { club_id: 1, nombre: 'CA Barcelona' },
  { club_id: 2, nombre: 'CA Madrid' }
]

const addClubMock = vi.fn()

function makeHistChain(data, error = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    is: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject),
    catch: (fn) => Promise.resolve({ data, error }).catch(fn),
  }
  return chain
}

function makeSimpleChain(data, error = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject),
    catch: (fn) => Promise.resolve({ data, error }).catch(fn),
  }
  return chain
}

describe('useAutoAssignClub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addClubMock.mockReset()
  })

  it('returns autoAssigning=false initially', () => {
    const { result } = renderHook(() =>
      useAutoAssignClub({ clubes: CLUBES, addClub: addClubMock })
    )
    expect(result.current.autoAssigning).toBe(false)
  })

  it('returns null when atletaId is falsy', async () => {
    const { result } = renderHook(() =>
      useAutoAssignClub({ clubes: CLUBES, addClub: addClubMock })
    )
    let club
    await act(async () => {
      club = await result.current.getClubForAthlete(null)
    })
    expect(club).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns club from active history when found', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'atleta_club_hist') {
        // .select().eq().order().limit() returns chain, .is() resolves with active club
        return makeHistChain([{ club_id: 1, fecha_inicio: '2024-01-01', fecha_fin: null }])
      }
      return makeSimpleChain([])
    })

    const { result } = renderHook(() =>
      useAutoAssignClub({ clubes: CLUBES, addClub: addClubMock })
    )

    let club
    await act(async () => {
      club = await result.current.getClubForAthlete(42)
    })

    expect(club).toEqual(CLUBES[0])
    expect(result.current.autoAssigning).toBe(false)
  })

  it('falls back to results table when no club history found', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'atleta_club_hist') {
        return makeHistChain([]) // active query → no active club
      }
      if (table === 'resultados') {
        return makeSimpleChain([{ club_id: 2 }])
      }
      return makeSimpleChain([])
    })

    const { result } = renderHook(() =>
      useAutoAssignClub({ clubes: CLUBES, addClub: addClubMock })
    )

    let club
    await act(async () => {
      club = await result.current.getClubForAthlete(42)
    })

    // club_id 2 exists in CLUBES
    expect(club).toEqual(CLUBES[1])
  })

  it('fetches and adds club when not in the current clubes list', async () => {
    const unknownClub = { club_id: 99, nombre: 'Club Desconocido' }
    supabase.from.mockImplementation((table) => {
      if (table === 'atleta_club_hist') {
        return makeHistChain([{ club_id: 99, fecha_inicio: '2024-01-01', fecha_fin: null }])
      }
      if (table === 'clubes') {
        return makeSimpleChain(unknownClub)
      }
      return makeSimpleChain([])
    })

    const { result } = renderHook(() =>
      useAutoAssignClub({ clubes: CLUBES, addClub: addClubMock })
    )

    let club
    await act(async () => {
      club = await result.current.getClubForAthlete(42)
    })

    expect(addClubMock).toHaveBeenCalledWith(unknownClub)
    expect(club).toEqual(unknownClub)
  })

  it('returns null when no club found anywhere', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'atleta_club_hist') return makeHistChain([])
      if (table === 'resultados') return makeSimpleChain([])
      return makeSimpleChain([])
    })

    const { result } = renderHook(() =>
      useAutoAssignClub({ clubes: CLUBES, addClub: addClubMock })
    )

    let club
    await act(async () => {
      club = await result.current.getClubForAthlete(42)
    })

    expect(club).toBeNull()
  })
})
