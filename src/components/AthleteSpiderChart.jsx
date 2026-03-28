import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem
} from '@mui/material'
import { TbChevronDown } from 'react-icons/tb'
import { useTheme } from '@mui/material'
import { initializeColorsForComparators, getColorForAthlete } from '../utils/athleteColors'
import { normalizePruebaNombre } from '../utils/pruebaUtils'
import { useAthletesComparison } from '../hooks/useAthletesComparison'
import { usePruebaMetrics } from '../hooks/usePruebaMetrics'
import { useAvailableCategories } from '../hooks/useAvailableCategories'
import { useRadarChartData } from '../hooks/useRadarChartData'
import { useChartDimensions } from '../hooks/useChartDimensions'
import RankingDialog from './RankingDialog'
import RadarChartDisplay from './AthleteSpiderChart/RadarChartDisplay'
import PruebaResultsAccordion from './AthleteSpiderChart/PruebaResultsAccordion'
import { useSelectedAthlete, setSelectedAthlete } from '../store/selectedAthleteStore'
import { getComparatorCache, setComparatorCache } from '../store/comparatorStore'

function AthleteSpiderChart({ comparatorAthletes = [] }) {
  const theme = useTheme()
  const selectedAthlete = useSelectedAthlete()

  const { athleteData, categoryLabels, loading: dataLoading, error: dataError } =
    useAthletesComparison(selectedAthlete, comparatorAthletes)
  const { referenceMaxByPrueba, loading: metricsLoading } = usePruebaMetrics()

  const loading = dataLoading || metricsLoading
  const error = dataError

  const { availableCategories, selectedCategory, setSelectedCategory, allPruebas } =
    useAvailableCategories({ athleteData, selectedAthlete, categoryLabels })

  const allAthletes = useMemo(() => {
    if (!selectedAthlete) return []
    return [selectedAthlete, ...comparatorAthletes]
  }, [selectedAthlete, comparatorAthletes])

  const { radarData } = useRadarChartData({
    allPruebas,
    athleteData,
    allAthletes,
    selectedCategory,
    referenceMaxByPrueba
  })

  const { width, height } = useChartDimensions()

  const [rankingDialogState, setRankingDialogState] = useState({
    open: false,
    prueba: null,
    categoria: null
  })

  const selectedAthleteGender = useMemo(() => {
    if (!selectedAthlete || !athleteData) return null
    const data = athleteData[String(selectedAthlete.atleta_id)]
    if (data?.categorias) {
      for (const catKey in data.categorias) {
        const pruebas = data.categorias[catKey].pruebas
        for (const pruebaKey in pruebas) {
          const resultados = pruebas[pruebaKey].resultados
          if (resultados?.[0]?.genero) return resultados[0].genero
        }
      }
    }
    return null
  }, [selectedAthlete, athleteData])

  const athleteColors = useMemo(() => {
    const colorMap = {}
    if (selectedAthlete) {
      colorMap[selectedAthlete.atleta_id] = getColorForAthlete(
        selectedAthlete.atleta_id, true, theme.palette.primary.main
      )
    }
    if (comparatorAthletes.length > 0) {
      initializeColorsForComparators(comparatorAthletes).forEach((color, atletaId) => {
        colorMap[atletaId] = color
      })
    }
    return colorMap
  }, [selectedAthlete, comparatorAthletes, theme])

  const handleOpenRanking = (prueba, categoriaId) => {
    const catInfo = athleteData[String(selectedAthlete.atleta_id)]?.categorias?.[categoriaId] || {
      label: categoryLabels[categoriaId] || 'Categoría'
    }

    let foundPruebaId = null
    let foundIsTimeBased = true

    const athleteKey = String(selectedAthlete.atleta_id)
    const pruebaData = athleteData[athleteKey]?.categorias?.[categoriaId]?.pruebas?.[prueba]
    if (pruebaData) {
      foundPruebaId =
        pruebaData.pruebaId || pruebaData.prueba_id ||
        pruebaData.resultado?.prueba_id || pruebaData.resultado?.pruebaId
      if (pruebaData.isTimeBased !== undefined) foundIsTimeBased = pruebaData.isTimeBased
    }

    if (!foundPruebaId && comparatorAthletes.length > 0) {
      for (const comp of comparatorAthletes) {
        const pData = athleteData[String(comp.atleta_id)]?.categorias?.[categoriaId]?.pruebas?.[prueba]
        if (pData) {
          foundPruebaId =
            pData.pruebaId || pData.prueba_id ||
            pData.resultado?.prueba_id || pData.resultado?.pruebaId
          if (pData.isTimeBased !== undefined) foundIsTimeBased = pData.isTimeBased
          break
        }
      }
    }

    if (!foundPruebaId) {
      const ref = referenceMaxByPrueba[prueba] || referenceMaxByPrueba[normalizePruebaNombre(prueba)]
      if (ref?.pruebaId) foundPruebaId = ref.pruebaId
    }

    if (foundPruebaId) {
      setRankingDialogState({
        open: true,
        prueba: { nombre: prueba, pruebaId: foundPruebaId, isTimeBased: foundIsTimeBased },
        categoria: {
          categoriaId: catInfo?.categoriaId || categoriaId,
          label: catInfo.label || categoryLabels[categoriaId] || String(categoriaId)
        }
      })
    } else {
      console.warn('No se pudo encontrar ID para la prueba:', prueba)
    }
  }

  if (!selectedAthlete) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Selecciona un atleta para ver el gráfico de araña
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

  if (radarData.length === 0) {
    return (
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ px: { xs: 2 }, py: { xs: 2 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem' } }}>
            Gráfico de Araña - Mejores Resultados
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No se encontraron resultados suficientes para generar el gráfico
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '20px', mb: 0, color: 'text.primary' }}
        >
          Mejores Marcas
        </Typography>

        {availableCategories.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedCategory || ''}
              onChange={(event) => setSelectedCategory(event.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) return 'Categoría'
                return categoryLabels[selected] || selected
              }}
              sx={{
                borderRadius: '20px',
                bgcolor: 'action.hover',
                border: 'none',
                fontWeight: 'medium',
                color: 'text.primary',
                px: 1,
                py: 0.5,
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover': { bgcolor: 'action.selected' },
                '& .MuiSelect-select': { py: 0.5, pr: '32px !important' },
                boxShadow: 'none'
              }}
              IconComponent={(props) => (
                <Box
                  {...props}
                  sx={{
                    ...props.sx,
                    right: '10px !important',
                    top: '0 !important',
                    bottom: '0 !important',
                    height: '100%',
                    display: 'flex !important',
                    alignItems: 'center'
                  }}
                >
                  <TbChevronDown size={20} color="#000" />
                </Box>
              )}
            >
              {(() => {
                const getRank = (key) => {
                  const label = categoryLabels[key] || key
                  const match = /\d+/.exec(label)
                  return match ? parseInt(match[0], 10) : -Infinity
                }
                return [...availableCategories]
                  .sort((a, b) => {
                    const ra = getRank(a)
                    const rb = getRank(b)
                    if (rb !== ra) return rb - ra
                    return (categoryLabels[b] || b).toString().localeCompare(
                      (categoryLabels[a] || a).toString(), 'es', { sensitivity: 'base' }
                    )
                  })
                  .map((categoriaKey) => (
                    <MenuItem key={categoriaKey} value={categoriaKey}>
                      {categoryLabels[categoriaKey] || categoriaKey}
                    </MenuItem>
                  ))
              })()}
            </Select>
          </FormControl>
        )}
      </Box>

      <RadarChartDisplay
        radarData={radarData}
        allAthletes={allAthletes}
        selectedAthlete={selectedAthlete}
        athleteColors={athleteColors}
        width={width}
        height={height}
        athleteData={athleteData}
        selectedCategory={selectedCategory}
      />

      <PruebaResultsAccordion
        radarData={radarData}
        allAthletes={allAthletes}
        selectedAthlete={selectedAthlete}
        selectedCategory={selectedCategory}
        athleteData={athleteData}
        athleteColors={athleteColors}
        onOpenRanking={handleOpenRanking}
      />

      <RankingDialog
        open={rankingDialogState.open}
        onClose={() => setRankingDialogState((prev) => ({ ...prev, open: false }))}
        prueba={rankingDialogState.prueba}
        categoria={rankingDialogState.categoria}
        mainAthleteId={selectedAthlete?.atleta_id || null}
        comparatorAthletes={comparatorAthletes}
        genderFilter={selectedAthleteGender}
        onAthleteSelect={(athlete) => {
          setSelectedAthlete(athlete)
          setRankingDialogState((prev) => ({ ...prev, open: false }))
        }}
        onAthleteCompare={(athlete) => {
          const current = getComparatorCache()
          if (!current.some((c) => c.atleta_id === athlete.atleta_id)) {
            setComparatorCache([...current, athlete])
            setRankingDialogState((prev) => ({ ...prev, open: false }))
          }
        }}
      />
    </Box>
  )
}

export default AthleteSpiderChart
