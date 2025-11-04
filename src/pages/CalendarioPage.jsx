import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Drawer from '@mui/material/Drawer'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventIcon from '@mui/icons-material/Event'
import SportsIcon from '@mui/icons-material/Sports'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import WarningIcon from '@mui/icons-material/Warning'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { PickersDay } from '@mui/x-date-pickers/PickersDay'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../lib/supabase'
import AddEventDialog from '../components/AddEventDialog'
import EditParticipantDialog from '../components/EditParticipantDialog'

const CalendarioPage = () => {
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false)
  const [eventDates, setEventDates] = useState(new Set())
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [dayParticipants, setDayParticipants] = useState([])
  const [loadingDayParticipants, setLoadingDayParticipants] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const open = Boolean(anchorEl)

  // Cargar eventos desde Supabase
  useEffect(() => {
    const loadEvents = async () => {
      setLoadingEvents(true)
      try {
        const { data, error } = await supabase
          .from('eventos')
          .select('fecha')

        if (error) throw error

        // Crear un Set con las fechas que tienen eventos (formato YYYY-MM-DD)
        const datesSet = new Set()
        if (data) {
          data.forEach(evento => {
            if (evento.fecha) {
              datesSet.add(evento.fecha)
            }
          })
        }
        setEventDates(datesSet)
      } catch (err) {
        console.error('Error al cargar eventos:', err)
      } finally {
        setLoadingEvents(false)
      }
    }

    loadEvents()
  }, [addEventDialogOpen]) // Recargar cuando se cierra el diálogo de añadir evento

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleAddEvent = () => {
    handleClose()
    setAddEventDialogOpen(true)
  }

  const handleAddEventDialogClose = () => {
    setAddEventDialogOpen(false)
  }

  const handleEventSuccess = () => {
    // Recargar eventos cuando se crea uno nuevo
    const loadEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('eventos')
          .select('fecha')

        if (error) throw error

        const datesSet = new Set()
        if (data) {
          data.forEach(evento => {
            if (evento.fecha) {
              datesSet.add(evento.fecha)
            }
          })
        }
        setEventDates(datesSet)
        
        // Recargar también los participantes del día seleccionado si el bottom sheet está abierto
        if (bottomSheetOpen) {
          loadDayParticipants(selectedDate)
        }
      } catch (err) {
        console.error('Error al cargar eventos:', err)
      }
    }
    loadEvents()
  }

  // Componente personalizado para los días del calendario
  const CustomDay = (props) => {
    const { day, ...other } = props
    const dateStr = day.format('YYYY-MM-DD')
    const hasEvent = eventDates.has(dateStr)

    const handleDayClick = (event) => {
      // Llamar al onClick original si existe
      if (other.onClick) {
        other.onClick(event)
      }
      // Siempre abrir el bottom sheet y cargar participantes
      setSelectedDate(day)
      setBottomSheetOpen(true)
      loadDayParticipants(day)
    }

    return (
      <PickersDay
        {...other}
        day={day}
        onClick={handleDayClick}
        sx={{
          ...(hasEvent && {
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'primary.main',
            },
          }),
        }}
      />
    )
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    setBottomSheetOpen(true)
    loadDayParticipants(newDate)
  }

  // Cargar participantes del día seleccionado
  const loadDayParticipants = async (date) => {
    setLoadingDayParticipants(true)
    try {
      const fechaStr = date.format('YYYY-MM-DD')
      
      // Obtener eventos del día
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('evento_id, ubicacion')
        .eq('fecha', fechaStr)

      if (eventosError) throw eventosError

      if (!eventosData || eventosData.length === 0) {
        setDayParticipants([])
        return
      }

      const eventoIds = eventosData.map(e => e.evento_id)

      // Obtener participantes de esos eventos
      const { data: participantesData, error: participantesError } = await supabase
        .from('participantes_eventos')
        .select(`
          participante_id,
          nombre_atleta,
          prueba_id,
          prueba_nombre_manual,
          hora,
          evento_id
        `)
        .in('evento_id', eventoIds)
        .order('hora', { ascending: true })

      if (participantesError) throw participantesError

      // Obtener nombres de pruebas desde la tabla pruebas
      const pruebaIds = participantesData
        .map(p => p.prueba_id)
        .filter(Boolean)
      
      let pruebasMap = new Map()
      if (pruebaIds.length > 0) {
        const { data: pruebasData } = await supabase
          .from('pruebas')
          .select('prueba_id, nombre')
          .in('prueba_id', pruebaIds)

        if (pruebasData) {
          pruebasData.forEach(p => {
            pruebasMap.set(p.prueba_id, p.nombre)
          })
        }
      }

      // Combinar datos
      const participantesConInfo = participantesData.map(p => {
        const pruebaNombre = p.prueba_id 
          ? pruebasMap.get(p.prueba_id) 
          : p.prueba_nombre_manual
        return {
          ...p,
          prueba_nombre: pruebaNombre,
          ubicacion: eventosData.find(e => e.evento_id === p.evento_id)?.ubicacion
        }
      })

      setDayParticipants(participantesConInfo)
    } catch (err) {
      console.error('Error al cargar participantes del día:', err)
      setDayParticipants([])
    } finally {
      setLoadingDayParticipants(false)
    }
  }

  // Detectar conflictos de horario (mismo atleta con menos de 10 minutos de diferencia)
  const detectConflicts = (participantes) => {
    const conflicts = new Set()
    const participantesPorAtleta = new Map()

    // Función para normalizar nombres (minúsculas y sin espacios al inicio/final)
    const normalizeName = (name) => {
      return name.trim().toLowerCase()
    }

    // Agrupar por nombre de atleta normalizado
    participantes.forEach(p => {
      const nombreNormalizado = normalizeName(p.nombre_atleta)
      if (!participantesPorAtleta.has(nombreNormalizado)) {
        participantesPorAtleta.set(nombreNormalizado, [])
      }
      participantesPorAtleta.get(nombreNormalizado).push(p)
    })

    // Verificar conflictos para cada atleta
    participantesPorAtleta.forEach((participantesAtleta, nombreAtletaNormalizado) => {
      if (participantesAtleta.length < 2) return

      for (let i = 0; i < participantesAtleta.length; i++) {
        for (let j = i + 1; j < participantesAtleta.length; j++) {
          const hora1 = dayjs(participantesAtleta[i].hora, 'HH:mm:ss')
          const hora2 = dayjs(participantesAtleta[j].hora, 'HH:mm:ss')
          const diffMinutes = Math.abs(hora1.diff(hora2, 'minute'))

          if (diffMinutes < 10) {
            conflicts.add(participantesAtleta[i].participante_id)
            conflicts.add(participantesAtleta[j].participante_id)
          }
        }
      }
    })

    return conflicts
  }

  const handleBottomSheetClose = () => {
    setBottomSheetOpen(false)
  }

  const handleEditParticipant = (participante) => {
    setEditingParticipant(participante)
    setEditDialogOpen(true)
  }

  const handleEditDialogClose = () => {
    setEditDialogOpen(false)
    setEditingParticipant(null)
  }

  const handleEditSuccess = () => {
    // Recargar participantes después de editar
    if (bottomSheetOpen) {
      loadDayParticipants(selectedDate)
    }
    handleEditDialogClose()
  }

  const handleDeleteParticipant = async (participante) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la participación de ${participante.nombre_atleta}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('participantes_eventos')
        .delete()
        .eq('participante_id', participante.participante_id)

      if (error) throw error

      // Recargar participantes
      if (bottomSheetOpen) {
        loadDayParticipants(selectedDate)
      }
      
      // Recargar eventos para actualizar los puntos en el calendario
      const loadEvents = async () => {
        try {
          const { data, error } = await supabase
            .from('eventos')
            .select('fecha')

          if (error) throw error

          const datesSet = new Set()
          if (data) {
            data.forEach(evento => {
              if (evento.fecha) {
                datesSet.add(evento.fecha)
              }
            })
          }
          setEventDates(datesSet)
        } catch (err) {
          console.error('Error al cargar eventos:', err)
        }
      }
      loadEvents()
    } catch (err) {
      console.error('Error al eliminar participante:', err)
      alert('Error al eliminar el participante. Por favor, intenta de nuevo.')
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        pb: '100px', // Espacio para el BottomNavigation
      }}
    >
      <Box
        sx={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          px: 2,
          py: 2,
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Calendario
          </Typography>
          <IconButton
            onClick={handleClick}
            sx={{ color: 'text.primary' }}
            aria-label="menú de opciones"
            aria-controls={open ? 'menu-calendario' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="menu-calendario"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'menu-calendario',
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleAddEvent}>
              Añadir evento
            </MenuItem>
          </Menu>
        </Box>

        {/* Calendario */}
        <Card>
          <CardContent>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <StaticDatePicker
                value={selectedDate}
                onChange={handleDateChange}
                slots={{
                  day: CustomDay,
                }}
                slotProps={{
                  actionBar: {
                    actions: [],
                  },
                }}
                sx={{
                  '& .MuiPickersCalendarHeader-root': {
                    paddingLeft: 2,
                    paddingRight: 2,
                    paddingTop: 2,
                  },
                  '& .MuiPickersCalendarHeader-labelContainer': {
                    marginLeft: 0,
                  },
                  // Ocultar el campo de texto "Select Date" que aparece arriba
                  '& .MuiPickersToolbar-title': {
                    display: 'none !important',
                  },
                  '& .MuiPickersLayout-root > div:first-of-type': {
                    display: 'none !important',
                  },
                  '& .MuiPickersTextField-root': {
                    display: 'none !important',
                  },
                  '& .MuiPickersInput-root': {
                    display: 'none !important',
                  },
                  '& .MuiDayCalendar-weekContainer': {
                    margin: '0 8px',
                  },
                  '& .MuiPickersDay-root': {
                    fontSize: '0.875rem',
                    width: 36,
                    height: 36,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '&::after': {
                        backgroundColor: 'white !important',
                      },
                    },
                    '&.MuiPickersDay-today': {
                      border: '1px solid',
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </CardContent>
        </Card>
      </Box>

      {/* Bottom Sheet */}
      <Drawer
        anchor="bottom"
        open={bottomSheetOpen}
        onClose={handleBottomSheetClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
          },
        }}
      >
        <Box
          sx={{
            padding: 3,
            minHeight: '200px',
          }}
        >
          {/* Indicador de arrastre */}
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: 'grey.300',
              borderRadius: 2,
              margin: '0 auto 20px',
            }}
          />
          <Typography variant="h6" sx={{ mb: 2, textTransform: 'capitalize' }}>
            {selectedDate.format('dddd, D [de] MMMM [de] YYYY')}
          </Typography>

          {/* Contenido del bottom sheet */}
          {loadingDayParticipants ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : dayParticipants.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No hay eventos asociados a este día
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(() => {
                const conflicts = detectConflicts(dayParticipants)
                return dayParticipants.map((participante) => {
                  const hasConflict = conflicts.has(participante.participante_id)
                  return (
                    <Card key={participante.participante_id} sx={{ position: 'relative' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          {hasConflict && (
                            <WarningIcon 
                              sx={{ 
                                color: 'warning.main', 
                                fontSize: 28,
                                mt: 0.5
                              }} 
                            />
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                              {participante.nombre_atleta}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                              <Chip 
                                label={participante.prueba_nombre || 'Sin prueba'} 
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Chip
                                icon={<AccessTimeIcon />}
                                label={dayjs(participante.hora, 'HH:mm:ss').format('HH:mm')}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                            {participante.ubicacion && (
                              <Typography variant="body2" color="text.secondary">
                                📍 {participante.ubicacion}
                              </Typography>
                            )}
                            {hasConflict && (
                              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                                ⚠️ Conflicto de horario detectado
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditParticipant(participante)}
                              color="primary"
                              sx={{ mt: -1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteParticipant(participante)}
                              color="error"
                              sx={{ mt: -1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )
                })
              })()}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Diálogo para añadir eventos */}
      <AddEventDialog
        open={addEventDialogOpen}
        onClose={handleAddEventDialogClose}
        onSuccess={handleEventSuccess}
        selectedDate={selectedDate}
      />

      {/* Diálogo para editar participante */}
      <EditParticipantDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        onSuccess={handleEditSuccess}
        participant={editingParticipant}
      />
    </Box>
  )
}

export default CalendarioPage

