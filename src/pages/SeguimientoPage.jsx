import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import { Typography } from '../components/ui'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import { TbDots, TbList, TbCircuitCapacitorPolarized, TbUser, TbSwords, TbUserMinus, TbStar } from 'react-icons/tb'
import dayjs from 'dayjs'
import { useFavorites } from '../store/favoritesStore'
import { useAuth } from '../context/AuthContext'
import { useAthleteProfile } from '../hooks/useAthleteProfile'

import AthleteSpiderChart from '../components/AthleteSpiderChart'
import AthleteResultsChart from '../components/AthleteResultsChart'
import SelectAthleteDialog from '../components/SelectAthleteDialog'
import AddComparatorDialog from '../components/AddComparatorDialog'
import MarksManagementDialog from '../components/MarksManagementDialog'
import AddResultDialog from '../components/AddResultDialog'
import NextEventCard from '../components/NextEventCard'
import { setComparatorCache, useComparatorAthletes } from '../store/comparatorStore'
import { useSelectedAthlete, setSelectedAthlete } from '../store/selectedAthleteStore'

const SeguimientoPage = () => {
  const selectedAthleteState = useSelectedAthlete()
  const comparatorAthletes = useComparatorAthletes()
  const [resultsRefreshKey, setResultsRefreshKey] = useState(0)

  // Data fetching hook for profile
  const { profile: selectedAthlete } = useAthleteProfile(selectedAthleteState?.atleta_id)

  // Use the state version for initial checks, but enriched version for display
  const effectiveAthlete = selectedAthlete || selectedAthleteState

  // Dialog states
  const [anchorEl, setAnchorEl] = useState(null)
  const [favAnchorEl, setFavAnchorEl] = useState(null)
  const [marksOpen, setMarksOpen] = useState(false)
  const [addResultOpen, setAddResultOpen] = useState(false)
  const [selectAthleteOpen, setSelectAthleteOpen] = useState(false)
  const [addComparatorOpen, setAddComparatorOpen] = useState(false)

  // Favorites
  const { favorites } = useFavorites()
  const { user } = useAuth()

  // Initial load: if no athlete selected, open selection dialog
  useEffect(() => {
    if (!selectedAthleteState) {
      setSelectAthleteOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Enriquecer el atleta en el store cuando el perfil cargue datos adicionales (club, fecha)
  useEffect(() => {
    if (selectedAthlete && selectedAthleteState) {
      const isEnriched = selectedAthlete.club && !selectedAthleteState.club
      const isUpdated = isEnriched || selectedAthlete.fecha_nacimiento !== selectedAthleteState.fecha_nacimiento
      if (isUpdated) {
        setSelectedAthlete({ ...selectedAthleteState, ...selectedAthlete })
      }
    }
  }, [selectedAthlete, selectedAthleteState])

  // Menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleAction = (action) => {
    handleMenuClose()
    switch (action) {
      case 'marks':
        setMarksOpen(true)
        break
      case 'add_result':
        setAddResultOpen(true)
        break
      case 'select_athlete':
        setSelectAthleteOpen(true)
        break
      case 'add_comparator':
        setAddComparatorOpen(true)
        break
      default:
        break
    }
  }

  // Dialog completion handlers
  const handleAthleteSelected = (athlete) => {
    setSelectedAthlete(athlete)
  }

  const handleComparatorAdded = (athlete) => {
    setComparatorCache([...comparatorAthletes, athlete])
  }

  const handleRemoveComparator = (atletaId) => {
    handleMenuClose()
    setComparatorCache(comparatorAthletes.filter(c => c.atleta_id !== atletaId))
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default', // Should be grey/blueish from theme
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Custom Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 0,
          pt: 'env(safe-area-inset-top)',
          px: 3,
          pb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <Box sx={{ mt: 2 }}>
          <Typography component="h1" sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '24px', color: 'text.primary', mb: 1 }}>
            {effectiveAthlete ? effectiveAthlete.nombre : 'Selecciona un atleta'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {effectiveAthlete?.fecha_nacimiento && (
              <Chip
                label={dayjs(effectiveAthlete.fecha_nacimiento).format('DD/MM/YYYY')}
                size="small"
                sx={{ bgcolor: 'background.paper', color: 'text.primary', fontWeight: 600, border: '1px solid', borderColor: 'divider' }}
              />
            )}
            {effectiveAthlete?.club && (
              <Chip
                label={effectiveAthlete.club}
                size="small"
                sx={{ bgcolor: 'background.paper', color: 'text.primary', fontWeight: 600, border: '1px solid', borderColor: 'divider' }}
              />
            )}
          </Box>
        </Box>

        {/* Right side: star + dots buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
          {/* Favorites quick-access */}
          {favorites.length > 0 && (
            <IconButton
              sx={{ bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={(e) => setFavAnchorEl(e.currentTarget)}
              title="Favoritos"
            >
              <TbStar />
            </IconButton>
          )}

          {/* Context menu */}
          <IconButton
            sx={{ bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={handleMenuOpen}
          >
            <TbDots />
          </IconButton>
        </Box>
      </Box>

      {/* Main Content Container - White Rounded */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          bgcolor: 'background.paper',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          px: 3,
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflow: 'hidden', // For children
          pb: 'calc(80px + env(safe-area-inset-bottom))' // Espacio reservado para BottomNavigation
        }}
      >
        {effectiveAthlete ? (
          <>
            {/* Próximo Competición */}
            <NextEventCard athlete={effectiveAthlete} />

            {/* Componente gráfico de araña */}
            <Box sx={{ width: '100%' }}>
              <AthleteSpiderChart
                key={`spider-${resultsRefreshKey}`}
                comparatorAthletes={comparatorAthletes}
              />
            </Box>

            {/* Componente gráfico de resultados */}
            <Box sx={{ width: '100%', pt: '30px' }}>
              <AthleteResultsChart
                key={`results-${resultsRefreshKey}`}
                comparatorAthletes={comparatorAthletes}
              />
            </Box>


          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <Typography color="text.secondary">
              Selecciona un atleta para ver su seguimiento
            </Typography>
          </Box>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2, mt: 1, minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => handleAction('select_athlete')}>
          <ListItemIcon><TbUser /></ListItemIcon>
          Seleccionar atleta
        </MenuItem>

        {user?.role === 'admin' && (
          <MenuItem onClick={() => handleAction('add_result')}>
            <ListItemIcon><TbCircuitCapacitorPolarized /></ListItemIcon>
            Añadir marca
          </MenuItem>
        )}

        {user?.role === 'admin' && (
          <MenuItem onClick={() => handleAction('marks')}>
            <ListItemIcon><TbList /></ListItemIcon>
            Gestionar marcas
          </MenuItem>
        )}

        <MenuItem onClick={() => handleAction('add_comparator')}>
          <ListItemIcon><TbSwords /></ListItemIcon>
          Añadir atleta a comparar
        </MenuItem>
        {comparatorAthletes.map(athlete => (
          <MenuItem
            key={`remove-${athlete.atleta_id}`}
            onClick={() => handleRemoveComparator(athlete.atleta_id)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}><TbUserMinus /></ListItemIcon>
            Eliminar {athlete.nombre}
          </MenuItem>
        ))}
      </Menu>

      {/* Favorites Menu */}
      <Menu
        anchorEl={favAnchorEl}
        open={Boolean(favAnchorEl)}
        onClose={() => setFavAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2, mt: 1, minWidth: 220 }
        }}
      >
        {favorites.map(athlete => (
          <MenuItem
            key={athlete.atleta_id}
            onClick={() => {
              setSelectedAthlete(athlete)
              setFavAnchorEl(null)
            }}
          >
            <ListItemIcon><TbStar /></ListItemIcon>
            <Box>
              <Typography variant="body2" fontWeight={600}>{athlete.nombre}</Typography>
              {athlete.club && (
                <Typography variant="caption" color="text.secondary">{athlete.club}</Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Dialogs */}
      <SelectAthleteDialog
        open={selectAthleteOpen}
        onClose={() => setSelectAthleteOpen(false)}
        onSelect={handleAthleteSelected}
      />

      <AddComparatorDialog
        open={addComparatorOpen}
        onClose={() => setAddComparatorOpen(false)}
        onAdd={handleComparatorAdded}
        currentComparators={comparatorAthletes}
      />

      <MarksManagementDialog
        open={marksOpen}
        onClose={() => setMarksOpen(false)}
        onResultChanged={() => setResultsRefreshKey((prev) => prev + 1)}
      />

      <AddResultDialog
        open={addResultOpen}
        onClose={() => setAddResultOpen(false)}
        onSuccess={() => {
          setAddResultOpen(false)
          setResultsRefreshKey((prev) => prev + 1)
        }}
      />

    </Box>
  )
}

export default SeguimientoPage
