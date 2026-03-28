import { renderHook, waitFor, act } from '@testing-library/react'
import { useAthleteProfile } from '../../hooks/useAthleteProfile'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

import { supabase } from '../../lib/supabase'

function createChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return chain
}

function createRejectingChain(error) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.reject(error)),
    then: (_, reject) => Promise.reject(error).then(_, reject),
    catch: (onReject) => Promise.reject(error).catch(onReject),
  }
  return chain
}

describe('useAthleteProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null athlete and no loading when no initialAthlete', () => {
    const { result } = renderHook(() => useAthleteProfile(null))
    expect(result.current.athlete).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does not fetch when athlete already has club and fecha_nacimiento', () => {
    const athlete = {
      atleta_id: 1,
      nombre: 'Maria',
      club: 'CA Barcelona',
      fecha_nacimiento: '2005-01-01'
    }
    renderHook(() => useAthleteProfile(athlete))
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('syncs athlete state when initialAthlete changes', () => {
    const athlete1 = { atleta_id: 1, nombre: 'Maria', club: 'CA BCN', fecha_nacimiento: '2005-01-01' }
    const athlete2 = { atleta_id: 2, nombre: 'Joan', club: 'CA MAD', fecha_nacimiento: '2004-05-10' }

    const { result, rerender } = renderHook(({ a }) => useAthleteProfile(a), {
      initialProps: { a: athlete1 }
    })
    expect(result.current.athlete.atleta_id).toBe(1)

    rerender({ a: athlete2 })
    expect(result.current.athlete.atleta_id).toBe(2)
  })

  it('fetches base data when fecha_nacimiento is missing', async () => {
    const athlete = { atleta_id: 1, nombre: 'Maria' } // no fecha_nacimiento, no club
    const enrichedBase = { atleta_id: 1, nombre: 'Maria', fecha_nacimiento: '2005-01-01' }

    // atletas fetch → returns enriched base
    // resultados fetch (for club) → empty (no results)
    supabase.from
      .mockReturnValueOnce(createChain({ data: enrichedBase, error: null }))
      .mockReturnValueOnce(createChain({ data: [], error: null }))

    const { result } = renderHook(() => useAthleteProfile(athlete))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athlete.fecha_nacimiento).toBe('2005-01-01')
    expect(result.current.error).toBeNull()
  })

  it('fetches nombre from atletas when missing', async () => {
    const athlete = { atleta_id: 1 } // no nombre, no fecha_nacimiento, no club
    const baseData = { atleta_id: 1, nombre: 'Maria', fecha_nacimiento: '2005-01-01' }

    supabase.from
      .mockReturnValueOnce(createChain({ data: baseData, error: null }))
      .mockReturnValueOnce(createChain({ data: [], error: null })) // resultados (no club)

    const { result } = renderHook(() => useAthleteProfile(athlete))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athlete.nombre).toBe('Maria')
  })

  it('enriches athlete with club from resultados when club is missing', async () => {
    const athlete = { atleta_id: 1, nombre: 'Maria', fecha_nacimiento: '2005-01-01' } // no club

    // resultados → returns one result with club_id
    // clubes → returns club name
    supabase.from
      .mockReturnValueOnce(createChain({ data: [{ club_id: 5, fecha: '2024-01-01' }], error: null }))
      .mockReturnValueOnce(createChain({ data: { nombre: 'CA Manresa' }, error: null }))

    const { result } = renderHook(() => useAthleteProfile(athlete))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athlete.club).toBe('CA Manresa')
  })

  it('leaves club undefined when no resultados exist for the athlete', async () => {
    const athlete = { atleta_id: 1, nombre: 'Maria', fecha_nacimiento: '2005-01-01' } // no club

    supabase.from.mockReturnValue(createChain({ data: [], error: null })) // empty resultados

    const { result } = renderHook(() => useAthleteProfile(athlete))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.athlete.club).toBeUndefined()
  })

  it('sets error when an unexpected exception is thrown during fetch', async () => {
    const athlete = { atleta_id: 1 } // missing nombre → will try to fetch atletas via single()
    const err = new Error('Network failure')

    supabase.from.mockReturnValue(createRejectingChain(err))

    const { result } = renderHook(() => useAthleteProfile(athlete))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network failure')
  })

  it('exposes setAthlete for external state updates', () => {
    const { result } = renderHook(() => useAthleteProfile(null))
    expect(typeof result.current.setAthlete).toBe('function')
  })

  it('setAthlete updates athlete state', async () => {
    const { result } = renderHook(() => useAthleteProfile(null))
    const newAthlete = { atleta_id: 99, nombre: 'Test' }

    act(() => {
      result.current.setAthlete(newAthlete)
    })

    expect(result.current.athlete).toEqual(newAthlete)
  })
})
