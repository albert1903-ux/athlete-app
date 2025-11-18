import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  Autocomplete,
  Divider,
  Snackbar,
  Alert
} from '@mui/material'
import { TbPlus, TbTrash, TbX, TbCheck, TbCalendarPlus } from 'react-icons/tb'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../lib/supabase'

function AddEventDialog({ open, onClose, onSuccess, selectedDate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pruebas, setPruebas] = useState([])
  const [loadingPruebas, setLoadingPruebas] = useState(false)

  // Estado del formulario
  const [fecha, setFecha] = useState(selectedDate || dayjs())
  const [ubicacion, setUbicacion] = useState('')
  const [participantes, setParticipantes] = useState([
    {
      nombre_atleta: '',
      prueba_id: null,
      prueba_nombre_manual: '',
      hora: null
    }
  ])

  // Cargar pruebas desde Supabase
  useEffect(() => {
    const loadPruebas = async () => {
      setLoadingPruebas(true)
      try {
        const { data, error: queryError } = await supabase
          .from('pruebas')
          .select('prueba_id, nombre')
          .order('nombre', { ascending: true })

        if (queryError) throw queryError

        setPruebas(data || [])
      } catch (err) {
        console.error('Error al cargar pruebas:', err)
        setPruebas([])
      } finally {
        setLoadingPruebas(false)
      }
    }

    if (open) {
      loadPruebas()
    }
  }, [open])

  // Resetear formulario cuando se abre/cierra el diálogo
  useEffect(() => {
    if (open) {
      setFecha(selectedDate || dayjs())
      setUbicacion('')
      setParticipantes([
        {
          nombre_atleta: '',
          prueba_id: null,
          prueba_nombre_manual: '',
          hora: null
        }
      ])
      setError(null)
    }
  }, [open, selectedDate])

  const handleAddParticipante = () => {
    setParticipantes([
      ...participantes,
      {
        nombre_atleta: '',
        prueba_id: null,
        prueba_nombre_manual: '',
        hora: ''
      }
    ])
  }

  const handleRemoveParticipante = (index) => {
    if (participantes.length > 1) {
      setParticipantes(participantes.filter((_, i) => i !== index))
    }
  }

  const handleParticipanteChange = (index, field, value) => {
    const updated = [...participantes]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    // Si se selecciona una prueba de la lista, limpiar el nombre manual
    if (field === 'prueba_id' && value) {
      updated[index].prueba_nombre_manual = ''
    }
    // Si se escribe manualmente, limpiar la prueba_id
    if (field === 'prueba_nombre_manual' && value) {
      updated[index].prueba_id = null
    }
    setParticipantes(updated)
  }

  const handleSubmit = async () => {
    // Validaciones
    if (!ubicacion.trim()) {
      setError('La ubicación es obligatoria')
      return
    }

    if (!fecha) {
      setError('Debe seleccionar una fecha')
      return
    }

    // Validar que todos los participantes tengan datos
    for (let i = 0; i < participantes.length; i++) {
      const p = participantes[i]
      if (!p.nombre_atleta || !p.nombre_atleta.trim()) {
        setError(`El nombre del atleta es obligatorio en el participante ${i + 1}`)
        return
      }
      // Validar que haya una prueba (ya sea por ID o nombre manual)
      const tienePruebaId = p.prueba_id !== null && p.prueba_id !== undefined && p.prueba_id !== ''
      const tienePruebaManual = p.prueba_nombre_manual && typeof p.prueba_nombre_manual === 'string' && p.prueba_nombre_manual.trim().length > 0
      if (!tienePruebaId && !tienePruebaManual) {
        setError(`Debe seleccionar o escribir una prueba en el participante ${i + 1}`)
        return
      }
      if (!p.hora) {
        setError(`La hora es obligatoria en el participante ${i + 1}`)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // Formatear fecha
      const fechaFormateada = fecha.format('YYYY-MM-DD')

      // Crear el evento
      const { data: eventoData, error: eventoError } = await supabase
        .from('eventos')
        .insert({
          fecha: fechaFormateada,
          ubicacion: ubicacion.trim()
        })
        .select()
        .single()

      if (eventoError) throw eventoError

      // Crear los participantes
      const participantesData = participantes.map(p => ({
        evento_id: eventoData.evento_id,
        nombre_atleta: p.nombre_atleta.trim(),
        prueba_id: p.prueba_id || null,
        prueba_nombre_manual: p.prueba_nombre_manual.trim() || null,
        hora: p.hora && dayjs.isDayjs(p.hora) && p.hora.isValid() ? p.hora.format('HH:mm:ss') : null
      }))

      const { error: participantesError } = await supabase
        .from('participantes_eventos')
        .insert(participantesData)

      if (participantesError) throw participantesError

      // Éxito
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      console.error('Error al crear evento:', err)
      setError(err.message || 'Error al crear el evento. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1 }}>
        <TbCalendarPlus size={24} />
        <Typography variant="h6" component="span">Añadir Evento</Typography>
      </DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          {/* Campos Fecha y Ubicación */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 1 }}>
            <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
              <DatePicker
                label="Fecha"
                value={fecha}
                onChange={(newValue) => setFecha(newValue)}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    margin: 'normal'
                  }
                }}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                fullWidth
                label="Ubicación"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                margin="normal"
                required
                disabled={loading}
              />
            </Box>
          </Box>

        {/* Participantes */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Participantes
          </Typography>

          {participantes.map((participante, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Participante {index + 1}
                </Typography>
                {participantes.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveParticipante(index)}
                    disabled={loading}
                    color="error"
                  >
                    <TbTrash size={20} />
                  </IconButton>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                {/* Nombre del atleta */}
                <TextField
                  fullWidth
                  label="Nombre del atleta"
                  value={participante.nombre_atleta}
                  onChange={(e) => handleParticipanteChange(index, 'nombre_atleta', e.target.value)}
                  required
                  disabled={loading}
                  size="small"
                />

                {/* Prueba - Autocompletado */}
                <Autocomplete
                  freeSolo
                  options={pruebas}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    return option.nombre || ''
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof option === 'string' || typeof value === 'string') {
                      return option === value
                    }
                    return option.prueba_id === value.prueba_id
                  }}
                  value={
                    participante.prueba_id
                      ? pruebas.find(p => p.prueba_id === participante.prueba_id) || null
                      : participante.prueba_nombre_manual || null
                  }
                  onChange={(event, newValue) => {
                    const updated = [...participantes]
                    if (typeof newValue === 'string') {
                      // Usuario escribió manualmente
                      updated[index] = {
                        ...updated[index],
                        prueba_id: null,
                        prueba_nombre_manual: newValue
                      }
                    } else if (newValue && newValue.prueba_id) {
                      // Usuario seleccionó de la lista
                      updated[index] = {
                        ...updated[index],
                        prueba_id: newValue.prueba_id,
                        prueba_nombre_manual: ''
                      }
                    } else {
                      // Limpiar
                      updated[index] = {
                        ...updated[index],
                        prueba_id: null,
                        prueba_nombre_manual: ''
                      }
                    }
                    setParticipantes(updated)
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    // Solo actualizar manualmente cuando el usuario escribe (no cuando selecciona)
                    // 'input' = usuario está escribiendo
                    // 'clear' = se limpió el campo
                    // 'reset' = se reseteó el campo
                    if (reason === 'input') {
                      // Solo actualizar si no hay una prueba_id seleccionada
                      // Esto evita sobrescribir cuando se selecciona de la lista
                      const currentParticipant = participantes[index]
                      if (!currentParticipant.prueba_id) {
                        handleParticipanteChange(index, 'prueba_nombre_manual', newInputValue)
                      }
                    }
                  }}
                  loading={loadingPruebas}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Prueba"
                      required
                      disabled={loading}
                      size="small"
                      helperText="Selecciona de la lista o escribe una nueva"
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props
                    return (
                      <Box component="li" key={key} {...otherProps}>
                        {typeof option === 'string' ? option : option.nombre}
                      </Box>
                    )
                  }}
                  getOptionKey={(option) => {
                    if (typeof option === 'string') return option
                    return `prueba-${option.prueba_id}`
                  }}
                />

                {/* Hora */}
                <TimePicker
                  label="Hora"
                  value={participante.hora && dayjs.isDayjs(participante.hora) ? participante.hora : null}
                  onChange={(newValue) => {
                    // Solo actualizar si el valor es válido o null
                    if (newValue === null || (dayjs.isDayjs(newValue) && newValue.isValid())) {
                      handleParticipanteChange(index, 'hora', newValue)
                    }
                  }}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      size: 'small'
                    }
                  }}
                  views={['hours', 'minutes']}
                  format="HH:mm"
                />
              </Box>

              {index < participantes.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          ))}

          {/* Botón para agregar más participantes */}
          <Button
            startIcon={<TbPlus />}
            onClick={handleAddParticipante}
            disabled={loading}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            Añadir participante
          </Button>
        </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} startIcon={<TbX />}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <TbCheck />}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>

      {/* Snackbar flotante para errores */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 8 }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  )
}

export default AddEventDialog

