---
title: "2026-03-28: Semana 4 — Refactorización de Componentes Grandes"
date: "2026-03-28"
tags: [bitácora, refactoring, arquitectura, react, tests, cobertura, vitest]
---

# Bitácora: 28 de Marzo 2026 — Semana 4: Refactorización de Componentes Grandes

## Objetivo

Refactorizar los 4 componentes monolíticos más grandes de la aplicación extrayendo lógica a custom hooks y secciones visuales a sub-componentes, **sin cambiar ningún comportamiento observable**. Mantener ≥80% de cobertura en hooks con todos los tests existentes pasando.

---

## Acciones Ejecutadas

### 1. AddResultDialog (773 → 269 líneas) — sesión anterior
- **Hooks extraídos:** `useFormOptions`, `useAthleteSearch`, `useAutoAssignClub`, `useResultSubmit`
- **Sub-componentes:** `AthleteClubFields`, `PruebaCategoriaFields`, `MarcaFields`
- **Tests escritos:** 22 tests (6+6+5+5) todos pasando

### 2. RankingDialog (558 → 112 líneas) — sesión anterior
- **Hooks extraídos:** `useRankingYears`, `useRankingData`
- **Sub-componentes:** `RankingListRow`, `RankingStickySection`

### 3. AthleteSpiderChart (724 → 320 líneas) — sesión anterior
- **Hooks extraídos:** `useAvailableCategories`, `useRadarChartData`, `useChartDimensions`
- **Sub-componentes:** `RadarChartDisplay`, `PruebaResultsAccordion`

### 4. AthleteResultsChart (1522 → 137 líneas) — esta sesión
- **Archivos afectados:**
  - `src/hooks/useAthleteResultsChartData.js` — exporta `fetchWithFallbacks` y `groupByPrueba`
  - `src/hooks/useComparatorChartData.js` — fetch para atletas comparados (reutiliza helpers exportados)
  - `src/hooks/useCombinedChartData.js` — merge datos principal + comparadores por fecha/edad
  - `src/components/AthleteResultsChart/ChartHeader.jsx` — título + selector prueba
  - `src/components/AthleteResultsChart/ViewModeToggle.jsx` — botones fecha/edad
  - `src/components/AthleteResultsChart/ResultsLineChart.jsx` — LineChart + CustomTooltip
  - `src/components/AthleteResultsChart.jsx` — reescrito (1522 → 137 líneas)

### 5. Tests nuevos escritos — esta sesión
- `useChartDimensions.test.jsx` — 4 tests (resize event, min 300, unmount cleanup)
- `useAvailableCategories.test.jsx` — 6 tests (sorting, default selection, allPruebas derivation)
- `useRadarChartData.test.jsx` + `useRadarChartData2.test.jsx` — 5 tests (normalization, multi-athlete)
- `useRankingYears.test.jsx` — 5 tests (iterative fetch, currentYear prepend, error handling)
- `useRankingData.test.jsx` — 5 tests (top50, deduplication, sticky, error)
- `useAthleteResultsChartData.test.jsx` — 4 tests (fetch, groupByPrueba, error, selectedPrueba change)
- `useCombinedChartData.test.jsx` — 5 tests (merge fecha/edad modes, sorting)
- `useComparatorChartData.test.jsx` — 4 tests (empty, fetch+group, error, empty data)

### 6. Diagnóstico OOM en useRadarChartData
- **Síntoma:** tests OOM al 8GB incluso en aislamiento (1 archivo solo)
- **Causa raíz:** tests accedían `result.current.radarData[0]` sin `waitFor` después de un hook que llama `setRadarData()` síncronamente. Sin `waitFor`, React act() acumula promesas de actualización en cola que nunca se resuelven → OOM tras ~115s.
- **Fix:** añadir `await waitFor(() => expect(result.current.radarData).toHaveLength(N))` antes de cualquier aserción sobre el valor del state en hooks síncronos que llaman setState.
- **Lección guardada:** `feedback_react19_hooks_testing.md` actualizado.

---

## Resultados

| Métrica | Valor |
|---------|-------|
| Tests pasando | 125 / 125 |
| Test files | 21 / 21 |
| Cobertura hooks statements | 81.98% |
| Cobertura hooks functions | 88.53% |
| Cobertura hooks lines | 85.65% |
| Build status | ✅ |

## Estado Final

```
npm test          → ✅ 125 tests, 21 files
npm run build     → ✅ built in 4.92s
npm run lint      → (no ejecutado, build limpio)
```

---

## Próximos Pasos

- [ ] Verificación manual en navegador: SeguimientoPage (SpiderChart + ResultsChart), AnalisisPage, AddResultDialog, RankingDialog
- [ ] Semana 5 (si aplica): SaaS onboarding, invitations, plan management
- [ ] Auditoría periódica de cobertura al añadir funcionalidades nuevas

---

## Notas Técnicas

### Patrón de exportación compartida en hooks
`fetchWithFallbacks` y `groupByPrueba` se exportan de `useAthleteResultsChartData.js` para que `useComparatorChartData.js` los reutilice sin duplicar ~150 líneas de lógica de fallback.

### `useComparatorChartData` mockeado en tests
Los tests de `useComparatorChartData` mockean `fetchWithFallbacks` y `groupByPrueba` directamente vía `vi.mock('../../hooks/useAthleteResultsChartData', () => ({...}))`. Esto permite probar la lógica de error-handling del hook sin necesidad de simular todos los fallbacks de Supabase.

### `waitFor` obligatorio para hooks síncronos con setState
A diferencia de los hooks con operaciones async (supabase), los hooks síncronos que llaman `setRadarData()` inmediatamente dentro del efecto necesitan `waitFor` porque React 19 procesa la actualización de estado en microtasks, no sincrónicamente desde el punto de vista del test.

### Tamaños reales tras refactorización
- `AthleteResultsChart.jsx`: 1522 → 137 líneas (↓91%)
- `AthleteSpiderChart.jsx`: 724 → 320 líneas (↓56%)
- `RankingDialog.jsx`: 558 → 112 líneas (↓80%)
- `AddResultDialog.jsx`: 773 → 269 líneas (↓65%)
