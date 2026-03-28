import { Autocomplete, CircularProgress, Stack } from '@mui/material'
import { Input } from '../ui'

function PruebaCategoriaFields({
  pruebaValue,
  onPruebaChange,
  filteredPruebas,
  pruebaFilter,
  pruebaInputValue,
  onPruebaInputChange,
  optionsLoading,
  categoriaValue,
  onCategoriaChange,
  categorias
}) {
  return (
    <Stack spacing={2}>
      <Autocomplete
        value={pruebaValue}
        onChange={(_, newValue) => onPruebaChange(newValue)}
        options={filteredPruebas}
        loading={optionsLoading}
        filterOptions={pruebaFilter}
        inputValue={pruebaInputValue}
        onInputChange={(_, value) => onPruebaInputChange(value)}
        getOptionLabel={(option) => option?.nombre || ''}
        isOptionEqualToValue={(option, value) => option?.prueba_id === value?.prueba_id}
        renderInput={(params) => (
          <Input
            {...params}
            label="Prueba disputada"
            required
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {optionsLoading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
      />

      <Autocomplete
        value={categoriaValue}
        onChange={(_, newValue) => onCategoriaChange(newValue)}
        options={categorias}
        loading={optionsLoading}
        getOptionLabel={(option) => option?.nombre || ''}
        isOptionEqualToValue={(option, value) => option?.categoria_id === value?.categoria_id}
        renderInput={(params) => (
          <Input
            {...params}
            label="Categoría"
            required
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {optionsLoading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
      />
    </Stack>
  )
}

export default PruebaCategoriaFields
