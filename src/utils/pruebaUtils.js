export const CATEGORY_ID_FALLBACK_LABELS = {
  '1': 'SUB8',
  '2': 'SUB10',
  '3': 'SUB12',
  '4': '-',
  '5': 'SUB14',
  '6': 'ABS',
  '7': 'SUB16',
  '8': 'SUB18',
  '9': 'SUB20',
  '10': 'SUB23'
}

export const normalizePruebaNombre = (value) => {
  if (!value && value !== 0) return ''
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export const normalizeCategoriaKey = (value, id) => {
  if (value && typeof value === 'string') {
    return value.trim().replace(/\s+/g, '_').toUpperCase()
  }
  if (value !== null && value !== undefined) {
    return String(value).trim().replace(/\s+/g, '_').toUpperCase()
  }
  if (id !== null && id !== undefined) {
    return `CAT_${String(id).trim()}`
  }
  return 'SIN_CATEGORIA'
}

export const extractCategoriaFromResultado = (resultado, categoriaMetadataMap) => {
  if (!resultado) {
    return { key: 'SIN_CATEGORIA', label: 'Sin categoría', categoriaId: null }
  }

  const categoriaId =
    resultado.categoria_id ??
    resultado.categoriaId ??
    resultado.categoria ??
    null

  const metadata =
    categoriaId !== null && categoriaMetadataMap
      ? categoriaMetadataMap.get(categoriaId) || categoriaMetadataMap.get(String(categoriaId))
      : null

  const categoriaCodigo = resultado.categoria_codigo || metadata?.codigo || metadata?.codigo_categoria
  const categoriaNombreCorto =
    resultado.categoria_nombre_corto ||
    metadata?.nombre_corto ||
    metadata?.nombreCorto ||
    null
  const categoriaNombre =
    resultado.categoria_nombre ||
    metadata?.nombre ||
    metadata?.nombre_largo ||
    null

  const fallbackLabel =
    categoriaId !== null
      ? CATEGORY_ID_FALLBACK_LABELS[String(categoriaId)] ||
        CATEGORY_ID_FALLBACK_LABELS[categoriaId]
      : null

  const keyBase = categoriaCodigo || categoriaNombreCorto || categoriaNombre || fallbackLabel || categoriaId
  const key = normalizeCategoriaKey(keyBase, categoriaId)
  const label =
    categoriaNombreCorto ||
    categoriaNombre ||
    categoriaCodigo ||
    fallbackLabel ||
    (categoriaId ? `Categoría ${categoriaId}` : 'Sin categoría')

  return { key, label, categoriaId }
}

export const parseResultadoValor = (resultado) => {
  if (!resultado) return null

  const candidates = [
    resultado.valor_numerico,
    resultado.valor,
    resultado.valorBruto,
    resultado.marca_valor,
    resultado.marca
  ]

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue

    if (typeof candidate === 'number') {
      if (!Number.isNaN(candidate)) {
        return candidate
      }
      continue
    }

    if (typeof candidate === 'string') {
      const normalized = candidate.trim()
      if (!normalized) continue

      const withDot = normalized.replace(',', '.')
      if (withDot.includes(':')) {
        const parts = withDot.split(':')
        let total = 0
        for (const part of parts) {
          const parsed = parseFloat(part)
          if (Number.isNaN(parsed)) {
            total = NaN
            break
          }
          total = total * 60 + parsed
        }
        if (!Number.isNaN(total)) {
          return total
        }
      } else {
        const parsed = parseFloat(withDot)
        if (!Number.isNaN(parsed)) {
          return parsed
        }
      }
    }
  }

  return null
}

export const isTimeBasedPrueba = (pruebaNombre, unidad) => {
  const nombreLower = pruebaNombre.toLowerCase()
  const unidadLower = unidad ? unidad.toLowerCase().trim() : ''

  const distanceKeywords = [
    'longitud', 'altura', 'peso', 'pes', 'disco', 'jabalina',
    'martillo', 'pértiga', 'perxa', 'garrocha', 'triple', 'vortex'
  ]
  if (distanceKeywords.some(keyword => nombreLower.includes(keyword))) {
    return false
  }

  if (unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos') {
    return true
  }

  if (/\d+m\b/.test(nombreLower) && !distanceKeywords.some(keyword => nombreLower.includes(keyword))) {
    return true
  }

  return true
}

export const getBestResult = (results, isTimeBased) => {
  if (!results || results.length === 0) return null

  let bestValue = null
  let bestResultado = null

  results.forEach((resultado) => {
    const valor = parseResultadoValor(resultado)
    if (valor === null || Number.isNaN(valor)) {
      return
    }

    if (bestValue === null) {
      bestValue = valor
      bestResultado = resultado
      return
    }

    if (isTimeBased) {
      if (valor < bestValue) {
        bestValue = valor
        bestResultado = resultado
      }
    } else {
      if (valor > bestValue) {
        bestValue = valor
        bestResultado = resultado
      }
    }
  })

  if (bestValue === null || bestResultado === null) {
    return null
  }

  return { valor: bestValue, resultado: bestResultado }
}

export const formatValue = (valor, unidad, isTimeBased) => {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return 'N/A'
  }

  const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
  const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'

  if (esSegundos || isTimeBased) {
    if (valor >= 60) {
      const minutos = Math.floor(valor / 60)
      const segundosRestantes = valor % 60
      const segundosFormateados = segundosRestantes.toFixed(2).padStart(5, '0')
      return `${minutos}:${segundosFormateados}`
    } else {
      return valor.toFixed(2)
    }
  } else {
    return valor % 1 === 0 ? valor.toString() : valor.toFixed(2)
  }
}
