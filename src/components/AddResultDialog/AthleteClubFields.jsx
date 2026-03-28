import { Autocomplete, CircularProgress, Stack } from '@mui/material'
import { Input } from '../ui'

function AthleteClubFields({
  atletaValue,
  onAthleteChange,
  atletas,
  athleteSearchLoading,
  optionsLoading,
  atletaInputValue,
  onAtletaInputChange,
  clubValue,
  onClubChange,
  clubes,
  autoAssigning
}) {
  return (
    <Stack spacing={2}>
      <Autocomplete
        value={atletaValue}
        onChange={onAthleteChange}
        options={atletas}
        loading={optionsLoading || athleteSearchLoading}
        inputValue={atletaInputValue}
        onInputChange={(_, value) => onAtletaInputChange(value)}
        filterOptions={(opts) => opts}
        getOptionLabel={(option) =>
          option?.nombre
            ? `${option.nombre}${option.licencia ? ` · ${option.licencia}` : ''}`
            : ''
        }
        isOptionEqualToValue={(option, value) => option?.atleta_id === value?.atleta_id}
        renderInput={(params) => (
          <Input
            {...params}
            label="Nombre del atleta"
            required
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {athleteSearchLoading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
      />

      <Autocomplete
        value={clubValue}
        onChange={(_, newValue) => onClubChange(newValue)}
        options={clubes}
        loading={optionsLoading || autoAssigning}
        getOptionLabel={(option) => option?.nombre || ''}
        isOptionEqualToValue={(option, value) => option?.club_id === value?.club_id}
        renderInput={(params) => (
          <Input
            {...params}
            label="Club"
            required
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {(optionsLoading || autoAssigning) ? <CircularProgress size={20} /> : null}
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

export default AthleteClubFields
