import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { TbUser, TbSettings, TbHelpCircle, TbInfoCircle, TbLogout } from 'react-icons/tb'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const MasPage = () => {
  const { user } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const menuItems = [
    { icon: <TbUser size={24} />, text: 'Perfil', description: 'Configura tu perfil de usuario' },
    { icon: <TbSettings size={24} />, text: 'Configuración', description: 'Ajustes de la aplicación' },
    { icon: <TbHelpCircle size={24} />, text: 'Ayuda', description: 'Centro de ayuda y soporte' },
    { icon: <TbInfoCircle size={24} />, text: 'Acerca de', description: 'Información sobre la aplicación' },
    { icon: <TbLogout size={24} />, text: 'Cerrar sesión', description: 'Salir de la aplicación', onClick: handleLogout },
  ]

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        pb: '100px', // Espacio para el BottomNavigation
      }}
    >
      <Box
        sx={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          px: 2,
          py: 2,
          gap: 2,
        }}
      >
        {user && (
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '16px !important' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TbUser size={28} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, fontFamily: 'Poppins' }}>
                  Entrenador
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, fontFamily: 'Poppins' }}>
                  {user.email}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <List>
              {menuItems.map((item, index) => (
                <ListItem
                  key={index}
                  button
                  onClick={item.onClick}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: item.text === 'Cerrar sesión' ? 'error.main' : 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    secondary={item.description}
                    primaryTypographyProps={{
                      color: item.text === 'Cerrar sesión' ? 'error.main' : 'text.primary',
                      fontWeight: item.text === 'Cerrar sesión' ? 600 : 500,
                      fontFamily: 'Poppins'
                    }}
                    secondaryTypographyProps={{
                      fontFamily: 'Poppins'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default MasPage


