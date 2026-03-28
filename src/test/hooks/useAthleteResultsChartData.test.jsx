import { renderHook, waitFor, act } from '@testing-library/react'
import { useAthleteResultsChartData } from '../../hooks/useAthleteResultsChartData'

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../../lib/supabase'

function makeChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    in: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

const RESULTADOS = [
  {
    resultado_id: 1,
    atleta_id: 42,
    fecha: '2025-04-10',
    prueba: { nombre: '100m', unidad_default: 's' },
    marca_valor: 11.5
  },
  {
    resultado_id: 2,
    atleta_id: 42,
    fecha: '2025-06-01',
    prueba: { nombre: '100m', unidad_default: 's' },
    marca_valor: 11.2
  }
]

describe('useAthleteResultsChartData', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns empty state when atletaId is null', () => {
    const { result } = renderHook(() =>
      useAthleteResultsChartData({ atletaId: null, primaryColor: '#1976d2' })
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.chartData).toEqual({ datos: [], pruebas: [] })
    expect(result.current.allPruebasData).toEqual({})
  })

  it('fetches data and groups by prueba', async () => {
    // atleta info fetch
    supabase.from
      .mockImplementationOnce(() => makeChain({ data: { nombre: 'Carlos', fecha_nac: '2006-01-01' }, error: null }))
      // resultados with join (success on first try)
      .mockImplementationOnce(() => makeChain({ data: RESULTADOS, error: null }))
      // null atleta_id check
      .mockImplementationOnce(() => makeChain({ data: [], error: null }))

    const { result } = renderHook(() =>
      useAthleteResultsChartData({ atletaId: 42, primaryColor: '#1976d2' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(Object.keys(result.current.allPruebasData)).toContain('100m')
    expect(result.current.allPruebasData['100m'].data).toHaveLength(2)
    // selectedPrueba defaults to first prueba
    expect(result.current.selectedPrueba).toBe('100m')
    // chartData contains datos for selected prueba
    expect(result.current.chartData.datos).toHaveLength(2)
  })

  it('sets error state on fetch failure', async () => {
    // atleta info fetch fails (non-critical, continues)
    supabase.from
      .mockImplementationOnce(() => makeChain({ data: null, error: new Error('atleta not found') }))
      // resultados join attempt throws
      .mockImplementationOnce(() => {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          order: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') })),
          then: (resolve, reject) =>
            Promise.resolve({ data: null, error: new Error('DB error') }).then(resolve, reject)
        }
        return chain
      })
      // second join attempt also fails
      .mockImplementationOnce(() => {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          order: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') })),
          then: (resolve, reject) =>
            Promise.resolve({ data: null, error: new Error('DB error') }).then(resolve, reject)
        }
        return chain
      })
      // fallback simple select also fails
      .mockImplementationOnce(() => makeChain({ data: null, error: new Error('DB error') }))

    const { result } = renderHook(() =>
      useAthleteResultsChartData({ atletaId: 99, primaryColor: '#1976d2' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.chartData).toEqual({ datos: [], pruebas: [] })
  })

  it('updates chartData when selectedPrueba changes', async () => {
    const resultados = [
      ...RESULTADOS,
      {
        resultado_id: 3,
        atleta_id: 42,
        fecha: '2025-03-01',
        prueba: { nombre: '200m', unidad_default: 's' },
        marca_valor: 23.1
      }
    ]

    supabase.from
      .mockImplementationOnce(() => makeChain({ data: { nombre: 'Carlos', fecha_nac: '2006-01-01' }, error: null }))
      .mockImplementationOnce(() => makeChain({ data: resultados, error: null }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }))

    const { result } = renderHook(() =>
      useAthleteResultsChartData({ atletaId: 42, primaryColor: '#1976d2' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Change to a different prueba
    act(() => {
      result.current.setSelectedPrueba('200m')
    })

    await waitFor(() => {
      expect(result.current.chartData.datos).toHaveLength(1)
    })
    expect(result.current.chartData.datos[0].marca).toBe(23.1)
  })
})
