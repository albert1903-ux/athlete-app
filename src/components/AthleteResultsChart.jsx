import { useState, useMemo } from 'react'
import { Box, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material'
import { initializeColorsForComparators } from '../utils/athleteColors'
import { useSelectedAthlete } from '../store/selectedAthleteStore'
import { useAthleteResultsChartData } from '../hooks/useAthleteResultsChartData'
import { useComparatorChartData } from '../hooks/useComparatorChartData'
import { useCombinedChartData } from '../hooks/useCombinedChartData'
import { useChartDimensions } from '../hooks/useChartDimensions'
import { useChartBrush } from '../hooks/useChartBrush'
import ChartHeader from './AthleteResultsChart/ChartHeader'
import ViewModeToggle from './AthleteResultsChart/ViewModeToggle'
import ResultsLineChart from './AthleteResultsChart/ResultsLineChart'

function AthleteResultsChart({ comparatorAthletes = [] }) {
  const selectedAthlete = useSelectedAthlete()
  const [viewMode, setViewMode] = useState('fecha')

  const { loading, error, allPruebasData, chartData, selectedPrueba, setSelectedPrueba } =
    useAthleteResultsChartData({
      atletaId: selectedAthlete?.atleta_id ?? null,
      primaryColor: null
    })

  const { comparatorData } = useComparatorChartData({ comparatorAthletes })

  const { combinedChartData } = useCombinedChartData({
    chartData,
    comparatorAthletes,
    comparatorData,
    selectedPrueba,
    viewMode
  })

  const { width: chartWidth } = useChartDimensions()

  const { activeRange, filteredData, hasRangeControls, handleRangeButton } =
    useChartBrush(combinedChartData, viewMode, selectedPrueba)

  const athleteColors = useMemo(() => {
    if (comparatorAthletes.length === 0) return {}
    const colorMap = initializeColorsForComparators(comparatorAthletes)
    const result = {}
    colorMap.forEach((color, atletaId) => { result[atletaId] = color })
    return result
  }, [comparatorAthletes])

  const pruebasDisponibles = useMemo(
    () => Object.keys(allPruebasData).length > 0
      ? Object.values(allPruebasData).map((grupo) => grupo.name)
      : [],
    [allPruebasData]
  )

  const handlePruebaChange = (_event, newPrueba) => {
    const valor = newPrueba ?? _event?.target?.value ?? null
    if (valor !== null && valor !== undefined && valor !== '') {
      setSelectedPrueba(valor)
    }
  }

  if (!selectedAthlete) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Selecciona un atleta para ver sus resultados
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (!chartData.datos || chartData.datos.length === 0) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
            Resultados de {selectedAthlete.nombre}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No se encontraron resultados para este atleta
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <ChartHeader
        selectedPrueba={selectedPrueba}
        pruebasDisponibles={pruebasDisponibles}
        onPruebaChange={handlePruebaChange}
      />
      <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      <ResultsLineChart
        combinedChartData={filteredData}
        chartData={chartData}
        chartWidth={chartWidth}
        viewMode={viewMode}
        selectedPrueba={selectedPrueba}
        selectedAthlete={selectedAthlete}
        comparatorAthletes={comparatorAthletes}
        comparatorData={comparatorData}
        athleteColors={athleteColors}
        activeRange={activeRange}
        onRangeChange={handleRangeButton}
        hasRangeControls={hasRangeControls}
      />
    </Box>
  )
}

export default AthleteResultsChart
