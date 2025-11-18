import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
  MenuItem
} from '@mui/material'
import { createFilterOptions } from '@mui/material/Autocomplete'
import dayjs from 'dayjs'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import { supabase } from '../lib/supabase'

const GENERO_OPTIONS = [
  { value: 'MASC', label: 'Masculino' },
  { value: 'FEM', label: 'Femenino' },
  { value: 'MIXTO', label: 'Mixto' }
]

const SUPERFICIE_OPTIONS = [
  { value: 'AL', label: 'Aire libre (AL)' },
  { value: 'PC', label: 'Pista cubierta (PC)' },
  { value: 'RT', label: 'Ruta' },
  { value: 'OT', label: 'Otra' }
]

const initialFormState = {
  atleta: null,
  club: null,
  prueba: null,
  categoria: null,
  fecha: '',
  anio: '',
  mes: '',
  genero: 'MASC',
  superficie: 'AL',
  unidad: '',
  marcaTexto: '',
  marcaValor: ''
}

const convertMarcaTextoToValor = (texto) => {
  if (!texto) return null
  const clean = texto.trim().replace(',', '.')
  if (!clean) return null

  if (!clean.includes(':')) {
    const numeric = Number(clean)
    return Number.isNaN(numeric) ? null : numeric
  }

  const parts = clean.split(':')
  let total = 0
  for (let index = 0; index < parts.length; index += 1) {
    const value = Number(parts[index])
    if (Number.isNaN(value)) {
      return null
    }
    const power = parts.length - index - 1
    total += value * (60 ** power)
  }
  return total
}

