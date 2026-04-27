import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import { Typography } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  trainer: 'Entrenador',
  athlete: 'Atleta',
  club: 'Club',
}

// Estados posibles de la página
// loading | valid | invalid | expired | accepted | already_used | accepting | done

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const token = searchParams.get('token')
  const [pageState, setPageState] = useState('loading')
  const [invitation, setInvitation] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) {
      setPageState('invalid')
      return
    }
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    setPageState('loading')
    const { data, error: rpcError } = await supabase.rpc('get_invitation_by_token', {
      invite_token: token,
    })

    if (rpcError || !data || data.length === 0) {
      setPageState('invalid')
      return
    }

    const inv = data[0]
    setInvitation(inv)

    if (inv.status === 'expired') {
      setPageState('expired')
    } else if (inv.status === 'accepted') {
      setPageState('already_used')
    } else if (inv.status === 'revoked') {
      setPageState('invalid')
    } else {
      setPageState('valid')
    }
  }

  const handleAccept = async () => {
    if (!user) return

    if (user.email !== invitation.email) {
      setError(`Esta invitación es para ${invitation.email}. Inicia sesión con esa cuenta.`)
      return
    }

    setAccepting(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('accept_invitation', {
      invite_token: token,
    })

    if (rpcError) {
      setError('Error al aceptar la invitación: ' + rpcError.message)
      setAccepting(false)
      return
    }

    // Refrescar sesión para que el JWT incluya el nuevo role y organization_id
    await supabase.auth.refreshSession()
    setPageState('done')

    setTimeout(() => navigate('/seguimiento', { replace: true }), 2000)
  }

  const loginUrl = `/login?redirect=/join?token=${token}`
  const registerUrl = `/register?redirect=/join?token=${token}`

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: 3,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Athlete App
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Invitación a organización
            </Typography>
          </Box>

          {pageState === 'loading' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {pageState === 'invalid' && (
            <Alert severity="error">
              Invitación no encontrada o inválida. Solicita una nueva al administrador de tu club.
            </Alert>
          )}

          {pageState === 'expired' && (
            <Alert severity="warning">
              Esta invitación ha caducado (más de 7 días). Solicita una nueva al administrador de tu club.
            </Alert>
          )}

          {pageState === 'already_used' && (
            <Alert severity="info">
              Esta invitación ya fue utilizada anteriormente.
            </Alert>
          )}

          {pageState === 'done' && (
            <Alert severity="success">
              ¡Bienvenido! Te has unido a <strong>{invitation?.organization_name}</strong>.
              Redirigiendo...
            </Alert>
          )}

          {(pageState === 'valid' || pageState === 'accepting') && invitation && (
            <>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  Has sido invitado a unirte a:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Typography variant="h6">{invitation.organization_name}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={ROLE_LABELS[invitation.role] || invitation.role}
                      size="small"
                      color="primary"
                    />
                    <Chip label={invitation.email} size="small" variant="outlined" />
                  </Box>
                </Box>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              {!user ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Inicia sesión para aceptar la invitación
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={loginUrl}
                    variant="contained"
                    fullWidth
                    size="large"
                  >
                    Iniciar sesión
                  </Button>
                  <Button
                    component={RouterLink}
                    to={registerUrl}
                    variant="outlined"
                    fullWidth
                    size="large"
                  >
                    Crear cuenta
                  </Button>
                </Box>
              ) : (
                <Button
                  onClick={handleAccept}
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={accepting}
                  startIcon={accepting ? <CircularProgress size={18} /> : null}
                >
                  {accepting ? 'Aceptando...' : 'Aceptar invitación'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
