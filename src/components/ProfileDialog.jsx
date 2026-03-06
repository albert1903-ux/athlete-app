import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { TbX, TbDeviceFloppy } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ProfileDialog({ open, onClose }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const [name, setName] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => {
        if (user && open) {
            setName(user.user_metadata?.name || user.user_metadata?.full_name || '')
            setPassword('')
            setError(null)
            setSuccess(null)
        }
    }, [user, open])

    const handleSave = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const updates = {}

            // Update Name
            if (name !== (user.user_metadata?.name || user.user_metadata?.full_name || '')) {
                updates.data = { name }
            }

            // Update Password
            if (password) {
                if (password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres')
                }
                updates.password = password
            }

            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.auth.updateUser(updates)
                if (error) throw error
                setSuccess('Perfil actualizado correctamente')
                setPassword('') // Clear password field after success
            } else {
                setSuccess('No se realizaron cambios')
            }
        } catch (err) {
            console.error(err)
            setError(err.message || 'Error al actualizar el perfil')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins', fontWeight: 600 }}>
                Perfil
                <IconButton onClick={onClose} size="small" disabled={loading}>
                    <TbX />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                            Información Básica
                        </Typography>
                        <TextField
                            label="Nombre completo"
                            variant="outlined"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                        />
                        <TextField
                            label="Correo electrónico"
                            variant="outlined"
                            fullWidth
                            value={user?.email || ''}
                            disabled
                            sx={{ mt: 2 }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                            Seguridad
                        </Typography>
                        <TextField
                            label="Nueva Contraseña"
                            type="password"
                            variant="outlined"
                            fullWidth
                            placeholder="Déjalo en blanco para mantener la actual"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading} sx={{ textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TbDeviceFloppy />}
                    sx={{ textTransform: 'none', px: 3, boxShadow: 'none' }}
                >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
