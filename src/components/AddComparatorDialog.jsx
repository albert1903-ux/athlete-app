import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import { TbX, TbCheck, TbSwords } from 'react-icons/tb'
import AthleteSearch from './AthleteSearch'
import { Modal, Button, Typography } from './ui'
import SelectedAthleteCard from './SelectedAthleteCard'

function AddComparatorDialog({ open, onClose, onAdd, currentComparators = [] }) {
    const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
    const [duplicateError, setDuplicateError] = useState(false)

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setTempSelectedAthlete(null)
            setDuplicateError(false)
        }
    }, [open])

    const handleResultClick = (athlete) => {
        setTempSelectedAthlete(athlete)
        setDuplicateError(false)
    }

    const handleConfirm = () => {
        if (tempSelectedAthlete) {
            // Check for duplicates
            const exists = currentComparators.some(c => c.atleta_id === tempSelectedAthlete.atleta_id)

            if (exists) {
                setDuplicateError(true)
                return
            }

            if (onAdd) {
                onAdd(tempSelectedAthlete)
            }
            onClose()
        }
    }

    return (
        <Modal.Root
            open={open}
            onClose={onClose}
            maxWidth="sm"
        >
            <Modal.Header onClose={onClose}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TbSwords size={24} />
                    <Typography variant="h6" component="span">Añadir Atleta para Comparar</Typography>
                </Box>
            </Modal.Header>

            <Modal.Body
                dividers
                sx={{
                    pb: 0,
                    position: 'relative',
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '400px'
                }}
            >
                <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <AthleteSearch onResultClick={handleResultClick} />
                </Box>

                {/* Card sticky del atleta seleccionado */}
                {tempSelectedAthlete && (
                    <Box
                        sx={{
                            flexShrink: 0,
                            backgroundColor: 'background.paper',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            pt: 1.5,
                            pb: 1,
                            position: 'sticky',
                            bottom: 0,
                            zIndex: 10,
                            px: 2
                        }}
                    >
                        <SelectedAthleteCard
                            athlete={tempSelectedAthlete}
                            label={duplicateError ? 'Este atleta ya está en la lista:' : 'Atleta seleccionado:'}
                            error={duplicateError}
                        />
                    </Box>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button
                    onClick={onClose}
                    variant="ghost"
                    startIcon={<TbX />}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="primary"
                    disabled={!tempSelectedAthlete || duplicateError}
                    startIcon={<TbCheck />}
                    color="secondary"
                >
                    Añadir
                </Button>
            </Modal.Footer>
        </Modal.Root>
    )
}

export default AddComparatorDialog
