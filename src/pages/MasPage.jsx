import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { TbUser, TbSettings, TbHelpCircle, TbInfoCircle, TbLogout } from 'react-icons/tb'

const MasPage = () => {
  const menuItems = [
    { icon: <TbUser size={24} />, text: 'Perfil', description: 'Configura tu perfil de usuario' },
    { icon: <TbSettings size={24} />, text: 'Configuración', description: 'Ajustes de la aplicación' },
    { icon: <TbHelpCircle size={24} />, text: 'Ayuda', description: 'Centro de ayuda y soporte' },
    { icon: <TbInfoCircle size={24} />, text: 'Acerca de', description: 'Información sobre la aplicación' },
    { icon: <TbLogout size={24} />, text: 'Cerrar sesión', description: 'Salir de la aplicación' },
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

        <Card>
          <CardContent sx={{ p: 0 }}>
            <List>
              {menuItems.map((item, index) => (
                <ListItem
                  key={index}
                  button
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    secondary={item.description}
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


