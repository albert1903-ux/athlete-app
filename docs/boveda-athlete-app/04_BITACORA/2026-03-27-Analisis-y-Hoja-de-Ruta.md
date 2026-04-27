# Análisis Técnico y Hoja de Ruta — Athlete App
**Fecha:** 2026-03-27
**Alcance:** Código fuente, migraciones Supabase, documentación Bóveda, pipeline ETL

---

## 1. Análisis Técnico por Dimensión

### 1.1 Complejidad Técnica — 7.5 / 10

**Fortalezas:**
- Stack moderno y cohesivo: React 19 + Vite 5 + MUI v7 + Supabase + Vercel
- Pipeline ETL Python separado (`bbdd-athlete-app`) para parseo de PDFs de la Federació Catalana d'Atletisme
- RLS (Row-Level Security) correctamente migrado a `app_metadata` (commit `2507ac8`)
- Sistema de roles granular: `admin`, `consulta`, `trainer`, `athlete`, `club_admin`
- Infraestructura SaaS con tablas `organizations` e `invitations` (migración `20260311114500`)

**Debilidades:**
- Componentes monolíticos: `AddResultDialog.jsx` (~650 líneas), `AthleteResultsChart.jsx` (~500 líneas), `RankingDialog.jsx` (~400 líneas), `AthleteSpiderChart.jsx` (~380 líneas)
- Antipatrón `window.dispatchEvent` para comunicación entre componentes (acoplamiento implícito)
- Sin tests automatizados (0% cobertura)
- Tailwind CSS instalado pero completamente sin uso (eliminado en sesión 2026-03-27)

---

### 1.2 Tipo de Solución — 7 / 10

Aplicación de gestión deportiva de nicho bien definido: seguimiento de atletas de atletismo, rankings, medidas corporales, eventos, comparativa entre atletas.

**Puntos fuertes:**
- Dominio deportivo muy específico (federación catalana de atletismo)
- ETL propio para importar marcas oficiales de PDF federativos
- Visualización de datos con Recharts (gráficos de progresión, spider chart comparativo)

**Limitaciones actuales:**
- Frontend SaaS (`organizations`, `invitations`) sin implementación visible en UI
- No hay onboarding para nuevos clubes/organizaciones
- Comunicación entre componentes frágil (eventos de ventana)

---

### 1.3 Madurez del Producto — 5.5 / 10

| Aspecto | Estado |
|---------|--------|
| CRUD atletas/resultados | ✅ Funcional |
| Rankings y filtros | ✅ Funcional |
| Calendario de eventos | ✅ Funcional |
| Compartir calendario | ✅ Funcional |
| Notificaciones | ✅ Funcional |
| Tests automatizados | ✅ ≥80% cobertura hooks + 2 componentes (165 tests) |
| CI/CD con gates de calidad | ❌ No existe |
| Onboarding SaaS | ❌ Sin implementar |
| Gestión de suscripciones | ❌ Sin implementar |
| Documentación de API | ❌ Sin documentar |

---

### 1.4 Seguridad — 8.5 / 10 ✅ Auditado 2026-03-28

**Bien implementado:**
- RLS habilitado en todas las tablas críticas
- Roles en `app_metadata` (no modificables por el usuario) — migración correctiva aplicada
- Autenticación delegada a Supabase Auth

**Pendiente de auditar:**
- Cobertura de políticas por operación (SELECT/INSERT/UPDATE/DELETE) para cada rol
- RPCs con `SECURITY DEFINER` sin validación de rol en el cuerpo
- Aislamiento multitenancy por `organization_id` en tablas SaaS

---

### 1.5 Escalabilidad — 5 / 10

**Limitaciones actuales:**
- Ausencia total de tests → regresiones silenciosas al escalar el equipo
- Componentes monolíticos difíciles de mantener y testar
- `window.dispatchEvent` no escala: eventos globales sin tipado ni control de flujo
- Sin paginación en consultas Supabase de listas potencialmente largas
- Sin caché de datos (cada navegación refetch completo)

