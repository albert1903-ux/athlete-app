import { useMemo } from 'react'
import {
  Typography,
  Box,
  CircularProgress,
  List,
  Select,
  MenuItem,
  FormControl
} from '@mui/material'
import { Modal } from './ui'
import { PiRanking } from 'react-icons/pi'
import { useRankingYears } from '../hooks/useRankingYears'
import { useRankingData } from '../hooks/useRankingData'
import RankingListRow from './RankingDialog/RankingListRow'
import RankingStickySection from './RankingDialog/RankingStickySection'

function RankingDialog({
  open,
  onClose,
  prueba,
  categoria,
  mainAthleteId,
  comparatorAthletes = [],
  genderFilter = null,
  onAthleteSelect,
  onAthleteCompare
}) {
  const { years, selectedYear, setSelectedYear } = useRankingYears()

  const stickyAthleteIds = useMemo(() => {
    const ids = new Set()
    if (mainAthleteId) ids.add(String(mainAthleteId))
    comparatorAthletes.forEach((a) => {
      if (a.atleta_id) ids.add(String(a.atleta_id))
      else if (a.atletaId) ids.add(String(a.atletaId))
    })
    return ids
  }, [mainAthleteId, comparatorAthletes])

  const { loading, error, top50, stickyList } = useRankingData({
    open,
    prueba,
    categoria,
    stickyAthleteIds,
    genderFilter,
    selectedYear,
    mainAthleteId
  })

  const rowProps = { mainAthleteId, stickyAthleteIds, onAthleteSelect, onAthleteCompare }

  return (
    <Modal.Root open={open} onClose={onClose} maxWidth="sm">
      <Modal.Header onClose={onClose}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PiRanking size={24} />
            Ranking Top 50
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {prueba?.nombre} • {categoria?.label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              displayEmpty
              variant="outlined"
              sx={{ height: 32, fontSize: '0.875rem' }}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
              <MenuItem value="historic">Histórico</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Modal.Header>

      <Modal.Body sx={{ p: 0, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            <List dense sx={{ overflow: 'auto', flex: 1, p: 0 }}>
              {top50.map((item) => (
                <RankingListRow key={item.atleta_id} item={item} {...rowProps} />
              ))}
              {top50.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No hay resultados registrados</Typography>
                </Box>
              )}
            </List>
            <RankingStickySection stickyList={stickyList} {...rowProps} />
          </>
        )}
      </Modal.Body>
    </Modal.Root>
  )
}

export default RankingDialog
