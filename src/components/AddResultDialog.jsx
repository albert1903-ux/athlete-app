import { useEffect, useMemo, useState, useCallback } from 'react'
import { Alert, Stack, Divider } from '@mui/material'
import { createFilterOptions } from '@mui/material/Autocomplete'
import dayjs from 'dayjs'
import { TbX, TbCheck, TbCircuitCapacitorPolarized } from 'react-icons/tb'
import { Modal, Button, Typography } from './ui'
import { useFormOptions } from '../hooks/useFormOptions'
import { useAthleteSearch } from '../hooks/useAthleteSearch'
import { useAutoAssignClub } from '../hooks/useAutoAssignClub'
import { useResultSubmit } from '../hooks/useResultSubmit'
import AthleteClubFields from './AddResultDialog/AthleteClubFields'
import PruebaCategoriaFields from './AddResultDialog/PruebaCategoriaFields'
import MarcaFields from './AddResultDialog/MarcaFields'

const initialFormState = {
  atleta: null,
  club: null,
  prueba: null,
  categoria: null,
  fecha: '',
  anio: '',
  mes: '',
  genero: 'MASC',
  superficie: 'AL',
  unidad: '',
  marcaTexto: '',
  marcaValor: ''
}

const convertMarcaTextoToValor = (texto) => {
  if (!texto) return null
  const clean = texto.trim().replace(',', '.')
  if (!clean) return null

  if (!clean.includes(':')) {
    const numeric = Number(clean)
    return Number.isNaN(numeric) ? null : numeric
  }

  const parts = clean.split(':')
  let total = 0
  for (let index = 0; index < parts.length; index += 1) {
    const value = Number(parts[index])
    if (Number.isNaN(value)) return null
    total += value * (60 ** (parts.length - index - 1))
  }
  return total
}

