import { useState, useEffect } from 'react'

export function useChartDimensions() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? Math.max(300, window.innerWidth - 40) : 300,
    height: 400
  })

  useEffect(() => {
    const update = () => {
      setDimensions({ width: Math.max(300, window.innerWidth - 40), height: 400 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return dimensions
}
