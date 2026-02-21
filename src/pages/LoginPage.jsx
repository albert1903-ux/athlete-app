import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { Typography } from '../components/ui';
import { supabase } from '../lib/supabase';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
        } else {
            navigate('/seguimiento', { replace: true });
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError(null);
        // Construimos la URL combinando el origen y la ruta base (BASE_URL) de Vite para manejar los subdirectorios
        const baseUrl = import.meta.env.BASE_URL || '/';
        const redirectPath = baseUrl.endsWith('/') ? `${baseUrl}seguimiento` : `${baseUrl}/seguimiento`;
        const redirectUrl = `${window.location.origin}${redirectPath}`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
        if (error) setError(error.message);
    };

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                px: 3,
                bgcolor: 'background.default',
            }}
        >
            <Box
                component="form"
                onSubmit={handleLogin}
                sx={{
                    width: '100%',
                    maxWidth: 400,
                    bgcolor: 'white',
                    p: 4,
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                }}
            >
                <Box textAlign="center">
                    <Typography component="h1" sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '28px', color: '#000000' }}>
                        Bienvenido
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Inicia sesión para gestionar a tus atletas
                    </Typography>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                    label="Email"
                    type="email"
                    required
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <TextField
                    label="Contraseña"
                    type="password"
                    required
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' }
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
                </Button>

                <Divider sx={{ my: 1 }}>o</Divider>

                <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleGoogleLogin}
                    startIcon={<FcGoogle size={24} />}
                    sx={{
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: 'text.primary',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' }
                    }}
                >
                    Entrar con Google
                </Button>

                <Box textAlign="center" mt={1}>
                    <Typography variant="body2" color="text.secondary">
                        ¿No tienes cuenta?{' '}
                        <RouterLink to="/register" style={{ color: 'var(--mui-palette-primary-main)', fontWeight: 600, textDecoration: 'none' }}>
                            Regístrate aquí
                        </RouterLink>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
