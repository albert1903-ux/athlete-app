# Guía de Despliegue del Backend

El backend de análisis biomecánico necesita estar desplegado en un servidor para funcionar en producción (GitHub Pages).

## Opción 1: Desplegar en Render (Recomendado - Gratis)

### Pasos:

1. **Crear cuenta en Render**: https://render.com

2. **Crear nuevo Web Service**:
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio `athlete-app`

3. **Configuración del servicio**:
   ```
   Name: athlete-app-backend
   Region: Frankfurt (o el más cercano)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn app:app
   ```

4. **Añadir gunicorn a requirements.txt**:
   ```bash
   cd backend
   echo "gunicorn==21.2.0" >> requirements.txt
   ```

5. **Variables de entorno** (en Render):
   - No necesitas ninguna por ahora

6. **Desplegar**: Click en "Create Web Service"

7. **Obtener URL**: Render te dará una URL como `https://athlete-app-backend.onrender.com`

8. **Configurar en GitHub Pages**:
   - Ve a Settings → Secrets and variables → Actions
   - Añade: `VITE_API_URL` = `https://athlete-app-backend.onrender.com`

## Opción 2: Railway

Similar a Render pero con diferentes límites gratuitos.

1. Ir a https://railway.app
2. Conectar GitHub
3. Deploy desde el directorio `backend`
4. Configurar variables de entorno en producción

## Opción 3: PythonAnywhere

Servicio específico para Python, con tier gratuito limitado.

## Configuración Local vs Producción

### Desarrollo Local:
```bash
# .env.local (no commitear)
VITE_API_URL=http://localhost:5001
```

### Producción (GitHub Pages):
- Configurar `VITE_API_URL` en GitHub Secrets
- O usar la URL del backend desplegado directamente

## Notas Importantes

⚠️ **El backend DEBE estar desplegado** para que funcione en producción (GitHub Pages)

⚠️ **CORS**: El backend ya tiene CORS configurado para aceptar todas las origins

⚠️ **Render Free Tier**: El servicio se "duerme" después de 15 minutos de inactividad. La primera petición puede tardar 30-60 segundos en despertar.

## Próximos Pasos

1. Desplegar backend en Render
2. Obtener URL del backend
3. Configurar `VITE_API_URL` en GitHub Actions
4. Rebuild y redeploy del frontend
