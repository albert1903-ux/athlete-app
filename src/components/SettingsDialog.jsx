import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { TbX, TbTrash } from 'react-icons/tb'

export default function SettingsDialog({ open, onClose }) {

    const handleClearCache = () => {
        if (window.confirm('¿Estás seguro de que quieres limpiar la caché? Esto cerrará la sesión actual y vaciará los atletas guardados.')) {
            localStorage.clear()
            window.location.reload()
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins', fontWeight: 600 }}>
                Configuración
                <IconButton onClick={onClose} size="small">
                    <TbX />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Datos locales</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Si notas algún comportamiento extraño en la interfaz o quieres reiniciar tus configuraciones de atletas comparadores sin perder tus datos de la base de datos, puedes limpiar la caché local.
                    </Typography>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<TbTrash />}
                        onClick={handleClearCache}
                        sx={{ borderRadius: 8, textTransform: 'none' }}
                    >
                        Limpiar datos temporales
                    </Button>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ borderRadius: 8, textTransform: 'none' }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    )
}
