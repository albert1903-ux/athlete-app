import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
    Box,
    Card,
    CardContent,
    Chip,
} from '@mui/material'
import { TbX, TbCheck, TbSwords } from 'react-icons/tb'
import AthleteSearch from './AthleteSearch'
import { Modal, Button, Typography } from './ui'

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
                            backgroundColor: 'white',
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
                        <Card
                            sx={{
                                bgcolor: duplicateError ? 'error.light' : 'secondary.light',
                                color: duplicateError ? 'error.contrastText' : 'secondary.contrastText'
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                    {duplicateError ? 'Este atleta ya está en la lista:' : 'Atleta seleccionado:'}
                                </Typography>
                                {/* Nombre del atleta */}
                                <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                                    {tempSelectedAthlete.nombre}
                                </Typography>

                                {/* Chips de licencia y club */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    {/* {tempSelectedAthlete.licencia && tempSelectedAthlete.licencia !== 'N/A' && (
                                        <Chip
                                            label={`Lic: ${tempSelectedAthlete.licencia}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ bgcolor: 'white', color: duplicateError ? 'error.main' : 'secondary.main' }}
                                        />
                                    )} */}
                                    {tempSelectedAthlete.club && tempSelectedAthlete.club !== 'N/A' && tempSelectedAthlete.club !== 'Sin club' && (
                                        <Chip
                                            label={tempSelectedAthlete.club}
                                            size="small"
                                            variant="outlined"
                                            sx={{ bgcolor: 'white', color: duplicateError ? 'error.main' : 'secondary.main' }}
                                        />
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
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
