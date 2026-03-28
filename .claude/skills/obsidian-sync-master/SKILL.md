---
name: obsidian-sync-master
description: "Documenta en la bóveda Obsidian los procesos ejecutados en la sesión actual. Crea una entrada de bitácora con resumen técnico de acciones, resultados y próximos pasos. Triggers: obsidian sync, document session, actualizar bóveda, documentar sesión, sync obsidian, registrar progreso, vault update."
---

# obsidian-sync-master — Documentador de Sesiones para la Bóveda

Crea o actualiza una entrada de bitácora en `docs/boveda-athlete-app/04_BITACORA/` con el resumen técnico de la sesión actual.

## Workflow obligatorio

### Paso 1 — Recopilar contexto de la sesión

Ejecuta estos comandos para reunir los hechos de la sesión:

**Commits de la sesión:**
```bash
git -C /Users/albert/Documents/athlete-app log --oneline --since="12 hours ago" --format="%h %s (%ci)"
```

**Log automático de comandos** (si existe):
Lee `docs/boveda-athlete-app/04_BITACORA/_session_log.md`.

**Archivos modificados en la sesión:**
```bash
git -C /Users/albert/Documents/athlete-app diff --name-only HEAD~5..HEAD 2>/dev/null | head -30
```

**Estado actual del build y tests:**
```bash
cd /Users/albert/Documents/athlete-app && npm test -- --reporter=verbose 2>&1 | tail -30
```

### Paso 2 — Determinar el archivo de bitácora

- **Fecha:** usa `date '+%Y-%m-%d'` (ya conoces la fecha del sistema)
- **Nombre:** `YYYY-MM-DD-Descripcion-Concisa-En-PascalCase.md`
- **Regla:** si ya existe un archivo `YYYY-MM-DD-*.md` para hoy, añade secciones al existente — no crees duplicados
- **Ubicación:** `docs/boveda-athlete-app/04_BITACORA/`

### Paso 3 — Crear la entrada con esta plantilla

```markdown
---
title: "YYYY-MM-DD: Título Descriptivo de la Sesión"
date: "YYYY-MM-DD"
tags: [bitácora, <tags relevantes>]
---

# Bitácora: DD de Mes YYYY — Título

## Objetivo
Qué se buscaba conseguir en esta sesión.

## Acciones Ejecutadas

### 1. <Nombre del proceso principal>
- **Comando:** `npm run test:coverage` (o el que aplique)
- **Resultado:** ✅ OK / ❌ Error — descripción breve
- **Archivos afectados:** lista de ficheros clave modificados

### 2. <Siguiente proceso>
...

## Resultados
| Métrica | Valor |
|---------|-------|
| Tests pasando | X / Y |
| Cobertura statements | XX.XX% |
| Cobertura functions | XX.XX% |
| Build status | ✅ / ❌ |

## Estado Final
```
npm test          → ✅/❌
npm run build     → ✅/❌
npm run lint      → ✅/❌
```

## Próximos Pasos
- [ ] <tarea pendiente 1>
- [ ] <tarea pendiente 2>

## Notas Técnicas
Decisiones relevantes, bugs encontrados, consideraciones de arquitectura, configuraciones aplicadas.
```

### Paso 4 — Tags a usar según contenido

| Actividad | Tags recomendados |
|-----------|------------------|
| Tests escritos / cobertura | `tests`, `cobertura`, `vitest` |
| Auditoría RLS / seguridad | `seguridad`, `rls`, `supabase` |
| Refactoring de componentes | `refactoring`, `arquitectura`, `react` |
| Migraciones de BD | `migracion`, `supabase`, `base-de-datos` |
| Build / CI/CD | `build`, `ci-cd`, `infraestructura` |
| Hooks de Claude Code | `claude-code`, `automatizacion` |
| Documentación | `docs`, `boveda` |

### Paso 5 — Limpiar el session log automático

Si `_session_log.md` existe y fue procesado, mueve su contenido al archivo de bitácora y luego bórralo o vacíalo para que la próxima sesión empiece limpio:

```bash
rm /Users/albert/Documents/athlete-app/docs/boveda-athlete-app/04_BITACORA/_session_log.md
```

### Paso 6 — Verificar

```bash
ls -la /Users/albert/Documents/athlete-app/docs/boveda-athlete-app/04_BITACORA/
```

## Reglas de calidad

- **Sin inventar resultados** — documenta solo lo que realmente ocurrió; si no tienes el dato exacto, escribe "ver git log"
- **Una entrada por día** — si ya hay archivo de hoy, añade secciones, no dupliques
- **Frontmatter siempre** — Obsidian lo usa para indexar y filtrar notas
- **Sección "Notas Técnicas" obligatoria** — captura decisiones no obvias que no quedan en el código (bugs de entorno, razones de diseño, workarounds)
- **Próximos pasos siempre actualizados** — refleja el siguiente ítem de la hoja de ruta real