**Infraestructura preparada para escalar:**
- Supabase escala horizontalmente (PostgreSQL gestionado)
- Vercel CDN para frontend estático
- Estructura de roles y organizaciones lista para multitenancy

---

### 1.6 Potencial Comercial — 6.5 / 10

**Oportunidades:**
- Nicho deportivo no saturado (herramientas de gestión de atletismo para clubes)
- Infraestructura SaaS parcialmente construida (organizations, invitations)
- ETL de datos federativos es una ventaja competitiva real
- Modelo de datos robusto (marcas, categorías, pruebas, medidas corporales)

**Barreras:**
- Sin monetización implementada (pagos, planes, límites por organización)
- Sin onboarding para nuevos clientes
- 0% tests → riesgo de regresiones en producción con cada release
- Sin métricas de uso ni analíticas

---

### 1.7 Promedio General — **6.4 / 10**

| Dimensión | Nota |
|-----------|------|
| Complejidad técnica | 7.5 |
| Tipo de solución | 7.0 |
| Madurez del producto | 5.5 |
| Seguridad | 8.5 ✅ |
| Escalabilidad | 5.0 |
| Potencial comercial | 6.5 |
| **Promedio** | **6.4** |

---

## 2. Hoja de Ruta de Implementación

### Semana 1 — Infraestructura de calidad ✅ COMPLETADO (2026-03-27)

| Tarea | Estado | Detalle |
|-------|--------|---------|
| Configurar hook Stop (build automático) | ✅ | `.claude/settings.json` |
| Configurar hook PostToolUse (lint por fichero) | ✅ | Matcher `Edit\|Write`, usa `jq` + `eslint $FILE` |
| Instalar Vitest + React Testing Library | ✅ | `package.json` actualizado |
| Configurar `vite.config.js` para tests | ✅ | jsdom, globals, setupFiles |
| Crear skill `/write-tests` | ✅ | `.claude/skills/write-tests/SKILL.md` |
| Crear skill `/check-rls` | ✅ | `.claude/skills/check-rls/SKILL.md` |
| Crear skill `/split-component` | ✅ | `.claude/skills/split-component/SKILL.md` |
| Eliminar Tailwind CSS (sin uso) | ✅ | `tailwindcss`, `postcss`, `autoprefixer` eliminados |
| Corregir ESLint (ignorar `.venv`) | ✅ | `globalIgnores` con `.venv`, `node_modules`, `.agent` |

---

### Semana 2 — Cobertura de tests (hooks custom) ✅ COMPLETADA

**Objetivo:** Alcanzar ≥80% de cobertura en los 7 hooks custom de `src/hooks/`.

**Resultado:** 8 archivos de test, 64 tests, 2.37s. Cobertura `src/hooks/`: **91.66% statements / 95.45% functions / 92.48% lines**.

| Hook | Criticidad | Tests | Cobertura |
|------|-----------|-------|-----------|
| `useAthleteResults` | Alta | 6 | ~97% |
| `useGroupedResults` | Alta | 9 | ~91% |
| `useAthleteProfile` | Alta | 9 | ~97% |
| `usePruebaMetrics` | Media | 8 | ~91% |
| `useAthletesComparison` | Media | 8 (2 archivos) | ~88% |
| `useCalendarShares` | Media | 8 | ~88% |
| `useNotifications` | Baja | 9 | ~92% |

**Notas técnicas:**
- `useAthletesComparison` dividido en 2 archivos (básico/avanzado) por aislamiento de workers
- `vite.config.js` añadido `execArgv: ['--max-old-space-size=8192']` para evitar OOM en workers con React 19 + JSDOM
- Bug crítico encontrado y corregido: pasar objeto literal `{}` inline en `renderHook` callback causa bucle infinito de re-renders en React 19 (useEffect deps cambian en cada render por referencia)

**Comando:** `npm run test:coverage` para ver cobertura actual.

---

### Semana 3 — Auditoría y hardening de seguridad RLS ✅ COMPLETADA (2026-03-28)

**Objetivo:** Cobertura completa de RLS para todos los roles en todas las operaciones.

**Resultado:** 14 tablas auditadas, 2 migraciones correctivas aplicadas a producción, 0 gaps críticos pendientes.

