import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import TextField from '@mui/material/TextField'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { TbX, TbCheck, TbUser } from 'react-icons/tb'
import AthleteSearch from './AthleteSearch'
import { Modal, Button } from './ui'
import SelectedAthleteCard from './SelectedAthleteCard'
import { getSelectedAthlete, setSelectedAthlete } from '../store/selectedAthleteStore'

/**
 * @param {Array|null} scopedAthletes  Pre-loaded athlete list [{atleta_id, nombre, fecha_nac}].
 *                                     null → global AthleteSearch. [] → empty scoped list.
 */
function SelectAthleteDialog({ open, onClose, onSelect, scopedAthletes = null }) {
    const [tempSelectedAthlete, setTempSelectedAthlete] = useState(null)
    const [currentAthlete, setCurrentAthlete] = useState(getSelectedAthlete)
    const [filter, setFilter] = useState('')

    useEffect(() => {
        if (open) {
            const current = getSelectedAthlete()
            setCurrentAthlete(current)
            setTempSelectedAthlete(current || null)
            setFilter('')
        }
    }, [open])

    const handleResultClick = (athlete) => {
        setTempSelectedAthlete(athlete)
    }

    const handleConfirm = () => {
        if (tempSelectedAthlete) {
            setSelectedAthlete(tempSelectedAthlete)
            if (onSelect) onSelect(tempSelectedAthlete)
            onClose()
        }
    }

    const filteredScoped = scopedAthletes
        ? scopedAthletes.filter(
              (a) => !filter || a.nombre.toLowerCase().includes(filter.toLowerCase())
          )
        : []

    return (
        <Modal.Root open={open} onClose={onClose} maxWidth="sm">
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
                    {scopedAthletes !== null ? (
                        /* Scoped view: pre-loaded list with client-side filter */
                        <Box>
                            <TextField
                                fullWidth
                                size="small"
                                label="Buscar atleta"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                sx={{ mb: 2 }}
                                autoFocus
                            />
                            {scopedAthletes.length === 0 ? (
                                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    No hay atletas asignados
                                </Typography>
                            ) : filteredScoped.length === 0 ? (
                                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    No se encontraron atletas con ese nombre
                                </Typography>
                            ) : (
                                <List disablePadding>
                                    {filteredScoped.map((a, index) => (
                                        <Box key={a.atleta_id}>
                                            <ListItemButton
                                                selected={tempSelectedAthlete?.atleta_id === a.atleta_id}
                                                onClick={() =>
                                                    handleResultClick({
                                                        atleta_id: a.atleta_id,
                                                        nombre: a.nombre,
                                                        fecha_nacimiento: a.fecha_nac,
                                                    })
                                                }
                                                sx={{ borderRadius: 1 }}
                                            >
                                                <ListItemText
                                                    primary={a.nombre}
                                                    primaryTypographyProps={{
                                                        fontWeight:
                                                            tempSelectedAthlete?.atleta_id === a.atleta_id
                                                                ? 600
                                                                : 400,
                                                    }}
                                                />
                                            </ListItemButton>
                                            {index < filteredScoped.length - 1 && <Divider />}
                                        </Box>
                                    ))}
                                </List>
                            )}
                        </Box>
                    ) : (
                        /* Default: global search */
                        <AthleteSearch onResultClick={handleResultClick} />
                    )}
                </Box>

                {/* Sticky selected athlete card */}
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
                            zIndex: (theme) => theme.zIndex.appBar,
                        }}
                    >
                        <SelectedAthleteCard athlete={tempSelectedAthlete} />
                    </Box>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button onClick={onClose} variant="ghost" startIcon={<TbX />}>
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
