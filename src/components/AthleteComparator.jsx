import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Box,

  Card,
  CardContent,

  Typography,
  Chip,
  IconButton,
  Alert
} from '@mui/material'
import { Button, Modal } from './ui'
import { TbX, TbCheck, TbTrash, TbPlus, TbUserPlus, TbSwords } from 'react-icons/tb'
import AthleteSearch from './AthleteSearch'
import { useComparatorAthletes, setComparatorCache } from '../store/comparatorStore'

function AthleteComparator({ onComparatorsChange, hideAddButton = false }) {
  const comparators = useComparatorAthletes()
  const [open, setOpen] = useState(false)
  const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
  const [duplicateError, setDuplicateError] = useState(false)

  // Notificar al padre cuando cambien los comparadores
  useEffect(() => {
    if (onComparatorsChange) {
      onComparatorsChange(comparators)
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
      const exists = comparators.some(c => c.atleta_id === tempSelectedAthlete.atleta_id)
      if (!exists) {
        setComparatorCache([...comparators, tempSelectedAthlete])
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
    setComparatorCache(comparators.filter(c => c.atleta_id !== atletaId))
  }

  if (comparators.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>


        {/* Popup con búsqueda */}
        <Modal.Root
          open={open}
          onClose={handleClose}
          maxWidth="sm"
        >
          <Modal.Header onClose={handleClose}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TbSwords size={24} />
              <Typography variant="h6" component="span">Añadir Atleta para Comparar</Typography>
            </Box>
          </Modal.Header>

          <Modal.Body
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
                  backgroundColor: 'background.paper',
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
                          sx={{ bgcolor: 'background.paper', color: 'secondary.main' }}
                        />
                      )}
                      {tempSelectedAthlete.club && tempSelectedAthlete.club !== 'N/A' && tempSelectedAthlete.club !== 'Sin club' && (
                        <Chip
                          label={tempSelectedAthlete.club}
                          size="small"
                          variant="outlined"
                          sx={{ bgcolor: 'background.paper', color: 'secondary.main' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              onClick={handleClose}
              variant="ghost"
              startIcon={<TbX />}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSelect}
              variant="primary"
              disabled={!tempSelectedAthlete}
              startIcon={<TbCheck />}
            >
              Añadir
            </Button>
          </Modal.Footer>
        </Modal.Root>
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
                <TbTrash />
              </IconButton>
            </Box>

            {/* Fila inferior: Chips de licencia y club */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {comparator.fecha_nacimiento && (
                <Chip
                  label={dayjs(comparator.fecha_nacimiento).format('DD/MM/YYYY')}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              )}
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
      {!hideAddButton && (
        <Card sx={{ width: '100%', mt: 2 }}>
          <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
            <Button
              fullWidth
              variant="secondary"
              onClick={handleOpen}
              startIcon={<TbSwords />}
            >
              AÑADIR ATLETA A COMPARAR
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Popup con búsqueda */}
      <Modal.Root
        open={open}
        onClose={handleClose}
        maxWidth="sm"
      >
        <Modal.Header onClose={handleClose}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TbSwords size={24} />
            <Typography variant="h6" component="span">Añadir Atleta para Comparar</Typography>
          </Box>
        </Modal.Header>

        <Modal.Body
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
                backgroundColor: 'background.paper',
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
                    {tempSelectedAthlete.fecha_nacimiento && (
                      <Chip
                        label={dayjs(tempSelectedAthlete.fecha_nacimiento).format('DD/MM/YYYY')}
                        size="small"
                        variant="outlined"
                        sx={{ bgcolor: 'background.paper', color: 'secondary.main' }}
                      />
                    )}
                    {tempSelectedAthlete.licencia && tempSelectedAthlete.licencia !== 'N/A' && (
                      <Chip
                        label={`Lic: ${tempSelectedAthlete.licencia}`}
                        size="small"
                        variant="outlined"
                        sx={{ bgcolor: 'background.paper', color: 'secondary.main' }}
                      />
                    )}
                    {tempSelectedAthlete.club && tempSelectedAthlete.club !== 'N/A' && tempSelectedAthlete.club !== 'Sin club' && (
                      <Chip
                        label={tempSelectedAthlete.club}
                        size="small"
                        variant="outlined"
                        sx={{ bgcolor: 'background.paper', color: 'secondary.main' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            onClick={handleClose}
            variant="ghost"
            startIcon={<TbX />}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSelect}
            variant="primary"
            disabled={!tempSelectedAthlete}
            startIcon={<TbCheck />}
          >
            Añadir
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </Box>
  )
}

export default AthleteComparator

