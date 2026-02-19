import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import {
    Box,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    CircularProgress,
    Alert,
    Chip,
    Divider
} from '@mui/material'
import { TbX, TbPencil, TbTrash, TbCircuitCapacitorPolarized, TbList } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import AddResultDialog from './AddResultDialog'
import { Modal, Button, Typography } from './ui'

const STORAGE_KEY = 'selectedAthlete'

function loadSelectedAthlete() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    } catch (error) {
        console.error('Error loading selected athlete:', error)
        return null
    }
}

function MarksManagementDialog({ open, onClose }) {

    const [athlete, setAthlete] = useState(null)
    const [marks, setMarks] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(null) // ID of item being deleted

    // State related to Add/Edit Dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [resultToEdit, setResultToEdit] = useState(null)

    const fetchMarks = useCallback(async (athleteObj) => {
        if (!athleteObj?.atleta_id) return

        setLoading(true)
        setError(null)
        try {
            // 1. Fetch lookup tables (in parallel for performance)
            const [
                { data: clubsData, error: clubsError },
                { data: proofsData, error: proofsError },
                { data: categoriesData, error: categoriesError }
            ] = await Promise.all([
                supabase.from('clubes').select('*'),
                supabase.from('pruebas').select('*'),
                supabase.from('categorias').select('*')
            ])

            if (clubsError) throw clubsError
            if (proofsError) throw proofsError
            if (categoriesError) throw categoriesError

            // Create lookup maps
            const clubsMap = new Map((clubsData || []).map(c => [c.club_id, c]))
            const proofsMap = new Map((proofsData || []).map(p => [p.prueba_id, p]))
            const categoriesMap = new Map((categoriesData || []).map(c => [c.categoria_id, c]))

            // 2. Fetch results
            const { data: resultsData, error: resultsError } = await supabase
                .from('resultados')
                .select('*') // Simple select, no joins
                .eq('atleta_id', athleteObj.atleta_id)
                .order('fecha', { ascending: false })

            if (resultsError) throw resultsError

            // 3. Join data locally
            const enrichedMarks = (resultsData || []).map(mark => ({
                ...mark,
                club: clubsMap.get(mark.club_id) || null,
                prueba: proofsMap.get(mark.prueba_id) || null,
                categoria: categoriesMap.get(mark.categoria_id) || null,
                atleta: athleteObj // Use the argument, not the state
            }))

            setMarks(enrichedMarks)
        } catch (err) {
            console.error('Error fetching marks:', err)
            setError('No se pudieron cargar las marcas del atleta.')
        } finally {
            setLoading(false)
        }
    }, []) // remove athlete dependency to prevent loop

    // Load athlete and data when dialog opens
    useEffect(() => {
        if (open) {
            const currentAthlete = loadSelectedAthlete()
            setAthlete(currentAthlete)
            if (currentAthlete?.atleta_id) {
                fetchMarks(currentAthlete)
            } else {
                setMarks([])
            }
        }
    }, [open, fetchMarks])

    const handleEditClick = (mark) => {
        setResultToEdit(mark)
        setEditDialogOpen(true)
    }

    const handleDeleteClick = async (markId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta marca? Esta acción no se puede deshacer.')) {
            return
        }

        setDeleteLoading(markId)
        try {
            const { error } = await supabase
                .from('resultados')
                .delete()
                .eq('resultado_id', markId)

            if (error) throw error

            // Remove from local list
            setMarks(prev => prev.filter(m => m.resultado_id !== markId))

            // Notify other components
            window.dispatchEvent(new Event('resultadoCreado')) // Reusing this event to trigger refreshes

        } catch (err) {
            alert('Error al eliminar la marca: ' + err.message)
        } finally {
            setDeleteLoading(null)
        }
    }

    const handleEditSuccess = () => {
        setEditDialogOpen(false)
        setResultToEdit(null)
        // Refresh list
        if (athlete) {
            fetchMarks(athlete)
        }
    }

    const handleEditClose = () => {
        setEditDialogOpen(false)
        setResultToEdit(null)
    }

    return (
        <>
            <Modal.Root
                open={open}
                onClose={onClose}
                maxWidth="md"
                scroll="paper"
            >
                <Modal.Header onClose={onClose}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TbList size={24} />
                        <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="h6" component="div" noWrap>
                                Gestión de Marcas
                            </Typography>
                            {athlete && (
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {athlete.nombre}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Modal.Header>

                <Modal.Body dividers sx={{ p: 0 }}>
                    {!athlete ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                Selecciona un atleta principal primero para ver sus marcas.
                            </Typography>
                        </Box>
                    ) : loading ? (
                        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
                    ) : marks.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No hay marcas registradas para este atleta.
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ pt: 0 }}>
                            {marks.map((mark, index) => (
                                <Box key={mark.resultado_id}>
                                    <ListItem alignItems="flex-start" sx={{ pr: 9 }}> {/* pr for actions */}
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography variant="h6" component="span" color="primary.main" fontWeight="bold">
                                                        {mark.marca_texto}
                                                    </Typography>
                                                    <Typography variant="body2" component="span" fontWeight="bold">
                                                        {mark.prueba?.nombre || 'Prueba desconocida'}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Typography variant="body2" component="span" color="text.primary">
                                                        {dayjs(mark.fecha).format('DD/MM/YYYY')}
                                                        {mark.club?.nombre && ` · ${mark.club.nombre}`}
                                                    </Typography>
                                                    <Box component="span" sx={{ display: 'flex', gap: 1 }}>
                                                        {mark.categoria?.nombre && (
                                                            <Chip label={mark.categoria.nombre} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                        )}
                                                        {mark.superficie && (
                                                            <Chip label={mark.superficie} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                        )}
                                                    </Box>
                                                </Box>
                                            }
                                        />
                                        <ListItemSecondaryAction sx={{ top: 24, right: 16, transform: 'none' }}>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <IconButton
                                                    edge="end"
                                                    aria-label="edit"
                                                    onClick={() => handleEditClick(mark)}
                                                    size="small"
                                                    sx={{ color: 'primary.main' }}
                                                >
                                                    <TbPencil />
                                                </IconButton>
                                                <IconButton
                                                    edge="end"
                                                    aria-label="delete"
                                                    onClick={() => handleDeleteClick(mark.resultado_id)}
                                                    size="small"
                                                    disabled={deleteLoading === mark.resultado_id}
                                                    sx={{ color: 'error.main' }}
                                                >
                                                    {deleteLoading === mark.resultado_id ? (
                                                        <CircularProgress size={20} color="inherit" />
                                                    ) : (
                                                        <TbTrash />
                                                    )}
                                                </IconButton>
                                            </Box>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    {index < marks.length - 1 && <Divider component="li" />}
                                </Box>
                            ))}
                        </List>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={onClose} variant="secondary">Cerrar</Button>
                </Modal.Footer>
            </Modal.Root>

            {/* Re-use AddResultDialog for editing */}
            <AddResultDialog
                open={editDialogOpen}
                onClose={handleEditClose}
                onSuccess={handleEditSuccess}
                resultToEdit={resultToEdit}
            />
        </>
    )
}

export default MarksManagementDialog