const fetchNextResultadoId = async () => {
  const { data, error } = await supabase
    .from('resultados')
    .select('resultado_id')
    .order('resultado_id', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  const lastId = data?.[0]?.resultado_id
  const parsed = Number(lastId)
  if (!lastId || Number.isNaN(parsed)) {
    return 1
  }
  return parsed + 1
}

function AddResultDialog({ open, onClose, onSuccess }) {
  const [formValues, setFormValues] = useState(initialFormState)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [options, setOptions] = useState({
    atletas: [],
    clubes: [],
    pruebas: [],
    categorias: []
  })
  const [autoAssigningClub, setAutoAssigningClub] = useState(false)
  const [atletaInputValue, setAtletaInputValue] = useState('')
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false)
  const [athleteSearchError, setAthleteSearchError] = useState(null)
  const [pruebaInputValue, setPruebaInputValue] = useState('')
  const pruebaFilter = useMemo(
    () =>
      createFilterOptions({
        ignoreAccents: true,
        ignoreCase: true,
        matchFrom: 'start',
        stringify: (option) => option?.nombre || ''
      }),
    []
  )
  const normalizedIncludes = useCallback((text, query) => {
    const normalize = (str) =>
      str
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') || ''
    return normalize(text).includes(normalize(query))
  }, [])
  const filteredPruebas = useMemo(() => {
    if (!pruebaInputValue) {
      return options.pruebas
    }
    return options.pruebas.filter((prueba) =>
      normalizedIncludes(prueba?.nombre, pruebaInputValue)
    )
  }, [options.pruebas, pruebaInputValue, normalizedIncludes])

  const resetForm = useCallback(() => {
    setFormValues(initialFormState)
    setSubmitError(null)
    setSubmitSuccess(null)
    setPruebaInputValue('')
    setAtletaInputValue('')
    setAthleteSearchError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }

    let isMounted = true
    const loadOptions = async () => {
      setOptionsLoading(true)
      setSubmitError(null)
      try {
        const [
          { data: clubesData, error: clubesError },
          { data: pruebasData, error: pruebasError },
          { data: categoriasData, error: categoriasError }
        ] = await Promise.all([
          supabase
            .from('clubes')
            .select('club_id, nombre')
            .order('nombre', { ascending: true }),
          supabase
            .from('pruebas')
            .select('prueba_id, nombre, tipo_prueba, tipo_marca, unidad_default')
            .order('nombre', { ascending: true }),
          supabase
            .from('categorias')
            .select('categoria_id, nombre')
            .order('nombre', { ascending: true })
        ])

        if (clubesError) throw clubesError
        if (pruebasError) throw pruebasError
        if (categoriasError) throw categoriasError

        if (!isMounted) return
        setOptions({
          atletas: [],
          clubes: clubesData || [],
          pruebas: pruebasData || [],
          categorias: categoriasData || []
        })
      } catch (error) {
        console.error('Error al cargar datos para el formulario:', error)
        if (isMounted) {
          setSubmitError(
            error.message || 'No se pudieron cargar las opciones del formulario'
          )
        }
      } finally {
        if (isMounted) {
          setOptionsLoading(false)
        }
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [open, resetForm])

  // Búsqueda de atletas en Supabase mientras se escribe (debounced)
  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    const signal = controller.signal

    const term = atletaInputValue?.trim()
    if (!term || term.length < 2) {
      setAthleteSearchLoading(false)
      setAthleteSearchError(null)
      // No borrar selección actual, sólo vaciar sugerencias
      setOptions((prev) => ({ ...prev, atletas: [] }))
      return
    }

    let timeoutId = setTimeout(async () => {
      setAthleteSearchLoading(true)
      setAthleteSearchError(null)
      try {
        const { data, error } = await supabase
          .from('atletas')
          .select('atleta_id, nombre, licencia')
          .ilike('nombre', `%${term}%`)
          .order('nombre', { ascending: true })
          .limit(100)

        if (error) throw error
        if (signal.aborted) return
        setOptions((prev) => ({ ...prev, atletas: data || [] }))
      } catch (err) {
        if (!signal.aborted) {
          setAthleteSearchError(err.message || 'Error al buscar atletas')
          setOptions((prev) => ({ ...prev, atletas: [] }))
        }
      } finally {
        if (!signal.aborted) {
          setAthleteSearchLoading(false)
        }
      }
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [atletaInputValue, open])

  const handleClose = () => {
    if (!submitLoading) {
      onClose?.()
    }
  }

  const handleDateChange = (value) => {
    if (!value) {
      setFormValues((prev) => ({ ...prev, fecha: '', anio: '', mes: '' }))
      return
    }

    const parsed = dayjs(value)
    if (!parsed.isValid()) {
      setFormValues((prev) => ({ ...prev, fecha: value, anio: '', mes: '' }))
      return
    }

    setFormValues((prev) => ({
      ...prev,
      fecha: value,
      anio: parsed.year(),
      mes: parsed.month() + 1
    }))
  }

  const handleMarcaTextoChange = (value) => {
    setFormValues((prev) => ({ ...prev, marcaTexto: value }))
    const autoValor = convertMarcaTextoToValor(value)
    setFormValues((prev) => ({
      ...prev,
      marcaValor: autoValor !== null ? autoValor : ''
    }))
  }

  const isFormValid = useMemo(() => {
    return (
      Boolean(formValues.atleta?.atleta_id) &&
      Boolean(formValues.prueba?.prueba_id) &&
      Boolean(formValues.club?.club_id) &&
      Boolean(formValues.categoria?.categoria_id) &&
      Boolean(formValues.fecha) &&
      Boolean(formValues.marcaTexto.trim()) &&
      Boolean(formValues.unidad.trim()) &&
      Boolean(formValues.genero) &&
      Boolean(formValues.superficie)
    )
  }, [formValues])

  const handleAthleteChange = async (_, newValue) => {
    setFormValues((prev) => ({ ...prev, atleta: newValue }))

    if (!newValue?.atleta_id) {
      return
    }

    setAutoAssigningClub(true)
    try {
      let clubId = null

      // Preferir el club activo (fecha_fin nula) con fecha_inicio más reciente en atleta_club_hist
      try {
        const fetchLatestClub = async (onlyActive = false) => {
          let query = supabase
            .from('atleta_club_hist')
            .select('club_id, fecha_inicio, fecha_fin')
            .eq('atleta_id', newValue.atleta_id)
            .order('fecha_inicio', { ascending: false, nullsFirst: false })
            .limit(1)

          if (onlyActive) {
            query = query.is('fecha_fin', null)
          }

          const { data, error } = await query
          if (error) throw error
          return data?.[0] || null
        }

        const latestActive = await fetchLatestClub(true)
        if (latestActive?.club_id) {
          clubId = latestActive.club_id
        } else {
          const latestAny = await fetchLatestClub(false)
          clubId = latestAny?.club_id || null
        }
      } catch (histFetchError) {
        console.warn('No se pudo obtener historial de clubes:', histFetchError)
      }

      // Si no hay historial, usar el club más reciente según resultados
      if (!clubId) {
        const { data, error } = await supabase
          .from('resultados')
          .select('club_id')
          .eq('atleta_id', newValue.atleta_id)
          .order('fecha', { ascending: false, nullsFirst: false })
          .limit(1)

        if (error) throw error
        clubId = data?.[0]?.club_id || null
      }

      if (!clubId) return

      let resolvedClub = options.clubes.find((club) => club.club_id === clubId)

      if (!resolvedClub) {
        const { data: clubData, error: clubError } = await supabase
          .from('clubes')
          .select('club_id, nombre')
          .eq('club_id', clubId)
          .maybeSingle()

        if (clubError) throw clubError

        if (clubData) {
          resolvedClub = clubData
          setOptions((prev) => {
            if (prev.clubes.some((club) => club.club_id === clubData.club_id)) {
              return prev
            }
            return {
              ...prev,
              clubes: [...prev.clubes, clubData]
            }
          })
        }
      }

      if (resolvedClub) {
        setFormValues((prev) => ({ ...prev, club: resolvedClub }))
      }
    } catch (error) {
      console.warn('No se pudo asignar el club automáticamente:', error)
    } finally {
      setAutoAssigningClub(false)
    }
  }

  const handleSubmit = async () => {
    if (!isFormValid) {
      setSubmitError('Completa todos los campos obligatorios antes de guardar')
      return
    }

    setSubmitLoading(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    let nextResultadoId = null
    try {
      nextResultadoId = await fetchNextResultadoId()
    } catch (error) {
      console.warn('No se pudo obtener el siguiente resultado_id:', error)
      setSubmitError('No se pudo calcular el identificador del nuevo resultado. Inténtalo de nuevo.')
      setSubmitLoading(false)
      return
    }

    const payload = {
      resultado_id: nextResultadoId,
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
      const { data, error } = await supabase
        .from('resultados')
        .insert([payload])
        .select(
          'resultado_id, atleta_id, club_id, prueba_id, categoria_id, fecha, anio, mes, marca_texto, marca_valor, unidad, genero, superficie'
        )
        .single()

      if (error) throw error

      setSubmitSuccess('Resultado añadido correctamente')
      window.dispatchEvent(new CustomEvent('resultadoCreado', { detail: data }))
      onSuccess?.(data)
      resetForm()
    } catch (error) {
      console.error('Error al guardar resultado:', error)
      setSubmitError(error.message || 'No se pudo guardar el resultado')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper' }}>Añadir marca</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>

          {submitError && <Alert severity="error">{submitError}</Alert>}
          {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

          <Stack spacing={2}>
            <Autocomplete
              value={formValues.atleta}
              onChange={handleAthleteChange}
              options={options.atletas}
              loading={optionsLoading || athleteSearchLoading}
              inputValue={atletaInputValue}
              onInputChange={(_, value) => setAtletaInputValue(value)}
              // las opciones ya vienen filtradas desde el servidor
              filterOptions={(opts) => opts}
              getOptionLabel={(option) =>
                option?.nombre
                  ? `${option.nombre}${option.licencia ? ` · ${option.licencia}` : ''}`
                  : ''
              }
              isOptionEqualToValue={(option, value) =>
                option?.atleta_id === value?.atleta_id
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nombre del atleta"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {optionsLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />

            <Autocomplete
              value={formValues.club}
              onChange={(_, newValue) => {
                setFormValues((prev) => ({ ...prev, club: newValue }))
              }}
              options={options.clubes}
              loading={optionsLoading || autoAssigningClub}
              getOptionLabel={(option) => option?.nombre || ''}
              isOptionEqualToValue={(option, value) => option?.club_id === value?.club_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Club"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {optionsLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />

            <Autocomplete
              value={formValues.prueba}
              onChange={(_, newValue) => {
                setFormValues((prev) => ({
                  ...prev,
                  prueba: newValue,
                  unidad: newValue?.unidad_default || prev.unidad
                }))
              }}
              options={filteredPruebas}
              loading={optionsLoading}
              filterOptions={pruebaFilter}
              inputValue={pruebaInputValue}
              onInputChange={(_, value) => setPruebaInputValue(value)}
              getOptionLabel={(option) => option?.nombre || ''}
              isOptionEqualToValue={(option, value) =>
                option?.prueba_id === value?.prueba_id
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Prueba disputada"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {optionsLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />

            <Autocomplete
              value={formValues.categoria}
              onChange={(_, newValue) => {
                setFormValues((prev) => ({ ...prev, categoria: newValue }))
              }}
              options={options.categorias}
              loading={optionsLoading}
              getOptionLabel={(option) => option?.nombre || ''}
              isOptionEqualToValue={(option, value) =>
                option?.categoria_id === value?.categoria_id
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Categoría"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {optionsLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Stack>

          <Divider />

          <TextField
            label="Fecha"
            type="date"
            value={formValues.fecha}
            onChange={(event) => handleDateChange(event.target.value)}
            required
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Género"
              select
              value={formValues.genero}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, genero: event.target.value }))
              }
              required
              fullWidth
            >
              {GENERO_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Superficie"
              select
              value={formValues.superficie}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, superficie: event.target.value }))
              }
              required
              fullWidth
            >
              {SUPERFICIE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Marca (texto oficial)"
            value={formValues.marcaTexto}
            onChange={(event) => handleMarcaTextoChange(event.target.value)}
            placeholder="Ej. 2:11.96 o 11.23"
            helperText="Se calculará automáticamente el valor numérico para almacenar en la base de datos."
            required
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          startIcon={<CloseIcon />}
          disabled={submitLoading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="secondary"
          startIcon={<CheckIcon />}
          disabled={!isFormValid || submitLoading || optionsLoading}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddResultDialog


