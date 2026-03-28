---
name: split-component
description: "Divide componentes React grandes (>300 líneas) en sub-componentes cohesivos sin cambiar el comportamiento. Úsalo cuando un componente sea difícil de leer, testar o reutilizar. Triggers: split component, dividir componente, refactorizar componente, componente grande, component too large, break down component."
---

# split-component — Divisor de componentes para athlete-app

Refactoriza componentes grandes de athlete-app en piezas mantenibles sin alterar el comportamiento observable.

## Umbral de acción

- **< 200 líneas** → no dividir (costo de abstracción > beneficio)
- **200-350 líneas** → dividir solo si hay responsabilidades claramente separadas
- **> 350 líneas** → dividir siempre

## Workflow

### Paso 1 — Leer el componente completo

Lee el fichero entero. Nunca propongas una división sin haberlo leído todo. Identifica:
- Responsabilidades del componente (qué hace cada sección)
- Props recibidas
- Estado local (`useState`, `useReducer`)
- Efectos (`useEffect`)
- Handlers de eventos
- Sub-secciones del JSX (bloques visuales distintos)
- Lógica de negocio (transformaciones de datos, cálculos)
- Llamadas a Supabase o hooks custom

### Paso 2 — Proponer el plan de división

Antes de tocar código, presenta al usuario:

```
## Plan de división para [NombreComponente] ([N] líneas)

Propuesta de [M] sub-componentes:

1. **[NombreSubComponente1]** (~[N] líneas)
   - Responsabilidad: [qué hace]
   - Recibe props: [lista]
   - Fichero: src/components/[nombre]/[NombreSubComponente1].jsx

2. **use[NombreHook]** (hook custom)
   - Extrae la lógica de: [descripción]
   - Devuelve: { [variables] }
   - Fichero: src/hooks/use[Nombre].js

3. **[NombreSubComponente2]** (~[N] líneas)
   - ...

El componente principal quedará en ~[N] líneas coordinando los sub-componentes.
```

Espera confirmación antes de ejecutar.

### Paso 3 — Reglas de división

**Extrae a hook custom cuando:**
- Hay `useEffect` con llamada a Supabase
- Hay múltiples `useState` relacionados (loading, data, error)
- La lógica no depende del JSX

**Extrae a sub-componente cuando:**
- Hay un bloque JSX de >30 líneas que es visualmente independiente
- El bloque tiene su propio estado local que no comparten otros bloques
- El bloque se repite o podría reutilizarse

**NO extraigas cuando:**
- El estado es compartido entre secciones y pasarlo como props sería más complejo
- El sub-componente resultante tendría solo 1 uso y <50 líneas
- La extracción requiere prop drilling >2 niveles (considera Context en su lugar)

### Paso 4 — Ejecutar la división

**Orden de operaciones:**
1. Crear primero los hooks custom (sin JSX, más fáciles de testar)
2. Crear sub-componentes de hoja (los más internos, sin hijos)
3. Crear sub-componentes intermedios
4. Actualizar el componente padre para usar todos los nuevos
5. Eliminar código muerto del componente padre

**Convenciones del proyecto:**
- Sub-componentes en `src/components/` con PascalCase
- Hooks custom en `src/hooks/` con `use` prefix en camelCase
- Si el sub-componente es muy específico del padre, puede ir en una subcarpeta: `src/components/[Padre]/[SubComponente].jsx`

### Paso 5 — Verificar que no hay regresiones

Tras la división:
1. El componente padre debe tener el mismo comportamiento externo (mismas props, mismo output visual)
2. Ejecutar `npm run build` para verificar que no hay errores de compilación
3. Si existen tests del componente original, verificar que siguen pasando con `npm test`
4. Si no hay tests, usar `/write-tests` para cubrir el componente refactorizado

## Patrones frecuentes en athlete-app

### Patrón: Extraer lógica de Supabase a hook

```jsx
// ANTES — en el componente
const [atletas, setAtletas] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchAtletas = async () => {
    const { data, error } = await supabase.from('atletas').select('*')
    if (!error) setAtletas(data)
    setLoading(false)
  }
  fetchAtletas()
}, [])

// DESPUÉS — hook custom src/hooks/useAtletas.js
export function useAtletas() {
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('atletas').select('*')
      .then(({ data, error }) => {
        if (error) setError(error)
        else setAtletas(data)
        setLoading(false)
      })
  }, [])

  return { atletas, loading, error }
}
```

### Patrón: Extraer sección de formulario

```jsx
// ANTES — AddResultDialog.jsx (650 líneas)
// Sección de ~150 líneas para selección de prueba

// DESPUÉS — sub-componente
// src/components/AddResultDialog/PruebaSelector.jsx
export function PruebaSelector({ pruebas, value, onChange, categoriaId }) {
  return (
    // JSX de selección de prueba
  )
}
```

### Patrón: Extraer sección de chart

```jsx
// ANTES — AthleteResultsChart.jsx (500 líneas)
// Controles de filtro en ~100 líneas

// DESPUÉS
// src/components/AthleteResultsChart/ChartFilters.jsx
export function ChartFilters({ filters, onChange, pruebas, categorias }) {
  return (/* controles de filtro */)
}
```

## Componentes prioritarios en athlete-app

Por orden de urgencia:

1. [AddResultDialog.jsx](src/components/AddResultDialog.jsx) (~650 líneas)
   - Extraer: `usePruebas`, `useCategorias` hooks
   - Extraer: `PruebaSelector`, `FechaUbicacionFields`, `ValorInput` sub-componentes

2. [AthleteResultsChart.jsx](src/components/AthleteResultsChart.jsx) (~500 líneas)
   - Extraer: `useResultados` hook
   - Extraer: `ChartFilters`, `ChartLegend` sub-componentes

3. [RankingDialog.jsx](src/components/RankingDialog.jsx) (~400 líneas)
   - Extraer: `useRanking` hook
   - Extraer: `RankingTable`, `RankingFilters` sub-componentes

4. [AthleteSpiderChart.jsx](src/components/AthleteSpiderChart.jsx) (~380 líneas)
   - Extraer: `useSpiderData` hook
   - Extraer: `ComparatorLegend` sub-componente
