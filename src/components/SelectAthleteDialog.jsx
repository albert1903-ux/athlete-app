import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import { TbX, TbCheck, TbUser } from 'react-icons/tb'
import AthleteSearch from './AthleteSearch'
import { Modal, Button, Typography } from './ui'
import SelectedAthleteCard from './SelectedAthleteCard'
import { getSelectedAthlete, setSelectedAthlete } from '../store/selectedAthleteStore'

function SelectAthleteDialog({ open, onClose, onSelect }) {
    const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
    const [currentAthlete, setCurrentAthlete] = useState(getSelectedAthlete)

    // Reset temp selection when opening
    useEffect(() => {
        if (open) {
            const current = getSelectedAthlete()
            setCurrentAthlete(current)
            setTempSelectedAthlete(current || null)
        }
    }, [open])

    const handleResultClick = (athlete) => {
        setTempSelectedAthlete(athlete)
    }

    const handleConfirm = () => {
        if (tempSelectedAthlete) {
            setSelectedAthlete(tempSelectedAthlete)
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
                            backgroundColor: 'background.paper',
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
