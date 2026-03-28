import { renderHook, waitFor, act } from '@testing-library/react'
import { useCalendarShares } from '../../hooks/useCalendarShares'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  }
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const mockUser = { id: 'user-123', email: 'trainer@test.com' }

function createChain(result) {
  const chain = {
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return chain
}

describe('useCalendarShares', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: mockUser })
  })

  it('does not fetch when user is null', () => {
    useAuth.mockReturnValue({ user: null })
    renderHook(() => useCalendarShares())
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('starts loading and fetches myShares and sharedWithMe on mount', async () => {
    const mySharesData = [{ id: 1, recipient_email: 'other@test.com', status: 'accepted' }]
    const sharedWithMeData = [{ id: 2, owner_email: 'owner@test.com', status: 'pending' }]

    supabase.rpc
      .mockResolvedValueOnce({ data: mySharesData, error: null })
      .mockResolvedValueOnce({ data: sharedWithMeData, error: null })

    const { result } = renderHook(() => useCalendarShares())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.myShares).toEqual(mySharesData)
    expect(result.current.sharedWithMe).toEqual(sharedWithMeData)
    expect(result.current.error).toBeNull()
    expect(supabase.rpc).toHaveBeenCalledWith('get_my_calendar_shares')
    expect(supabase.rpc).toHaveBeenCalledWith('get_shared_with_me')
  })

  it('sets error when RPC fails', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc error' } })

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('rpc error')
  })

  it('requestShare calls share_calendar_by_email and refreshes', async () => {
    // Initial fetch
    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      // requestShare call
      .mockResolvedValueOnce({ data: 'ok', error: null })
      // refresh after requestShare
      .mockResolvedValueOnce({ data: [{ id: 10 }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.requestShare('new@test.com')
    })

    expect(supabase.rpc).toHaveBeenCalledWith('share_calendar_by_email', {
      target_email: 'new@test.com'
    })
    expect(result.current.myShares).toEqual([{ id: 10 }])
  })

  it('acceptShare calls accept_calendar_share and refreshes', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: 'ok', error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.acceptShare(42)
    })

    expect(supabase.rpc).toHaveBeenCalledWith('accept_calendar_share', { share_id: 42 })
  })

  it('rejectShare calls reject_calendar_share and refreshes', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: 'ok', error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.rejectShare(42)
    })

    expect(supabase.rpc).toHaveBeenCalledWith('reject_calendar_share', { share_id: 42 })
  })

  it('revokeShare deletes from calendar_shares and refreshes', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      // refresh after revoke
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    supabase.from.mockReturnValue(createChain({ error: null }))

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.revokeShare(99)
    })

    expect(supabase.from).toHaveBeenCalledWith('calendar_shares')
  })

  it('revokeShare throws when delete fails', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    supabase.from.mockReturnValue(createChain({ error: { message: 'delete failed' } }))

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => { await result.current.revokeShare(99) })
    ).rejects.toMatchObject({ message: 'delete failed' })
  })

  it('requestShare throws when RPC fails', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => { await result.current.requestShare('bad@test.com') })
    ).rejects.toMatchObject({ message: 'not found' })
  })

  it('refreshShares re-fetches both share lists', async () => {
    supabase.rpc
      .mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useCalendarShares())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const callsBefore = supabase.rpc.mock.calls.length

    await act(async () => {
      await result.current.refreshShares()
    })

    expect(supabase.rpc.mock.calls.length).toBe(callsBefore + 2)
  })
})
