import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress
} from '@mui/material';
import { TbBell } from 'react-icons/tb';
import { useNotifications } from '../hooks/useNotifications';
import { useCalendarShares } from '../hooks/useCalendarShares';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('es');

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { acceptShare, rejectShare } = useCalendarShares();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  const handleAccept = async (notification) => {
    try {
      setProcessingId(notification.id);
      await acceptShare(notification.reference_id);
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Error accepting share:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (notification) => {
    try {
      setProcessingId(notification.id);
      await rejectShare(notification.reference_id);
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Error rejecting share:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const renderNotificationContent = (notification) => {
    const senderName = notification.sender?.raw_user_meta_data?.nombre || notification.sender?.email || 'Un usuario';
    
    switch (notification.type) {
      case 'calendar_share_request':
        return (
          <Box>
            <Typography variant="body2">
              <strong>{senderName}</strong> te ha invitado a ver su calendario.
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                variant="contained" 
                color="primary"
                onClick={(e) => { e.stopPropagation(); handleAccept(notification); }}
                disabled={processingId === notification.id || notification.is_read}
              >
                Aceptar
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                color="inherit"
                onClick={(e) => { e.stopPropagation(); handleReject(notification); }}
                disabled={processingId === notification.id || notification.is_read}
              >
                Rechazar
              </Button>
            </Box>
          </Box>
        );
      case 'calendar_share_accepted':
        return (
          <Typography variant="body2">
            <strong>{senderName}</strong> ha aceptado tu invitación. Ahora puede ver tu calendario.
          </Typography>
        );
      default:
        return <Typography variant="body2">Nueva notificación</Typography>;
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-describedby={id}
        sx={{ ml: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <TbBell />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 320, maxHeight: 400, display: 'flex', flexDirection: 'column' }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontSize="1rem" fontWeight="600">
            Notificaciones
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={() => markAllAsRead()} sx={{ textTransform: 'none' }}>
              Marcar todo como leído
            </Button>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0, overflow: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No tienes notificaciones" 
                primaryTypographyProps={{ align: 'center', color: 'text.secondary', variant: 'body2' }} 
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    cursor: notification.is_read ? 'default' : 'pointer',
                    '&:hover': {
                      bgcolor: 'action.selected'
                    }
                  }}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    {renderNotificationContent(notification)}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
                    {dayjs(notification.created_at).fromNow()}
                  </Typography>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </Popover>
    </>
  );
}
