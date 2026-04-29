import { Box, FormControl, MenuItem, Select, Typography } from '@mui/material'
import { TbChevronDown } from 'react-icons/tb'

function ChartHeader({ selectedPrueba, pruebasDisponibles, onPruebaChange }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
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
  )
}

export default ChartHeader
