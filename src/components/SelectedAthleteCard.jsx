import dayjs from 'dayjs'
import { Box, Card, CardContent, Chip } from '@mui/material'
import { Typography } from './ui'

/**
 * Reusable card that shows: label (e.g. "Atleta seleccionado:"), athlete name,
 * date-of-birth chip, and club chip.
 *
 * Props:
 *  - athlete       {object}  — the athlete object (nombre, fecha_nacimiento, club)
 *  - label         {string}  — subtitle label above the name
 *  - error         {bool}    — if true, colours the card in error palette
 */
function SelectedAthleteCard({ athlete, label = 'Atleta seleccionado:', error = false }) {
    if (!athlete) return null

    const bgColor = error ? 'error.light' : 'primary.light'
    const chipColor = error ? 'error.main' : 'primary.main'

    return (
        <Card sx={{ bgcolor: bgColor }}>
            <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ color: error ? 'error.contrastText' : 'primary.contrastText' }}>
                    {label}
                </Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ mb: 1, color: error ? 'error.contrastText' : 'primary.contrastText' }}>
                    {athlete.nombre}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {athlete.fecha_nacimiento && (
                        <Chip
                            label={dayjs(athlete.fecha_nacimiento).format('DD/MM/YYYY')}
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: 'white', color: chipColor }}
                        />
                    )}
                    {athlete.club && athlete.club !== 'N/A' && athlete.club !== 'Sin club' && (
                        <Chip
                            label={athlete.club}
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: 'white', color: chipColor }}
                        />
                    )}
                </Box>
            </CardContent>
        </Card>
    )
}

export default SelectedAthleteCard
