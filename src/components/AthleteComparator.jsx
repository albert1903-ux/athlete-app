import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  IconButton,
  Alert
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import AthleteSearch from './AthleteSearch'

const STORAGE_KEY_COMPARATORS = 'comparatorAthletes'

function AthleteComparator({ onComparatorsChange }) {
  const [comparators, setComparators] = useState([])
  const [open, setOpen] = useState(false)
  const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
  const [duplicateError, setDuplicateError] = useState(false)

  // Cargar comparadores desde localStorage y escuchar cambios externos
  useEffect(() => {
    const loadComparators = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_COMPARATORS)
        if (stored) {
          const parsed = JSON.parse(stored)
          const comparadoresArray = Array.isArray(parsed) ? parsed : []
          setComparators(comparadoresArray)
        } else {
          setComparators([])
        }
      } catch (error) {
        console.error('Error al cargar comparadores desde localStorage:', error)
        localStorage.removeItem(STORAGE_KEY_COMPARATORS)
        setComparators([])
      }
    }

    loadComparators()

    // Escuchar evento personalizado para cambios externos (botón del header)
    const handleExternalChange = () => {
      loadComparators()
    }

    window.addEventListener('comparatorAthletesChanged', handleExternalChange)

    return () => {
      window.removeEventListener('comparatorAthletesChanged', handleExternalChange)
    }
  }, [])

  // Guardar comparadores en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPARATORS, JSON.stringify(comparators))
      // Notificar al componente padre del cambio
      if (onComparatorsChange) {
        onComparatorsChange(comparators)
      }
    } catch (error) {
      console.error('Error al guardar comparadores en localStorage:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparators])

  const handleOpen = () => {
    setTempSelectedAthlete(null)
    setDuplicateError(false)
    setOpen(true)
  }

  const handleClose = () => {
    setTempSelectedAthlete(null)
    setDuplicateError(false)
    setOpen(false)
  }

  const handleSelect = () => {
    if (tempSelectedAthlete) {
      // Verificar que no esté ya añadido
      const exists = comparators.some(c => c.atleta_id === tempSelectedAthlete.atleta_id)
      if (!exists) {
        setComparators(prev => [...prev, tempSelectedAthlete])
        handleClose()
      } else {
        setDuplicateError(true)
      }
    }
  }

  const handleResultClick = (athlete) => {
    setTempSelectedAthlete(athlete)
  }

  const handleRemove = (atletaId) => {
    setComparators(prev => prev.filter(c => c.atleta_id !== atletaId))
  }

  if (comparators.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleOpen}
              sx={{ py: 2 }}
              startIcon={<AddIcon />}
            >
              AÑADIR ATLETA
            </Button>
          </CardContent>
        </Card>

        {/* Popup con búsqueda */}
        <Dialog 
          open={open} 
          onClose={handleClose} 
          maxWidth={false}
          fullWidth
          fullScreen={false}
          PaperProps={{
            sx: { 
              width: '100%',
              maxWidth: '100%',
              m: { xs: 0 },
              height: { xs: '90vh', sm: '80vh' },
              maxHeight: { xs: '90vh', sm: '80vh' },
              minHeight: { xs: '90vh', sm: '500px' },
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper' }}>
            Añadir Atleta para Comparar
          </DialogTitle>
          
          <DialogContent 
            dividers 
            sx={{ 
              pb: 0,
              position: 'relative',
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}
          >
            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <AthleteSearch onResultClick={handleResultClick} />
            </Box>
            
            {/* Card sticky del atleta seleccionado */}
            {tempSelectedAthlete && (
              <Box
                sx={{
                  flexShrink: 0,
                  backgroundColor: 'white',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 1.5,
                  pb: 1
                }}
              >
                <Card 
                  sx={{ 
                    bgcolor: 'secondary.light', 
                    color: 'secondary.contrastText'
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Atleta seleccionado:
                    </Typography>
                    {/* Nombre del atleta */}
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                      {tempSelectedAthlete.nombre}
                    </Typography>
                    
                    {/* Chips de licencia y club */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {tempSelectedAthlete.licencia && tempSelectedAthlete.licencia !== 'N/A' && (
                        <Chip 
                          label={`Lic: ${tempSelectedAthlete.licencia}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ bgcolor: 'white', color: 'secondary.main' }}
                        />
                      )}
                      {tempSelectedAthlete.club && tempSelectedAthlete.club !== 'N/A' && tempSelectedAthlete.club !== 'Sin club' && (
                        <Chip 
                          label={tempSelectedAthlete.club} 
                          size="small" 
                          variant="outlined"
                          sx={{ bgcolor: 'white', color: 'secondary.main' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ flexShrink: 0, py: 1.5 }}>
            <Button 
              onClick={handleClose}
              startIcon={<CloseIcon />}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSelect}
              variant="contained"
              disabled={!tempSelectedAthlete}
              startIcon={<CheckIcon />}
              color="secondary"
            >
              Añadir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      {comparators.map((comparator, index) => (
        <Card 
          key={comparator.atleta_id} 
          sx={{ 
            width: '100%',
            mb: index < comparators.length - 1 ? 2 : 0,
            borderLeft: '4px solid',
            borderColor: 'secondary.main'
          }}
        >
          <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
            {/* Fila superior: Nombre del atleta e icono de eliminar */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" component="span" fontWeight="bold">
                {comparator.nombre}
              </Typography>
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleRemove(comparator.atleta_id)}
                aria-label="Eliminar atleta comparador"
                sx={{ ml: 'auto' }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
            
            {/* Fila inferior: Chips de licencia y club */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {comparator.licencia && comparator.licencia !== 'N/A' && (
                <Chip 
                  label={`Lic: ${comparator.licencia}`} 
                  size="small" 
                  variant="outlined"
                  color="secondary"
                />
              )}
              {comparator.club && comparator.club !== 'N/A' && comparator.club !== 'Sin club' && (
                <Chip 
                  label={comparator.club} 
                  size="small" 
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Botón para añadir más */}
      <Card sx={{ width: '100%', mt: 2 }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            onClick={handleOpen}
            startIcon={<AddIcon />}
          >
            AÑADIR ATLETA
          </Button>
        </CardContent>
      </Card>

      {/* Popup con búsqueda */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth={false}
        fullWidth
        fullScreen={false}
        PaperProps={{
          sx: { 
            width: '100%',
            maxWidth: '100%',
            m: { xs: 0 },
            height: { xs: '90vh', sm: '80vh' },
            maxHeight: { xs: '90vh', sm: '80vh' },
            minHeight: { xs: '90vh', sm: '500px' },
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper' }}>
          Añadir Atleta para Comparar
        </DialogTitle>
        
        <DialogContent 
          dividers 
          sx={{ 
            pb: 0,
            position: 'relative',
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <Box sx={{ flex: 1, overflow: 'auto', mb: tempSelectedAthlete ? '140px' : 0 }}>
            <AthleteSearch onResultClick={handleResultClick} />
          </Box>
          
          {/* Card sticky del atleta seleccionado */}
          {tempSelectedAthlete && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                backgroundColor: 'white',
                borderTop: '1px solid',
                borderColor: 'divider',
                mt: 2,
                pt: 2
              }}
            >
              <Card 
                sx={{ 
                  bgcolor: 'secondary.light', 
                  color: 'secondary.contrastText'
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Atleta seleccionado:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {tempSelectedAthlete.nombre}
                    </Typography>
                    {tempSelectedAthlete.licencia && tempSelectedAthlete.licencia !== 'N/A' && (
                      <Chip 
                        label={`Lic: ${tempSelectedAthlete.licencia}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ bgcolor: 'white', color: 'secondary.main' }}
                      />
                    )}
                    {tempSelectedAthlete.club && tempSelectedAthlete.club !== 'N/A' && tempSelectedAthlete.club !== 'Sin club' && (
                      <Chip 
                        label={tempSelectedAthlete.club} 
                        size="small" 
                        variant="outlined"
                        sx={{ bgcolor: 'white', color: 'secondary.main' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ flexShrink: 0, py: 1.5 }}>
          <Button 
            onClick={handleClose}
            startIcon={<CloseIcon />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSelect}
            variant="contained"
            disabled={!tempSelectedAthlete}
            startIcon={<CheckIcon />}
            color="secondary"
          >
            Añadir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AthleteComparator

