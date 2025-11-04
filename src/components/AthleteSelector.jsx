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
  IconButton
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import EditIcon from '@mui/icons-material/Edit'
import AthleteSearch from './AthleteSearch'

const STORAGE_KEY = 'selectedAthlete'

// Función helper para cargar desde localStorage de forma síncrona
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error al cargar atleta desde localStorage:', error)
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

function AthleteSelector() {
  // Inicializar directamente desde localStorage para evitar el render inicial con null
  const [open, setOpen] = useState(() => {
    const athlete = loadFromStorage()
    // Solo abrir popup si NO hay atleta guardado
    return athlete === null
  })
  
  const [selectedAthlete, setSelectedAthlete] = useState(() => loadFromStorage())
  const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)

  // Guardar atleta seleccionado en localStorage cuando cambie
  useEffect(() => {
    if (selectedAthlete) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedAthlete))
      } catch (error) {
        console.error('Error al guardar atleta en localStorage:', error)
      }
    } else {
      // Limpiar localStorage si no hay atleta seleccionado
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedAthlete])

  const handleOpen = () => {
    setTempSelectedAthlete(null) // Reset temp selection al abrir
    setOpen(true)
  }

  const handleClose = () => {
    setTempSelectedAthlete(null) // Reset temp selection al cerrar
    setOpen(false)
  }

  const handleSelect = () => {
    if (tempSelectedAthlete) {
      setSelectedAthlete(tempSelectedAthlete)
      handleClose()
    }
  }

  const handleResultClick = (athlete) => {
    setTempSelectedAthlete(athlete)
  }

  const handleRemove = () => {
    setSelectedAthlete(null)
    localStorage.removeItem(STORAGE_KEY) // Limpiar explícitamente el localStorage
    setOpen(true) // Abrir el popup al eliminar la selección
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Interfaz principal */}
      {selectedAthlete ? (
        <Card sx={{ width: '100%', position: 'relative' }}>
          <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
            {/* Fila superior: Nombre del atleta e icono de editar */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" component="span" fontWeight="bold">
                {selectedAthlete.nombre}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleRemove}
                color="primary"
                aria-label="Cambiar atleta"
                sx={{ ml: 'auto' }}
              >
                <EditIcon />
              </IconButton>
            </Box>
            
            {/* Fila inferior: Chips de licencia y club */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={handleOpen}
              sx={{ py: 2 }}
            >
              Nombre del Atleta
            </Button>
          </CardContent>
        </Card>
      )}

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
        <DialogTitle sx={{ flexShrink: 0 }}>
          Seleccionar Atleta
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
                  bgcolor: 'primary.light', 
                  color: 'primary.contrastText'
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
                        sx={{ bgcolor: 'white', color: 'primary.main' }}
                      />
                    )}
                    {tempSelectedAthlete.club && tempSelectedAthlete.club !== 'N/A' && tempSelectedAthlete.club !== 'Sin club' && (
                      <Chip 
                        label={tempSelectedAthlete.club} 
                        size="small" 
                        variant="outlined"
                        sx={{ bgcolor: 'white', color: 'primary.main' }}
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
          >
            Seleccionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AthleteSelector

