import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { TbArrowLeft } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

const PrivacyPage = () => {
    const navigate = useNavigate()

    return (
        <Box sx={{ width: '100%', minHeight: '100dvh', bgcolor: 'background.default', pb: 10 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                    <TbArrowLeft />
                </IconButton>
                <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                    Política de Privacidad
                </Typography>
            </Box>
            <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>Privacidad de Datos</Typography>
                <Typography variant="body1" paragraph>
                    Su privacidad es de máxima importancia para nosotros. Esta política explica cómo recopilamos, usamos y protegemos su información al utilizar Athlete App.
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 500 }}>Recopilación de Datos</Typography>
                <Typography variant="body1" paragraph>
                    Recopilamos únicamente datos esenciales para ofrecer un servicio adecuado de análisis y seguimiento de los atletas incorporados en nuestra base de datos.
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 500 }}>Uso de Terceros</Typography>
                <Typography variant="body1" paragraph>
                    Esta aplicación usa servicios de Backend como Supabase. Nos comprometemos a no vender o regalar bases de datos de correos electrónicos bajo ningún concepto de terceros no autorizados.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
                    Última actualización: {new Date().toLocaleDateString()}
                </Typography>
            </Box>
        </Box>
    )
}

export default PrivacyPage
