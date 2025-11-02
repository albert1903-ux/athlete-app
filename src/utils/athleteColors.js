// Gestión centralizada de colores para atletas
// Los colores se asignan basándose en atleta_id para mantener consistencia

const MAIN_ATHLETE_COLOR = '#0275d8' // rgb(2, 117, 216)

const COMPARATOR_COLORS = [
  '#d9534f', // rgb(217, 83, 79) - Rojo
  '#5cb85c', // rgb(92, 184, 92) - Verde
  '#f0ad4e', // Naranja
  '#292b2c', // Gris oscuro
  '#7289da', // Azul claro
  '#e81e63'  // Rosa
]

// Mapa global para almacenar asignaciones de color por atleta_id
// La clave es el atleta_id (número) y el valor es el color (string)
const colorAssignments = new Map()

// Función para obtener o asignar color a un atleta comparador
// Si el atleta ya tiene color asignado, lo devuelve
// Si no, asigna el siguiente color disponible de la lista
export function getColorForAthlete(atletaId, isMainAthlete = false) {
  // El atleta principal siempre tiene el mismo color
  if (isMainAthlete) {
    return MAIN_ATHLETE_COLOR
  }

  // Si el atleta ya tiene un color asignado, devolverlo
  // Esto asegura que los colores se mantienen incluso si se eliminan otros atletas
  if (colorAssignments.has(atletaId)) {
    return colorAssignments.get(atletaId)
  }

  // Si no tiene color asignado, encontrar el primer color disponible
  // que no esté siendo usado por otro atleta comparador activo
  const usedColors = new Set(Array.from(colorAssignments.values()))
  
  // Buscar el primer color de la lista que no esté en uso
  for (const color of COMPARATOR_COLORS) {
    if (!usedColors.has(color)) {
      colorAssignments.set(atletaId, color)
      return color
    }
  }

  // Si todos los colores están en uso, usar el primero disponible cíclicamente
  // basándose en el número de asignaciones actuales (no ideal, pero funciona)
  const assignedCount = colorAssignments.size
  const color = COMPARATOR_COLORS[assignedCount % COMPARATOR_COLORS.length]
  colorAssignments.set(atletaId, color)
  return color
}

// Función para limpiar colores de atletas que ya no están en la lista
export function cleanupUnusedColors(currentAthleteIds) {
  const currentIds = new Set(currentAthleteIds.map(id => Number(id)))
  
  // Eliminar colores de atletas que ya no están en la lista
  for (const [atletaId] of colorAssignments) {
    if (!currentIds.has(Number(atletaId))) {
      colorAssignments.delete(atletaId)
    }
  }
}

// Función para inicializar colores para una lista de atletas comparadores
// Esta función NO limpia colores automáticamente para mantener la consistencia
// cuando se eliminan y se vuelven a agregar atletas
export function initializeColorsForComparators(comparatorAthletes) {
  // Asegurar que cada atleta comparador tiene un color asignado
  // Si ya tiene color, lo mantiene; si no, se le asigna uno nuevo
  comparatorAthletes.forEach(athlete => {
    getColorForAthlete(athlete.atleta_id, false)
  })

  // Devolver el mapa de colores actualizado
  return new Map(colorAssignments)
}

// Función para limpiar colores de atletas que ya no están activos
// Útil cuando se quiere liberar colores de atletas definitivamente eliminados
export function cleanupColorsForComparators(comparatorAthletes) {
  const allIds = comparatorAthletes.map(a => a.atleta_id)
  cleanupUnusedColors(allIds)
}

// Función para obtener el mapa completo de colores
export function getAllAthleteColors() {
  return new Map(colorAssignments)
}

// Función para resetear todos los colores (útil para limpieza)
export function resetAllColors() {
  colorAssignments.clear()
}

