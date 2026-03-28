import { useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const fetchNextResultadoId = async () => {
  const { data, error } = await supabase
    .from('resultados')
    .select('resultado_id')
    .order('resultado_id', { ascending: false })
    .limit(1)

  if (error) throw error

  const lastId = data?.[0]?.resultado_id
  const parsed = Number(lastId)
  if (!lastId || Number.isNaN(parsed)) return 1
  return parsed + 1
}

export function useResultSubmit({ resultToEdit, onSuccess, onReset }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const submit = async (formValues, isFormValid) => {
    if (!isFormValid) {
      setError('Completa todos los campos obligatorios antes de guardar')
      return null
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    let nextResultadoId = null
    if (!resultToEdit) {
      try {
        nextResultadoId = await fetchNextResultadoId()
      } catch (err) {
        console.warn('No se pudo obtener el siguiente resultado_id:', err)
        setError('No se pudo calcular el identificador del nuevo resultado. Inténtalo de nuevo.')
        setLoading(false)
        return null
      }
    }

    const payload = {
      ...(resultToEdit ? {} : { resultado_id: nextResultadoId }),
      atleta_id: formValues.atleta.atleta_id,
      club_id: formValues.club.club_id,
      prueba_id: formValues.prueba.prueba_id,
      categoria_id: formValues.categoria.categoria_id,
      fecha: formValues.fecha,
      anio: formValues.anio || (formValues.fecha ? dayjs(formValues.fecha).year() : null),
      mes: formValues.mes || (formValues.fecha ? dayjs(formValues.fecha).month() + 1 : null),
      marca_texto: formValues.marcaTexto.trim(),
      marca_valor:
        formValues.marcaValor === '' || formValues.marcaValor === null
          ? null
          : Number(formValues.marcaValor),
      unidad: formValues.unidad.trim(),
      genero: formValues.genero,
      superficie: formValues.superficie
    }

    try {
      let query = supabase.from('resultados')
      if (resultToEdit) {
        query = query.update(payload).eq('resultado_id', resultToEdit.resultado_id)
      } else {
        query = query.insert([payload])
      }

      const { data, error: dbError } = await query
        .select(
          'resultado_id, atleta_id, club_id, prueba_id, categoria_id, fecha, anio, mes, marca_texto, marca_valor, unidad, genero, superficie'
        )
        .single()

      if (dbError) throw dbError

      setSuccess(resultToEdit ? 'Resultado actualizado correctamente' : 'Resultado añadido correctamente')
      onSuccess?.(data)
      if (!resultToEdit) onReset?.()
      return data
    } catch (err) {
      console.error('Error al guardar resultado:', err)
      setError(err.message || 'No se pudo guardar el resultado')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, success, submit }
}
