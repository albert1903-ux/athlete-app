import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { TbArrowLeft } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

const TermsPage = () => {
    const navigate = useNavigate()

    return (
        <Box sx={{ width: '100%', minHeight: '100dvh', bgcolor: 'background.default', pb: 10 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                    <TbArrowLeft />
                </IconButton>
                <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                    Términos y Condiciones
                </Typography>
            </Box>
            <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>Términos de Uso</Typography>
                <Typography variant="body1" paragraph>
                    Bienvenido a Athlete App. Al utilizar nuestra aplicación, usted acepta estar sujeto a los presentes términos y condiciones. Todo uso de esta herramienta será bajo la responsabilidad del usuario administrador.
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 500 }}>Propiedad Intelectual</Typography>
                <Typography variant="body1" paragraph>
                    El código, el diseño y todo el material de esta plataforma están protegidos. No se permite la copia ni distribución sin autorización previa.
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 500 }}>Uso de la Plataforma</Typography>
                <Typography variant="body1" paragraph>
                    Athlete App está diseñada para el seguimiento y análisis deportivo. Queda terminantemente prohibido usar la aplicación para recabar, vender o transferir datos a terceros maliciosamente o usar la web para propósitos ilícitos.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
                    Última actualización: {new Date().toLocaleDateString()}
                </Typography>
            </Box>
        </Box>
    )
}

export default TermsPage
