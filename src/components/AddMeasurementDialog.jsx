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
  Chip,
  Typography
} from '@mui/material'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'selectedAthlete'

function AddMeasurementDialog({ open, onClose, onSuccess }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    altura: '',
    peso: '',
    envergadura: ''
  })

  // Cargar atleta seleccionado desde localStorage
  useEffect(() => {
    const loadAthlete = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const athlete = JSON.parse(stored)
          setSelectedAthlete(athlete)
        } else {
          setSelectedAthlete(null)
        }
      } catch (error) {
        console.error('Error al cargar atleta:', error)
        setSelectedAthlete(null)
      }
    }

    loadAthlete()
    const interval = setInterval(loadAthlete, 500)

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadAthlete()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Resetear formulario cuando se abre/cierra el diálogo
  useEffect(() => {
    if (open) {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        altura: '',
        peso: '',
        envergadura: ''
      })
      setError(null)
    }
  }, [open])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    // Validación
    if (!formData.altura && !formData.peso) {
      setError('Debe ingresar al menos altura o peso')
      return
    }

    if (!selectedAthlete?.atleta_id) {
      setError('No hay ningún atleta seleccionado. Por favor, selecciona un atleta primero.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        atleta_id: selectedAthlete.atleta_id,
        fecha: formData.fecha,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        envergadura: formData.envergadura ? parseFloat(formData.envergadura) : null
      }

      const { error: insertError } = await supabase
        .from('medidas_corporales')
        .insert([payload])

      if (insertError) throw insertError

      // Llamar callback de éxito si existe
      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      console.error('Error al guardar medición:', err)
      setError(`Error al guardar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper' }}>Nueva Medición Corporal</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {!selectedAthlete && (
            <Alert severity="warning">
              No hay ningún atleta seleccionado. Por favor, selecciona un atleta en la página de Seguimiento.
            </Alert>
          )}

          {/* Información del atleta (no editable) */}
          {selectedAthlete && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Atleta seleccionado
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                <Typography variant="body1" fontWeight="bold">
                  {selectedAthlete.nombre}
                </Typography>
                {selectedAthlete.licencia && selectedAthlete.licencia !== 'N/A' && (
                  <Chip 
                    label={`Lic: ${selectedAthlete.licencia}`} 
                    size="small" 
                    variant="outlined"
                  />
                )}
                {selectedAthlete.club && selectedAthlete.club !== 'N/A' && selectedAthlete.club !== 'Sin club' && (
                  <Chip 
                    label={selectedAthlete.club} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}

          <TextField
            label="Fecha"
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleInputChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Altura (cm)"
            type="number"
            name="altura"
            value={formData.altura}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: 0, max: 300, step: 0.1 }}
            helperText="Altura en centímetros (ej: 175.5)"
          />
          <TextField
            label="Peso (kg)"
            type="number"
            name="peso"
            value={formData.peso}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: 0, max: 300, step: 0.1 }}
            helperText="Peso en kilogramos (ej: 65.0)"
          />
          <TextField
            label="Envergadura (cm)"
            type="number"
            name="envergadura"
            value={formData.envergadura}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: 0, max: 300, step: 0.1 }}
            helperText="Envergadura de brazos en centímetros"
          />
          <Alert severity="info">
            El IMC se calculará automáticamente si hay altura y peso
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddMeasurementDialog

