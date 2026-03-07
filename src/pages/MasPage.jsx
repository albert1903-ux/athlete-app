import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { TbUser, TbSettings, TbInfoCircle, TbLogout, TbStar, TbUsers, TbShield } from 'react-icons/tb'
import { useState } from 'react'
import FavoritesDialog from '../components/FavoritesDialog'
import AdminApprovalDialog from '../components/AdminApprovalDialog'
import RoleManagementDialog from '../components/RoleManagementDialog'
import ProfileDialog from '../components/ProfileDialog'
import SettingsDialog from '../components/SettingsDialog'
import AboutDialog from '../components/AboutDialog'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const MasPage = () => {
  const [favOpen, setFavOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { user } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const menuItems = [
    { icon: <TbStar size={24} />, text: 'Atletas favoritos', description: 'Gestiona tus atletas favoritos', onClick: () => setFavOpen(true) },
    ...(user?.role === 'admin' ? [{ icon: <TbUsers size={24} />, text: 'Solicitudes de Acceso', description: 'Aprueba o rechaza nuevos usuarios', onClick: () => setAdminOpen(true) }] : []),
    ...(user?.role === 'admin' ? [{ icon: <TbShield size={24} />, text: 'Gestión de Roles', description: 'Asigna roles a los usuarios registrados', onClick: () => setRolesOpen(true) }] : []),
    { icon: <TbUser size={24} />, text: 'Perfil', description: 'Configura tu perfil de usuario', onClick: () => setProfileOpen(true) },
    { icon: <TbSettings size={24} />, text: 'Configuración', description: 'Ajustes de la aplicación', onClick: () => setSettingsOpen(true) },
    { icon: <TbInfoCircle size={24} />, text: 'Acerca de', description: 'Información sobre la aplicación', onClick: () => setAboutOpen(true) },
    { icon: <TbLogout size={24} />, text: 'Cerrar sesión', description: 'Salir de la aplicación', onClick: handleLogout },
  ]

  return (
    <>
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

      <FavoritesDialog open={favOpen} onClose={() => setFavOpen(false)} />
      <AdminApprovalDialog open={adminOpen} onClose={() => setAdminOpen(false)} />
      <RoleManagementDialog open={rolesOpen} onClose={() => setRolesOpen(false)} />
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}

export default MasPage



