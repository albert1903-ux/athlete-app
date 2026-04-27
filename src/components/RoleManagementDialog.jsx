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
import Avatar from '@mui/material/Avatar'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
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
    const [clubs, setClubs] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(null)       // userId being updated (role)
    const [savingClub, setSavingClub] = useState(null) // userId being updated (club)
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

    useEffect(() => {
        if (open) {
            fetchUsers()
            fetchClubs()
        }
    }, [open])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_all_users')
        if (error) {
            setSnackbar({ open: true, message: 'Error al cargar los usuarios', severity: 'error' })
        } else {
            setUsers(data || [])
        }
        setLoading(false)
    }

    const fetchClubs = async () => {
        const { data } = await supabase.from('clubes').select('club_id, nombre').order('nombre')
        if (data) setClubs(data)
    }

    const handleRoleChange = async (userId, newRole) => {
        setSaving(userId)
        const { error } = await supabase.rpc('update_user_role', {
            target_user_id: userId,
            new_role: newRole,
        })
        if (error) {
            setSnackbar({ open: true, message: 'Error al actualizar el rol', severity: 'error' })
        } else {
            setUsers(prev =>
                prev.map(u =>
                    u.id === userId
                        ? { ...u, raw_app_meta_data: { ...u.raw_app_meta_data, role: newRole } }
                        : u
                )
            )
            setSnackbar({ open: true, message: 'Rol actualizado correctamente', severity: 'success' })
        }
        setSaving(null)
    }

    const handleClubChange = async (userId, newClubId) => {
        setSavingClub(userId)
        const { error } = await supabase.rpc('update_user_club', {
            p_target_user_id: userId,
            p_club_id: newClubId,
        })
        if (error) {
            setSnackbar({ open: true, message: 'Error al vincular el club', severity: 'error' })
        } else {
            setUsers(prev =>
                prev.map(u =>
                    u.id === userId
                        ? { ...u, raw_app_meta_data: { ...u.raw_app_meta_data, club_id: newClubId } }
                        : u
                )
            )
            setSnackbar({ open: true, message: 'Club vinculado correctamente', severity: 'success' })
        }
        setSavingClub(null)
    }

    const getRoleChipProps = (role) => {
        switch (role) {
            case 'superadmin': return { label: 'Superadmin',  color: 'primary',   icon: <TbShield size={14} /> }
            case 'club':       return { label: 'Club',        color: 'secondary', icon: <TbShield size={14} /> }
            case 'trainer':    return { label: 'Entrenador',  color: 'info',      icon: <TbUser size={14} /> }
            case 'athlete':    return { label: 'Atleta',      color: 'success',   icon: <TbUser size={14} /> }
            default:           return { label: 'Consulta',    color: 'default',   icon: <TbUser size={14} /> }
        }
    }

    const needsClub = (role) => role === 'club' || role === 'trainer'

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Gestión de Usuarios
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
                                const currentRole = u.raw_app_meta_data?.role || 'consulta'
                                const currentClubId = u.raw_app_meta_data?.club_id ?? ''
                                const isCurrentUser = u.id === currentUser?.id
                                const chipProps = getRoleChipProps(currentRole)
                                const showClub = needsClub(currentRole)

                                return (
                                    <ListItem
                                        key={u.id}
                                        divider
                                        disableGutters
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}
                                    >
                                        {/* Avatar */}
                                        <Avatar src={u.raw_user_meta_data?.avatar_url} alt={name} sx={{ flexShrink: 0 }}>
                                            {name.charAt(0).toUpperCase()}
                                        </Avatar>

                                        {/* Name + email */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
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
                                            <Typography variant="caption" color="text.secondary">
                                                {email}
                                            </Typography>
                                        </Box>

                                        {/* Selectors */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
                                            {/* Role selector */}
                                            {saving === u.id ? (
                                                <CircularProgress size={24} />
                                            ) : isCurrentUser ? (
                                                <Tooltip title="No puedes cambiar tu propio rol">
                                                    <span>
                                                        <FormControl size="small" disabled>
                                                            <Select value={currentRole} sx={{ minWidth: 120, fontSize: '0.8rem' }}>
                                                                <MenuItem value="superadmin">Superadmin</MenuItem>
                                                                <MenuItem value="club">Club</MenuItem>
                                                                <MenuItem value="trainer">Entrenador</MenuItem>
                                                                <MenuItem value="athlete">Atleta</MenuItem>
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
                                                        sx={{ minWidth: 120, fontSize: '0.8rem' }}
                                                    >
                                                        <MenuItem value="superadmin">Superadmin</MenuItem>
                                                        <MenuItem value="club">Club</MenuItem>
                                                        <MenuItem value="trainer">Entrenador</MenuItem>
                                                        <MenuItem value="athlete">Atleta</MenuItem>
                                                        <MenuItem value="consulta">Consulta</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            )}

                                            {/* Club selector — only for club and trainer roles */}
                                            {showClub && (
                                                savingClub === u.id ? (
                                                    <CircularProgress size={20} />
                                                ) : (
                                                    <FormControl size="small" disabled={isCurrentUser}>
                                                        <InputLabel sx={{ fontSize: '0.75rem' }}>Club</InputLabel>
                                                        <Select
                                                            value={currentClubId}
                                                            onChange={(e) => handleClubChange(u.id, e.target.value)}
                                                            label="Club"
                                                            sx={{ minWidth: 120, fontSize: '0.8rem' }}
                                                        >
                                                            {clubs.map((c) => (
                                                                <MenuItem key={c.club_id} value={c.club_id}>
                                                                    {c.nombre}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                )
                                            )}
                                        </Box>
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
