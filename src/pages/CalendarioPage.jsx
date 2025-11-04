import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventIcon from '@mui/icons-material/Event'
import SportsIcon from '@mui/icons-material/Sports'
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
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false)
  const [eventDates, setEventDates] = useState(new Set())
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [dayParticipants, setDayParticipants] = useState([])
  const [loadingDayParticipants, setLoadingDayParticipants] = useState(false)
  const [dayLocation, setDayLocation] = useState(null)
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Cargar eventos desde Supabase (solo fechas que tienen participantes)
  const loadEvents = async () => {
    setLoadingEvents(true)
    try {
      // Obtener eventos que tienen al menos un participante
      const { data: participantesData, error: participantesError } = await supabase
        .from('participantes_eventos')
        .select('evento_id, eventos!inner(fecha)')

      if (participantesError) throw participantesError

      // Crear un Set con las fechas que tienen eventos con participantes (formato YYYY-MM-DD)
      const datesSet = new Set()
      if (participantesData) {
        participantesData.forEach(p => {
          if (p.eventos && p.eventos.fecha) {
            datesSet.add(p.eventos.fecha)
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

  useEffect(() => {
    loadEvents()
  }, [addEventDialogOpen]) // Recargar cuando se cierra el diálogo de añadir evento

  const handleAddEventDialogClose = () => {
    setAddEventDialogOpen(false)
  }

  // Escuchar evento desde el header
  useEffect(() => {
    const handleOpenAddEvent = () => {
      setAddEventDialogOpen(true)
    }

    window.addEventListener('openAddEventDialog', handleOpenAddEvent)

    return () => {
      window.removeEventListener('openAddEventDialog', handleOpenAddEvent)
    }
  }, [])

  const handleEventSuccess = () => {
    // Recargar eventos cuando se crea uno nuevo
    loadEvents()
    
    // Recargar también los participantes del día seleccionado si el bottom sheet está abierto
    if (bottomSheetOpen) {
      loadDayParticipants(selectedDate)
    }
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
        setDayLocation(null)
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
      
      // Obtener la ubicación (si todos los eventos tienen la misma ubicación, usar esa)
      const ubicaciones = [...new Set(eventosData.map(e => e.ubicacion).filter(Boolean))]
      setDayLocation(ubicaciones.length === 1 ? ubicaciones[0] : null)
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

      // Verificar si el evento queda sin participantes y eliminarlo
      const { data: participantesRestantes, error: checkError } = await supabase
        .from('participantes_eventos')
        .select('participante_id')
        .eq('evento_id', participante.evento_id)

      if (checkError) throw checkError

      // Si no quedan participantes, eliminar el evento también
      if (!participantesRestantes || participantesRestantes.length === 0) {
        const { error: deleteEventError } = await supabase
          .from('eventos')
          .delete()
          .eq('evento_id', participante.evento_id)

        if (deleteEventError) throw deleteEventError
      }

      // Recargar participantes
      if (bottomSheetOpen) {
        loadDayParticipants(selectedDate)
      }
      
      // Recargar eventos para actualizar los puntos en el calendario
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
                
                // Función para normalizar nombres y ubicaciones
                const normalizeName = (name) => name.trim().toLowerCase()
                const normalizeLocation = (location) => location ? location.trim().toLowerCase() : ''
                
                // Agrupar participantes por nombre de atleta y ubicación
                const groupedParticipants = new Map()
                dayParticipants.forEach(p => {
                  const key = `${normalizeName(p.nombre_atleta)}|${normalizeLocation(p.ubicacion || '')}`
                  if (!groupedParticipants.has(key)) {
                    groupedParticipants.set(key, [])
                  }
                  groupedParticipants.get(key).push(p)
                })
                
                // Convertir a array y ordenar por nombre
                const groups = Array.from(groupedParticipants.entries()).map(([key, participantes]) => ({
                  key,
                  participantes,
                  nombreAtleta: participantes[0].nombre_atleta,
                  ubicacion: participantes[0].ubicacion || ''
                }))
                
                groups.sort((a, b) => a.nombreAtleta.localeCompare(b.nombreAtleta))
                
                return groups.map((group) => {
                  // Verificar si algún participante del grupo tiene conflicto
                  const groupHasConflict = group.participantes.some(p => conflicts.has(p.participante_id))
                  
                  return (
                    <Card key={group.key} sx={{ position: 'relative' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          {groupHasConflict && (
                            <WarningIcon 
                              sx={{ 
                                color: 'warning.main', 
                                fontSize: 28,
                                mt: 0.5
                              }} 
                            />
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="h6">
                                {group.nombreAtleta}
                              </Typography>
                              {group.ubicacion && (
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  📍 {group.ubicacion}
                                </Typography>
                              )}
                            </Box>
                            
                            {/* Mostrar todas las pruebas y horarios del grupo */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1 }}>
                              {group.participantes.map((participante, idx) => (
                                <Box key={participante.participante_id} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditParticipant(participante)}
                                    color="primary"
                                    sx={{ ml: 'auto', width: 32, height: 32 }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteParticipant(participante)}
                                    color="error"
                                    sx={{ width: 32, height: 32 }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))}
                            </Box>
                            
                            {groupHasConflict && (
                              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                                ⚠️ Conflicto de horario detectado
                              </Typography>
                            )}
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

