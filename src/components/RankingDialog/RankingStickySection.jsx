import { List, Paper } from '@mui/material'
import RankingListRow from './RankingListRow'

function RankingStickySection({ stickyList, mainAthleteId, stickyAthleteIds, onAthleteSelect, onAthleteCompare }) {
  if (!stickyList || stickyList.length === 0) return null

  return (
    <Paper
      elevation={3}
      sx={{ position: 'sticky', bottom: 0, zIndex: 2, borderTop: '2px solid #e0e0e0' }}
    >
      <List dense sx={{ p: 0 }}>
        {stickyList.map((item) => (
          <RankingListRow
            key={item.atleta_id}
            item={item}
            mainAthleteId={mainAthleteId}
            stickyAthleteIds={stickyAthleteIds}
            onAthleteSelect={onAthleteSelect}
            onAthleteCompare={onAthleteCompare}
          />
        ))}
      </List>
    </Paper>
  )
}

export default RankingStickySection