| Tabla | RLS | SELECT | INSERT | UPDATE | DELETE | Estado |
|-------|-----|--------|--------|--------|--------|--------|
| atletas | ✅ | ✅ authenticated | ✅ admin | ✅ admin | ✅ admin | OK |
| resultados | ✅ | ✅ authenticated | ✅ admin | ✅ admin | ✅ admin | OK |
| atleta_club_hist | ✅ | ✅ authenticated | ✅ admin | ✅ admin | ✅ admin | OK |
| categorias | ✅ | ✅ authenticated | ✅ admin | ✅ admin | ✅ admin | OK |
| clubes | ✅ | ✅ authenticated | ✅ admin | ✅ admin | ✅ admin | OK |
| pruebas | ✅ | ✅ authenticated | ✅ admin | ✅ admin | ✅ admin | OK |
| eventos | ✅ | ✅ user+shares | ✅ user | ✅ user | ✅ user | OK |
| medidas_corporales | ✅ | ✅ user | ✅ user | ✅ user | ✅ user | OK |
| participantes_eventos | ✅ | ✅ user+shares | ✅ user | ✅ user | ✅ user | OK |
| calendar_shares | ✅ | ✅ owner/recipient | ✅ owner | ✅ recipient | ✅ owner/recipient | OK |
| notifications | ✅ | ✅ user | ✅ admin | ✅ user | ✅ user | OK |
| atletas_favoritos | ✅ | ✅ user | ✅ user | ✅ user | ✅ user | OK |
| organizations | ✅ | ✅ org/admin | ✅ admin | ✅ admin/club_admin | ✅ admin | OK |
| invitations | ✅ | ✅ admin/club_admin | ✅ admin/club_admin | ✅ admin/club_admin | ✅ admin/club_admin | OK |

**Gaps corregidos:**
1. `organizations` — bug `super_admin` → `admin`, añadidas políticas INSERT y DELETE
2. `invitations` — separada política FOR ALL en 4 operaciones, añadido acceso admin
3. `notifications` — añadida política INSERT para admin
4. `atletas_favoritos` — añadida política UPDATE
5. `update_user_role` RPC — ampliados roles permitidos (trainer, athlete, club_admin)
6. Migración `20260311114500` corregida (referencia a `profiles` eliminada, `gen_random_bytes` → `gen_random_uuid`)

**Migraciones aplicadas a producción:**
- `20260311114500_add_organizations_for_saas.sql` (corregida y aplicada)
- `20260328120000_fix_rls_hardening.sql`

**Comando:** `supabase db dump --schema public | grep "CREATE POLICY"` para ver estado actual.

---

### Semana 4 — Refactorización de componentes grandes ✅ COMPLETADA (2026-03-28)

**Objetivo:** Ningún componente con más de 350 líneas. Resultado: 125 tests, todos pasando.

| Componente | Antes | Después | Hooks extraídos |
|-----------|-------|---------|-----------------|
| `AddResultDialog.jsx` | 773 | 269 | `useFormOptions`, `useAthleteSearch`, `useAutoAssignClub`, `useResultSubmit` |
| `AthleteResultsChart.jsx` | 1522 | 137 | `useAthleteResultsChartData`, `useComparatorChartData`, `useCombinedChartData` |
| `RankingDialog.jsx` | 558 | 112 | `useRankingYears`, `useRankingData` |
| `AthleteSpiderChart.jsx` | 724 | 320 | `useAvailableCategories`, `useRadarChartData`, `useChartDimensions` |

---

### Semana 4b — Gestión SaaS: Organizaciones y Usuarios ✅ COMPLETADA (2026-04-01/02)

**Objetivo:** Funcionalidades superadmin para gestionar organizaciones y usuarios del sistema.

#### Features implementadas

