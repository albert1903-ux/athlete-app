# Guía de Despliegue del Backend

El backend de análisis biomecánico está diseñado para funcionar en un entorno que soporte Python y las librerías necesarias (MediaPipe, OpenCV).

## Desarrollo Local (Recomendado Actual)

Para ejecutar el backend localmente:

1. **Instalar dependencias**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Ejecutar servidor**:
   ```bash
   python3 app.py
   ```
   El servidor iniciará en `http://localhost:5001`.

3. **Configurar Frontend**:
   El frontend detectará automáticamente si el backend no está disponible en producción y mostrará un mensaje para ejecutarlo localmente.

## Consideraciones para Producción

Si deseas desplegar el backend en un servidor de producción, ten en cuenta:

1. **Requisitos del Sistema**:
   - Python 3.10+
   - Librerías de sistema para OpenCV (`libgl1`, `libglib2.0-0`)
   - CPU suficiente para inferencia de MediaPipe

2. **Docker**:
   Se incluye un `Dockerfile` en la carpeta `backend/` que contiene toda la configuración necesaria para crear una imagen compatible.

3. **Variables de Entorno**:
   - El frontend necesita saber la URL del backend mediante `VITE_API_URL`.

## Notas Importantes

⚠️ **Funcionalidad Local**: Actualmente, la funcionalidad de análisis biomecánico está optimizada para ejecutarse localmente debido a los requerimientos de cómputo de MediaPipe.

⚠️ **CORS**: El backend tiene CORS configurado para aceptar peticiones desde cualquier origen.
