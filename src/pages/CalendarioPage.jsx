import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EventIcon from '@mui/icons-material/Event'
import SportsIcon from '@mui/icons-material/Sports'

const CalendarioPage = () => {
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
        <Typography variant="h5" component="h1" sx={{ mb: 1, fontWeight: 600 }}>
          Calendario
        </Typography>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <EventIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6">Eventos y Competiciones</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Visualiza y gestiona los eventos deportivos, competiciones y fechas importantes.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CalendarMonthIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6">Planificación</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Organiza sesiones de entrenamiento, pruebas y seguimientos programados.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <SportsIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6">Sesiones Deportivas</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Consulta el calendario de sesiones deportivas y actividades planificadas.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default CalendarioPage

