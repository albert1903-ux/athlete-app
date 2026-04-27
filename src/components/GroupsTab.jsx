import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import { TbPlus, TbTrash, TbChevronDown, TbChevronUp, TbUsers, TbUserMinus, TbLink, TbUnlink } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function GroupsTab() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [trainers, setTrainers] = useState([])
  const [clubAthletes, setClubAthletes] = useState([])
  const [athleteUsers, setAthleteUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Expand/add-athlete state
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [addAthleteGroupId, setAddAthleteGroupId] = useState(null)
  const [athleteSearch, setAthleteSearch] = useState('')
  const [addingAthlete, setAddingAthlete] = useState(false)

  // Link-account state per athlete
  const [linkingAtletaId, setLinkingAtletaId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [linkingInProgress, setLinkingInProgress] = useState(false)

  // Create group form
  const [createOpen, setCreateOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupTrainerId, setNewGroupTrainerId] = useState('')
  const [creating, setCreating] = useState(false)

  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true)
    const [groupsRes, membersRes, athletesRes, athleteUsersRes] = await Promise.all([
      supabase
        .from('trainer_groups')
        .select('id, name, trainer_user_id, created_at, group_athletes(id, atleta_id, atletas(atleta_id, nombre, user_id))')
        .order('name'),
      supabase.rpc('get_organization_members'),
      supabase.rpc('get_club_athletes'),
      supabase.rpc('get_athlete_users'),
    ])

    if (groupsRes.error) setError('Error al cargar grupos: ' + groupsRes.error.message)
    else setGroups(groupsRes.data || [])

    if (!membersRes.error) setTrainers((membersRes.data || []).filter((m) => m.role === 'trainer'))

    if (!athletesRes.error) setClubAthletes(athletesRes.data || [])

    if (!athleteUsersRes.error) setAthleteUsers(athleteUsersRes.data || [])

    setLoading(false)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupTrainerId) return
    setCreating(true)
    const { error: insertError } = await supabase.from('trainer_groups').insert({
      name: newGroupName.trim(),
      trainer_user_id: newGroupTrainerId,
      organization_id: user.organization_id,
    })
    if (insertError) {
      setError('Error al crear grupo: ' + insertError.message)
    } else {
      setCreateOpen(false)
      setNewGroupName('')
      setNewGroupTrainerId('')
      await fetchAll()
    }
    setCreating(false)
  }

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('¿Eliminar este grupo y sus asignaciones de atletas?')) return
    setDeleting(groupId)
    const { error: deleteError } = await supabase.from('trainer_groups').delete().eq('id', groupId)
    if (deleteError) {
      setError('Error al eliminar grupo: ' + deleteError.message)
    } else {
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
      if (expandedGroup === groupId) setExpandedGroup(null)
    }
    setDeleting(null)
  }

  const handleAddAthlete = async (groupId, atletaId) => {
    setAddingAthlete(true)
    const { error: insertError } = await supabase
      .from('group_athletes')
      .insert({ group_id: groupId, atleta_id: atletaId })
    if (insertError && !insertError.message.includes('duplicate')) {
      setError('Error al añadir atleta: ' + insertError.message)
    } else {
      setAddAthleteGroupId(null)
      setAthleteSearch('')
      await fetchAll()
    }
    setAddingAthlete(false)
  }

  const handleRemoveAthlete = async (groupAthleteId) => {
    const { error: deleteError } = await supabase
      .from('group_athletes')
      .delete()
      .eq('id', groupAthleteId)
    if (deleteError) {
      setError('Error al eliminar atleta del grupo: ' + deleteError.message)
    } else {
      await fetchAll()
    }
  }

  const handleLinkAccount = async (atletaId) => {
    if (!selectedUserId) return
    setLinkingInProgress(true)
    const { error: linkError } = await supabase.rpc('link_athlete_to_user', {
      p_atleta_id: atletaId,
      p_user_id: selectedUserId,
    })
    if (linkError) {
      setError('Error al vincular cuenta: ' + linkError.message)
    } else {
      setLinkingAtletaId(null)
      setSelectedUserId('')
      await fetchAll()
    }
    setLinkingInProgress(false)
  }

  const handleUnlinkAccount = async (atletaId) => {
    setLinkingInProgress(true)
    const { error: unlinkError } = await supabase.rpc('unlink_athlete_user', {
      p_atleta_id: atletaId,
    })
    if (unlinkError) {
      setError('Error al desvincular cuenta: ' + unlinkError.message)
    } else {
      await fetchAll()
    }
    setLinkingInProgress(false)
  }

  const trainerLabel = (trainerId) => {
    const t = trainers.find((m) => m.id === trainerId)
    return t?.name || t?.email || 'Sin entrenador'
  }

  // Build a lookup map: user_id → display info
  const athleteUserMap = athleteUsers.reduce((acc, u) => {
    acc[u.id] = u.display_name || u.email
    return acc
  }, {})

  // Available users: those not already linked to any athlete in this club's groups
  const linkedUserIds = new Set(
    groups.flatMap((g) =>
      (g.group_athletes || [])
        .map((ga) => ga.atletas?.user_id)
        .filter(Boolean)
    )
  )
  const availableUsers = athleteUsers.filter((u) => !linkedUserIds.has(u.id))

  const filteredAthletes = clubAthletes.filter((a) =>
    a.nombre.toLowerCase().includes(athleteSearch.toLowerCase())
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Create group form */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {!createOpen ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<TbPlus />}
            onClick={() => setCreateOpen(true)}
          >
            Nuevo grupo
          </Button>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle2">Crear nuevo grupo</Typography>
            <TextField
              label="Nombre del grupo"
              size="small"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder='Ej: SUB10, SUB12 Fem…'
              autoFocus
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Entrenador</InputLabel>
              <Select
                value={newGroupTrainerId}
                onChange={(e) => setNewGroupTrainerId(e.target.value)}
                label="Entrenador"
              >
                {trainers.length === 0 && (
                  <MenuItem disabled value="">
                    Sin entrenadores en la organización
                  </MenuItem>
                )}
                {trainers.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name || t.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || !newGroupTrainerId || creating}
                startIcon={creating ? <CircularProgress size={14} /> : null}
              >
                Crear
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setCreateOpen(false)
                  setNewGroupName('')
                  setNewGroupTrainerId('')
                }}
              >
                Cancelar
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Groups list */}
      {groups.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No hay grupos creados todavía</Typography>
        </Box>
      ) : (
        <List disablePadding>
          {groups.map((group, index) => {
            const isExpanded = expandedGroup === group.id
            const isAddingToThis = addAthleteGroupId === group.id
            const assignedAthleteIds = new Set((group.group_athletes || []).map((ga) => ga.atleta_id))

            return (
              <Box key={group.id}>
                <ListItem
                  divider={index < groups.length - 1 && !isExpanded}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                        aria-label={isExpanded ? 'Colapsar grupo' : 'Expandir grupo'}
                      >
                        {isExpanded ? <TbChevronUp /> : <TbChevronDown />}
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deleting === group.id}
                        onClick={() => handleDeleteGroup(group.id)}
                        aria-label="Eliminar grupo"
                      >
                        {deleting === group.id ? <CircularProgress size={16} /> : <TbTrash />}
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TbUsers size={16} />
                        <Typography fontWeight={600}>{group.name}</Typography>
                        <Chip
                          label={`${(group.group_athletes || []).length} atletas`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={`Entrenador: ${trainerLabel(group.trainer_user_id)}`}
                  />
                </ListItem>

                {/* Expandable: athletes in group + add athlete */}
                <Collapse in={isExpanded} unmountOnExit>
                  <Box
                    sx={{
                      pl: 3,
                      pr: 2,
                      pb: 2,
                      borderBottom: index < groups.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                    }}
                  >
                    {(group.group_athletes || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                        No hay atletas en este grupo
                      </Typography>
                    ) : (
                      <List dense disablePadding sx={{ mb: 1 }}>
                        {group.group_athletes.map((ga) => {
                          const linkedUserId = ga.atletas?.user_id
                          const isLinkingThis = linkingAtletaId === ga.atleta_id
                          const usersForThisAthlete = linkedUserId
                            ? availableUsers.concat(
                                athleteUsers.filter((u) => u.id === linkedUserId)
                              )
                            : availableUsers

                          return (
                            <ListItem
                              key={ga.id}
                              dense
                              sx={{ px: 0, flexDirection: 'column', alignItems: 'flex-start' }}
                            >
                              <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                                <ListItemText
                                  primary={ga.atletas?.nombre || `Atleta ${ga.atleta_id}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondary={
                                    linkedUserId
                                      ? `Cuenta: ${athleteUserMap[linkedUserId] || linkedUserId}`
                                      : 'Sin cuenta vinculada'
                                  }
                                  secondaryTypographyProps={{
                                    variant: 'caption',
                                    color: linkedUserId ? 'success.main' : 'text.disabled',
                                  }}
                                />
                                <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto', flexShrink: 0 }}>
                                  {linkedUserId ? (
                                    <Tooltip title="Desvincular cuenta">
                                      <IconButton
                                        size="small"
                                        color="warning"
                                        disabled={linkingInProgress}
                                        onClick={() => handleUnlinkAccount(ga.atleta_id)}
                                      >
                                        <TbUnlink size={14} />
                                      </IconButton>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="Vincular cuenta">
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => {
                                          setLinkingAtletaId(ga.atleta_id)
                                          setSelectedUserId('')
                                        }}
                                      >
                                        <TbLink size={14} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveAthlete(ga.id)}
                                    aria-label="Quitar atleta del grupo"
                                  >
                                    <TbUserMinus size={14} />
                                  </IconButton>
                                </Box>
                              </Box>

                              {/* Inline link-account picker */}
                              {isLinkingThis && (
                                <Box sx={{ width: '100%', mt: 0.5, pl: 0, display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                                    <InputLabel>Seleccionar cuenta</InputLabel>
                                    <Select
                                      value={selectedUserId}
                                      onChange={(e) => setSelectedUserId(e.target.value)}
                                      label="Seleccionar cuenta"
                                    >
                                      {usersForThisAthlete.length === 0 && (
                                        <MenuItem disabled value="">Sin cuentas atleta disponibles</MenuItem>
                                      )}
                                      {usersForThisAthlete.map((u) => (
                                        <MenuItem key={u.id} value={u.id}>
                                          {u.display_name || u.email}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={!selectedUserId || linkingInProgress}
                                    onClick={() => handleLinkAccount(ga.atleta_id)}
                                    startIcon={linkingInProgress ? <CircularProgress size={12} /> : null}
                                  >
                                    Vincular
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setLinkingAtletaId(null)
                                      setSelectedUserId('')
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </Box>
                              )}
                            </ListItem>
                          )
                        })}
                      </List>
                    )}

                    {/* Add athlete picker */}
                    {!isAddingToThis ? (
                      <Button
                        size="small"
                        startIcon={<TbPlus />}
                        onClick={() => {
                          setAddAthleteGroupId(group.id)
                          setAthleteSearch('')
                        }}
                      >
                        Añadir atleta
                      </Button>
                    ) : (
                      <Box sx={{ mt: 1 }}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Buscar atleta del club"
                          value={athleteSearch}
                          onChange={(e) => setAthleteSearch(e.target.value)}
                          autoFocus
                          sx={{ mb: 1 }}
                        />
                        {clubAthletes.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            No hay atletas con resultados registrados en tu club
                          </Typography>
                        ) : (
                          <List
                            dense
                            disablePadding
                            sx={{ maxHeight: 180, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
                          >
                            {filteredAthletes
                              .filter((a) => !assignedAthleteIds.has(a.atleta_id))
                              .map((a) => (
                                <ListItem
                                  key={a.atleta_id}
                                  dense
                                  sx={{
                                    cursor: addingAthlete ? 'default' : 'pointer',
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }}
                                  onClick={() =>
                                    !addingAthlete && handleAddAthlete(group.id, a.atleta_id)
                                  }
                                >
                                  <ListItemText
                                    primary={a.nombre}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                  />
                                </ListItem>
                              ))}
                          </List>
                        )}
                        <Button
                          size="small"
                          sx={{ mt: 0.5 }}
                          onClick={() => {
                            setAddAthleteGroupId(null)
                            setAthleteSearch('')
                          }}
                        >
                          Cancelar
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </List>
      )}
    </Box>
  )
}
