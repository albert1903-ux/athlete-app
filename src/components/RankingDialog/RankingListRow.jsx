import { Box, ListItem, ListItemText, IconButton, Typography } from '@mui/material'
import { TbSwords } from 'react-icons/tb'
import { getColorForAthlete } from '../../utils/athleteColors'

function RankingListRow({ item, mainAthleteId, stickyAthleteIds, onAthleteSelect, onAthleteCompare }) {
  const isMain = String(item.atleta_id) === String(mainAthleteId)
  const isComparator = stickyAthleteIds.has(String(item.atleta_id)) && !isMain

  let bgColor = 'transparent'
  if (isMain) bgColor = 'rgba(25, 118, 210, 0.08)'
  else if (isComparator) bgColor = 'rgba(156, 39, 176, 0.08)'

  // eslint-disable-next-line no-unused-vars
  const color = isMain
    ? getColorForAthlete(item.atleta_id, true)
    : isComparator
      ? getColorForAthlete(item.atleta_id)
      : 'inherit'

  const handleAthleteClick = () => {
    if (onAthleteSelect && item.atletas) {
      onAthleteSelect({
        ...item.atletas,
        fecha_nacimiento: item.atletas.fecha_nac,
        club: item.clubes?.nombre || 'Sin club'
      })
    }
  }

  const handleCompareClick = (e) => {
    e.stopPropagation()
    if (onAthleteCompare && item.atletas) {
      onAthleteCompare({
        ...item.atletas,
        fecha_nacimiento: item.atletas.fecha_nac,
        club: item.clubes?.nombre || 'Sin club'
      })
    }
  }

  return (
    <ListItem
      sx={{ bgcolor: bgColor, borderBottom: '1px solid #f0f0f0', py: 0.5 }}
    >
      <Box sx={{ minWidth: 30, mr: 1, display: 'flex', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold">
          {item.rank}
        </Typography>
      </Box>
      <ListItemText
        primary={
          <Typography
            variant="body2"
            fontWeight={isMain || isComparator ? 'bold' : 'normal'}
            color="primary.main"
            sx={{ cursor: 'pointer', textDecoration: 'underline', '&:hover': { textDecoration: 'underline' } }}
            onClick={handleAthleteClick}
          >
            {item.atletas?.nombre || 'Desconocido'}
          </Typography>
        }
        secondary={
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              {item.clubes?.nombre || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {item.atletas?.fecha_nac ? new Date(item.atletas.fecha_nac).toLocaleDateString() : '-'}
            </Typography>
          </Box>
        }
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Typography variant="body2" fontWeight="bold">
            {item.marca_texto || item.marca_valor} {item.unidad}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textAlign: 'right' }}>
            {new Date(item.fecha).toLocaleDateString()}
            {item.age && ` • ${item.age} años`}
          </Typography>
        </Box>
        <IconButton
          size="small"
          color="primary"
          onClick={handleCompareClick}
          title="Comparar (VS)"
          sx={{ ml: 0.5, p: 0.5, transition: 'background-color 0.2s' }}
        >
          <TbSwords size={18} />
        </IconButton>
      </Box>
    </ListItem>
  )
}

export default RankingListRow
