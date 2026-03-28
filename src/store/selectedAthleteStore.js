import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'selectedAthlete'

const listeners = new Set()

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

let cache = loadFromStorage()

function notify() {
  listeners.forEach((fn) => fn())
}

export function getSelectedAthlete() {
  return cache
}

export function setSelectedAthlete(athlete) {
  cache = athlete
  try {
    if (athlete) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(athlete))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    console.warn('selectedAthleteStore: localStorage error', e)
  }
  notify()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSelectedAthlete() {
  return useSyncExternalStore(subscribe, getSelectedAthlete)
}
