import { Box, FormControl, MenuItem, Select, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { TbChevronDown } from 'react-icons/tb'

const RANGES = ['1M', '3M', '6M', '1A', 'Todo']

function ChartHeader({ selectedPrueba, pruebasDisponibles, onPruebaChange, activeRange, onRangeChange, viewMode, hasBrush }) {
  return (
    <Box sx={{ mb: 2, px: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: hasBrush && viewMode === 'fecha' ? 1.5 : 0 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '20px', color: 'text.primary' }}
        >
          Evolución de Marcas
        </Typography>

        {pruebasDisponibles.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={selectedPrueba || ''}
              onChange={(event) => onPruebaChange(event, event.target.value)}
              displayEmpty
              renderValue={(selected) => selected || 'Prueba'}
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
              {pruebasDisponibles.map((pruebaNombre) => (
                <MenuItem key={pruebaNombre} value={pruebaNombre}>
                  {pruebaNombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {hasBrush && viewMode === 'fecha' && (
        <ToggleButtonGroup
          value={activeRange}
          exclusive
          onChange={(_, val) => { if (val !== null) onRangeChange(val) }}
          size="small"
          sx={{ gap: 0.5 }}
        >
          {RANGES.map(r => (
            <ToggleButton
              key={r}
              value={r}
              sx={{
                px: 1.5,
                py: 0.25,
                fontSize: '0.72rem',
                fontWeight: 500,
                borderRadius: '12px !important',
                border: '1px solid',
                borderColor: 'divider',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' }
                }
              }}
            >
              {r}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    </Box>
  )
}

export default ChartHeader
