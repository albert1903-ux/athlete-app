import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Autocomplete
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../lib/supabase'

function EditParticipantDialog({ open, onClose, onSuccess, participant }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pruebas, setPruebas] = useState([])
  const [loadingPruebas, setLoadingPruebas] = useState(false)

  // Estado del formulario
  const [nombreAtleta, setNombreAtleta] = useState('')
  const [pruebaId, setPruebaId] = useState(null)
  const [pruebaNombreManual, setPruebaNombreManual] = useState('')
  const [hora, setHora] = useState(null)

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

  // Cargar datos del participante cuando se abre el diálogo
  useEffect(() => {
    if (open && participant) {
      setNombreAtleta(participant.nombre_atleta || '')
      setPruebaId(participant.prueba_id || null)
      setPruebaNombreManual(participant.prueba_nombre_manual || '')
      setHora(participant.hora ? dayjs(participant.hora, 'HH:mm:ss') : null)
      setError(null)
    }
  }, [open, participant])

  const handleSubmit = async () => {
    // Validaciones
    if (!nombreAtleta.trim()) {
      setError('El nombre del atleta es obligatorio')
      return
    }

    if (!pruebaId && !pruebaNombreManual.trim()) {
      setError('Debe seleccionar o escribir una prueba')
      return
    }

    if (!hora) {
      setError('La hora es obligatoria')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('participantes_eventos')
        .update({
          nombre_atleta: nombreAtleta.trim(),
          prueba_id: pruebaId || null,
          prueba_nombre_manual: pruebaNombreManual.trim() || null,
          hora: hora.format('HH:mm:ss')
        })
        .eq('participante_id', participant.participante_id)

      if (updateError) throw updateError

      // Éxito
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      console.error('Error al actualizar participante:', err)
      setError(err.message || 'Error al actualizar el participante. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Editar Participante
        </Typography>
      </DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Nombre del atleta */}
            <TextField
              fullWidth
              label="Nombre del atleta"
              value={nombreAtleta}
              onChange={(e) => setNombreAtleta(e.target.value)}
              required
              disabled={loading}
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
                pruebaId
                  ? pruebas.find(p => p.prueba_id === pruebaId) || null
                  : pruebaNombreManual || null
              }
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setPruebaId(null)
                  setPruebaNombreManual(newValue)
                } else if (newValue && newValue.prueba_id) {
                  setPruebaId(newValue.prueba_id)
                  setPruebaNombreManual('')
                } else {
                  setPruebaId(null)
                  setPruebaNombreManual('')
                }
              }}
              onInputChange={(event, newInputValue, reason) => {
                if (reason === 'input' && !pruebaId) {
                  setPruebaNombreManual(newInputValue)
                }
              }}
              loading={loadingPruebas}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Prueba"
                  required
                  disabled={loading}
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
              value={hora}
              onChange={(newValue) => setHora(newValue)}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
              views={['hours', 'minutes']}
              format="HH:mm"
            />
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditParticipantDialog



