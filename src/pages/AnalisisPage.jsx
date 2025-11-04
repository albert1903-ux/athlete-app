import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import BarChartIcon from '@mui/icons-material/BarChart'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AddMeasurementDialog from '../components/AddMeasurementDialog'
import ViewMeasurementsDialog from '../components/ViewMeasurementsDialog'
import AthleteHeightWeightScatter from '../components/AthleteHeightWeightScatter'
import AthleteBodyMeasurementsChart from '../components/AthleteBodyMeasurementsChart'

const AnalisisPage = () => {
  const [anchorEl, setAnchorEl] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const open = Boolean(anchorEl)

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleAddMeasurement = () => {
    handleClose()
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
  }

  const handleViewMeasurements = () => {
    handleClose()
    setViewDialogOpen(true)
  }

  const handleViewDialogClose = () => {
    setViewDialogOpen(false)
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
            Análisis Físico
          </Typography>
          <IconButton
            onClick={handleClick}
            sx={{ color: 'text.primary' }}
            aria-label="menú de opciones"
            aria-controls={open ? 'menu-analisis' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="menu-analisis"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'menu-analisis',
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
            <MenuItem onClick={handleAddMeasurement}>
              Añadir nueva medición
            </MenuItem>
            <MenuItem onClick={handleViewMeasurements}>
              Visualizar mediciones
            </MenuItem>
          </Menu>
        </Box>

        {/* Gráfico de evolución de medidas corporales */}
        <AthleteBodyMeasurementsChart />

        {/* Gráfico de dispersión Altura-Peso */}
        <AthleteHeightWeightScatter />          
      </Box>

      {/* Diálogo para añadir mediciones */}
      <AddMeasurementDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogClose}
      />

      {/* Diálogo para visualizar mediciones */}
      <ViewMeasurementsDialog
        open={viewDialogOpen}
        onClose={handleViewDialogClose}
      />
    </Box>
  )
}

export default AnalisisPage

