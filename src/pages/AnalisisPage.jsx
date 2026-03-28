import Box from '@mui/material/Box'

import AddMeasurementDialog from '../components/AddMeasurementDialog'
import ViewMeasurementsDialog from '../components/ViewMeasurementsDialog'
import AthleteHeightWeightScatter from '../components/AthleteHeightWeightScatter'
import AthleteBodyMeasurementsChart from '../components/AthleteBodyMeasurementsChart'
import { useUI } from '../context/UIContext'

const AnalisisPage = () => {
  const {
    addMeasurementOpen, setAddMeasurementOpen,
    viewMeasurementsOpen, setViewMeasurementsOpen,
  } = useUI()

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

      <AddMeasurementDialog
        open={addMeasurementOpen}
        onClose={() => setAddMeasurementOpen(false)}
        onSuccess={() => setAddMeasurementOpen(false)}
      />

      <ViewMeasurementsDialog
        open={viewMeasurementsOpen}
        onClose={() => setViewMeasurementsOpen(false)}
      />
    </Box>
  )
}

export default AnalisisPage

