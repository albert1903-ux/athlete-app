import { useState } from 'react'
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
  Alert
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import AthleteSearch from './AthleteSearch'

const STORAGE_KEY_COMPARATORS = 'comparatorAthletes'

function AddAthleteDialog({ open, onClose, onAdd }) {
  const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
  const [duplicateError, setDuplicateError] = useState(false)

  const handleClose = () => {
    setTempSelectedAthlete(null)
    setDuplicateError(false)
    onClose()
  }

  const handleSelect = () => {
    if (tempSelectedAthlete) {
      // Verificar que no esté ya añadido
      try {
        const stored = localStorage.getItem(STORAGE_KEY_COMPARATORS)
        const comparators = stored ? JSON.parse(stored) : []
        const exists = comparators.some(c => c.atleta_id === tempSelectedAthlete.atleta_id)
        
        if (!exists) {
          if (onAdd) {
            onAdd(tempSelectedAthlete)
          }
          handleClose()
        } else {
          setDuplicateError(true)
        }
      } catch (error) {
        console.error('Error al verificar comparadores:', error)
        if (onAdd) {
          onAdd(tempSelectedAthlete)
        }
        handleClose()
      }
    }
  }

  const handleResultClick = (athlete) => {
    setTempSelectedAthlete(athlete)
  }

  return (
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
                <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                  {tempSelectedAthlete.nombre}
                </Typography>
                
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
        
        {/* Alerta de duplicado */}
        {duplicateError && (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setDuplicateError(false)}>
            Este atleta ya está en la lista de comparación
          </Alert>
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
  )
}

export default AddAthleteDialog



