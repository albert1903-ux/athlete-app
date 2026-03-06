import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import Avatar from '@mui/material/Avatar'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { TbX, TbCheck, TbTrash } from 'react-icons/tb'
import { supabase } from '../lib/supabase'


export default function AdminApprovalDialog({ open, onClose }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null) // ID of user being processed

    useEffect(() => {
        if (open) {
            fetchUsers()
        }
    }, [open])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_pending_users')

        if (error) {
            console.error('Error fetching pending users:', error)
        } else {
            setUsers(data || [])
        }
        setLoading(false)
    }

    const handleApprove = async (userId) => {
        setProcessing(userId)
        const { error } = await supabase.rpc('approve_user', { target_user_id: userId })
        if (error) {
            console.error('Error approving user:', error)
        } else {
            setUsers(users.filter(u => u.id !== userId))
        }
        setProcessing(null)
    }

    const handleReject = async (userId) => {
        if (!window.confirm('¿Seguro que quieres eliminar esta solicitud?')) return;

        setProcessing(userId)
        const { error } = await supabase.rpc('reject_user', { target_user_id: userId })
        if (error) {
            console.error('Error rejecting user:', error)
        } else {
            setUsers(users.filter(u => u.id !== userId))
        }
        setProcessing(null)
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Solicitudes de Acceso
                <IconButton onClick={onClose} size="small">
                    <TbX />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : users.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">No hay solicitudes pendientes en este momento.</Typography>
                    </Box>
                ) : (
                    <List>
                        {users.map((user) => {
                            const name = user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || 'Usuario';
                            const email = user.email || 'Sin email';
                            const date = new Date(user.created_at).toLocaleDateString();

                            return (
                                <ListItem key={user.id} divider>
                                    <ListItemAvatar>
                                        <Avatar src={user.raw_user_meta_data?.avatar_url} alt={name}>
                                            {name.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={name}
                                        secondary={`${email} • ${date}`}
                                        primaryTypographyProps={{ fontWeight: 500 }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleApprove(user.id)}
                                            disabled={processing === user.id}
                                            color="success"
                                            sx={{ mr: 1, bgcolor: 'success.50', '&:hover': { bgcolor: 'success.100' } }}
                                        >
                                            {processing === user.id ? <CircularProgress size={20} /> : <TbCheck />}
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleReject(user.id)}
                                            disabled={processing === user.id}
                                            color="error"
                                            sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}
                                        >
                                            {processing === user.id ? <CircularProgress size={20} /> : <TbTrash />}
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            )
                        })}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    )
}
