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
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import Avatar from '@mui/material/Avatar'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { TbX, TbShield, TbUser } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function RoleManagementDialog({ open, onClose }) {
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(null) // ID of user being updated
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

    useEffect(() => {
        if (open) {
            fetchUsers()
        }
    }, [open])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_all_users')
        if (error) {
            console.error('Error fetching users:', error)
            setSnackbar({ open: true, message: 'Error al cargar los usuarios', severity: 'error' })
        } else {
            setUsers(data || [])
        }
        setLoading(false)
    }

    const handleRoleChange = async (userId, newRole) => {
        setSaving(userId)
        const { error } = await supabase.rpc('update_user_role', {
            target_user_id: userId,
            new_role: newRole,
        })
        if (error) {
            console.error('Error updating role:', error)
            setSnackbar({ open: true, message: 'Error al actualizar el rol', severity: 'error' })
        } else {
            setUsers(prev =>
                prev.map(u =>
                    u.id === userId
                        ? { ...u, raw_user_meta_data: { ...u.raw_user_meta_data, role: newRole } }
                        : u
                )
            )
            setSnackbar({ open: true, message: 'Rol actualizado correctamente', severity: 'success' })
        }
        setSaving(null)
    }

    const getRoleChipProps = (role) => {
        if (role === 'admin') {
            return { label: 'Admin', color: 'primary', icon: <TbShield size={14} /> }
        }
        return { label: 'Consulta', color: 'default', icon: <TbUser size={14} /> }
    }

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Gestión de Roles
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
                            <Typography color="text.secondary">No hay usuarios registrados.</Typography>
                        </Box>
                    ) : (
                        <List>
                            {users.map((u) => {
                                const name = u.raw_user_meta_data?.name || u.raw_user_meta_data?.full_name || 'Usuario'
                                const email = u.email || 'Sin email'
                                const currentRole = u.raw_user_meta_data?.role || 'consulta'
                                const isCurrentUser = u.id === currentUser?.id
                                const chipProps = getRoleChipProps(currentRole)

                                return (
                                    <ListItem key={u.id} divider alignItems="flex-start">
                                        <ListItemAvatar>
                                            <Avatar src={u.raw_user_meta_data?.avatar_url} alt={name}>
                                                {name.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                        {name}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={chipProps.label}
                                                        color={chipProps.color}
                                                        icon={chipProps.icon}
                                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                                    />
                                                    {isCurrentUser && (
                                                        <Chip size="small" label="Tú" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                                    )}
                                                </Box>
                                            }
                                            secondary={email}
                                            secondaryTypographyProps={{ variant: 'caption', sx: { mt: 0.25 } }}
                                        />
                                        <ListItemSecondaryAction>
                                            {saving === u.id ? (
                                                <CircularProgress size={24} sx={{ mr: 1 }} />
                                            ) : isCurrentUser ? (
                                                <Tooltip title="No puedes cambiar tu propio rol">
                                                    <span>
                                                        <FormControl size="small" disabled>
                                                            <Select
                                                                value={currentRole}
                                                                sx={{ minWidth: 105, fontSize: '0.8rem' }}
                                                            >
                                                                <MenuItem value="admin">Admin</MenuItem>
                                                                <MenuItem value="consulta">Consulta</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                <FormControl size="small">
                                                    <Select
                                                        value={currentRole}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        sx={{ minWidth: 105, fontSize: '0.8rem' }}
                                                    >
                                                        <MenuItem value="admin">Admin</MenuItem>
                                                        <MenuItem value="consulta">Consulta</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            )}
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

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    )
}
