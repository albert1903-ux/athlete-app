import { renderHook, act } from '@testing-library/react'
import { useChartDimensions } from '../../hooks/useChartDimensions'

describe('useChartDimensions', () => {
  it('initializes with window.innerWidth - 40 (min 300) and height 400', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    const { result } = renderHook(() => useChartDimensions())
    expect(result.current.width).toBe(1024 - 40)
    expect(result.current.height).toBe(400)
  })

  it('uses minimum 300 when window is very narrow', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 200 })
    const { result } = renderHook(() => useChartDimensions())
    expect(result.current.width).toBe(300)
  })

  it('updates width on window resize', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 })
    const { result } = renderHook(() => useChartDimensions())
    expect(result.current.width).toBe(800 - 40)

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.width).toBe(1200 - 40)
  })

  it('removes resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useChartDimensions())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })
})
