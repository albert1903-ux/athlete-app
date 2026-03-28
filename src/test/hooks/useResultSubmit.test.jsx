import { renderHook, act } from '@testing-library/react'
import { useResultSubmit } from '../../hooks/useResultSubmit'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() }
}))

vi.mock('dayjs', () => {
  const actual = vi.importActual('dayjs')
  return actual
})

import { supabase } from '../../lib/supabase'

// Module-level constants to avoid React 19 re-render loops
const FORM_VALUES = {
  atleta: { atleta_id: 1 },
  club: { club_id: 10 },
  prueba: { prueba_id: 100 },
  categoria: { categoria_id: 5 },
  fecha: '2025-06-15',
  anio: 2025,
  mes: 6,
  marcaTexto: '11.23',
  marcaValor: 11.23,
  unidad: 's',
  genero: 'MASC',
  superficie: 'AL'
}

const SAVED_RECORD = { resultado_id: 42, atleta_id: 1, club_id: 10 }

function makeInsertChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (fn) => Promise.resolve(result).catch(fn),
  }
  return chain
}

const onSuccessMock = vi.fn()
const onResetMock = vi.fn()

describe('useResultSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with clean state', () => {
    const { result } = renderHook(() =>
      useResultSubmit({ resultToEdit: null, onSuccess: onSuccessMock, onReset: onResetMock })
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBeNull()
  })

  it('sets error when form is invalid', async () => {
    const { result } = renderHook(() =>
      useResultSubmit({ resultToEdit: null, onSuccess: onSuccessMock, onReset: onResetMock })
    )

    await act(async () => {
      await result.current.submit(FORM_VALUES, false)
    })

    expect(result.current.error).toMatch(/obligatorios/)
    expect(result.current.loading).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('inserts a new result and calls onSuccess + onReset', async () => {
    // First call: fetchNextResultadoId → .select().order().limit() resolves
    // Second call: insert → .insert().select().single() resolves
    supabase.from
      .mockImplementationOnce(() => makeInsertChain({ data: [{ resultado_id: 41 }], error: null }))
      .mockImplementationOnce(() => makeInsertChain({ data: SAVED_RECORD, error: null }))

    const { result } = renderHook(() =>
      useResultSubmit({ resultToEdit: null, onSuccess: onSuccessMock, onReset: onResetMock })
    )

    let returned
    await act(async () => {
      returned = await result.current.submit(FORM_VALUES, true)
    })

    expect(returned).toEqual(SAVED_RECORD)
    expect(result.current.success).toMatch(/añadido/)
    expect(result.current.error).toBeNull()
    expect(onSuccessMock).toHaveBeenCalledWith(SAVED_RECORD)
    expect(onResetMock).toHaveBeenCalledTimes(1)
  })

  it('updates an existing result and does not call onReset', async () => {
    const resultToEdit = { resultado_id: 99 }
    supabase.from.mockImplementationOnce(() =>
      makeInsertChain({ data: { ...SAVED_RECORD, resultado_id: 99 }, error: null })
    )

    const { result } = renderHook(() =>
      useResultSubmit({ resultToEdit, onSuccess: onSuccessMock, onReset: onResetMock })
    )

    await act(async () => {
      await result.current.submit(FORM_VALUES, true)
    })

    expect(result.current.success).toMatch(/actualizado/)
    expect(onResetMock).not.toHaveBeenCalled()
  })

  it('sets error on supabase failure', async () => {
    // fetchNextResultadoId succeeds, but insert fails
    supabase.from
      .mockImplementationOnce(() => makeInsertChain({ data: [{ resultado_id: 41 }], error: null }))
      .mockImplementationOnce(() =>
        makeInsertChain({ data: null, error: { message: 'unique constraint violated' } })
      )

    const { result } = renderHook(() =>
      useResultSubmit({ resultToEdit: null, onSuccess: onSuccessMock, onReset: onResetMock })
    )

    await act(async () => {
      await result.current.submit(FORM_VALUES, true)
    })

    expect(result.current.error).toMatch(/unique constraint/)
    expect(result.current.success).toBeNull()
    expect(onSuccessMock).not.toHaveBeenCalled()
    expect(onResetMock).not.toHaveBeenCalled()
  })
})
