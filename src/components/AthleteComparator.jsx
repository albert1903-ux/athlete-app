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

function AthleteComparator({ onComparatorsChange, comparators: externalComparators }) {
  const [comparators, setComparators] = useState(() =>
    Array.isArray(externalComparators) ? externalComparators : []
  )
  const [open, setOpen] = useState(false)
  const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
  const [duplicateError, setDuplicateError] = useState(false)

  console.debug('[AthleteComparator] render', {
    open,
    comparatorsCount: comparators.length,
    tempSelectedAthlete
  })

  // Sincronizar con comparadores proporcionados desde el exterior
  useEffect(() => {
    if (Array.isArray(externalComparators)) {
      setComparators(prev => {
        const prevIds = prev.map(item => item.atleta_id).join('|')
        const nextIds = externalComparators.map(item => item.atleta_id).join('|')
        if (prevIds === nextIds) {
          return prev
        }
        return externalComparators
      })
    }
  }, [externalComparators])

  const handleOpen = () => {
    setTempSelectedAthlete(null)
    setDuplicateError(false)
    setOpen(true)
    console.debug('[AthleteComparator] handleOpen')
  }

  const handleClose = () => {
    setTempSelectedAthlete(null)
    setDuplicateError(false)
    setOpen(false)
    console.debug('[AthleteComparator] handleClose')
  }

  const handleSelect = () => {
    if (tempSelectedAthlete) {
      // Verificar que no esté ya añadido
      const exists = comparators.some(c => c.atleta_id === tempSelectedAthlete.atleta_id)
      if (!exists) {
        const updated = [...comparators, tempSelectedAthlete]
        setComparators(updated)
        if (onComparatorsChange) {
          onComparatorsChange(updated)
        }
        handleClose()
        console.debug('[AthleteComparator] handleSelect', tempSelectedAthlete)
      } else {
        setDuplicateError(true)
        console.debug('[AthleteComparator] duplicate athlete', tempSelectedAthlete)
      }
    }
  }

  const handleResultClick = (athlete) => {
    setTempSelectedAthlete(athlete)
    console.debug('[AthleteComparator] handleResultClick', athlete)
  }

  useEffect(() => {
    if (!open && comparators.length > 0) {
      const last = comparators[comparators.length - 1]
      setTempSelectedAthlete(last)
      console.debug('[AthleteComparator] sync tempSelectedAthlete with last comparator', last)
    }
  }, [open, comparators])

  const handleRemove = (atletaId) => {
    const updated = comparators.filter(c => c.atleta_id !== atletaId)
    setComparators(updated)
    if (onComparatorsChange) {
      onComparatorsChange(updated)
    }
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
          <DialogTitle sx={{ flexShrink: 0 }}>
            Añadir Atleta para Comparar
          </DialogTitle>
          
          <DialogContent 
            dividers 
            sx={{ 
              pb: 2,
              flex: 1,
              overflowY: 'auto'
            }}
          >
            <AthleteSearch onResultClick={handleResultClick} />
            
            {/* Alerta de duplicado */}
            {duplicateError && (
              <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setDuplicateError(false)}>
                Este atleta ya está en la lista de comparación
              </Alert>
            )}
          </DialogContent>

          {/* Card de feedback del atleta seleccionado */}
          {tempSelectedAthlete && (
            console.debug('[AthleteComparator] rendering selected athlete card', tempSelectedAthlete),
            <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
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
        <DialogTitle sx={{ flexShrink: 0 }}>
          Añadir Atleta para Comparar
        </DialogTitle>
        
        <DialogContent 
          dividers 
          sx={{ 
            pb: 2,
            flex: 1,
            overflowY: 'auto'
          }}
        >
          <AthleteSearch onResultClick={handleResultClick} />
          
          {/* Alerta de duplicado */}
          {duplicateError && (
            <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setDuplicateError(false)}>
              Este atleta ya está en la lista de comparación
            </Alert>
          )}
        </DialogContent>

        {/* Card de feedback del atleta seleccionado */}
        {tempSelectedAthlete && (
          console.debug('[AthleteComparator] rendering selected athlete card', tempSelectedAthlete),
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
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

