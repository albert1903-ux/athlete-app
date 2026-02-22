import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { Typography } from './ui';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

export default function NextEventCard({ athlete }) {
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!athlete) {
            setEventData(null);
            setLoading(false);
            return;
        }

        const fetchNextEvent = async () => {
            setLoading(true);
            try {
                const today = dayjs().format('YYYY-MM-DD');

                // Query 1: obtener participaciones del atleta (sin join a pruebas que no tiene FK reconocida)
                const { data, error } = await supabase
                    .from('participantes_eventos')
                    .select(`
                        hora,
                        prueba_id,
                        prueba_nombre_manual,
                        eventos(evento_id, fecha, ubicacion)
                    `)
                    .eq('atleta_id', athlete.atleta_id);

                if (error) {
                    console.error("❌ Supabase error:", error);
                    throw error;
                }

                if (!data || data.length === 0) {
                    setEventData(null);
                    return;
                }

                // Filtrar solo eventos futuros en el cliente
                const futureParticipations = data.filter(p =>
                    p.eventos && p.eventos.fecha && p.eventos.fecha >= today
                );

                if (futureParticipations.length === 0) {
                    setEventData(null);
                    return;
                }

                // Query 2: obtener nombres de las pruebas por IDs
                const pruebaIds = [...new Set(futureParticipations
                    .map(p => p.prueba_id)
                    .filter(Boolean)
                )];

                let pruebasMap = {};
                if (pruebaIds.length > 0) {
                    const { data: pruebasData } = await supabase
                        .from('pruebas')
                        .select('prueba_id, nombre')
                        .in('prueba_id', pruebaIds);
                    if (pruebasData) {
                        pruebasData.forEach(p => { pruebasMap[p.prueba_id] = p.nombre; });
                    }
                }

                // Agrupar por evento
                const eventsMap = {};
                futureParticipations.forEach(p => {
                    const eventId = p.eventos.evento_id;
                    if (!eventsMap[eventId]) {
                        eventsMap[eventId] = {
                            fecha: p.eventos.fecha,
                            ubicacion: p.eventos.ubicacion,
                            participations: []
                        };
                    }
                    const prueba_nombre = p.prueba_id
                        ? (pruebasMap[p.prueba_id] || p.prueba_nombre_manual || '—')
                        : (p.prueba_nombre_manual || '—');
                    eventsMap[eventId].participations.push({
                        prueba_nombre,
                        hora: p.hora
                    });
                });

                // Ordenar por fecha y coger el más inminente
                const sortedEvents = Object.values(eventsMap).sort((a, b) =>
                    a.fecha.localeCompare(b.fecha)
                );

                const next = sortedEvents[0];

                // Ordenar participaciones por hora
                next.participations.sort((a, b) => {
                    if (!a.hora) return 1;
                    if (!b.hora) return -1;
                    return a.hora.localeCompare(b.hora);
                });

                setEventData(next);
            } catch (err) {
                console.error("Error al cargar la próxima competición:", err);
                setEventData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchNextEvent();
    }, [athlete]);

    // Handle Event Listener para recargar si hay cambios de calendario
    useEffect(() => {
        const handleRecarga = () => {
            // Forzar un trigger sobre la dependencia 'athlete' simulando un cambio de reference 
            // si quisiéramos recargar al instante, pero lo hacemos simple relanzando si es el mismo
            setEventData(prev => prev ? { ...prev } : null); // Dummy update para provocar re-render
        };
        window.addEventListener('openAddEventDialog', handleRecarga); // As placeholder, should listen to a calendar success event if globally dispatched

        return () => {
            window.removeEventListener('openAddEventDialog', handleRecarga);
        }
    }, []);

    if (loading) {
        return (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (!eventData) return null;

    const eventDate = dayjs(eventData.fecha).locale('es');
    const dayOfWeek = eventDate.format('dddd').toUpperCase(); // EJ: SÁBADO
    const dayOfMonth = eventDate.format('D'); // EJ: 24

    return (
        <Box sx={{ width: '100%', mb: 3 }}>
            {/* Título y Ubicación */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '20px', mb: 0, color: '#000000' }}>
                    Próxima competición
                </Typography>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#E11141' }}>
                    {eventData.ubicacion}
                </Typography>
            </Box>

            {/* Row de tarjetas: Fecha y Pruebas */}
            <Box sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 1, // Espacio para scrollbar nativo
                '&::-webkit-scrollbar': { display: 'none' }, // Ocultar scrollbar
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {/* Tarjeta de Fecha (Rosada/Roja) */}
                <Box sx={{
                    minWidth: '90px',
                    height: '90px',
                    bgcolor: '#E11141',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: 0.5 }}>
                        {dayOfWeek}
                    </Typography>
                    <Typography sx={{ fontSize: '2.5rem', fontWeight: 400, lineHeight: 1.1 }}>
                        {dayOfMonth}
                    </Typography>
                </Box>

                {/* Tarjetas de Pruebas (Gris) */}
                {eventData.participations.map((part, idx) => (
                    <Box key={idx} sx={{
                        minWidth: '95px',
                        height: '90px',
                        bgcolor: '#F3F4F6',
                        borderRadius: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        px: 1
                    }}>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 500, color: '#4B5563', mb: 0.5, textAlign: 'center', lineHeight: 1.1 }}>
                            {part.prueba_nombre}
                        </Typography>
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#000' }}>
                            {part.hora ? part.hora.substring(0, 5) : '--:--'}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
