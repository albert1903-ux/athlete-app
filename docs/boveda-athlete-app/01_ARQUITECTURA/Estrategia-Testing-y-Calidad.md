---
title: "Estrategia de Testing y Calidad (QA)"
description: "Cómo validamos la integridad de los datos sensibles y el correcto renderizado del frontend"
tags: [testing, calidad, QA, validacion, frontend, etl]
---

# 🧪 Estrategia de Testing y Calidad

En "Athlete App", el principal valor es la fiabilidad del dato estadístico. Una marca mal imputada a un niño de categoría sub-12 rompe por completo la experiencia. Por tanto, nuestro foco *Tier 1* de calidad recae sobre la inyección de datos, y el *Tier 2* sobre el renderizado de gráficos UI.

## 1. Validación de la Capa ETL (Data Engineering)
Antes de que un dato toque Supabase Producción, tiene que sobrevivir a la cuarentena local.

- **Modo Preview (`main.py --preview`)**: Este es nuestro "Dry-Run" (simulacro) oficial. Exporta un CSV (`preview_YYYY-MM.csv`) sin mutar la BBDD. **Testing manual obgligatorio:** El administrador debe usar excel para revisar columnas de 'Marca' y compararlas visualmente con PDFs aleatorios, especialmente verificando el `prueba_id`.
- **Detección de Outliers (Scripts locales):** Si un valor entero es insertado para una prueba cronometrada de corta distancia (donde se esperan decimales), un script automatizado alerta en consola. Este mecanismo actúa como nuestro *Snapshot Test* para el OCR.
- **Validación referencial:** El script `fix_events.py` corrobora toda string escaneada contra `valid_events.txt`. Si no hay "match", el volcado local arroja warnings advirtiendo del error en el OCR, frenando la contaminación silenciosa.

## 2. Testing Frontend (React / Vite)

### 2a. Cobertura automatizada — Estado actual ✅

Stack: **Vitest 4** + **React Testing Library 16** + **jest-dom 6** · Entorno: jsdom · Configuración: `vite.config.js`

```
npm test               → todos los tests
npm run test:coverage  → informe de cobertura (src/hooks/ ≥80%)
npm run test:watch     → modo watch
```

**Tests activos:**

| Capa | Archivos | Tests |
|------|----------|-------|
| Custom hooks (`src/test/hooks/`) | 22 archivos | 139 |
| Componentes (`src/test/components/`) | 2 archivos | 26 |
| **Total** | **24 archivos** | **165** |

**Desglose por archivo:**

| Archivo | Tests | Semana |
|---------|-------|--------|
| `useAthleteResults` | 6 | S2 |
| `useGroupedResults` | 9 | S2 |
| `useAthleteProfile` | 10 | S2 |
| `usePruebaMetrics` | 9 | S2 |
| `useAthletesComparison` | 4 | S2 |
| `useAthletesComparison2` | 4 | S2 |
| `useCalendarShares` | 10 | S2 |
| `useNotifications` | 12 | S2 |
| `useFormOptions` | 6 | S4 |
| `useAthleteSearch` | 6 | S4 |
| `useAutoAssignClub` | 6 | S4 |
| `useResultSubmit` | 5 | S4 |
| `useChartDimensions` | 4 | S4 |
| `useAvailableCategories` | 6 | S4 |
| `useRadarChartData` + `useRadarChartData2` | 3+2 | S4 |
| `useRankingYears` | 5 | S4 |
| `useRankingData` | 5 | S4 |
| `useAthleteResultsChartData` | 4 | S4 |
| `useCombinedChartData` | 5 | S4 |
| `useComparatorChartData` | 4 | S4 |
| `useScopedAthletes` | 14 | S4b |
| `OrganizationsDialog` | 14 | S4b |
| `RoleManagementDialog` | 12 | S4b |

### 2b. Reglas establecidas para tests de componentes MUI

- **Chips:** usar `document.querySelectorAll('.MuiChip-label')`, no `getByText` (el Select también renderiza el valor seleccionado en el DOM)
- **InputLabel de Select:** usar `screen.getByText('Label', { selector: 'label' })` — `getByLabelText` no funciona con IDs auto-generados de MUI
- **Abrir un Select:** `label.closest('.MuiFormControl-root').querySelector('[role="combobox"]')` + `fireEvent.mouseDown`
- **Constantes de test:** los nombres de usuarios NO deben coincidir con strings de chips de rol

### 2c. Validación visual (complementaria a los tests automatizados)

El área más sensible de UI son los gráficos compuestos (Spider Charts, Evolución).

- *Prueba Humana:* Seleccionar un Atleta con datos mixtos (campo y pista). Verificar que los picos del Radar de pista están en sintonía con "Menor es mejor" y velocidad/saltos "Mayor es mejor".
- *Prueba de Extremos:* Insertar intencionalmente un valor atípico (Ej. 60m en 3s via `MarksManagementDialog`) y validar que la UI formatea adecuadamente los límites del gráfico.

### 2d. Roadmap a futuro

- **Playwright** para tests E2E críticos: login, aprobación de usuario, subida de marca, renderizado final.
- Ampliar cobertura de componentes al resto de diálogos del módulo superadmin.

## 3. Seguridad Base de Datos (QA Supabase)
- **RLS Policy Checks:**
  - *Test Manual de Suplantación:* Entrar con una cuenta de rol `consulta`. Interceptar token JWT e intentar hacer PUSH (POST) a endpoint HTTP de inserción de resultados o cambiar el parámetro `is_approved`. Debe arrojar `Status 403 / 401`. Solo RPCs `SECURITY DEFINER` ejecutados por un UI validado por UID saltan este control.
