# Guía Paso a Paso: Despliegue en Render

## Paso 1: Crear Cuenta en Render

1. Ve a https://render.com
2. Click en "Get Started for Free"
3. Regístrate con GitHub (recomendado) o email

## Paso 2: Crear Web Service

1. Una vez dentro, click en **"New +"** (botón azul arriba a la derecha)
2. Selecciona **"Web Service"**
3. Click en **"Connect account"** si no has conectado GitHub aún
4. Busca y selecciona el repositorio **"athlete-app"**
5. Click en **"Connect"**

## Paso 3: Configurar el Servicio

En la página de configuración, completa los siguientes campos:

### Información Básica
- **Name**: `athlete-app-backend` (o el nombre que prefieras)
- **Region**: Selecciona **Frankfurt** o el más cercano a España
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **MUY IMPORTANTE**

### Build & Deploy
- **Runtime**: Selecciona **Python 3**
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  gunicorn app:app
  ```

### Plan
- Selecciona **Free** (0$/mes)
- ⚠️ Nota: El servicio se "dormirá" tras 15 min de inactividad

## Paso 4: Variables de Entorno (Opcional)

Por ahora no necesitas ninguna, pero si en el futuro necesitas añadir:
1. Scroll hasta "Environment Variables"
2. Click "Add Environment Variable"

## Paso 5: Crear el Servicio

1. Scroll hasta abajo
2. Click en **"Create Web Service"** (botón azul)
3. Espera 5-10 minutos mientras se despliega

## Paso 6: Obtener la URL

1. Una vez desplegado, verás un mensaje verde: "Your service is live 🎉"
2. En la parte superior verás la URL, algo como:
   ```
   https://athlete-app-backend.onrender.com
   ```
3. **COPIA ESTA URL** - la necesitarás para el siguiente paso

## Paso 7: Probar el Backend

Abre en tu navegador:
```
https://TU-URL-DE-RENDER.onrender.com/api/upload
```

Deberías ver un error 405 (Method Not Allowed) - ¡Esto es correcto! Significa que el servidor está funcionando.

## Paso 8: Configurar GitHub

1. Ve a tu repositorio en GitHub: https://github.com/albert1903-ux/athlete-app
2. Click en **Settings** (arriba)
3. En el menú izquierdo, click en **Secrets and variables** → **Actions**
4. Click en la pestaña **Variables**
5. Click en **"New repository variable"**
6. Completa:
   - **Name**: `VITE_API_URL`
   - **Value**: Tu URL de Render (ej: `https://athlete-app-backend.onrender.com`)
7. Click **"Add variable"**

## Paso 9: Forzar Redeploy

1. Ve a la pestaña **Actions** en GitHub
2. Verás el workflow "Deploy to GitHub Pages"
3. Click en **"Run workflow"** → **"Run workflow"**
4. Espera 2-3 minutos

## Paso 10: Verificar

1. Ve a https://albert1903-ux.github.io/athlete-app/biomecanica
2. Sube un video
3. ⚠️ **Primera vez**: Puede tardar 30-60 segundos (Render está "despertando")
4. Deberías ver el análisis funcionando

## Troubleshooting

### El backend no responde
- **Causa**: Render está "dormido"
- **Solución**: Espera 30-60 segundos en la primera petición

### Error CORS
- **Causa**: URL mal configurada
- **Solución**: Verifica que la URL en GitHub no tenga `/` al final

### Error 404
- **Causa**: Root Directory no configurado
- **Solución**: En Render, Settings → Root Directory = `backend`

### Build falla
- **Causa**: Dependencias incorrectas
- **Solución**: Verifica que `requirements.txt` tenga `gunicorn`

## Costos

- **Render Free Tier**: 
  - ✅ 750 horas/mes gratis
  - ✅ Suficiente para desarrollo/demo
  - ⚠️ Se duerme tras 15 min inactividad
  - ⚠️ 512 MB RAM

- **Render Starter ($7/mes)**:
  - ✅ Siempre activo (no se duerme)
  - ✅ 512 MB RAM

## Próximos Pasos

Una vez configurado, cada vez que hagas `git push` a `main`:
1. GitHub Actions rebuildeará el frontend automáticamente
2. Render rebuildeará el backend automáticamente
3. Todo se actualizará en producción

¡Listo! 🚀
