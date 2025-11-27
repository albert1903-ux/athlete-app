# Despliegue en Railway (Alternativa a Render)

## ¿Por qué Railway?

Render Free tier tiene limitaciones con MediaPipe porque no soporta bien las dependencias del sistema que MediaPipe necesita. Railway soporta Docker nativamente, lo que nos permite instalar todas las dependencias necesarias.

## Pasos para desplegar en Railway:

### 1. Crear cuenta en Railway

1. Ve a https://railway.app
2. Click en **"Start a New Project"**
3. Regístrate con GitHub (recomendado)

### 2. Crear nuevo proyecto

1. Una vez dentro, click en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Autoriza Railway a acceder a tus repositorios
4. Busca y selecciona **"athlete-app"**

### 3. Configurar el servicio

Railway detectará automáticamente el Dockerfile en `backend/`.

1. Railway te preguntará qué quieres desplegar
2. Selecciona el directorio **"backend"**
3. Railway detectará el `Dockerfile` automáticamente

### 4. Variables de entorno (opcional por ahora)

No necesitas configurar nada por ahora.

### 5. Desplegar

1. Click en **"Deploy"**
2. Espera 5-10 minutos mientras Railway construye la imagen Docker
3. Verás logs en tiempo real

### 6. Obtener la URL

1. Una vez desplegado, ve a **"Settings"** del servicio
2. Busca **"Domains"**
3. Click en **"Generate Domain"**
4. Railway te dará una URL como: `https://athlete-app-backend-production.up.railway.app`
5. **Copia esta URL**

### 7. Configurar GitHub

1. Ve a tu repositorio en GitHub: https://github.com/albert1903-ux/athlete-app
2. Settings → Secrets and variables → Actions → Variables
3. Click "New repository variable"
4. Name: `VITE_API_URL`
5. Value: La URL de Railway (ej: `https://athlete-app-backend-production.up.railway.app`)
6. Save

### 8. Redesplegar frontend

1. Ve a Actions en GitHub
2. Click en el workflow "Deploy to GitHub Pages"
3. Click "Run workflow" → "Run workflow"
4. Espera 2-3 minutos

## Ventajas de Railway vs Render

- ✅ Soporte nativo de Docker (sin configuración extra)
- ✅ Mejor manejo de dependencias del sistema
- ✅ Despliegues más rápidos
- ✅ Logs más claros
- ✅ $5 de crédito gratis al mes (suficiente para desarrollo)

## Tier Gratuito de Railway

- 500 horas de ejecución/mes
- $5 de crédito gratis/mes
- Suficiente para desarrollo y demos

## Troubleshooting

### El build falla
- Verifica que el `Dockerfile` esté en `backend/`
- Revisa los logs de build en Railway

### No puedo generar dominio
- Asegúrate de que el servicio esté desplegado (status: "Active")
- Espera unos minutos después del primer deploy

### El servicio se detiene
- Railway free tier puede pausar servicios inactivos
- La primera petición puede tardar 30-60s en "despertar"

---

**¿Listo para probar Railway?** Es mucho más compatible con MediaPipe que Render.
