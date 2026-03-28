import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  Typography,
  useTheme
} from '@mui/material'
import { TbChevronDown } from 'react-icons/tb'
import { PiRanking } from 'react-icons/pi'
import { getColorForAthlete } from '../../utils/athleteColors'
import { formatValue } from '../../utils/pruebaUtils'

function PruebaResultsAccordion({
  radarData,
  allAthletes,
  selectedAthlete,
  selectedCategory,
  athleteData,
  athleteColors,
  onOpenRanking
}) {
  const theme = useTheme()

  return (
    <Accordion
      disableGutters
      sx={{
        borderRadius: '20px !important',
        bgcolor: 'action.hover',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        '&.Mui-expanded': { margin: 0, borderRadius: '20px !important' }
      }}
    >
      <AccordionSummary
        expandIcon={
          <Box
            sx={{
              bgcolor: 'transparent',
              borderRadius: '50%',
              border: 2,
              borderColor: 'text.primary',
              display: 'flex',
              p: 0.5,
              color: 'text.primary'
            }}
          >
            <TbChevronDown size={14} color="currentColor" />
          </Box>
        }
        sx={{ px: 3, minHeight: '60px', '& .MuiAccordionSummary-content': { margin: '16px 0' } }}
      >
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'text.primary' }}>
          Mejores Resultados por Prueba
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
        {radarData.map((entry, idx) => (
          <Box
            key={idx}
            sx={{
              mt: 1,
              p: 1.5,
              bgcolor: 'background.paper',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="body2" fontWeight="bold" color="text.primary">
                {entry.prueba} {entry.unidad && `(${entry.unidad})`}
              </Typography>
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenRanking(entry.prueba, selectedCategory)
                }}
                title="Ver Ranking Top 50"
                sx={{
                  transition: 'background-color 0.2s',
                  bgcolor: 'action.selected',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <PiRanking size={18} />
              </IconButton>
            </Box>

            {allAthletes.map((athlete) => {
              const atletaIdKey = String(athlete.atleta_id)
              const valorReal = entry[`${atletaIdKey}_real`]
              const unidadReal = entry[`${atletaIdKey}_unidad`]

              if (valorReal === undefined || valorReal === null) {
                return (
                  <Typography
                    key={athlete.atleta_id}
                    variant="caption"
                    sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic', ml: 1 }}
                  >
                    {athlete.nombre}: -
                  </Typography>
                )
              }

              const isTimeBased =
                athleteData[atletaIdKey]?.categorias?.[selectedCategory]?.pruebas?.[entry.prueba]
                  ?.isTimeBased ?? true
              const valorFormateado = formatValue(valorReal, unidadReal, isTimeBased)
              const isMain = athlete.atleta_id === selectedAthlete?.atleta_id
              const color =
                athleteColors[athlete.atleta_id] ||
                getColorForAthlete(athlete.atleta_id, isMain, theme.palette.primary.main) ||
                'text.primary'

              return (
                <Typography
                  key={athlete.atleta_id}
                  variant="caption"
                  sx={{ display: 'block', color, fontWeight: 'bold', ml: 1 }}
                >
                  {athlete.nombre}:{' '}
                  <span style={{ fontWeight: 'normal', color: 'text.primary' }}>
                    {valorFormateado} {unidadReal || ''}
                  </span>
                </Typography>
              )
            })}
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  )
}

export default PruebaResultsAccordion
