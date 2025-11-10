const STORAGE_KEY = 'comparatorAthletes'

let cache = null

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getComparatorCache() {
  if (cache) {
    return cache
  }
  if (isBrowser()) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        cache = Array.isArray(JSON.parse(stored)) ? JSON.parse(stored) : []
        return cache
      }
    } catch (error) {
      console.error('Error al leer comparadores desde localStorage:', error)
    }
  }
  cache = []
  return cache
}

export function setComparatorCache(comparators) {
  cache = Array.isArray(comparators) ? comparators : []
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('Error al guardar comparadores en localStorage:', error)
    }
  }
}

