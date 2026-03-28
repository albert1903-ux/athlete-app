import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import { TbCalendar, TbUser } from 'react-icons/tb'

function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, px: 1 }}>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          border: '1px solid #e0e0e0',
          borderRadius: '20px',
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
        <Tooltip title="Vista por Fecha">
          <IconButton
            size="small"
            onClick={() => onViewModeChange('fecha')}
            sx={{
              borderRadius: 0,
              px: 2,
              py: 0.5,
              bgcolor: viewMode === 'fecha' ? '#f5f5f5' : 'transparent',
              color: viewMode === 'fecha' ? 'primary.main' : '#757575',
              '&:hover': { bgcolor: viewMode === 'fecha' ? '#eeeeee' : '#fafafa' }
            }}
          >
            <TbCalendar size={18} />
            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: viewMode === 'fecha' ? 600 : 400 }}>
              Fecha
            </Typography>
          </IconButton>
        </Tooltip>
        <Box sx={{ width: '1px', bgcolor: 'action.selected' }} />
        <Tooltip title="Vista por Edad">
          <IconButton
            size="small"
            onClick={() => onViewModeChange('edad')}
            sx={{
              borderRadius: 0,
              px: 2,
              py: 0.5,
              bgcolor: viewMode === 'edad' ? '#f5f5f5' : 'transparent',
              color: viewMode === 'edad' ? 'primary.main' : '#757575',
              '&:hover': { bgcolor: viewMode === 'edad' ? '#eeeeee' : '#fafafa' }
            }}
          >
            <TbUser size={18} />
            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: viewMode === 'edad' ? 600 : 400 }}>
              Edad
            </Typography>
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  )
}

export default ViewModeToggle
