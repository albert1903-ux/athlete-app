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
  const [marcaValorLocked, setMarcaValorLocked] = useState(false)
  const [options, setOptions] = useState({
    atletas: [],
    clubes: [],
    pruebas: [],
    categorias: []
  })

  const resetForm = useCallback(() => {
    setFormValues(initialFormState)
    setSubmitError(null)
    setSubmitSuccess(null)
    setMarcaValorLocked(false)
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
          { data: atletasData, error: atletasError },
          { data: clubesData, error: clubesError },
          { data: pruebasData, error: pruebasError },
          { data: categoriasData, error: categoriasError }
        ] = await Promise.all([
          supabase
            .from('atletas')
            .select('atleta_id, nombre, licencia')
            .order('nombre', { ascending: true })
            .limit(2000),
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

        if (atletasError) throw atletasError
        if (clubesError) throw clubesError
        if (pruebasError) throw pruebasError
        if (categoriasError) throw categoriasError

        if (!isMounted) return
        setOptions({
          atletas: atletasData || [],
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
    if (!marcaValorLocked) {
      const autoValor = convertMarcaTextoToValor(value)
      if (autoValor !== null) {
        setFormValues((prev) => ({ ...prev, marcaValor: autoValor }))
      }
    }
  }

  const handleMarcaValorChange = (value) => {
    const numeric = Number(value)
    setMarcaValorLocked(true)
    setFormValues((prev) => ({
      ...prev,
      marcaValor: Number.isNaN(numeric) ? '' : numeric
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
      <DialogTitle>Añadir resultado a Seguimiento Deportivo</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Completa los campos según la estructura de la tabla `resultados`. Los
            datos relacionados (atleta, club, prueba, categoría) se obtienen en tiempo real de Supabase.
          </Typography>

          {submitError && <Alert severity="error">{submitError}</Alert>}
          {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

          <Stack spacing={2}>
            <Autocomplete
              value={formValues.atleta}
              onChange={(_, newValue) => {
                setFormValues((prev) => ({ ...prev, atleta: newValue }))
              }}
              options={options.atletas}
              loading={optionsLoading}
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
              loading={optionsLoading}
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
              options={options.pruebas}
              loading={optionsLoading}
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
              getOptionLabel={(option) =>
                option?.nombre ? `${option.nombre} · ID ${option.categoria_id}` : ''
              }
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

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Fecha"
              type="date"
              value={formValues.fecha}
              onChange={(event) => handleDateChange(event.target.value)}
              required
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Año (auto)"
              value={formValues.anio}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Mes (auto)"
              value={formValues.mes}
              InputProps={{ readOnly: true }}
              fullWidth
            />
          </Stack>

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

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Marca (texto oficial)"
              value={formValues.marcaTexto}
              onChange={(event) => handleMarcaTextoChange(event.target.value)}
              placeholder="Ej. 2:11.96 o 11.23"
              helperText="Formato libre, se guardará en `marca_texto`."
              required
              fullWidth
            />

            <TextField
              label="Marca (valor numérico)"
              value={formValues.marcaValor}
              onChange={(event) => handleMarcaValorChange(event.target.value)}
              placeholder="Se calcula a partir del texto si es posible"
              helperText="Decimal en segundos o metros según la prueba."
              fullWidth
            />

            <TextField
              label="Unidad"
              value={formValues.unidad}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, unidad: event.target.value }))
              }
              placeholder="s, m, pts..."
              required
              fullWidth
            />
          </Stack>
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
          Guardar resultado
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddResultDialog


