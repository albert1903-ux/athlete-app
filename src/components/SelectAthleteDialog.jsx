import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import { TbX, TbCheck, TbUser } from 'react-icons/tb'
import AthleteSearch from './AthleteSearch'
import { Modal, Button, Typography } from './ui'
import SelectedAthleteCard from './SelectedAthleteCard'

// Función helper para cargar desde localStorage de forma síncrona
const STORAGE_KEY = 'selectedAthlete'
function loadFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        console.error('Error al cargar atleta desde localStorage:', error)
        localStorage.removeItem(STORAGE_KEY)
    }
    return null
}

function SelectAthleteDialog({ open, onClose, onSelect }) {
    const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
    // We need to know who is 'currently' selected to default the temp selection or highlight
    const [currentAthlete, setCurrentAthlete] = useState(loadFromStorage())

    // Reset temp selection when opening
    useEffect(() => {
        if (open) {
            const stored = loadFromStorage()
            setCurrentAthlete(stored)
            setTempSelectedAthlete(stored || null)
        }
    }, [open])

    const handleResultClick = (athlete) => {
        setTempSelectedAthlete(athlete)
    }

    const handleConfirm = () => {
        if (tempSelectedAthlete) {
            // Save globally
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSelectedAthlete))
                // Dispatch event for other components to know
                window.dispatchEvent(new Event('localStorageChange'))
            } catch (error) {
                console.error('Error al guardar atleta:', error)
            }

            if (onSelect) {
                onSelect(tempSelectedAthlete)
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
                    <TbUser size={24} />
                    <Typography variant="h6" component="span">Seleccionar Atleta</Typography>
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
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        pr: { xs: 1, sm: 2 },
                        pl: { xs: 1, sm: 2 },
                        pt: 1,
                        pb: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <AthleteSearch onResultClick={handleResultClick} />
                </Box>

                {/* Card sticky del atleta seleccionado */}
                {tempSelectedAthlete && (
                    <Box
                        sx={{
                            position: 'sticky',
                            bottom: 0,
                            width: '100%',
                            backgroundColor: 'white',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            px: { xs: 2, sm: 3 },
                            py: 2,
                            zIndex: (theme) => theme.zIndex.appBar
                        }}
                    >
                        <SelectedAthleteCard athlete={tempSelectedAthlete} />
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
                    disabled={!tempSelectedAthlete}
                    startIcon={<TbCheck />}
                >
                    Seleccionar
                </Button>
            </Modal.Footer>
        </Modal.Root>
    )
}

export default SelectAthleteDialog
