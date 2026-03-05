import { useState } from 'react'
import {
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
    CircularProgress,
} from '@mui/material'
import { TbStarFilled, TbPlus, TbStar } from 'react-icons/tb'
import { Modal, Button, Typography } from './ui'
import SelectAthleteDialog from './SelectAthleteDialog'
import SelectedAthleteCard from './SelectedAthleteCard'
import { useFavorites } from '../store/favoritesStore'

function FavoritesDialog({ open, onClose }) {
    const { favorites, toggleFavorite, loading } = useFavorites()
    const [addOpen, setAddOpen] = useState(false)

    const handleAthleteSelected = async (athlete) => {
        await toggleFavorite(athlete)
    }

    return (
        <>
            <Modal.Root open={open} onClose={onClose} maxWidth="sm">
                <Modal.Header onClose={onClose}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TbStar size={24} />
                        <Typography variant="h6" component="span">Atletas favoritos</Typography>
                    </Box>
                </Modal.Header>

                <Modal.Body dividers sx={{ minHeight: 200 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : favorites.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                            <TbStar size={40} color="#bbb" />
                            <Typography color="text.secondary" variant="body2">
                                Aún no tienes atletas favoritos
                            </Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {favorites.map((athlete, idx) => (
                                <Box key={athlete.atleta_id}>
                                    {idx > 0 && <Divider />}
                                    <ListItem sx={{ py: 1.5 }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body1" fontWeight={600}>
                                                    {athlete.nombre}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                                                    {athlete.fecha_nacimiento && (
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                display: 'inline-block',
                                                                bgcolor: 'grey.100',
                                                                border: '1px solid',
                                                                borderColor: 'grey.300',
                                                                borderRadius: 10,
                                                                px: 1,
                                                                py: 0.25,
                                                                fontSize: '0.72rem',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {new Date(athlete.fecha_nacimiento).toLocaleDateString('es-ES')}
                                                        </Box>
                                                    )}
                                                    {athlete.club && (
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                display: 'inline-block',
                                                                bgcolor: 'grey.100',
                                                                border: '1px solid',
                                                                borderColor: 'grey.300',
                                                                borderRadius: 10,
                                                                px: 1,
                                                                py: 0.25,
                                                                fontSize: '0.72rem',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {athlete.club}
                                                        </Box>
                                                    )}
                                                </Box>
                                            }
                                            disableTypography
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                onClick={() => toggleFavorite(athlete)}
                                                sx={{ color: 'warning.main', mr: 0 }}
                                            >
                                                <TbStarFilled size={24} />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="primary"
                        startIcon={<TbPlus />}
                        onClick={() => setAddOpen(true)}
                    >
                        Añadir favorito
                    </Button>
                </Modal.Footer>
            </Modal.Root>

            {/* Reutilizamos SelectAthleteDialog para buscar y añadir */}
            <SelectAthleteDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSelect={handleAthleteSelected}
            />
        </>
    )
}

export default FavoritesDialog
