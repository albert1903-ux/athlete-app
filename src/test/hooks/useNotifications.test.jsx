import { renderHook, waitFor, act } from '@testing-library/react'
import { useNotifications } from '../../hooks/useNotifications'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  }
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const mockUser = { id: 'user-abc', email: 'athlete@test.com' }

function createFromChain(result) {
  const chain = {
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return chain
}

function createMockChannel() {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return channel
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: mockUser })
    // Default: channel mock
    supabase.channel.mockReturnValue(createMockChannel())
    supabase.removeChannel.mockResolvedValue(undefined)
  })

  it('does not fetch when user is null', () => {
    useAuth.mockReturnValue({ user: null })
    supabase.channel.mockReturnValue(createMockChannel())
    renderHook(() => useNotifications())
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('fetches notifications on mount', async () => {
    const notifs = [
      { id: 1, message: 'New mark added', is_read: false },
      { id: 2, message: 'Event reminder', is_read: true }
    ]
    supabase.rpc.mockResolvedValue({ data: notifs, error: null })

    const { result } = renderHook(() => useNotifications())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(supabase.rpc).toHaveBeenCalledWith('get_my_notifications')
    expect(result.current.notifications).toEqual(notifs)
    expect(result.current.error).toBeNull()
  })

  it('sets error when RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('rpc error')
    expect(result.current.notifications).toEqual([])
  })

  it('computes unreadCount correctly', async () => {
    const notifs = [
      { id: 1, is_read: false },
      { id: 2, is_read: false },
      { id: 3, is_read: true }
    ]
    supabase.rpc.mockResolvedValue({ data: notifs, error: null })

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.unreadCount).toBe(2)
  })

  it('sets up realtime channel subscription on mount', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null })

    renderHook(() => useNotifications())
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())

    expect(supabase.channel).toHaveBeenCalledWith(`notifications:user_id=${mockUser.id}`)
  })

  it('removes realtime channel on unmount', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null })
    const mockChannel = createMockChannel()
    supabase.channel.mockReturnValue(mockChannel)

    const { unmount } = renderHook(() => useNotifications())
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())

    unmount()
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('markAsRead updates local notification state optimistically', async () => {
    const notifs = [
      { id: 1, is_read: false },
      { id: 2, is_read: false }
    ]
    supabase.rpc.mockResolvedValue({ data: notifs, error: null })
    supabase.from.mockReturnValue(createFromChain({ error: null }))

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAsRead(1)
    })

    const updated = result.current.notifications.find(n => n.id === 1)
    expect(updated.is_read).toBe(true)
    // notification 2 unchanged
    expect(result.current.notifications.find(n => n.id === 2).is_read).toBe(false)
  })

  it('markAsRead throws when update fails', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ id: 1, is_read: false }], error: null })
    supabase.from.mockReturnValue(createFromChain({ error: { message: 'update failed' } }))

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => { await result.current.markAsRead(1) })
    ).rejects.toMatchObject({ message: 'update failed' })
  })

  it('markAllAsRead marks all notifications as read', async () => {
    const notifs = [
      { id: 1, is_read: false },
      { id: 2, is_read: false }
    ]
    supabase.rpc.mockResolvedValue({ data: notifs, error: null })
    supabase.from.mockReturnValue(createFromChain({ error: null }))

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(result.current.notifications.every(n => n.is_read)).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('deleteNotification removes notification from state', async () => {
    const notifs = [
      { id: 1, is_read: false },
      { id: 2, is_read: true }
    ]
    supabase.rpc.mockResolvedValue({ data: notifs, error: null })
    supabase.from.mockReturnValue(createFromChain({ error: null }))

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteNotification(1)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].id).toBe(2)
  })

  it('deleteNotification throws when delete fails', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ id: 1, is_read: false }], error: null })
    supabase.from.mockReturnValue(createFromChain({ error: { message: 'delete failed' } }))

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => { await result.current.deleteNotification(1) })
    ).rejects.toMatchObject({ message: 'delete failed' })
  })

  it('fetchNotifications is exposed for manual refresh', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(typeof result.current.fetchNotifications).toBe('function')

    const callsBefore = supabase.rpc.mock.calls.length
    await act(async () => {
      await result.current.fetchNotifications()
    })
    expect(supabase.rpc.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
