import { renderHook, act } from '@testing-library/react'
import { useAvailableCategories } from '../../hooks/useAvailableCategories'

// Module-level constants — avoid React 19 inline object re-render loops
const ATHLETE = { atleta_id: 1, nombre: 'Atleta' }

const ATHLETE_DATA_WITH_CATS = {
  '1': {
    categorias: {
      'cat_sub20': { pruebas: { '100m': {}, '200m': {} } },
      'cat_sub16': { pruebas: { '100m': {} } },
      'cat_sub23': { pruebas: { '100m': {}, '400m': {} } }
    }
  }
}

const CATEGORY_LABELS = {
  'cat_sub20': 'Sub20',
  'cat_sub16': 'Sub16',
  'cat_sub23': 'Sub23'
}

const EMPTY_ATHLETE_DATA = {}
const EMPTY_LABELS = {}

describe('useAvailableCategories', () => {
  it('returns empty state when no selectedAthlete', () => {
    const { result } = renderHook(() =>
      useAvailableCategories({
        athleteData: EMPTY_ATHLETE_DATA,
        selectedAthlete: null,
        categoryLabels: EMPTY_LABELS
      })
    )
    expect(result.current.availableCategories).toEqual([])
    expect(result.current.selectedCategory).toBeNull()
    expect(result.current.allPruebas).toEqual([])
  })

  it('returns empty when athleteData has no categorias for athlete', () => {
    const { result } = renderHook(() =>
      useAvailableCategories({
        athleteData: EMPTY_ATHLETE_DATA,
        selectedAthlete: ATHLETE,
        categoryLabels: EMPTY_LABELS
      })
    )
    expect(result.current.availableCategories).toEqual([])
    expect(result.current.selectedCategory).toBeNull()
  })

  it('sorts categories by numeric rank descending', () => {
    const { result } = renderHook(() =>
      useAvailableCategories({
        athleteData: ATHLETE_DATA_WITH_CATS,
        selectedAthlete: ATHLETE,
        categoryLabels: CATEGORY_LABELS
      })
    )
    // Sub23 > Sub20 > Sub16
    expect(result.current.availableCategories[0]).toBe('cat_sub23')
    expect(result.current.availableCategories[1]).toBe('cat_sub20')
    expect(result.current.availableCategories[2]).toBe('cat_sub16')
  })

  it('selects first sorted category by default', () => {
    const { result } = renderHook(() =>
      useAvailableCategories({
        athleteData: ATHLETE_DATA_WITH_CATS,
        selectedAthlete: ATHLETE,
        categoryLabels: CATEGORY_LABELS
      })
    )
    expect(result.current.selectedCategory).toBe('cat_sub23')
  })

  it('derives allPruebas from selectedCategory', () => {
    const { result } = renderHook(() =>
      useAvailableCategories({
        athleteData: ATHLETE_DATA_WITH_CATS,
        selectedAthlete: ATHLETE,
        categoryLabels: CATEGORY_LABELS
      })
    )
    // Default selected: cat_sub23 → ['100m', '400m']
    expect(result.current.allPruebas.sort()).toEqual(['100m', '400m'])
  })

  it('updates allPruebas when category changes', () => {
    const { result } = renderHook(() =>
      useAvailableCategories({
        athleteData: ATHLETE_DATA_WITH_CATS,
        selectedAthlete: ATHLETE,
        categoryLabels: CATEGORY_LABELS
      })
    )

    act(() => {
      result.current.setSelectedCategory('cat_sub16')
    })

    expect(result.current.allPruebas).toEqual(['100m'])
  })
})
