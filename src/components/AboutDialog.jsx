import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { TbX, TbFileText, TbShieldLock } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

export default function AboutDialog({ open, onClose }) {
    const navigate = useNavigate()

    const openLink = (path) => {
        onClose()
        navigate(path)
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins', fontWeight: 600 }}>
                Acerca de
                <IconButton onClick={onClose} size="small">
                    <TbX />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Poppins', color: 'primary.main', mb: 1 }}>
                        Athlete App
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Versión 1.0.0
                    </Typography>

                    <Button
                        fullWidth
                        variant="text"
                        color="inherit"
                        startIcon={<TbFileText />}
                        onClick={() => openLink('/terms')}
                        sx={{ justifyContent: 'flex-start', mb: 1, py: 1.5, textTransform: 'none' }}
                    >
                        Términos y Condiciones
                    </Button>
                    <Button
                        fullWidth
                        variant="text"
                        color="inherit"
                        startIcon={<TbShieldLock />}
                        onClick={() => openLink('/privacy')}
                        sx={{ justifyContent: 'flex-start', py: 1.5, textTransform: 'none' }}
                    >
                        Política de Privacidad
                    </Button>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Volver
                </Button>
            </DialogActions>
        </Dialog>
    )
}
