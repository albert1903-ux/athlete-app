import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import { TbCalendar, TbCalendarEvent, TbBallFootball, TbAlertTriangle, TbClock, TbPencil, TbTrash, TbChevronLeft, TbChevronRight, TbMapPin } from 'react-icons/tb'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { PickersDay } from '@mui/x-date-pickers/PickersDay'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../lib/supabase'
import AddEventDialog from '../components/AddEventDialog'
import EditParticipantDialog from '../components/EditParticipantDialog'

// Configurar dayjs para usar el locale español
dayjs.locale('es')

const CalendarioPage = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'))
  const [calendarKey, setCalendarKey] = useState(0)
  const [shouldRenderCalendar, setShouldRenderCalendar] = useState(true)
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

  // Componente personalizado para el header del calendario (no se usa actualmente, pero se mantiene por si se necesita)
  const CustomCalendarHeader = (props) => {
    const { 
      currentMonth: monthFromProps, 
      onMonthChange,
      leftArrowButtonProps,
      rightArrowButtonProps
    } = props
    
    // Usar el mes del prop o el estado local
    const displayMonth = monthFromProps || currentMonth
    
    const handlePrevMonth = (event) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      
      const newMonth = dayjs(displayMonth).subtract(1, 'month')
      setCurrentMonth(newMonth)
      
      if (onMonthChange) {
        onMonthChange(newMonth, 'left')
      }
      
      // Llamar también al handler original si existe
      if (leftArrowButtonProps?.onClick) {
        leftArrowButtonProps.onClick(event)
      }
    }
    
    const handleNextMonth = (event) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      
      const newMonth = dayjs(displayMonth).add(1, 'month')
      setCurrentMonth(newMonth)
      
      if (onMonthChange) {
        onMonthChange(newMonth, 'right')
      }
      
      // Llamar también al handler original si existe
      if (rightArrowButtonProps?.onClick) {
        rightArrowButtonProps.onClick(event)
      }
    }
    
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0 8px',
          mb: 3,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 8,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={(e) => {
              handlePrevMonth(e)
            }}
            sx={{
              color: '#6B7280',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: 2,
              width: 40,
              height: 40,
              padding: 0,
              pointerEvents: 'auto !important',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1001,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <TbChevronLeft size={20} />
          </IconButton>
        </Box>
        
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: '100%',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#000000',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              textTransform: 'capitalize',
              lineHeight: 1.2,
              mb: 0.5,
            }}
          >
            {displayMonth.format('MMMM')}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 400,
              color: '#9CA3AF',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {displayMonth.format('YYYY')}
          </Typography>
        </Box>
        
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={(e) => {
              handleNextMonth(e)
            }}
            sx={{
              color: '#6B7280',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: 2,
              width: 40,
              height: 40,
              padding: 0,
              pointerEvents: 'auto !important',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1001,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <TbChevronRight size={20} />
          </IconButton>
        </Box>
      </Box>
    )
  }

  // Componente personalizado para los días del calendario
  const CustomDay = (props) => {
    const { day, ...other } = props
    const dateStr = day.format('YYYY-MM-DD')
    const hasEvent = eventDates.has(dateStr)
    const isToday = dayjs().format('YYYY-MM-DD') === dateStr
    const isSelected = selectedDate.format('YYYY-MM-DD') === dateStr

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
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          minHeight: 48,
        }}
      >
        <PickersDay
          {...other}
          day={day}
          onClick={handleDayClick}
          sx={{
            fontSize: '0.9375rem',
            fontWeight: isToday ? 600 : 400,
            width: isToday ? 40 : 36,
            height: isToday ? 40 : 36,
            borderRadius: (isToday || isSelected) ? '10px' : '50%',
            color: isToday ? 'white' : isSelected ? '#000000' : 'text.primary',
            backgroundColor: isToday ? '#000000' : isSelected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            '&:hover': {
              backgroundColor: isToday ? '#000000' : 'rgba(0, 0, 0, 0.04)',
              borderRadius: '10px',
            },
          }}
        />
        {hasEvent && (
          <Box
            sx={{
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#4285F4',
            }}
          />
        )}
      </Box>
    )
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    setBottomSheetOpen(true)
    loadDayParticipants(newDate)
  }

  // Sincronizar currentMonth con selectedDate cuando cambia
  useEffect(() => {
    if (selectedDate && !selectedDate.isSame(currentMonth, 'month')) {
      setCurrentMonth(selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  // Handlers para navegación de mes
  const handlePrevMonth = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const newMonth = dayjs(currentMonth).subtract(1, 'month').startOf('month')
    setCurrentMonth(newMonth)
    setCalendarMonth(newMonth)
    setCalendarKey(prev => prev + 1)
  }

  const handleNextMonth = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const newMonth = dayjs(currentMonth).add(1, 'month').startOf('month')
    setCurrentMonth(newMonth)
    setCalendarMonth(newMonth)
    setCalendarKey(prev => prev + 1)
  }
  
  // Sincronizar calendarMonth con currentMonth cuando cambia selectedDate
  useEffect(() => {
    if (selectedDate && !selectedDate.isSame(calendarMonth, 'month')) {
      const newMonth = selectedDate.startOf('month')
      setCalendarMonth(newMonth)
    }
  }, [selectedDate])

  // Forzar remontaje del calendario cuando cambia calendarMonth (usando useMemo para la key)
  const calendarMonthKey = useMemo(() => calendarMonth.format('YYYY-MM'), [calendarMonth])
  
  useEffect(() => {
    setShouldRenderCalendar(false)
    // Temporalmente mover selectedDate al nuevo mes para forzar que el calendario lo muestre
    const newSelectedDate = calendarMonth.date(Math.min(selectedDate.date(), calendarMonth.daysInMonth()))
    setSelectedDate(newSelectedDate)
    const timer = setTimeout(() => {
      setShouldRenderCalendar(true)
    }, 100)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonthKey])

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
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#FFFFFF',
            position: 'relative',
          }}
        >
          <CardContent sx={{ p: 3, position: 'relative' }}>
            {/* Header personalizado fuera del DatePicker */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 8px',
                mb: 3,
                position: 'relative',
                zIndex: 100,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 8,
                  zIndex: 1000,
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e?.preventDefault?.()
                    e?.stopPropagation?.()
                    handlePrevMonth(e)
                  }}
                  sx={{
                    color: '#6B7280',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderRadius: 2,
                    width: 40,
                    height: 40,
                    padding: 0,
                    pointerEvents: 'auto !important',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1001,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    },
                  }}
                >
                  <TbChevronLeft size={20} />
                </IconButton>
              </Box>
              
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  width: '100%',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    textTransform: 'capitalize',
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                >
                  {currentMonth.locale('es').format('MMMM')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    color: '#9CA3AF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  {currentMonth.format('YYYY')}
        </Typography>
              </Box>
              
              <Box
                sx={{
                  position: 'absolute',
                  right: 8,
                  zIndex: 1000,
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e?.preventDefault?.()
                    e?.stopPropagation?.()
                    handleNextMonth(e)
                  }}
                  sx={{
                    color: '#6B7280',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderRadius: 2,
                    width: 40,
                    height: 40,
                    padding: 0,
                    pointerEvents: 'auto !important',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1001,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    },
                  }}
                >
                  <TbChevronRight size={20} />
                </IconButton>
              </Box>
            </Box>
            
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <Box
                key={`wrapper-${currentMonth.format('YYYY-MM')}-${calendarKey}`}
                sx={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '400px',
                }}
              >
                {shouldRenderCalendar && (
                  <DateCalendar
                    key={`calendar-${calendarMonth.format('YYYY-MM-DD')}-${calendarKey}`}
                    value={selectedDate}
                    onChange={handleDateChange}
                    onMonthChange={(newMonth) => {
                      // Sincronizar si el cambio viene del picker interno (navegación por días)
                      const newMonthStart = newMonth.startOf('month')
                      if (!newMonthStart.isSame(calendarMonth, 'month')) {
                        setCurrentMonth(newMonthStart)
                        setCalendarMonth(newMonthStart)
                        setCalendarKey(prev => prev + 1)
                      }
                    }}
                    slots={{
                      day: CustomDay,
                    }}
                    sx={{
                    width: '100%',
                    '& .MuiDateCalendar-root': {
                      overflow: 'visible !important',
                      maxHeight: 'none !important',
                      height: 'auto !important',
                    },
                  '& .MuiDayCalendar-root': {
                    overflow: 'visible !important',
                    maxHeight: 'none !important',
                    height: 'auto !important',
                  },
                  '& .MuiDayCalendar-monthContainer': {
                    overflow: 'visible !important',
                    maxHeight: 'none !important',
                    height: 'auto !important',
                  },
                  '& .MuiPickersSlideTransition-root': {
                    maxHeight: 'none !important',
                    height: 'auto !important',
                    overflow: 'visible !important',
                    transition: 'none !important',
                    '& > *': {
                      transition: 'none !important',
                      transform: 'none !important',
                      animation: 'none !important',
                    },
                  },
                  '& .MuiDayCalendar-slideTransition': {
                    transition: 'none !important',
                    '& > *': {
                      transition: 'none !important',
                      transform: 'none !important',
                      animation: 'none !important',
                      position: 'relative !important',
                      '&[aria-hidden="true"]': {
                        display: 'none !important',
                      },
                    },
                    '& > *:not([aria-hidden="true"])': {
                      display: 'block !important',
                    },
                  },
                  '& .MuiPickersFadeTransitionGroup-root': {
                    transition: 'none !important',
                    '& > *': {
                      transition: 'none !important',
                      animation: 'none !important',
                      opacity: '1 !important',
                      '&[aria-hidden="true"]': {
                        display: 'none !important',
                      },
                    },
                    '& > *:not([aria-hidden="true"])': {
                      display: 'block !important',
                      opacity: '1 !important',
                    },
                  },
                  '& .MuiDateCalendar-viewTransitionContainer': {
                    '& > *[aria-hidden="true"]': {
                      display: 'none !important',
                      opacity: '0 !important',
                    },
                    '& > *:not([aria-hidden="true"])': {
                      display: 'block !important',
                      opacity: '1 !important',
                    },
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
                  '& h4': {
                    display: 'none !important',
                  },
                  '& .MuiTypography-h4': {
                    display: 'none !important',
                  },
                  '& .MuiPickersCalendarHeader-root': {
                    display: 'none !important',
                    visibility: 'hidden !important',
                    height: '0 !important',
                    minHeight: '0 !important',
                    padding: '0 !important',
                    margin: '0 !important',
                  },
                  '& .MuiPickersCalendarHeader-labelContainer': {
                    display: 'none !important',
                  },
                  '& .MuiPickersCalendarHeader-switchViewButton': {
                    display: 'none !important',
                  },
                  '& .MuiDayCalendar-weekContainer': {
                    margin: '0 !important',
                    padding: '0 !important',
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    color: '#9CA3AF',
                    width: '100%',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    padding: '8px 0',
                  },
                  '& .MuiDayCalendar-header': {
                    paddingBottom: 1,
                    marginBottom: 1,
                  },
                  '& .MuiPickersDay-root': {
                    fontSize: '0.9375rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    margin: '2px',
                    '&:focus': {
                      backgroundColor: 'transparent',
                    },
                  },
                }}
                  />
                )}
                {!shouldRenderCalendar && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>
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
          <Typography variant="h6" sx={{ mb: 2 }}>
            {(() => {
              const diaSemana = selectedDate.locale('es').format('dddd')
              const dia = selectedDate.format('D')
              const mes = selectedDate.locale('es').format('MMMM')
              const año = selectedDate.format('YYYY')
              // Capitalizar primera letra del día y del mes
              const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
              const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1)
              return `${diaSemanaCapitalizado}, ${dia} de ${mesCapitalizado} de ${año}`
            })()}
          </Typography>

          {/* Contenido del bottom sheet */}
          {loadingDayParticipants ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : dayParticipants.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TbCalendarEvent style={{ fontSize: 48, color: 'inherit', marginBottom: 16 }} />
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
                            <TbAlertTriangle 
                              style={{ 
                                color: 'inherit', 
                                fontSize: 28,
                                marginTop: 4
                              }} 
                            />
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="h6">
                                {group.nombreAtleta}
                              </Typography>
                              {group.ubicacion && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <TbMapPin style={{ fontSize: 18, color: 'inherit' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {group.ubicacion}
                                  </Typography>
                                </Box>
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
                                    icon={<TbClock />}
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
                                    <TbPencil size={20} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteParticipant(participante)}
                                    color="error"
                                    sx={{ width: 32, height: 32 }}
                                  >
                                    <TbTrash size={20} />
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