function AddResultDialog({ open, onClose, onSuccess, resultToEdit = null }) {
  const [formValues, setFormValues] = useState(initialFormState)
  const [atletaInputValue, setAtletaInputValue] = useState('')
  const [pruebaInputValue, setPruebaInputValue] = useState('')

  const resetForm = useCallback(() => {
    setFormValues(initialFormState)
    setPruebaInputValue('')
    setAtletaInputValue('')
  }, [])

  const { clubes, pruebas, categorias, loading: optionsLoading, error: optionsError, addClub } =
    useFormOptions({ open })
  const { atletas, loading: athleteSearchLoading } = useAthleteSearch({
    inputValue: atletaInputValue,
    open,
    selectedAthlete: formValues.atleta,
    resultToEdit
  })
  const { autoAssigning, getClubForAthlete } = useAutoAssignClub({ clubes, addClub })
  const { loading: submitLoading, error: submitError, success: submitSuccess, submit } =
    useResultSubmit({ resultToEdit, onSuccess, onReset: resetForm })

  const pruebaFilter = useMemo(
    () =>
      createFilterOptions({
        ignoreAccents: true,
        ignoreCase: true,
        matchFrom: 'start',
        stringify: (option) => option?.nombre || ''
      }),
    []
  )

  const normalizedIncludes = useCallback((text, query) => {
    const normalize = (str) =>
      str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ''
    return normalize(text).includes(normalize(query))
  }, [])

  const filteredPruebas = useMemo(() => {
    if (!pruebaInputValue) return pruebas
    return pruebas.filter((prueba) => normalizedIncludes(prueba?.nombre, pruebaInputValue))
  }, [pruebas, pruebaInputValue, normalizedIncludes])

  const isFormValid = useMemo(
    () =>
      Boolean(formValues.atleta?.atleta_id) &&
      Boolean(formValues.prueba?.prueba_id) &&
      Boolean(formValues.club?.club_id) &&
      Boolean(formValues.categoria?.categoria_id) &&
      Boolean(formValues.fecha) &&
      Boolean(formValues.marcaTexto.trim()) &&
      Boolean(formValues.unidad.trim()) &&
      Boolean(formValues.genero) &&
      Boolean(formValues.superficie),
    [formValues]
  )

  // Edit mode initialization
  useEffect(() => {
    if (open && resultToEdit) {
      const { atleta, club, prueba, categoria, fecha, marca_texto, marca_valor, unidad, genero, superficie } =
        resultToEdit
      setFormValues({
        atleta: atleta || null,
        club: club || null,
        prueba: prueba || null,
        categoria: categoria || null,
        fecha: fecha || '',
        anio: resultToEdit.anio || '',
        mes: resultToEdit.mes || '',
        genero: genero || 'MASC',
        superficie: superficie || 'AL',
        unidad: unidad || '',
        marcaTexto: marca_texto || '',
        marcaValor: marca_valor || ''
      })
      if (atleta?.nombre) setAtletaInputValue(atleta.nombre)
      if (prueba?.nombre) setPruebaInputValue(prueba.nombre)
    } else if (open && !resultToEdit) {
      resetForm()
    }
  }, [open, resultToEdit, resetForm])

  const handleClose = () => {
    if (!submitLoading) onClose?.()
  }

  const handleDateChange = (value) => {
    if (!value) {
      setFormValues((prev) => ({ ...prev, fecha: '', anio: '', mes: '' }))
      return
    }
    const parsed = dayjs(value)
    if (!parsed.isValid()) {
      setFormValues((prev) => ({ ...prev, fecha: value, anio: '', mes: '' }))
      return
    }
    setFormValues((prev) => ({
      ...prev,
      fecha: value,
      anio: parsed.year(),
      mes: parsed.month() + 1
    }))
  }

  const handleMarcaTextoChange = (value) => {
    const autoValor = convertMarcaTextoToValor(value)
    setFormValues((prev) => ({
      ...prev,
      marcaTexto: value,
      marcaValor: autoValor !== null ? autoValor : ''
    }))
  }

  const handleAthleteChange = async (_, newValue) => {
    setFormValues((prev) => ({ ...prev, atleta: newValue }))
    if (!newValue?.atleta_id) return
    const club = await getClubForAthlete(newValue.atleta_id)
    if (club) setFormValues((prev) => ({ ...prev, club }))
  }

  const handlePruebaChange = (newValue) => {
    setFormValues((prev) => ({
      ...prev,
      prueba: newValue,
      unidad: newValue?.unidad_default || prev.unidad
    }))
  }

  return (
    <Modal.Root open={open} onClose={handleClose} maxWidth="md">
      <Modal.Header onClose={handleClose}>
        <Stack direction="row" alignItems="center" gap={1}>
          <TbCircuitCapacitorPolarized size={24} />
          <Typography variant="h6" component="span">
            {resultToEdit ? 'Editar marca' : 'Añadir marca'}
          </Typography>
        </Stack>
      </Modal.Header>
      <Modal.Body>
        <Stack spacing={2}>
          {(submitError || optionsError) && (
            <Alert severity="error">{submitError || optionsError}</Alert>
          )}
          {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

          <AthleteClubFields
            atletaValue={formValues.atleta}
            onAthleteChange={handleAthleteChange}
            atletas={atletas}
            athleteSearchLoading={athleteSearchLoading}
            optionsLoading={optionsLoading}
            atletaInputValue={atletaInputValue}
            onAtletaInputChange={setAtletaInputValue}
            clubValue={formValues.club}
            onClubChange={(newValue) => setFormValues((prev) => ({ ...prev, club: newValue }))}
            clubes={clubes}
            autoAssigning={autoAssigning}
          />

          <Divider />

          <PruebaCategoriaFields
            pruebaValue={formValues.prueba}
            onPruebaChange={handlePruebaChange}
            filteredPruebas={filteredPruebas}
            pruebaFilter={pruebaFilter}
            pruebaInputValue={pruebaInputValue}
            onPruebaInputChange={setPruebaInputValue}
            optionsLoading={optionsLoading}
            categoriaValue={formValues.categoria}
            onCategoriaChange={(newValue) =>
              setFormValues((prev) => ({ ...prev, categoria: newValue }))
            }
            categorias={categorias}
          />

          <Divider />

          <MarcaFields
            fecha={formValues.fecha}
            onFechaChange={handleDateChange}
            genero={formValues.genero}
            onGeneroChange={(value) => setFormValues((prev) => ({ ...prev, genero: value }))}
            superficie={formValues.superficie}
            onSuperficieChange={(value) =>
              setFormValues((prev) => ({ ...prev, superficie: value }))
            }
            marcaTexto={formValues.marcaTexto}
            onMarcaTextoChange={handleMarcaTextoChange}
          />
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={handleClose}
          variant="ghost"
          startIcon={<TbX />}
          disabled={submitLoading}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => submit(formValues, isFormValid)}
          variant="primary"
          color="secondary"
          startIcon={<TbCheck />}
          disabled={!isFormValid || submitLoading || optionsLoading}
          isLoading={submitLoading}
        >
          Guardar
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}

export default AddResultDialog
