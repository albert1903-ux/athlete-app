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

export default function RegisterPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            setError(signUpError.message);
        } else {
            setStep(2);
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError("El código debe tener 6 dígitos");
            return;
        }
        setLoading(true);
        setError(null);

        const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup',
        });

        if (verifyError) {
            setError(verifyError.message);
        } else {
            navigate('/seguimiento', { replace: true });
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/seguimiento'
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
                        {step === 1 ? 'Únete' : 'Verifica tu Email'}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                        {step === 1
                            ? 'Crea tu cuenta de entrenador'
                            : `Hemos enviado un código de 6 dígitos a ${email}`}
                    </Typography>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                {step === 1 ? (
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Crear Cuenta'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <TextField
                            label="Código de 6 dígitos"
                            type="text"
                            required
                            fullWidth
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '8px', fontSize: '20px' } }}
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
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Verificar y Entrar'}
                        </Button>
                        <Button
                            variant="text"
                            onClick={() => setStep(1)}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                        >
                            Volver
                        </Button>
                    </form>
                )}

                {step === 1 && (
                    <>
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
                            Regístrate con Google
                        </Button>
                    </>
                )}

                {step === 1 && (
                    <Box textAlign="center" mt={1}>
                        <Typography variant="body2" color="text.secondary">
                            ¿Ya tienes cuenta?{' '}
                            <RouterLink to="/login" style={{ color: 'var(--mui-palette-primary-main)', fontWeight: 600, textDecoration: 'none' }}>
                                Entra aquí
                            </RouterLink>
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
