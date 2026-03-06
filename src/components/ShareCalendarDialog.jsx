import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { useCalendarShares } from '../hooks/useCalendarShares';

export default function ShareCalendarDialog({ open, onClose }) {
  const { requestShare } = useCalendarShares();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleShare = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, introduce un email válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await requestShare(email.trim());
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.message.includes('not found')) {
        setError('No se ha encontrado a ningún usuario con este email.');
      } else if (err.message.includes('yourself')) {
        setError('No puedes compartir el calendario contigo mismo.');
      } else {
        setError('Error al enviar la invitación. Es posible que ya exista una solicitud pendiente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Compartir mi calendario</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Introduce el email de la persona con la que quieres compartir tu calendario. Le enviaremos una notificación para que apruebe la solicitud.
        </DialogContentText>
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ¡Invitación enviada con éxito!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          margin="dense"
          id="email"
          label="Email del usuario"
          type="email"
          fullWidth
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || success}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleShare();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {success ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!success && (
          <Button 
            onClick={handleShare} 
            variant="contained" 
            disabled={loading || !email.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Enviar Invitación
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
