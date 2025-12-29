import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
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
import { TbX, TbCheck, TbPencil, TbUser } from 'react-icons/tb'
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
  const [tempSelectedAthlete, setTempSelectedAthlete] = useState(() => {
    const stored = loadFromStorage()
    return stored || null
  })

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

  // Escuchar cambios externos (por ejemplo, desde RankingDialog)
  useEffect(() => {
    const handleExternalChange = () => {
      const stored = loadFromStorage()
      // Solo actualizar si es diferente para evitar loops
      setSelectedAthlete(prev => {
        if (!prev && !stored) return prev
        if (prev && stored && prev.atleta_id === stored.atleta_id) return prev
        return stored
      })
    }

    window.addEventListener('localStorageChange', handleExternalChange)
    return () => window.removeEventListener('localStorageChange', handleExternalChange)
  }, [])

  const handleOpen = () => {
    const candidate = selectedAthlete || loadFromStorage() || null
    setTempSelectedAthlete(candidate)
    setOpen(true)
  }

  const handleClose = (nextTempSelected = selectedAthlete) => {
    setTempSelectedAthlete(nextTempSelected || null)
    setOpen(false)
  }

  const handleSelect = () => {
    if (tempSelectedAthlete) {
      setSelectedAthlete(tempSelectedAthlete)
      handleClose(tempSelectedAthlete)
    }
  }

  const handleResultClick = (athlete) => {
    setTempSelectedAthlete(athlete)
  }

  const handleRemove = () => {
    setSelectedAthlete(null)
    setTempSelectedAthlete(null)
    localStorage.removeItem(STORAGE_KEY) // Limpiar explícitamente el localStorage
    setOpen(true) // Abrir el popup al eliminar la selección
    console.debug('[AthleteSelector] handleRemove')
  }

  useEffect(() => {
    if (open) {
      const candidate = tempSelectedAthlete || selectedAthlete || loadFromStorage()
      if (candidate && (!tempSelectedAthlete || tempSelectedAthlete.atleta_id !== candidate.atleta_id)) {
        setTempSelectedAthlete(candidate)
      }
    }
  }, [open, selectedAthlete])

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
                onClick={handleOpen}
                color="primary"
                aria-label="Cambiar atleta"
                sx={{ ml: 'auto' }}
              >
                <TbPencil />
              </IconButton>
            </Box>

            {/* Fila inferior: Chips de licencia y club */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {selectedAthlete.fecha_nacimiento && (
                <Chip
                  label={dayjs(selectedAthlete.fecha_nacimiento).format('DD/MM/YYYY')}
                  size="small"
                  variant="outlined"
                />
              )}
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TbUser size={24} />
          <Typography variant="h6" component="span">Seleccionar Atleta</Typography>
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
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              pr: { xs: 1, sm: 2 },
              pl: { xs: 1, sm: 2 },
              pt: 1,
              pb: open && tempSelectedAthlete ? 3 : 1,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <AthleteSearch onResultClick={handleResultClick} />
          </Box>

          {/* Card sticky del atleta seleccionado */}
          {open && tempSelectedAthlete && (
            console.debug('[AthleteSelector] rendering selected athlete card', tempSelectedAthlete),
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                width: '100%',
                backgroundColor: 'white',
                borderTop: '1px solid',
                borderColor: 'divider',
                px: { xs: 2, sm: 3 },
                py: 2,
                zIndex: (theme) => theme.zIndex.appBar
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
                    {tempSelectedAthlete.fecha_nacimiento && (
                      <Chip
                        label={dayjs(tempSelectedAthlete.fecha_nacimiento).format('DD/MM/YYYY')}
                        size="small"
                        variant="outlined"
                        sx={{ bgcolor: 'white', color: 'primary.main' }}
                      />
                    )}
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
            startIcon={<TbX />}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSelect}
            variant="contained"
            disabled={!tempSelectedAthlete}
            startIcon={<TbCheck />}
          >
            Seleccionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AthleteSelector

