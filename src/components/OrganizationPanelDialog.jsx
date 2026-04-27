import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { TbX, TbPlus, TbUserMinus, TbBuilding } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import InviteMemberDialog from './InviteMemberDialog'
import GroupsTab from './GroupsTab'

const ROLE_LABELS = {
  trainer: 'Entrenador',
  athlete: 'Atleta',
  club: 'Club',
  consulta: 'Consulta',
}

const STATUS_COLOR = {
  pending: 'warning',
  accepted: 'success',
  revoked: 'default',
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function OrganizationPanelDialog({ open, onClose }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [revoking, setRevoking] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (open) {
      fetchAll()
    }
  }, [open])

  const fetchAll = async () => {
    setLoading(true)
    const [membersRes, invitationsRes] = await Promise.all([
      supabase.rpc('get_organization_members'),
      supabase.rpc('get_organization_invitations'),
    ])
    if (!membersRes.error) setMembers(membersRes.data || [])
    if (!invitationsRes.error) setInvitations(invitationsRes.data || [])
    setLoading(false)
  }

  const handleRemoveMember = async (memberId, memberRole) => {
    if (memberRole === 'club') return
    if (!window.confirm('¿Eliminar este miembro de la organización?')) return

    setRemoving(memberId)
    const { error } = await supabase.rpc('remove_organization_member', {
      target_user_id: memberId,
    })

    if (error) {
      setSnackbar({ open: true, message: 'Error al eliminar miembro', severity: 'error' })
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setSnackbar({ open: true, message: 'Miembro eliminado', severity: 'success' })
    }
    setRemoving(null)
  }

  const handleRevokeInvitation = async (invitationId) => {
    setRevoking(invitationId)
    const { error } = await supabase.rpc('revoke_invitation', {
      invitation_id: invitationId,
    })

    if (error) {
      setSnackbar({ open: true, message: 'Error al revocar invitación', severity: 'error' })
    } else {
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === invitationId ? { ...inv, status: 'revoked' } : inv))
      )
      setSnackbar({ open: true, message: 'Invitación revocada', severity: 'success' })
    }
    setRevoking(null)
  }

  const handleInviteSuccess = () => {
    setInviteOpen(false)
    supabase.rpc('get_organization_invitations').then(({ data }) => {
      if (data) setInvitations(data)
    })
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TbBuilding size={20} />
            Mi Organización
          </Box>
          <IconButton onClick={onClose} size="small">
            <TbX />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Miembros (${members.length})`} />
          <Tab label={`Invitaciones (${invitations.length})`} />
          <Tab label="Grupos" />
        </Tabs>

        <DialogContent dividers sx={{ p: 0, minHeight: 300 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : activeTab === 0 ? (
            members.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No hay miembros en tu organización</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {members.map((member, index) => (
                  <ListItem
                    key={member.id}
                    divider={index < members.length - 1}
                    secondaryAction={
                      <IconButton
                        size="small"
                        color="error"
                        disabled={member.role === 'club' || removing === member.id}
                        onClick={() => handleRemoveMember(member.id, member.role)}
                      >
                        {removing === member.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <TbUserMinus />
                        )}
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                        {(member.name || member.email || '?')[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {member.name || member.email}
                          <Chip
                            label={ROLE_LABELS[member.role] || member.role}
                            size="small"
                            color={member.role === 'club' ? 'primary' : 'default'}
                          />
                        </Box>
                      }
                      secondary={member.name ? member.email : null}
                    />
                  </ListItem>
                ))}
              </List>
            )
          ) : activeTab === 2 ? (
            <GroupsTab />
          ) : (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<TbPlus />}
                  onClick={() => setInviteOpen(true)}
                >
                  Invitar miembro
                </Button>
              </Box>
              {invitations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No hay invitaciones enviadas</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {invitations.map((inv, index) => (
                    <ListItem
                      key={inv.id}
                      divider={index < invitations.length - 1}
                      secondaryAction={
                        inv.status === 'pending' && (
                          <IconButton
                            size="small"
                            disabled={revoking === inv.id}
                            onClick={() => handleRevokeInvitation(inv.id)}
                          >
                            {revoking === inv.id ? <CircularProgress size={16} /> : <TbX />}
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={inv.email}
                        secondary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={ROLE_LABELS[inv.role] || inv.role}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={inv.status}
                              size="small"
                              color={STATUS_COLOR[inv.status] || 'default'}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(inv.created_at)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={handleInviteSuccess}
      />

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
