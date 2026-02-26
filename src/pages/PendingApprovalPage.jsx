import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { TbClockHour4, TbLogout } from 'react-icons/tb'
import { supabase } from '../lib/supabase'

const PendingApprovalPage = () => {

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100dvh',
                backgroundColor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                textAlign: 'center'
            }}
        >
            <Box sx={{ color: 'primary.main', mb: 3 }}>
                <TbClockHour4 size={80} />
            </Box>
            <Typography variant="h5" sx={{ fontFamily: 'Poppins', fontWeight: 600, mb: 2 }}>
                Cuenta en Revisión
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
                Tu registro se ha completado correctamente. Un administrador debe aprobar tu cuenta antes de que puedas acceder a la plataforma. Vuelve a intentarlo más tarde o contacta con soporte.
            </Typography>
            <Button
                variant="outlined"
                startIcon={<TbLogout />}
                onClick={handleLogout}
                sx={{ borderRadius: 8, textTransform: 'none', px: 4, py: 1.5 }}
            >
                Cerrar Sesión
            </Button>
        </Box>
    )
}

export default PendingApprovalPage
