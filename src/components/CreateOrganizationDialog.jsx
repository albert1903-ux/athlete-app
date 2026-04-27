import { useState, useEffect } from 'react'
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
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { TbX, TbBuilding } from 'react-icons/tb'
import { supabase } from '../lib/supabase'

export default function CreateOrganizationDialog({ open, onClose, onSuccess }) {
  const [orgName, setOrgName] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedClubId, setSelectedClubId] = useState('')
  const [users, setUsers] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (open) {
      setOrgName('')
      setSelectedUserId('')
      setSelectedClubId('')
      setError(null)
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    setLoading(true)
    const [usersResult, clubsResult] = await Promise.all([
      supabase.rpc('get_approved_users_without_org'),
      supabase.from('clubes').select('club_id, nombre').order('nombre'),
    ])
    if (usersResult.error) {
      setError('Error al cargar usuarios: ' + usersResult.error.message)
    } else {
      setUsers(usersResult.data || [])
    }
    if (clubsResult.error) {
      setError('Error al cargar clubes: ' + clubsResult.error.message)
    } else {
      setClubs(clubsResult.data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!orgName.trim() || !selectedUserId || !selectedClubId) return

    setSaving(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('create_organization', {
      org_name: orgName.trim(),
      admin_user_id: selectedUserId,
      club_id: selectedClubId,
    })

    if (rpcError) {
      setError('Error al crear organización: ' + rpcError.message)
    } else {
      setSnackbar({ open: true, message: 'Organización creada correctamente', severity: 'success' })
      onSuccess?.()
      onClose()
    }

    setSaving(false)
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TbBuilding size={20} />
            Nueva organización
          </Box>
          <IconButton onClick={onClose} size="small">
            <TbX />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nombre de la organización"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              fullWidth
              autoFocus
              required
            />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <FormControl fullWidth required>
                  <InputLabel>Club vinculado</InputLabel>
                  <Select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    label="Club vinculado"
                  >
                    {clubs.length === 0 && (
                      <MenuItem disabled value="">
                        No hay clubes disponibles
                      </MenuItem>
                    )}
                    {clubs.map((c) => (
                      <MenuItem key={c.club_id} value={c.club_id}>
                        {c.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Usuario de contacto</InputLabel>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    label="Usuario de contacto"
                  >
                    {users.length === 0 && (
                      <MenuItem disabled value="">
                        No hay usuarios disponibles
                      </MenuItem>
                    )}
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!orgName.trim() || !selectedUserId || !selectedClubId || saving || loading}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            Crear organización
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
