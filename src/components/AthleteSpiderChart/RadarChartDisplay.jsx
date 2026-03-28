import { useMemo } from 'react'
import { Box, Card, CardContent, CircularProgress, Paper, Typography, useTheme } from '@mui/material'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts'
import { getColorForAthlete } from '../../utils/athleteColors'
import { formatValue } from '../../utils/pruebaUtils'

function RadarChartDisplay({
  radarData,
  allAthletes,
  selectedAthlete,
  athleteColors,
  width,
  height,
  athleteData,
  selectedCategory
}) {
  const theme = useTheme()

  const CustomTooltip = useMemo(() => {
    return ({ active, payload }) => {
      if (active && payload && payload.length) {
        const prueba = payload[0]?.payload?.prueba || ''
        const unidad = payload[0]?.payload?.unidad || ''

        return (
          <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }} elevation={3}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {prueba}
            </Typography>
            {payload.map((entry, index) => {
              if (entry.value === null || entry.value === undefined) return null

              const atletaId = String(entry.dataKey)
              const athlete = allAthletes.find((a) => String(a.atleta_id) === atletaId)
              if (!athlete) return null

              const valorReal = entry.payload[`${atletaId}_real`]
              const unidadReal = entry.payload[`${atletaId}_unidad`] || unidad
              if (valorReal === undefined || valorReal === null) return null

              const isTimeBased =
                athleteData[atletaId]?.categorias?.[selectedCategory]?.pruebas?.[prueba]
                  ?.isTimeBased ?? true
              const valorFormateado = formatValue(valorReal, unidadReal, isTimeBased)

              return (
                <Typography key={index} variant="body2" sx={{ color: entry.color }}>
                  {athlete.nombre}: {valorFormateado} {unidadReal || ''}
                </Typography>
              )
            })}
          </Paper>
        )
      }
      return null
    }
  }, [allAthletes, athleteData, selectedCategory])

  return (
    <Card
      sx={{
        width: '100%',
        bgcolor: 'action.hover',
        borderRadius: '20px',
        boxShadow: 'none',
        overflow: 'visible'
      }}
    >
      <CardContent
        sx={{
          px: { xs: 1, sm: 2 },
          py: { xs: 2, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {width > 0 && height > 0 ? (
          <Box sx={{ width: '100%', height, display: 'flex', justifyContent: 'center' }}>
            <RadarChart width={width} height={height} data={radarData}>
              <PolarGrid stroke="#d1d1d1" />
              <PolarAngleAxis
                dataKey="prueba"
                tick={{ fontSize: 12, fill: theme.palette?.text?.primary || '#333333' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: theme.palette?.text?.secondary || '#555555' }}
                axisLine={false}
              />
              <Tooltip content={CustomTooltip} />
              <Legend iconType="circle" wrapperStyle={{ color: 'text.primary', paddingTop: '20px' }} />
              {allAthletes.map((athlete) => {
                const atletaIdKey = String(athlete.atleta_id)
                const isMain = athlete.atleta_id === selectedAthlete?.atleta_id
                const color =
                  athleteColors[athlete.atleta_id] ||
                  getColorForAthlete(athlete.atleta_id, isMain, theme.palette.primary.main) ||
                  '#8884d8'
                return (
                  <Radar
                    key={athlete.atleta_id}
                    name={athlete.nombre}
                    dataKey={atletaIdKey}
                    stroke={color}
                    fill={color}
                    fillOpacity={isMain ? 0.5 : 0.15}
                    connectNulls
                    isAnimationActive={false}
                  />
                )
              })}
            </RadarChart>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <CircularProgress />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default RadarChartDisplay
