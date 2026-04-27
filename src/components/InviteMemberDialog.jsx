import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import { TbX, TbUserPlus, TbCopy, TbCheck } from 'react-icons/tb'
import { supabase } from '../lib/supabase'

const ROLE_LABELS = {
  trainer: 'Entrenador',
  athlete: 'Atleta',
  club: 'Club',
}

export default function InviteMemberDialog({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('trainer')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [inviteLink, setInviteLink] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setEmail('')
    setRole('trainer')
    setError(null)
    setInviteLink(null)
    setCopied(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (!email.trim()) return

    setSaving(true)
    setError(null)

    const { data: token, error: rpcError } = await supabase.rpc('invite_member', {
      invite_email: email.trim(),
      invite_role: role,
    })

    if (rpcError) {
      setError('Error al crear invitación: ' + rpcError.message)
    } else {
      const link = `${window.location.origin}${import.meta.env.BASE_URL || '/'}join?token=${token}`
      setInviteLink(link)
      onSuccess?.()
    }

    setSaving(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TbUserPlus size={20} />
          Invitar miembro
        </Box>
        <IconButton onClick={handleClose} size="small">
          <TbX />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {inviteLink ? (
            <>
              <Alert severity="success">
                Invitación creada. Comparte este enlace con {email}:
              </Alert>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  wordBreak: 'break-all',
                }}
              >
                <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {inviteLink}
                </Typography>
                <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                  {copied ? <TbCheck /> : <TbCopy />}
                </IconButton>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                El usuario recibirá un enlace para unirse a tu organización con el rol seleccionado.
              </Typography>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                autoFocus
                required
              />
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select value={role} onChange={(e) => setRole(e.target.value)} label="Rol">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {inviteLink ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!inviteLink && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!email.trim() || saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            Enviar invitación
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
