import { useMemo } from 'react'
import { Box, Card, CardContent, CircularProgress, Paper, Typography, useTheme } from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush
} from 'recharts'
import { getColorForAthlete } from '../../utils/athleteColors'

const formatTiempo = (segundos, unidad) => {
  if (segundos === null || segundos === undefined || isNaN(segundos)) return ''
  const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
  const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'
  if (!esSegundos) {
    return segundos % 1 === 0 ? segundos.toString() : segundos.toFixed(2)
  }
  if (segundos >= 60) {
    const minutos = Math.floor(segundos / 60)
    const segundosRestantes = segundos % 60
    return `${minutos}:${segundosRestantes.toFixed(2).padStart(5, '0')}`
  }
  return segundos.toFixed(2)
}

function ResultsLineChart({
  combinedChartData,
  chartData,
  chartWidth,
  viewMode,
  selectedPrueba,
  selectedAthlete,
  comparatorAthletes,
  comparatorData,
  athleteColors,
  brushRange,
  onBrushChange,
  hasBrush
}) {
  const theme = useTheme()
  const unidad = chartData.pruebas?.[0]?.unidad || ''
  const primaryColor = chartData.pruebas?.[0]?.color || theme.palette.primary.main

  const CustomTooltip = useMemo(() => {
    return ({ active, payload, label }) => {
      if (!active || !payload || !payload.length) return null
      const unidadLower = unidad ? unidad.toLowerCase().trim() : ''
      const esSegundos = unidadLower === 's' || unidadLower === 'seg' || unidadLower === 'segundos'
      const textoUnidad = esSegundos ? '' : (unidad ? ` ${unidad}` : '')
      const dataPoint = payload[0]?.payload
      const mostrarFecha = dataPoint?.fecha || label
      const mostrarEdad = dataPoint?.edad !== null && dataPoint?.edad !== undefined
        ? `${dataPoint.edad.toFixed(1)} años`
        : null

      return (
        <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }} elevation={3}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {viewMode === 'edad' ? mostrarEdad || label : mostrarFecha}
          </Typography>
          {viewMode === 'edad' && mostrarFecha && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              {mostrarFecha}
            </Typography>
          )}
          {viewMode === 'fecha' && mostrarEdad && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Edad: {mostrarEdad}
            </Typography>
          )}
          {payload.map((entry, index) => {
            if (entry.value === null || entry.value === undefined) return null
            if (entry.dataKey === 'sma') {
              return (
                <Typography key={index} variant="body2" sx={{ color: entry.color, fontStyle: 'italic' }}>
                  {entry.name}: {formatTiempo(entry.value, unidad)}{textoUnidad}
                </Typography>
              )
            }
            return (
              <Typography key={index} variant="body2" sx={{ color: entry.color }}>
                {entry.name}: {formatTiempo(entry.value, unidad)}{textoUnidad}
              </Typography>
            )
          })}
        </Paper>
      )
    }
  }, [unidad, viewMode])

  if (!combinedChartData || combinedChartData.length === 0) {
    if (selectedPrueba) {
      return (
        <Card sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: '20px', boxShadow: 'none' }}>
          <CardContent sx={{ px: { xs: 2 }, py: { xs: 3 } }}>
            <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" align="center">
                No hay datos disponibles para esta prueba
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  const chartHeight = hasBrush ? 360 : 300

  return (
    <Card sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: '20px', boxShadow: 'none' }}>
      <CardContent sx={{ px: { xs: 2 }, py: { xs: 3 } }}>
        {chartWidth > 0 ? (
          <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <LineChart
              width={chartWidth}
              height={chartHeight}
              data={combinedChartData}
              margin={{ top: 5, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d1d1" vertical={false} />
              <XAxis
                dataKey={viewMode === 'edad' ? 'edad' : 'fecha'}
                angle={viewMode === 'edad' ? 0 : -45}
                textAnchor={viewMode === 'edad' ? 'middle' : 'end'}
                height={viewMode === 'edad' ? 40 : 80}
                interval="preserveStartEnd"
                tick={{ fontSize: 10, fill: theme.palette?.text?.secondary || '#666' }}
                tickLine={false}
                axisLine={{ stroke: theme.palette?.divider || '#999' }}
                padding={{ left: 10, right: 30 }}
                label={{
                  value: viewMode === 'edad' ? 'Edad (años)' : '',
                  position: 'insideBottom',
                  offset: -5,
                  style: { textAnchor: 'middle', fontSize: '10px', fill: theme.palette?.text?.secondary || '#666' }
                }}
                tickFormatter={(value) =>
                  viewMode === 'edad' && typeof value === 'number' ? value.toFixed(1) : value
                }
              />
              <YAxis
                label={{
                  value: unidad ? `Valor (${unidad})` : 'Valor',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '10px', fill: theme.palette?.text?.secondary || '#666' }
                }}
                tick={{ fontSize: 10, fill: theme.palette?.text?.secondary || '#666' }}
                tickLine={false}
                axisLine={{ stroke: theme.palette?.divider || '#999' }}
                tickFormatter={(value) => formatTiempo(value, unidad)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', color: 'text.primary' }} />

              {chartData.pruebas && chartData.pruebas.length > 0 ? (
                chartData.pruebas.map((prueba, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey="marca"
                    stroke={prueba.color || theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                    name={selectedAthlete?.nombre || 'Atleta Principal'}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="marca"
                  stroke={theme.palette.primary.main}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls
                  name={selectedAthlete?.nombre || 'Atleta Principal'}
                />
              )}

              {hasBrush && (
                <Line
                  type="monotone"
                  dataKey="sma"
                  stroke={primaryColor}
                  strokeWidth={1.5}
                  strokeOpacity={0.55}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  name="Media móvil"
                />
              )}

              {comparatorAthletes.map((athlete) => {
                const compData = comparatorData[athlete.atleta_id]
                if (!compData || !compData[selectedPrueba]) return null
                const atletaDataKey = `marca_comp_${athlete.atleta_id}`
                const athleteColor =
                  athleteColors[athlete.atleta_id] ||
                  getColorForAthlete(athlete.atleta_id, false, theme.palette.primary.main) ||
                  theme.palette.primary.main
                return (
                  <Line
                    key={`comp_${athlete.atleta_id}`}
                    type="monotone"
                    dataKey={atletaDataKey}
                    stroke={athleteColor}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, strokeWidth: 1, fill: '#fff' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                    name={athlete.nombre}
                  />
                )
              })}

              {hasBrush && (
                <Brush
                  dataKey={viewMode === 'edad' ? 'edad' : 'fecha'}
                  startIndex={brushRange.startIndex}
                  endIndex={brushRange.endIndex}
                  onChange={onBrushChange}
                  height={28}
                  travellerWidth={8}
                  stroke={theme.palette?.divider || '#ccc'}
                  fill={theme.palette?.background?.paper || '#fff'}
                  tickFormatter={(value) =>
                    viewMode === 'edad' && typeof value === 'number' ? value.toFixed(1) : value
                  }
                />
              )}
            </LineChart>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <CircularProgress />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ResultsLineChart
