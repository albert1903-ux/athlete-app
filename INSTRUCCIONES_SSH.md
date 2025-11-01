# 🔐 Instrucciones para Configurar SSH en GitHub

## Paso 1: Añadir tu clave SSH a GitHub

He generado una clave SSH para ti. Ahora necesitas añadirla a tu cuenta de GitHub:

### Tu clave SSH pública es:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAK6Svi2BwIlg6gFelRPnfuEtH5z1U/d+8Y9VPkAV3hk albert1903-ux@github.com
```

### Pasos para añadirla:

1. **Copia la clave completa** de arriba (incluyendo `ssh-ed25519` al inicio y el email al final)

2. **Ve a GitHub** → Inicia sesión en tu cuenta

3. **Configuración**: Haz clic en tu avatar (esquina superior derecha) → **Settings**

4. **SSH Keys**: En el menú lateral izquierdo, busca y haz clic en **"SSH and GPG keys"**

5. **Nueva clave**: Haz clic en el botón verde **"New SSH key"**

6. **Título**: Pon un nombre descriptivo, por ejemplo: "MacBook Pro - Albert"

7. **Tipo**: Asegúrate de que está en "Authentication Key"

8. **Key**: Pega la clave completa que copiaste en el paso 1

9. **Guardar**: Haz clic en **"Add SSH key"**

10. **Confirmar**: GitHub te pedirá tu contraseña para confirmar

## Paso 2: Probar la conexión

Una vez añadida la clave, ejecuta este comando para verificar:

```bash
ssh -T git@github.com
```

Deberías ver un mensaje como:
```
Hi albert1903-ux! You've successfully authenticated...
```

## Paso 3: Subir el código

Una vez verificada la conexión, ejecuta:

```bash
cd /Users/albert/Documents/athlete-app
git push -u origin main
```

¡Y listo! Tu código estará en GitHub.

---

## 📋 Resumen

✅ Clave SSH generada automáticamente  
✅ Remoto configurado para usar SSH  
⏳ **TÚ HACES:** Añadir la clave pública a GitHub (Paso 1)  
⏳ **LUEGO:** Subir el código (Paso 3)

---

## ¿Tienes problemas?

### Error "Permission denied"
- Verifica que copiaste la clave completa
- Revisa que no haya espacios extra al copiar/pegar
- Asegúrate de haber guardado la clave en GitHub

### Error "Host key verification failed"
- Ejecuta: `ssh-keyscan github.com >> ~/.ssh/known_hosts`

### Ver tu clave pública de nuevo
```bash
cat ~/.ssh/id_ed25519.pub
```

