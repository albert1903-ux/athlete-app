import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import { TbUpload, TbPlayerPlay, TbChartDots } from 'react-icons/tb'

const BiomecanicaPage = () => {
    const [videoFile, setVideoFile] = useState(null)
    const [videoUrl, setVideoUrl] = useState(null)
    const [analysisData, setAnalysisData] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (file) {
            setVideoFile(file)
            setVideoUrl(URL.createObjectURL(file))
            setAnalysisData(null) // Reset previous analysis

            // Upload and analyze
            setIsAnalyzing(true)
            setUploadProgress(0)

            const formData = new FormData()
            formData.append('file', file)

            // Simulate progress (non-linear)
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    // Fast start (0-30%)
                    if (prev < 30) return prev + 5
                    // Medium speed (30-60%)
                    if (prev < 60) return prev + 2
                    // Slow down (60-80%)
                    if (prev < 80) return prev + 1
                    // Very slow finish (80-90%)
                    if (prev < 90) return prev + 0.5

                    // Cap at 90% until complete
                    return 90
                })
            }, 200)

            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
                const response = await fetch(`${apiUrl}/api/upload`, {
                    method: 'POST',
                    body: formData,
                })

                if (!response.ok) {
                    throw new Error('Error en el análisis')
                }

                const data = await response.json()
                setUploadProgress(100)
                setTimeout(() => {
                    setAnalysisData(data)
                    console.log('Análisis completado:', data)
                }, 500)
            } catch (error) {
                console.error('Error:', error)
                clearInterval(progressInterval)

                // Check if it's a network error (backend not available)
                if (error.message === 'Failed to fetch' || error.message.includes('Load failed')) {
                    alert('⚠️ Funcionalidad de análisis biomecánico disponible solo en desarrollo local.\n\nPara usar esta función:\n1. Ejecuta el backend localmente: python3 backend/app.py\n2. Asegúrate de que esté corriendo en http://localhost:5001\n3. Recarga la página y vuelve a intentar')
                } else {
                    alert('Error al procesar el video: ' + error.message)
                }
            } finally {
                clearInterval(progressInterval)
                setIsAnalyzing(false)
                setUploadProgress(0)
            }
        }
    }

    const seekToFrame = (frameNumber) => {
        if (videoRef.current && analysisData) {
            // Assuming 30fps (you can make this dynamic based on video metadata)
            const fps = 30
            const timeInSeconds = frameNumber / fps
            videoRef.current.currentTime = timeInSeconds
            videoRef.current.pause()
        }
    }

    // Draw skeleton on canvas
    useEffect(() => {
        if (!videoRef.current || !canvasRef.current || !analysisData) {
            console.log('Canvas setup check:', {
                hasVideo: !!videoRef.current,
                hasCanvas: !!canvasRef.current,
                hasData: !!analysisData
            })
            return
        }

        console.log('Setting up canvas rendering. Total frames:', analysisData.total_frames)

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        let animationFrameId = null

        const draw = () => {
            // Match canvas size to video
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                console.log('Canvas resized to:', canvas.width, 'x', canvas.height)
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Find current frame data (approximate based on time)
            const currentFrameIndex = Math.floor(video.currentTime * 30)
            const frameData = analysisData.frames.find(f => f.frame === currentFrameIndex)

            if (frameData && frameData.landmarks && frameData.landmarks.length > 0) {
                console.log('Drawing frame', currentFrameIndex, 'with', frameData.landmarks.length, 'landmarks')
                drawSkeleton(ctx, frameData.landmarks, canvas.width, canvas.height)
            } else {
                console.log('No landmarks for frame', currentFrameIndex)
            }

            // Continue drawing regardless of play state
            if (!video.ended) {
                animationFrameId = requestAnimationFrame(draw)
            }
        }

        const handlePlay = () => {
            console.log('Video playing, starting draw loop')
            draw()
        }

        const handleLoadedMetadata = () => {
            console.log('Video metadata loaded:', {
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration
            })
        }

        video.addEventListener('play', handlePlay)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)

        // Start drawing immediately if video is already playing
        if (!video.paused) {
            draw()
        }

        return () => {
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
            }
        }
    }, [analysisData])

    const drawSkeleton = (ctx, landmarks, width, height) => {
        console.log('drawSkeleton called with:', {
            landmarksCount: landmarks.length,
            canvasSize: { width, height }
        })

        // Add semi-transparent background to make skeleton visible
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(0, 0, width, height)

        // Define connections (simplified for brevity)
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
            [11, 23], [12, 24], [23, 24], // Torso
            [23, 25], [25, 27], [24, 26], [26, 28], // Legs
            [27, 29], [29, 31], [28, 30], [30, 32]  // Feet
        ]

        // Minimum visibility threshold
        const MIN_VISIBILITY = 0.5

        let drawnConnections = 0
        // Draw connections with depth-based styling
        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start]
            const endPoint = landmarks[end]

            // Only draw if both points are visible enough
            if (startPoint && endPoint &&
                startPoint.visibility > MIN_VISIBILITY &&
                endPoint.visibility > MIN_VISIBILITY) {

                // Use z-coordinate for depth (closer = smaller z value)
                const avgDepth = ((startPoint.z || 0) + (endPoint.z || 0)) / 2

                // Scale line width based on depth (closer = thicker)
                const depthScale = 1 / (1 + Math.abs(avgDepth) * 2)
                const lineWidth = 5 * Math.max(0.3, depthScale)

                // Adjust opacity based on depth
                const opacity = Math.max(0.6, 1 - Math.abs(avgDepth) * 0.5)

                ctx.strokeStyle = `rgba(0, 255, 0, ${opacity})`  // Green with depth-based opacity
                ctx.lineWidth = lineWidth

                ctx.beginPath()
                ctx.moveTo(startPoint.x * width, startPoint.y * height)
                ctx.lineTo(endPoint.x * width, endPoint.y * height)
                ctx.stroke()
                drawnConnections++
            }
        })

        // Draw landmarks with depth-based sizing
        let drawnPoints = 0
        landmarks.forEach((landmark, index) => {
            if (landmark && landmark.visibility > MIN_VISIBILITY) {
                const x = landmark.x * width
                const y = landmark.y * height
                const z = landmark.z || 0

                // Scale point size based on depth
                const depthScale = 1 / (1 + Math.abs(z) * 2)
                const radius = 8 * Math.max(0.3, depthScale)

                // Adjust opacity based on depth
                const opacity = Math.max(0.6, 1 - Math.abs(z) * 0.5)

                ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`  // Red with depth-based opacity
                ctx.beginPath()
                ctx.arc(x, y, radius, 0, 2 * Math.PI)
                ctx.fill()
                drawnPoints++
            }
        })

        console.log(`Drew ${drawnConnections} connections and ${drawnPoints} points`)
    }

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100vh',
                backgroundColor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                p: 2,
                pb: '100px', // Espacio para el BottomNavigation
                gap: 3
            }}
        >
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Análisis Biomecánico (Versión Beta)
            </Typography>

            <Typography variant="body2" color="text.secondary">
                Análisis de salto de longitud mediante visión por computadora.
            </Typography>

            {/* Warning banner for production */}
            {(!import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL.includes('localhost')) && (
                <Box sx={{
                    p: 2,
                    bgcolor: 'warning.light',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'warning.main'
                }}>
                    <Typography variant="body2" fontWeight="bold" color="warning.contrastText" sx={{ mb: 1 }}>
                        ⚠️ Funcionalidad disponible solo en desarrollo local
                    </Typography>
                    <Typography variant="caption" color="warning.contrastText">
                        Para usar el análisis biomecánico, ejecuta el backend localmente: <code>python3 backend/app.py</code>
                    </Typography>
                </Box>
            )}

            {/* Sección 1: Carga de Video */}
            <Card sx={{ borderRadius: 4, boxShadow: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 4 }}>
                    <Box sx={{ p: 2, borderRadius: '50%', backgroundColor: 'action.hover' }}>
                        <TbUpload size={40} color="#666" />
                    </Box>
                    <Typography variant="h6" align="center">
                        Cargar Video del Salto
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                        Sube un video para analizar la técnica frame a frame.
                    </Typography>
                    <Button
                        variant="contained"
                        component="label"
                        startIcon={<TbUpload />}
                        disabled={isAnalyzing}
                        sx={{ mt: 1, borderRadius: 20, textTransform: 'none' }}
                    >
                        {isAnalyzing ? 'Analizando...' : 'Seleccionar Video'}
                        <input
                            type="file"
                            hidden
                            accept="video/*"
                            onChange={handleFileUpload}
                        />
                    </Button>
                    {videoFile && (
                        <Typography variant="caption" color="success.main">
                            Archivo seleccionado: {videoFile.name}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Sección 2: Visualización (Placeholder) */}
            <Card sx={{ borderRadius: 4, boxShadow: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TbPlayerPlay size={24} />
                        <Typography variant="h6">
                            Visualización y Esqueleto
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: '100%',
                            position: 'relative',
                            backgroundColor: '#000',
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        {videoUrl ? (
                            <div style={{ position: 'relative', width: '100%' }}>
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    controls
                                    style={{ width: '100%', display: 'block' }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none'
                                    }}
                                />
                            </div>
                        ) : (
                            <Box sx={{ p: 4 }}>
                                <Typography variant="body2" color="white">
                                    Vista previa del análisis (Canvas)
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Sección 3: Métricas e Insights */}
            <Card sx={{ borderRadius: 4, boxShadow: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TbChartDots size={24} />
                        <Typography variant="h6">
                            Métricas e Insights
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {analysisData?.metrics ? (
                        <>
                            {/* Phase Indicators */}
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                Fases del Salto
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid size={4}>
                                    <Box
                                        onClick={() => seekToFrame(analysisData.metrics.takeoff_frame)}
                                        sx={{
                                            p: 2,
                                            bgcolor: 'info.light',
                                            borderRadius: 2,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.05)',
                                                boxShadow: 3
                                            }
                                        }}
                                    >
                                        <Typography variant="caption" color="info.contrastText">Despegue</Typography>
                                        <Typography variant="h6" color="info.contrastText">
                                            Frame {analysisData.metrics.takeoff_frame}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={4}>
                                    <Box
                                        onClick={() => seekToFrame(analysisData.metrics.peak_frame)}
                                        sx={{
                                            p: 2,
                                            bgcolor: 'success.light',
                                            borderRadius: 2,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.05)',
                                                boxShadow: 3
                                            }
                                        }}
                                    >
                                        <Typography variant="caption" color="success.contrastText">Pico</Typography>
                                        <Typography variant="h6" color="success.contrastText">
                                            Frame {analysisData.metrics.peak_frame}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={4}>
                                    <Box
                                        onClick={() => seekToFrame(analysisData.metrics.landing_frame)}
                                        sx={{
                                            p: 2,
                                            bgcolor: 'warning.light',
                                            borderRadius: 2,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.05)',
                                                boxShadow: 3
                                            }
                                        }}
                                    >
                                        <Typography variant="caption" color="warning.contrastText">Aterrizaje</Typography>
                                        <Typography variant="h6" color="warning.contrastText">
                                            Frame {analysisData.metrics.landing_frame}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Angle Metrics */}
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                Ángulos Articulares
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {/* Knee Angles */}
                                <Grid size={12}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>Rodilla</Typography>
                                    <Grid container spacing={1}>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Despegue</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.knee_angles.takeoff?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Pico</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.knee_angles.peak?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Aterrizaje</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.knee_angles.landing?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Grid>

                                {/* Hip Angles */}
                                <Grid size={12}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>Cadera</Typography>
                                    <Grid container spacing={1}>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Despegue</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.hip_angles.takeoff?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Pico</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.hip_angles.peak?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Aterrizaje</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.hip_angles.landing?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Grid>

                                {/* Ankle Angles */}
                                <Grid size={12}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>Tobillo</Typography>
                                    <Grid container spacing={1}>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Despegue</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.ankle_angles.takeoff?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Pico</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.ankle_angles.peak?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                <Typography variant="caption" color="text.secondary">Aterrizaje</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {analysisData.metrics.ankle_angles.landing?.toFixed(0)}°
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Max Height */}
                            <Box sx={{ p: 2, bgcolor: 'primary.main', borderRadius: 2, mb: 3 }}>
                                <Typography variant="body2" color="#ffffff" sx={{ opacity: 0.9 }}>
                                    Altura Máxima
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="#ffffff">
                                    {analysisData.metrics.max_height.toFixed(1)} cm
                                </Typography>
                            </Box>

                            {/* Insights */}
                            {analysisData.insights && analysisData.insights.length > 0 && (
                                <>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                        Recomendaciones
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {analysisData.insights.map((insight, index) => (
                                            <Grid size={12} key={index}>
                                                <Box sx={{
                                                    p: 2,
                                                    bgcolor: insight.type === 'warning' ? 'error.light' :
                                                        insight.type === 'success' ? 'success.light' : 'info.light',
                                                    borderRadius: 2,
                                                    color: insight.type === 'warning' ? 'error.contrastText' :
                                                        insight.type === 'success' ? 'success.contrastText' : 'info.contrastText'
                                                }}>
                                                    <Typography variant="body2">
                                                        {insight.message}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </>
                            )}
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                            Carga un video para ver las métricas y recomendaciones
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Loading Overlay */}
            {isAnalyzing && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        gap: 3
                    }}
                >
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <Box
                            sx={{
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                border: '8px solid rgba(255, 255, 255, 0.1)',
                                borderTop: '8px solid #1976d2',
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' }
                                }
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography variant="h5" fontWeight="bold" color="#ffffff">
                                {uploadProgress}%
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="h6" color="#ffffff" fontWeight="medium">
                        Analizando video...
                    </Typography>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        Detectando pose y calculando métricas
                    </Typography>
                </Box>
            )}
        </Box>
    )
}

export default BiomecanicaPage
