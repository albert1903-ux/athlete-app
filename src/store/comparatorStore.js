import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'comparatorAthletes'

const listeners = new Set()

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (error) {
    console.error('Error al leer comparadores desde localStorage:', error)
  }
  return []
}

let cache = loadFromStorage()

function notify() {
  listeners.forEach((fn) => fn())
}

// Legacy getters — mantener compatibilidad con SeguimientoPage existente
export function getComparatorCache() {
  return cache
}

export function setComparatorCache(comparators) {
  cache = Array.isArray(comparators) ? comparators : []
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error al guardar comparadores en localStorage:', error)
  }
  notify()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useComparatorAthletes() {
  return useSyncExternalStore(subscribe, getComparatorCache)
}
