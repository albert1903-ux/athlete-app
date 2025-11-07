import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'selectedAthlete'

function AthleteBodyMeasurements() {
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMeasure, setEditingMeasure] = useState(null)
  
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

  // Cargar mediciones cuando cambia el atleta
  useEffect(() => {
    if (selectedAthlete && selectedAthlete.atleta_id) {
      fetchMeasurements()
    } else {
      setMeasurements([])
    }
  }, [selectedAthlete])

  const fetchMeasurements = async () => {
    if (!selectedAthlete?.atleta_id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('medidas_corporales')
        .select('*')
        .eq('atleta_id', selectedAthlete.atleta_id)
        .order('fecha', { ascending: false })

      if (fetchError) throw fetchError

      setMeasurements(data || [])
    } catch (err) {
      console.error('Error al cargar mediciones:', err)
      setError('Error al cargar las mediciones corporales')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (measure = null) => {
    if (measure) {
      setEditingMeasure(measure)
      setFormData({
        fecha: measure.fecha,
        altura: measure.altura || '',
        peso: measure.peso || '',
        envergadura: measure.envergadura || ''
      })
    } else {
      setEditingMeasure(null)
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        altura: '',
        peso: '',
        envergadura: ''
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingMeasure(null)
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      altura: '',
      peso: '',
      envergadura: ''
    })
  }

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
      setError('No hay ningún atleta seleccionado')
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

      if (editingMeasure) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('medidas_corporales')
          .update(payload)
          .eq('medida_id', editingMeasure.medida_id)

        if (updateError) throw updateError
      } else {
        // Insertar
        const { error: insertError } = await supabase
          .from('medidas_corporales')
          .insert([payload])

        if (insertError) throw insertError
      }

      await fetchMeasurements()
      handleCloseDialog()
    } catch (err) {
      console.error('Error al guardar medición:', err)
      setError(`Error al guardar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (measureId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta medición?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('medidas_corporales')
        .delete()
        .eq('medida_id', measureId)

      if (deleteError) throw deleteError

      await fetchMeasurements()
    } catch (err) {
      console.error('Error al eliminar medición:', err)
      setError(`Error al eliminar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getIMCStatus = (imc) => {
    if (!imc) return { label: 'N/A', color: 'default' }
    if (imc < 18.5) return { label: 'Bajo peso', color: 'warning' }
    if (imc < 25) return { label: 'Normal', color: 'success' }
    if (imc < 30) return { label: 'Sobrepeso', color: 'warning' }
    return { label: 'Obesidad', color: 'error' }
  }

  if (!selectedAthlete) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FitnessCenterIcon color="primary" />
            <Typography variant="h6">Medidas Corporales</Typography>
          </Box>
          <Alert severity="info">
            Selecciona un atleta para ver sus medidas corporales
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <FitnessCenterIcon color="primary" />
            <Typography variant="h6">Medidas Corporales</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="small"
          >
            Añadir
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && measurements.length === 0 ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : measurements.length === 0 ? (
          <Alert severity="info">
            No hay mediciones registradas para este atleta
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Altura (cm)</TableCell>
                  <TableCell align="right">Peso (kg)</TableCell>
                  <TableCell align="right">Envergadura (cm)</TableCell>
                  <TableCell align="right">IMC</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {measurements.map((measure) => {
                  const imcStatus = getIMCStatus(measure.imc)
                  return (
                    <TableRow key={measure.medida_id}>
                      <TableCell>
                        {new Date(measure.fecha).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell align="right">
                        {measure.altura || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {measure.peso || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {measure.envergadura || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          {measure.imc && <span>{measure.imc}</span>}
                          {measure.imc && (
                            <Chip
                              label={imcStatus.label}
                              size="small"
                              color={imcStatus.color}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(measure)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(measure.medida_id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Diálogo de entrada/edición */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingMeasure ? 'Editar Medición' : 'Nueva Medición'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} sx={{ pt: 1 }}>
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
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default AthleteBodyMeasurements



