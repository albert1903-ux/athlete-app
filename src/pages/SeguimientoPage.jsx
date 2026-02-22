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


import AthleteSpiderChart from '../components/AthleteSpiderChart'
import AthleteResultsChart from '../components/AthleteResultsChart'
import SelectAthleteDialog from '../components/SelectAthleteDialog'
import AddComparatorDialog from '../components/AddComparatorDialog'
import MarksManagementDialog from '../components/MarksManagementDialog'
import AddResultDialog from '../components/AddResultDialog'
import NextEventCard from '../components/NextEventCard'
import { getComparatorCache, setComparatorCache } from '../store/comparatorStore'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'selectedAthlete'

function loadSelectedAthlete() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error al cargar atleta:', error)
  }
  return null
}

const SeguimientoPage = () => {
  const [comparatorAthletes, setComparatorAthletes] = useState(() => getComparatorCache())
  const [resultsRefreshKey, setResultsRefreshKey] = useState(0)
  const [selectedAthlete, setSelectedAthlete] = useState(() => loadSelectedAthlete())

  // Dialog states
  const [anchorEl, setAnchorEl] = useState(null)
  const [favAnchorEl, setFavAnchorEl] = useState(null)
  const [marksOpen, setMarksOpen] = useState(false)
  const [addResultOpen, setAddResultOpen] = useState(false)
  const [selectAthleteOpen, setSelectAthleteOpen] = useState(false)
  const [addComparatorOpen, setAddComparatorOpen] = useState(false)

  // Favorites
  const { favorites } = useFavorites()

  // Initial load: if no athlete selected, open selection dialog
  useEffect(() => {
    if (!selectedAthlete) {
      setSelectAthleteOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Enrich selectedAthlete with club if missing
  useEffect(() => {
    if (!selectedAthlete || selectedAthlete.club) return
    const atletaId = selectedAthlete.atleta_id
    if (!atletaId) return
      ; (async () => {
        try {
          const { data: resultados } = await supabase
            .from('resultados')
            .select('club_id, fecha')
            .eq('atleta_id', atletaId)
            .order('fecha', { ascending: false })
            .limit(1)
          const clubId = resultados?.[0]?.club_id
          if (!clubId) return
          const { data: clubData } = await supabase
            .from('clubes')
            .select('nombre')
            .eq('club_id', clubId)
            .single()
          if (clubData?.nombre) {
            const enriched = { ...selectedAthlete, club: clubData.nombre }
            setSelectedAthlete(enriched)
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched))
            } catch (_) { }
          }
        } catch (err) {
          console.error('Error enriching athlete club:', err)
        }
      })()
  }, [selectedAthlete?.atleta_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResultadoCreado = () => {
      setResultsRefreshKey((prev) => prev + 1)
    }

    // Also listen for changes in selected athlete from other tabs/windows or dialogs
    const handleStorageChange = () => {
      setSelectedAthlete(loadSelectedAthlete())
    }

    window.addEventListener('resultadoCreado', handleResultadoCreado)
    window.addEventListener('localStorageChange', handleStorageChange)

    return () => {
      window.removeEventListener('resultadoCreado', handleResultadoCreado)
      window.removeEventListener('localStorageChange', handleStorageChange)
    }
  }, [])

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
    const newComparators = [...comparatorAthletes, athlete]
    setComparatorAthletes(newComparators)
    setComparatorCache(newComparators)
  }

  const handleRemoveComparator = (atletaId) => {
    handleMenuClose()
    const newComparators = comparatorAthletes.filter(c => c.atleta_id !== atletaId)
    setComparatorAthletes(newComparators)
    setComparatorCache(newComparators)
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
          <Typography component="h1" sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '24px', color: '#000000', mb: 1 }}>
            {selectedAthlete ? selectedAthlete.nombre : 'Selecciona un atleta'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedAthlete?.fecha_nacimiento && (
              <Chip
                label={dayjs(selectedAthlete.fecha_nacimiento).format('DD/MM/YYYY')}
                size="small"
                sx={{ bgcolor: 'white', fontWeight: 600 }}
              />
            )}
            {selectedAthlete?.club && (
              <Chip
                label={selectedAthlete.club}
                size="small"
                sx={{ bgcolor: 'white', fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        {/* Right side: star + dots buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
          {/* Favorites quick-access */}
          {favorites.length > 0 && (
            <IconButton
              sx={{ bgcolor: 'white', color: 'rgb(28, 27, 31)', '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}
              onClick={(e) => setFavAnchorEl(e.currentTarget)}
              title="Favoritos"
            >
              <TbStar />
            </IconButton>
          )}

          {/* Context menu */}
          <IconButton
            sx={{ bgcolor: 'white', color: 'rgb(28, 27, 31)', '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}
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
          bgcolor: 'white',
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
        {selectedAthlete ? (
          <>
            {/* Próximo Competición */}
            <NextEventCard athlete={selectedAthlete} />

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
        <MenuItem onClick={() => handleAction('add_result')}>
          <ListItemIcon><TbCircuitCapacitorPolarized /></ListItemIcon>
          Añadir marca
        </MenuItem>
        <MenuItem onClick={() => handleAction('marks')}>
          <ListItemIcon><TbList /></ListItemIcon>
          Gestionar marcas
        </MenuItem>
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
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(athlete))
                window.dispatchEvent(new Event('localStorageChange'))
              } catch (e) {
                console.error('Error saving favorite athlete:', e)
              }
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
      />

      <AddResultDialog
        open={addResultOpen}
        onClose={() => setAddResultOpen(false)}
        onSuccess={() => setAddResultOpen(false)}
      />

    </Box>
  )
}

export default SeguimientoPage
