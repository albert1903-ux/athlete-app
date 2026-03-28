---
title: "2026-03-28: Skill obsidian-sync-master y Hooks de Documentación Automática"
date: "2026-03-28"
tags: [bitácora, claude-code, automatizacion, docs, boveda]
---

# Bitácora: 28 de Marzo 2026 — Skill obsidian-sync-master y Hooks de Documentación

## Objetivo

Implementar un sistema de documentación automática de sesiones de trabajo para que la bóveda Obsidian recoja siempre el estado real del proyecto. El objetivo era que Claude Code documentara los procesos ejecutados sin intervención manual.

## Acciones Ejecutadas

### 1. Creación de la skill `obsidian-sync-master`

- **Archivo:** `.claude/skills/obsidian-sync-master/SKILL.md`
- **Resultado:** ✅ Creada y disponible (se carga automáticamente en cada sesión)
- **Descripción:** Skill que sigue un workflow de 6 pasos para recopilar contexto (git log, session log, archivos modificados, estado de tests/build) y generar una entrada de bitácora bien estructurada en `04_BITACORA/`

### 2. Hook PostToolUse para comandos Bash significativos

- **Archivo:** `.claude/settings.json`
- **Resultado:** ✅ Añadido nuevo matcher `"Bash"` en `PostToolUse`
- **Comportamiento:** Cada vez que Claude ejecuta un comando Bash que contiene `npm test`, `npm run build`, `npm run lint` o `npm run test:coverage`, el hook:
  1. Extrae el comando de la entrada JSON de stdin con `jq`
  2. Crea `_session_log.md` si no existe
  3. Añade una línea con timestamp: `- YYYY-MM-DD HH:MM \`<comando>\``

### 3. Hook Stop — marcador de fin de sesión

- **Archivo:** `.claude/settings.json`
- **Resultado:** ✅ Segundo comando añadido al hook `Stop` existente (junto al `npm run build`)
- **Comportamiento:** Al terminar una sesión Claude, escribe en `_session_log.md`:
  ```
  ---
  **Sesión terminada:** YYYY-MM-DD HH:MM:SS
  ```

## Resultados

| Elemento | Estado |
|----------|--------|
| Skill `obsidian-sync-master` | ✅ Creada |
| Hook Bash (PostToolUse) | ✅ Configurado |
| Hook Stop (marcador sesión) | ✅ Configurado |
| Skill visible en sistema | ✅ Confirmado |

## Estado Final

```
npm run build     → ✅ (verificado por Stop hook al final de cada sesión)
npm test          → ✅ 64 tests passing (Semana 2 completada ayer)
```

## Arquitectura de Hooks Actual

```
Stop:
  1. npm run build          → verifica compilación
  2. _session_log.md        → marca fin de sesión con timestamp

PostToolUse (Edit|Write):
  → eslint $FILE            → lint inmediato del fichero modificado

PostToolUse (Bash):
  → si npm test/build/lint  → append a _session_log.md con timestamp
```

## Próximos Pasos

- [ ] **Semana 3** — Auditoría RLS con `/check-rls`: cobertura completa SELECT/INSERT/UPDATE/DELETE por rol
- [ ] Verificar que `_session_log.md` se genera correctamente en la próxima sesión con comandos npm
- [ ] Ejecutar `/obsidian-sync-master` al terminar Semana 3 para documentar la auditoría de seguridad

## Notas Técnicas

**Por qué hook Bash y no Stop para el log de comandos:**
El hook `Stop` se ejecuta una vez al final de la sesión pero no tiene acceso al historial de comandos ejecutados. El hook `PostToolUse` se ejecuta tras cada herramienta y recibe el input completo como JSON en stdin, lo que permite extraer el comando exacto con `jq`.

**Limitación del hook Bash:**
El hook filtra solo comandos con `npm (test|run build|run lint|run test:coverage)`. Comandos como `git`, `supabase`, o scripts Python del ETL no se registran automáticamente — se pueden añadir al regex si se necesita.

**La skill `obsidian-sync-master` estaba documentada pero no implementada:**
El archivo `2026-03-10-Refactor-Hooks-Skills.md` menciona `obsidian-sync-master` como skill de `.agent/skills/`, pero ese directorio solo contenía `ui-ux-pro-max` (skill externa). La skill real se ha creado ahora en `.claude/skills/obsidian-sync-master/SKILL.md`.
