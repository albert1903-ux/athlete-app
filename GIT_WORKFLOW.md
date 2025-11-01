# Guía de Git Workflow

## Estado actual
✅ Repositorio Git inicializado  
✅ Primer commit realizado: "feat: configuración inicial del proyecto"

## Comandos Git esenciales

### Trabajo diario

#### Ver el estado actual
```bash
git status
```

#### Ver el historial de commits
```bash
git log --oneline
```

#### Ver cambios en archivos
```bash
git diff
```

### Hacer cambios

#### 1. Ver qué archivos has modificado
```bash
git status
```

#### 2. Agregar archivos al staging
```bash
# Agregar un archivo específico
git add src/components/AthleteSelector.jsx

# Agregar todos los archivos modificados
git add .

# Agregar solo archivos modificados (no elimina archivos borrados)
git add -u
```

#### 3. Hacer commit
```bash
git commit -m "feat: descripción del cambio"

# Tipos de commits comunes:
# feat: Nueva funcionalidad
# fix: Corrección de bug
# refactor: Refactorización de código
# style: Cambios de formato (espacios, etc.)
# docs: Cambios en documentación
# perf: Mejoras de rendimiento
# test: Añadir o modificar tests
```

#### Ejemplos de commits buenos:
```bash
git commit -m "feat: añadir filtro por categoría en búsqueda de atletas"
git commit -m "fix: corregir visualización de tiempos en gráficos"
git commit -m "refactor: mejorar estructura de componentes"
git commit -m "docs: actualizar README con nuevas instrucciones"
```

### Ramas (branches)

#### Ver ramas
```bash
git branch
```

#### Crear una nueva rama
```bash
git branch nombre-de-la-rama
git checkout nombre-de-la-rama

# O hacerlo en un solo paso
git checkout -b nombre-de-la-rama
```

#### Cambiar de rama
```bash
git checkout main
```

#### Eliminar una rama
```bash
git branch -d nombre-de-la-rama
```

### Deshacer cambios

#### Deshacer cambios en un archivo (antes de hacer add)
```bash
git checkout -- nombre-archivo.jsx
```

#### Quitar un archivo del staging (después de add, antes de commit)
```bash
git reset HEAD nombre-archivo.jsx
```

#### Modificar el último commit (si no lo has subido aún)
```bash
git commit --amend -m "nuevo mensaje"
```

### Conexión con repositorio remoto

#### Agregar un repositorio remoto (GitHub, GitLab, etc.)
```bash
# Primera vez
git remote add origin https://github.com/albert1903-ux/athlete-app.git
```

#### Ver repositorios remotos
```bash
git remote -v
```

#### Subir cambios al remoto
```bash
# Primera vez (solo necesitas hacerlo una vez)
git push -u origin main

# Las siguientes veces
git push
```

#### Descargar cambios del remoto
```bash
git pull
```

#### Clonar un repositorio
```bash
git clone https://github.com/tu-usuario/athlete-app.git
```

## Flujo de trabajo recomendado

### Trabajo simple (directamente en main)
1. Hacer tus cambios en el código
2. `git status` - ver qué has cambiado
3. `git add .` - agregar todos los cambios
4. `git commit -m "tipo: descripción"` - guardar cambios
5. `git push` - subir cambios (si tienes remoto configurado)

### Trabajo con ramas (recomendado para features grandes)
1. `git checkout -b feature/nueva-funcionalidad`
2. Hacer tus cambios
3. `git add .`
4. `git commit -m "feat: descripción"`
5. `git checkout main` - volver a main
6. `git merge feature/nueva-funcionalidad` - integrar cambios
7. `git branch -d feature/nueva-funcionalidad` - eliminar rama
8. `git push`

## Buenas prácticas

### ✅ Hacer commits frecuentes
- No esperes a acumular muchos cambios
- Haz commits cada vez que terminas una funcionalidad pequeña

### ✅ Mensajes claros
- Describe qué hace el commit
- Usa verbos en infinitivo: "añadir", "corregir", "mejorar"
- Sé específico: "añadir filtro por categoría" es mejor que "cambios"

### ✅ No subir .env
- Nunca hagas commit de archivos `.env` con datos reales
- Solo usa `.env.example` como plantilla

### ✅ Revisar antes de hacer push
- Usa `git log` para ver qué commits vas a subir
- Usa `git status` para asegurarte de que todo está bien

## Configuración de Git (recomendado)

### Configurar tu nombre y email
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@ejemplo.com"
```

### Configurar editor por defecto
```bash
# Para VS Code
git config --global core.editor "code --wait"
```

### Ver tu configuración
```bash
git config --list
```

## Solución de problemas comunes

### "Changes not staged for commit"
```bash
# Necesitas hacer git add primero
git add .
git commit -m "tu mensaje"
```

### "Already up to date"
- Ya tienes todos los cambios. Todo está sincronizado.

### "merge conflict"
- Git no puede fusionar automáticamente los cambios
- Necesitas resolver los conflictos manualmente
- Busca los marcadores `<<<<<<<`, `=======`, `>>>>>>>` en tus archivos
- Decide qué código mantener y elimina los marcadores

## Recursos adicionales

- [Guía oficial de Git](https://git-scm.com/docs)
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)
- [GitHub Help](https://help.github.com)

## Próximos pasos

1. Configura tu nombre y email de Git
2. Crea un repositorio en GitHub/GitLab si quieres
3. Conecta el repositorio remoto
4. Empieza a hacer commits de tus cambios

