import { useState, useEffect } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import { TbX, TbPlus, TbBuilding, TbEdit, TbPower } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import CreateOrganizationDialog from './CreateOrganizationDialog'

const STATUS_COLOR = {
  trial: 'default',
  active: 'success',
  past_due: 'warning',
  canceled: 'error',
}

export default function OrganizationsDialog({ open, onClose }) {
  const [orgs, setOrgs] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // Edit org state
  const [editOrg, setEditOrg] = useState({ open: false, orgId: null, orgName: '', clubId: '', adminId: '', originalAdminId: '' })
  const [editUsers, setEditUsers] = useState([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)

  // Toggle active state confirmation (shared for disable and enable)
  // action: 'disable' | 'enable'
  const [toggleConfirm, setToggleConfirm] = useState({ open: false, orgId: null, orgName: '', action: null })
  const [toggling, setToggling] = useState(false)

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (open) {
      fetchOrgs()
      fetchClubs()
    }
  }, [open])

  const fetchOrgs = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_organizations')
    if (!error) setOrgs(data || [])
    setLoading(false)
  }

  const fetchClubs = async () => {
    const { data } = await supabase.from('clubes').select('club_id, nombre').order('nombre')
    if (data) setClubs(data)
  }

  const handleCreated = () => {
    setCreateOpen(false)
    fetchOrgs()
  }

  // — Edit org —
  const loadContactUsers = async (clubId, currentAdminId, currentAdminEmail, currentAdminName) => {
    if (!clubId) { setEditUsers([]); return }
    const { data } = await supabase.rpc('get_club_users_for_club', { p_club_id: clubId })
    const users = data || []
    // Always include current admin at the top if not already in the list
    if (currentAdminId && !users.find((u) => u.id === currentAdminId)) {
      users.unshift({ id: currentAdminId, email: currentAdminEmail, name: currentAdminName })
    }
    setEditUsers(users)
  }

  const handleOpenEditOrg = async (org) => {
    setEditOrg({
      open: true,
      orgId: org.id,
      orgName: org.name,
      clubId: org.club_id ?? '',
      adminId: org.admin_id ?? '',
      originalAdminId: org.admin_id ?? '',
    })
    setEditError(null)
    await loadContactUsers(org.club_id, org.admin_id, org.admin_email, org.admin_name)
  }

  const handleEditClubChange = async (newClub) => {
    setEditOrg((s) => ({ ...s, clubId: newClub?.club_id ?? '', adminId: '' }))
    await loadContactUsers(newClub?.club_id ?? null, null)
  }

  const handleSaveEditOrg = async () => {
    if (!editOrg.orgName.trim() || !editOrg.clubId) return
    setSavingEdit(true)
    setEditError(null)

    const { error: orgError } = await supabase.rpc('update_organization', {
      p_club_id: editOrg.clubId,
      p_name: editOrg.orgName.trim(),
      p_org_id: editOrg.orgId,
    })
    if (orgError) {
      setEditError('Error al guardar: ' + orgError.message)
      setSavingEdit(false)
      return
    }

    // Update contact user only if changed
    if (editOrg.adminId && editOrg.adminId !== editOrg.originalAdminId) {
      const { error: contactError } = await supabase.rpc('update_organization_contact', {
        p_contact_user_id: editOrg.adminId,
        p_org_id: editOrg.orgId,
      })
      if (contactError) {
        setEditError('Error al actualizar el usuario de contacto: ' + contactError.message)
        setSavingEdit(false)
        return
      }
    }

    setEditOrg({ open: false, orgId: null, orgName: '', clubId: '', adminId: '', originalAdminId: '' })
    setSnackbar({ open: true, message: 'Organización actualizada', severity: 'success' })
    fetchOrgs()
    setSavingEdit(false)
  }

  // — Toggle org active state —
  const handleOpenToggle = (org) => {
    setToggleConfirm({ open: true, orgId: org.id, orgName: org.name, action: org.is_active ? 'disable' : 'enable' })
  }

  const handleConfirmToggle = async () => {
    const { action, orgId, orgName } = toggleConfirm
    setToggling(true)
    const rpc = action === 'disable' ? 'disable_organization' : 'enable_organization'
    const { error } = await supabase.rpc(rpc, { p_org_id: orgId })
    if (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' })
    } else {
      const msg =
        action === 'disable'
          ? `Organización "${orgName}" deshabilitada. Los entrenadores han sido desvinculados.`
          : `Organización "${orgName}" habilitada de nuevo.`
      setSnackbar({ open: true, message: msg, severity: 'success' })
      fetchOrgs()
    }
    setToggling(false)
    setToggleConfirm({ open: false, orgId: null, orgName: '', action: null })
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TbBuilding size={20} />
            Organizaciones
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<TbPlus />}
              onClick={() => setCreateOpen(true)}
            >
              Nueva
            </Button>
            <IconButton onClick={onClose} size="small">
              <TbX />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : orgs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No hay organizaciones creadas</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {orgs.map((org, index) => (
                <ListItem
                  key={org.id}
                  divider={index < orgs.length - 1}
                  sx={{ opacity: org.is_active ? 1 : 0.5, pr: 14 }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Editar organización">
                        <IconButton size="small" onClick={() => handleOpenEditOrg(org)}>
                          <TbEdit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={org.is_active ? 'Deshabilitar organización' : 'Habilitar organización'}>
                        <IconButton
                          size="small"
                          color={org.is_active ? 'error' : 'success'}
                          onClick={() => handleOpenToggle(org)}
                        >
                          <TbPower size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {org.name}
                        <Chip
                          label={org.subscription_status}
                          size="small"
                          color={STATUS_COLOR[org.subscription_status] || 'default'}
                        />
                        {!org.is_active && (
                          <Chip label="Deshabilitada" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <span>{org.admin_email || 'Sin administrador de club asignado'}</span>
                        <span>
                          {org.club_name ? `Club: ${org.club_name}` : 'Sin club vinculado'}
                        </span>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Create org dialog */}
      <CreateOrganizationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreated}
      />

      {/* Edit org dialog */}
      <Dialog
        open={editOrg.open}
        onClose={() => !savingEdit && setEditOrg({ open: false, orgId: null, orgName: '', clubId: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Editar organización
            <IconButton
              size="small"
              onClick={() => setEditOrg({ open: false, orgId: null, orgName: '', clubId: '' })}
              disabled={savingEdit}
            >
              <TbX />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Nombre de la organización"
              value={editOrg.orgName}
              onChange={(e) => setEditOrg((s) => ({ ...s, orgName: e.target.value }))}
              fullWidth
              required
              autoFocus
            />
            <Autocomplete
              options={clubs}
              getOptionLabel={(o) => o.nombre}
              isOptionEqualToValue={(o, v) => o.club_id === v.club_id}
              value={clubs.find((c) => c.club_id === editOrg.clubId) ?? null}
              onChange={(_, newValue) => handleEditClubChange(newValue)}
              noOptionsText="No hay clubes disponibles"
              renderInput={(params) => (
                <TextField {...params} label="Club vinculado" required />
              )}
            />

            <FormControl fullWidth>
              <InputLabel>Usuario de contacto</InputLabel>
              <Select
                value={editOrg.adminId}
                onChange={(e) => setEditOrg((s) => ({ ...s, adminId: e.target.value }))}
                label="Usuario de contacto"
              >
                <MenuItem value="">
                  <em>Sin usuario de contacto</em>
                </MenuItem>
                {editUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditOrg({ open: false, orgId: null, orgName: '', clubId: '' })}
            disabled={savingEdit}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditOrg}
            disabled={!editOrg.orgName.trim() || !editOrg.clubId || savingEdit}
            startIcon={savingEdit ? <CircularProgress size={16} /> : null}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle active state confirmation dialog (shared for disable and enable) */}
      <Dialog
        open={toggleConfirm.open}
        onClose={() => !toggling && setToggleConfirm({ open: false, orgId: null, orgName: '', action: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {toggleConfirm.action === 'disable' ? 'Deshabilitar organización' : 'Habilitar organización'}
        </DialogTitle>
        <DialogContent>
          {toggleConfirm.action === 'disable' ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta acción deshabilitará la organización <strong>{toggleConfirm.orgName}</strong> y
                desvinculará a todos los entrenadores asociados (su rol pasará a ser «Sin rol»).
                Los atletas no se verán afectados.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                La organización no se eliminará y podrá volver a habilitarse en cualquier momento.
              </Typography>
            </>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Esto volverá a habilitar la organización <strong>{toggleConfirm.orgName}</strong>.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Los entrenadores que fueron desvinculados al deshabilitar la organización no se
                restaurarán automáticamente y deberán ser reinvitados.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setToggleConfirm({ open: false, orgId: null, orgName: '', action: null })}
            disabled={toggling}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={toggleConfirm.action === 'disable' ? 'error' : 'success'}
            onClick={handleConfirmToggle}
            disabled={toggling}
            startIcon={
              toggling ? (
                <CircularProgress size={16} />
              ) : (
                <TbPower size={16} />
              )
            }
          >
            {toggleConfirm.action === 'disable' ? 'Deshabilitar' : 'Habilitar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