| Funcionalidad | Componente | RPCs Supabase |
|--------------|-----------|---------------|
| Editar nombre + club de una org | `OrganizationsDialog` | `update_organization(p_club_id, p_name, p_org_id)` |
| Cambiar usuario de contacto de una org | `OrganizationsDialog` | `update_organization_contact(p_contact_user_id, p_org_id)`, `get_club_users_for_club(p_club_id)` |
| Deshabilitar organización (con confirmación) | `OrganizationsDialog` | `disable_organization(p_org_id)` |
| Habilitar organización (con confirmación) | `OrganizationsDialog` | `enable_organization(p_org_id)` |
| Asignar club a usuario club/trainer | `RoleManagementDialog` | `update_user_club(p_club_id, p_target_user_id)` |

**Nota crítica:** PostgREST envía params en orden **alfabético**. Todos los RPCs con múltiples params deben definirlos en ese orden en SQL.

#### Tests escritos (2026-04-02)

| Archivo | Tests |
|---------|-------|
| `src/test/hooks/useScopedAthletes.test.jsx` | 14 |
| `src/test/components/OrganizationsDialog.test.jsx` | 14 |
| `src/test/components/RoleManagementDialog.test.jsx` | 12 |

**Total acumulado:** 165 tests · Ver bitácora `2026-04-02-Tests-Componentes-OrgsDialog-RolesDialog.md` para detalles.

---

### Mes 2 — Arquitectura y comunicación entre componentes

**Objetivo:** Eliminar antipatrón `window.dispatchEvent`.

**Problemas identificados:**
- Eventos globales de ventana sin tipado ni control de flujo
- Dependencias implícitas entre componentes no relacionados en el árbol

**Solución propuesta:**
1. Auditar todos los `window.dispatchEvent` y `window.addEventListener` en el código
2. Evaluar si Context API o Zustand es más adecuado según el alcance
3. Migrar gradualmente: primero los eventos que afectan a más componentes

---

### Mes 2-3 — Onboarding SaaS y monetización

**Objetivo:** Activar la infraestructura SaaS que ya existe en BD pero no tiene UI.

**Tablas ya creadas** (migración `20260311114500`):
- `organizations` — entidades cliente (clubes, federaciones)
- `invitations` — invitaciones a unirse a una organización

**Tareas:**
1. UI de creación de organización (registro de nuevo club)
2. Flujo de invitación de miembros (entrenadores, atletas)
3. Panel de gestión de organización para `club_admin`
4. Integración con sistema de pagos (Stripe recomendado)
5. Límites por plan (número de atletas, acceso a features avanzadas)

---

### Mes 3 — CI/CD y observabilidad

**Objetivo:** Automatizar validación de calidad en cada PR.

**GitHub Actions pipeline sugerido:**
```yaml
on: [push, pull_request]
jobs:
  quality:
    steps:
      - npm ci
      - npm run lint
      - npm run test:coverage  # falla si <80% cobertura
      - npm run build
```

**Observabilidad:**
- Sentry para captura de errores en producción
- Analytics básico (Vercel Analytics o PostHog)
- Métricas de uso por organización (para informar decisiones de producto)

---

## 3. Herramientas Claude Code disponibles

### Skills personalizadas

| Skill | Trigger | Uso |
|-------|---------|-----|
| `/write-tests` | Crear/refactorizar componente o hook | Genera tests Vitest + RTL adaptados al stack |
| `/check-rls` | Auditoría de seguridad | Informe de cobertura RLS + migración correctiva |
| `/split-component` | Componente >300 líneas | Plan de división + ejecución ordenada |

### Hooks automáticos

| Hook | Evento | Acción |
|------|--------|--------|
| Stop | Final de sesión Claude | `npm run build` — detecta errores de compilación |
| PostToolUse | Cada `Edit\|Write` | `eslint $FILE` — lint inmediato del fichero modificado |

---

## 4. Estado del entorno de desarrollo

```
npm test          → ✅ exit 0 (--passWithNoTests, 0 tests por ahora)
npm run build     → ✅ ~4s, sin errores
npm run lint      → ✅ solo escanea src/ (sin .venv, node_modules, .agent)
```

**Stack de testing disponible:**
- Vitest 4.x + jsdom
- @testing-library/react 16.x
- @testing-library/user-event 14.x
- @testing-library/jest-dom 6.x
- Setup global en `src/test/setup.js`
