import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination
} from '@mui/material'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'selectedAthlete'

// Función para obtener el color del IMC según su valor
const getIMCStatus = (imc) => {
  if (!imc) return { label: 'N/A', color: 'default' }
  
  if (imc < 18.5) {
    return { label: 'Bajo peso', color: 'warning' }
  } else if (imc < 25) {
    return { label: 'Normal', color: 'success' }
  } else if (imc < 30) {
    return { label: 'Sobrepeso', color: 'warning' }
  } else {
    return { label: 'Obesidad', color: 'error' }
  }
}

// Función para formatear fecha
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch (error) {
    return 'Fecha inválida'
  }
}

// Función para formatear número con decimales
const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined) return 'N/A'
  return parseFloat(value).toFixed(decimals)
}

function ViewMeasurementsDialog({ open, onClose }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const lastAthleteIdRef = useRef(null)
  const isLoadingRef = useRef(false)

  // Cargar atleta seleccionado desde localStorage
  // Solo hacer polling cuando el diálogo está abierto
  useEffect(() => {
    if (!open) {
      // Limpiar referencia cuando se cierra el diálogo
      lastAthleteIdRef.current = null
      return
    }

    const loadAthlete = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const athlete = JSON.parse(stored)
          // Solo actualizar si cambió el atleta_id para evitar re-renders innecesarios
          if (athlete.atleta_id !== lastAthleteIdRef.current) {
            lastAthleteIdRef.current = athlete.atleta_id
            setSelectedAthlete(athlete)
          }
        } else {
          if (lastAthleteIdRef.current !== null) {
            lastAthleteIdRef.current = null
            setSelectedAthlete(null)
          }
        }
      } catch (error) {
        console.error('Error al cargar atleta:', error)
        if (lastAthleteIdRef.current !== null) {
          lastAthleteIdRef.current = null
          setSelectedAthlete(null)
        }
      }
    }

    // Cargar inmediatamente
    loadAthlete()

    // Solo hacer polling cuando el diálogo está abierto (cada 2 segundos para reducir carga)
    const interval = setInterval(loadAthlete, 2000)

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
  }, [open])

  // Función para cargar mediciones (memoizada para evitar recreaciones)
  const fetchMeasurements = useCallback(async (atletaId) => {
    if (!atletaId) {
      setMeasurements([])
      return
    }

    // Evitar múltiples llamadas simultáneas usando ref en lugar de state
    if (isLoadingRef.current) return

    isLoadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('medidas_corporales')
        .select('*')
        .eq('atleta_id', atletaId)
        .order('fecha', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setMeasurements(data || [])
    } catch (err) {
      console.error('Error al cargar mediciones:', err)
      setError(`Error al cargar las mediciones: ${err.message}`)
      setMeasurements([])
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }, [])

  // Extraer atleta_id de manera estable para las dependencias
  const atletaId = selectedAthlete?.atleta_id ?? null

  // Cargar mediciones cuando se abre el diálogo o cambia el atleta_id
  useEffect(() => {
    if (!open) {
      // Limpiar datos cuando se cierra el diálogo
      setMeasurements([])
      setLoading(false)
      setError(null)
      setPage(0)
      isLoadingRef.current = false
      return
    }

    if (atletaId) {
      fetchMeasurements(atletaId)
    } else {
      // Si no hay atleta seleccionado, limpiar mediciones
      setMeasurements([])
      setLoading(false)
    }
  }, [open, atletaId, fetchMeasurements])

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Resetear página cuando cambian las mediciones
  useEffect(() => {
    setPage(0)
  }, [measurements.length])

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" component="span">
            Mediciones Corporales
          </Typography>
          {selectedAthlete && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                {selectedAthlete.nombre}
              </Typography>
              {selectedAthlete.licencia && selectedAthlete.licencia !== 'N/A' && (
                <Chip 
                  label={`Lic: ${selectedAthlete.licencia}`} 
                  size="small" 
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!selectedAthlete && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No hay ningún atleta seleccionado. Por favor, selecciona un atleta en la página de Seguimiento.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : measurements.length === 0 && selectedAthlete ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No se encontraron mediciones para este atleta
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Altura (cm)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Peso (kg)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Envergadura (cm)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>IMC</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {measurements
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((measurement) => {
                    const imcStatus = getIMCStatus(measurement.imc)
                    return (
                      <TableRow key={measurement.medida_id} hover>
                        <TableCell>{formatDate(measurement.fecha)}</TableCell>
                        <TableCell align="right">
                          {measurement.altura ? formatNumber(measurement.altura) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {measurement.peso ? formatNumber(measurement.peso) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {measurement.envergadura ? formatNumber(measurement.envergadura) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {measurement.imc ? formatNumber(measurement.imc, 2) : 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          {measurement.imc ? (
                            <Chip 
                              label={imcStatus.label} 
                              color={imcStatus.color} 
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                {measurements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No hay mediciones disponibles
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {measurements.length > 0 && (
          <TablePagination
            component="div"
            count={measurements.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ViewMeasurementsDialog

