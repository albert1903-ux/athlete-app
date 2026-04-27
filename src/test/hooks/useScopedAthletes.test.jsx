import { renderHook, waitFor } from '@testing-library/react'
import { useScopedAthletes } from '../../hooks/useScopedAthletes'

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: vi.fn() }
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// Module-level constants to avoid React 19 inline object re-render loops
const USER_CLUB = { role: 'club', organization_id: 'org-123' }
const USER_CLUB_NO_ORG = { role: 'club', organization_id: null }
const USER_TRAINER = { role: 'trainer', organization_id: 'org-456' }
const USER_ATHLETE = { role: 'athlete', organization_id: null }
const USER_SUPERADMIN = { role: 'superadmin', organization_id: null }
const USER_CONSULTA = { role: 'consulta', organization_id: null }

const CLUB_ATHLETES = [
  { atleta_id: 1, nombre: 'Ana García', fecha_nac: '2005-03-10' },
  { atleta_id: 2, nombre: 'Pere Roca', fecha_nac: '2004-07-22' },
]
const TRAINER_ATHLETES = [
  { atleta_id: 3, nombre: 'Marta Pons', fecha_nac: '2006-01-15' },
]
const MY_ATHLETE = [
  { atleta_id: 5, nombre: 'Joan Mas', fecha_nac: '2003-09-01' },
]

describe('useScopedAthletes', () => {
  beforeEach(() => vi.clearAllMocks())

  // ─── Null / unauthenticated ────────────────────────────────────────────────

  it('returns null and not loading when user is null', () => {
    useAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useScopedAthletes())
    expect(result.current.scopedAthletes).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  // ─── Global roles (superadmin, consulta) ──────────────────────────────────

  it('returns null for superadmin (global search, no scoping)', () => {
    useAuth.mockReturnValue({ user: USER_SUPERADMIN })
    const { result } = renderHook(() => useScopedAthletes())
    expect(result.current.scopedAthletes).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns null for consulta (global search, no scoping)', () => {
    useAuth.mockReturnValue({ user: USER_CONSULTA })
    const { result } = renderHook(() => useScopedAthletes())
    expect(result.current.scopedAthletes).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  // ─── Club role ─────────────────────────────────────────────────────────────

  it('calls get_club_athletes and returns list for club role', async () => {
    useAuth.mockReturnValue({ user: USER_CLUB })
    supabase.rpc.mockResolvedValue({ data: CLUB_ATHLETES })

    const { result } = renderHook(() => useScopedAthletes())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(supabase.rpc).toHaveBeenCalledWith('get_club_athletes')
    expect(result.current.scopedAthletes).toEqual(CLUB_ATHLETES)
  })

  it('returns empty array when club has no athletes', async () => {
    useAuth.mockReturnValue({ user: USER_CLUB })
    supabase.rpc.mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useScopedAthletes())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.scopedAthletes).toEqual([])
  })

  it('returns empty array when get_club_athletes returns null data', async () => {
    useAuth.mockReturnValue({ user: USER_CLUB })
    supabase.rpc.mockResolvedValue({ data: null })

    const { result } = renderHook(() => useScopedAthletes())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.scopedAthletes).toEqual([])
  })

  it('does NOT call RPC when club role has no organization_id', () => {
    useAuth.mockReturnValue({ user: USER_CLUB_NO_ORG })
    const { result } = renderHook(() => useScopedAthletes())
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(result.current.scopedAthletes).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  // ─── Trainer role ──────────────────────────────────────────────────────────

  it('calls get_trainer_athletes and returns list for trainer role', async () => {
    useAuth.mockReturnValue({ user: USER_TRAINER })
    supabase.rpc.mockResolvedValue({ data: TRAINER_ATHLETES })

    const { result } = renderHook(() => useScopedAthletes())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(supabase.rpc).toHaveBeenCalledWith('get_trainer_athletes')
    expect(result.current.scopedAthletes).toEqual(TRAINER_ATHLETES)
  })

  it('returns empty array when trainer has no assigned athletes', async () => {
    useAuth.mockReturnValue({ user: USER_TRAINER })
    supabase.rpc.mockResolvedValue({ data: null })

    const { result } = renderHook(() => useScopedAthletes())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.scopedAthletes).toEqual([])
  })

  // ─── Athlete role ──────────────────────────────────────────────────────────

  it('calls get_my_athlete and returns own record for athlete role', async () => {
    useAuth.mockReturnValue({ user: USER_ATHLETE })
    supabase.rpc.mockResolvedValue({ data: MY_ATHLETE })

    const { result } = renderHook(() => useScopedAthletes())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(supabase.rpc).toHaveBeenCalledWith('get_my_athlete')
    expect(result.current.scopedAthletes).toEqual(MY_ATHLETE)
    expect(result.current.scopedAthletes).toHaveLength(1)
  })

  it('returns empty array when athlete account is not linked to any record', async () => {
    useAuth.mockReturnValue({ user: USER_ATHLETE })
    supabase.rpc.mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useScopedAthletes())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.scopedAthletes).toEqual([])
    expect(result.current.scopedAthletes).toHaveLength(0)
  })

  it('returns empty array when get_my_athlete returns null data', async () => {
    useAuth.mockReturnValue({ user: USER_ATHLETE })
    supabase.rpc.mockResolvedValue({ data: null })

    const { result } = renderHook(() => useScopedAthletes())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.scopedAthletes).toEqual([])
  })

  // ─── Role change (re-fetch) ────────────────────────────────────────────────

  it('re-fetches when role changes from trainer to club', async () => {
    useAuth.mockReturnValue({ user: USER_TRAINER })
    supabase.rpc.mockResolvedValue({ data: TRAINER_ATHLETES })

    const { result, rerender } = renderHook(() => useScopedAthletes())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(supabase.rpc).toHaveBeenCalledWith('get_trainer_athletes')
    expect(result.current.scopedAthletes).toEqual(TRAINER_ATHLETES)

    // Simulate role change (e.g. after re-login)
    supabase.rpc.mockResolvedValue({ data: CLUB_ATHLETES })
    useAuth.mockReturnValue({ user: USER_CLUB })
    rerender()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(supabase.rpc).toHaveBeenCalledWith('get_club_athletes')
    expect(result.current.scopedAthletes).toEqual(CLUB_ATHLETES)
  })

  it('resets to null when role changes from club to superadmin', async () => {
    useAuth.mockReturnValue({ user: USER_CLUB })
    supabase.rpc.mockResolvedValue({ data: CLUB_ATHLETES })

    const { result, rerender } = renderHook(() => useScopedAthletes())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.scopedAthletes).toEqual(CLUB_ATHLETES)

    useAuth.mockReturnValue({ user: USER_SUPERADMIN })
    rerender()

    // After switching to superadmin, scopedAthletes is set to null synchronously
    expect(result.current.scopedAthletes).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
