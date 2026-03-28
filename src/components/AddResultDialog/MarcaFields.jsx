import { MenuItem, Stack } from '@mui/material'
import { Input } from '../ui'

const GENERO_OPTIONS = [
  { value: 'MASC', label: 'Masculino' },
  { value: 'FEM', label: 'Femenino' },
  { value: 'MIXTO', label: 'Mixto' }
]

const SUPERFICIE_OPTIONS = [
  { value: 'AL', label: 'Aire libre (AL)' },
  { value: 'PC', label: 'Pista cubierta (PC)' },
  { value: 'RT', label: 'Ruta' },
  { value: 'OT', label: 'Otra' }
]

function MarcaFields({
  fecha,
  onFechaChange,
  genero,
  onGeneroChange,
  superficie,
  onSuperficieChange,
  marcaTexto,
  onMarcaTextoChange
}) {
  return (
    <Stack spacing={2}>
      <Input
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(event) => onFechaChange(event.target.value)}
        required
        InputLabelProps={{ shrink: true }}
        fullWidth
      />

      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <Input
          label="Género"
          select
          value={genero}
          onChange={(event) => onGeneroChange(event.target.value)}
          required
          fullWidth
        >
          {GENERO_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Input>

        <Input
          label="Superficie"
          select
          value={superficie}
          onChange={(event) => onSuperficieChange(event.target.value)}
          required
          fullWidth
        >
          {SUPERFICIE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Input>
      </Stack>

      <Input
        label="Marca (texto oficial)"
        value={marcaTexto}
        onChange={(event) => onMarcaTextoChange(event.target.value)}
        placeholder="Ej. 2:11.96 o 11.23"
        helperText="Se calculará automáticamente el valor numérico para almacenar en la base de datos."
        required
        fullWidth
      />
    </Stack>
  )
}

export default MarcaFields
