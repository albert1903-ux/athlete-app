import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AddMeasurementDialog from '../components/AddMeasurementDialog'
import ViewMeasurementsDialog from '../components/ViewMeasurementsDialog'
import AthleteHeightWeightScatter from '../components/AthleteHeightWeightScatter'
import AthleteBodyMeasurementsChart from '../components/AthleteBodyMeasurementsChart'

const AnalisisPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const handleDialogClose = () => {
    setDialogOpen(false)
  }

  const handleViewDialogClose = () => {
    setViewDialogOpen(false)
  }

  // Escuchar eventos desde el header
  useEffect(() => {
    const handleOpenAddMeasurement = () => {
      setDialogOpen(true)
    }

    const handleOpenViewMeasurements = () => {
      setViewDialogOpen(true)
    }

    window.addEventListener('openAddMeasurementDialog', handleOpenAddMeasurement)
    window.addEventListener('openViewMeasurementsDialog', handleOpenViewMeasurements)

    return () => {
      window.removeEventListener('openAddMeasurementDialog', handleOpenAddMeasurement)
      window.removeEventListener('openViewMeasurementsDialog', handleOpenViewMeasurements)
    }
  }, [])

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

