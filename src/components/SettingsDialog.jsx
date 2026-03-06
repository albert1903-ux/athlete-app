import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { TbX, TbTrash, TbMoon, TbSun, TbDeviceDesktop, TbCheck } from 'react-icons/tb'
import { Select, MenuItem, FormControl, InputLabel, Divider } from '@mui/material'
import { useAppTheme } from '../context/ThemeContext'

const PREDEFINED_COLORS = [
    { label: 'Original', value: '#E11141' },
    { label: 'Teal', value: '#00bcdc' },
    { label: 'Azul', value: '#2196f3' },
    { label: 'Verde', value: '#4caf50' },
    { label: 'Naranja', value: '#ff9800' },
    { label: 'Morado', value: '#9c27b0' }
]

export default function SettingsDialog({ open, onClose }) {
    const { modePreference, toggleTheme, primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor } = useAppTheme()


    const handleClearCache = () => {
        if (window.confirm('¿Estás seguro de que quieres limpiar la caché? Esto cerrará la sesión actual y vaciará los atletas guardados.')) {
            localStorage.clear()
            window.location.reload()
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins', fontWeight: 600 }}>
                Configuración
                <IconButton onClick={onClose} size="small">
                    <TbX />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Apariencia</Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel id="theme-select-label">Tema de la aplicación</InputLabel>
                        <Select
                            labelId="theme-select-label"
                            id="theme-select"
                            value={modePreference}
                            label="Tema de la aplicación"
                            onChange={(e) => toggleTheme(e.target.value)}
                        >
                            <MenuItem value="light">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TbSun /> Claro</Box>
                            </MenuItem>
                            <MenuItem value="dark">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TbMoon /> Oscuro</Box>
                            </MenuItem>
                            <MenuItem value="system">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TbDeviceDesktop /> Sistema</Box>
                            </MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Color Primario</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            {PREDEFINED_COLORS.map((color) => (
                                <Box
                                    key={color.value}
                                    onClick={() => setPrimaryColor(color.value)}
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        backgroundColor: color.value,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: primaryColor === color.value ? '2px solid' : '2px solid transparent',
                                        borderColor: 'text.primary',
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.1)' }
                                    }}
                                    title={color.label}
                                >
                                    {primaryColor === color.value && <TbCheck color="#fff" size={20} />}
                                </Box>
                            ))}
                        </Box>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Color Secundario</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {PREDEFINED_COLORS.map((color) => (
                                <Box
                                    key={`sec-${color.value}`}
                                    onClick={() => setSecondaryColor(color.value)}
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        backgroundColor: color.value,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: secondaryColor === color.value ? '2px solid' : '2px solid transparent',
                                        borderColor: 'text.primary',
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.1)' }
                                    }}
                                    title={color.label}
                                >
                                    {secondaryColor === color.value && <TbCheck color="#fff" size={20} />}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
                
                <Divider />

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
                        sx={{ textTransform: 'none' }}
                    >
                        Limpiar datos temporales
                    </Button>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    )
}
