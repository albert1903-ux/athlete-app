import { useState, useEffect } from 'react'
import {
  Alert,
  Box,
  Chip
} from '@mui/material'
import { Modal, Button, Input, Typography } from './ui'
import { supabase } from '../lib/supabase'
import { TbX, TbCheck, TbHeartPlus } from 'react-icons/tb'
import { useSelectedAthlete } from '../store/selectedAthleteStore'

function AddMeasurementDialog({ open, onClose, onSuccess }) {
  const selectedAthlete = useSelectedAthlete()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    altura: '',
    peso: '',
    envergadura: ''
  })

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
    <Modal.Root open={open} onClose={onClose} maxWidth="sm">
      <Modal.Header onClose={onClose}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TbHeartPlus size={24} />
          <Typography variant="h6" component="span">Nueva Medición Corporal</Typography>
        </Box>
      </Modal.Header>
      <Modal.Body>
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
                {/* {selectedAthlete.licencia && selectedAthlete.licencia !== 'N/A' && (
                  <Chip
                    label={`Lic: ${selectedAthlete.licencia}`}
                    size="small"
                    variant="outlined"
                  />
                )} */}
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

          <Input
            label="Fecha"
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            required
          />
          <Input
            label="Altura (cm)"
            type="number"
            name="altura"
            value={formData.altura}
            onChange={handleInputChange}
            inputProps={{ min: 0, max: 300, step: 0.1 }}
            helperText="Altura en centímetros (ej: 175.5)"
          />
          <Input
            label="Peso (kg)"
            type="number"
            name="peso"
            value={formData.peso}
            onChange={handleInputChange}
            inputProps={{ min: 0, max: 300, step: 0.1 }}
            helperText="Peso en kilogramos (ej: 65.0)"
          />
          <Input
            label="Envergadura (cm)"
            type="number"
            name="envergadura"
            value={formData.envergadura}
            onChange={handleInputChange}
            inputProps={{ min: 0, max: 300, step: 0.1 }}
            helperText="Envergadura de brazos en centímetros"
          />
          <Alert severity="info">
            El IMC se calculará automáticamente si hay altura y peso
          </Alert>
        </Box>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="ghost" disabled={loading} startIcon={<TbX />}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="primary"
          isLoading={loading}
          disabled={loading}
          startIcon={<TbCheck />}
        >
          Guardar
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}

export default AddMeasurementDialog

