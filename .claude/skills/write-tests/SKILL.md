---
name: write-tests
description: "Genera tests completos con Vitest + React Testing Library para componentes y hooks de athlete-app. Úsalo cuando: crees un componente nuevo, refactorices uno existente, quieras cubrir un hook custom, o necesites aumentar la cobertura. Triggers: write tests, generate tests, crear tests, añadir tests, cubrir componente, test coverage."
---

# write-tests — Generador de Tests para athlete-app

Genera tests con Vitest + React Testing Library adaptados al stack del proyecto: React 19, MUI v7, Supabase, React Router v6, Recharts.

## Stack de testing

- **Vitest** — runner (configurado en vite.config.js, entorno jsdom)
- **@testing-library/react** — render, screen, fireEvent, waitFor
- **@testing-library/user-event** — interacciones de usuario realistas
- **@testing-library/jest-dom** — matchers (toBeInTheDocument, toHaveValue…)
- **Ficheros**: `src/**/*.test.jsx` o `src/**/*.spec.jsx`
- **Ejecutar**: `npm test` (run) | `npm run test:watch` (modo watch) | `npm run test:ui` (UI visual)

## Workflow obligatorio

### Paso 1 — Leer el fichero objetivo

Lee el componente o hook completo antes de escribir ningún test. Analiza:
- Props recibidas y sus tipos
- Estado interno y efectos
- Llamadas a Supabase (`supabase.from`, `supabase.auth`, RPCs)
- Llamadas a React Router (`useNavigate`, `useParams`)
- Eventos de usuario que dispara
- Qué renderiza condicionalmente

### Paso 2 — Identificar los casos de test

Para **componentes**, cubre siempre:
1. Renderizado base (snapshot o existencia de elementos clave)
2. Cada prop obligatoria con valor válido
3. Estados condicionales (loading, error, vacío, con datos)
4. Interacciones de usuario principales (click, submit, input)
5. Callbacks / onX props llamados con los argumentos correctos

Para **hooks custom**, cubre siempre:
1. Valor inicial devuelto
2. Estado tras llamada asíncrona exitosa (mockear Supabase)
3. Estado tras error de Supabase
4. Que limpia suscripciones en cleanup (si aplica)

### Paso 3 — Mocks estándar del proyecto

**Supabase** — mockear siempre, nunca llamadas reales:
```js
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-uid' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))
```

**React Router** — mockear useNavigate/useParams:
```js
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: vi.fn(() => vi.fn()), useParams: vi.fn(() => ({})) }
})
```

**AuthContext** — wrapper con usuario simulado:
```js
import { AuthContext } from '../../context/AuthContext'
const mockUser = { id: 'test-uid', email: 'test@test.com', app_metadata: { role: 'admin' } }
const wrapper = ({ children }) => (
  <AuthContext.Provider value={{ user: mockUser, loading: false }}>
    {children}
  </AuthContext.Provider>
)
```

**MUI Theme** — siempre envolver con ThemeProvider:
```js
import { ThemeProvider, createTheme } from '@mui/material'
const theme = createTheme()
const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
```

**React Router** — envolver con MemoryRouter cuando el componente usa Link/NavLink:
```js
import { MemoryRouter } from 'react-router-dom'
render(<MemoryRouter><ComponenteATestear /></MemoryRouter>)
```

### Paso 4 — Plantilla de fichero de test

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material'
// [mocks de supabase, contextos, etc.]
import NombreComponente from './NombreComponente'

vi.mock('../../lib/supabaseClient', () => ({ /* mock supabase */ }))

const theme = createTheme()
const renderComponent = (props = {}) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <NombreComponente {...props} />
      </ThemeProvider>
    </MemoryRouter>
  )

describe('NombreComponente', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza sin errores', () => {
    renderComponent()
    // expect(screen.getByText(...)).toBeInTheDocument()
  })

  it('muestra estado de carga inicial', () => { /* ... */ })

  it('muestra datos tras carga exitosa', async () => {
    await waitFor(() => { /* ... */ })
  })

  it('muestra error cuando Supabase falla', async () => { /* ... */ })

  it('llama al callback correcto al hacer click', async () => {
    const onAction = vi.fn()
    renderComponent({ onAction })
    await userEvent.click(screen.getByRole('button', { name: /texto/i }))
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ /* ... */ }))
  })
})
```

### Paso 5 — Verificar

Tras escribir el test, ejecuta:
```bash
npm test
```

Si hay fallos, corrígelos antes de considerar el task completado. Un test que falla es peor que ningún test.

## Reglas de calidad

- **Sin snapshots** de componentes completos — son frágiles con MUI
- **Buscar por rol** (`getByRole`) antes que por texto o testId
- **No mockear lo que no necesitas** — si un hook no llama a Supabase, no mockees Supabase
- **Un `describe` por fichero**, múltiples `it` dentro
- **Nombres descriptivos**: `'muestra error cuando el atleta no tiene resultados'` no `'test 1'`
- **`beforeEach(() => vi.clearAllMocks())`** siempre al inicio del describe
- **Hooks custom**: usar `renderHook` de `@testing-library/react`

## Ejemplo completo — hook custom

```jsx
// src/hooks/useAtletas.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAtletas } from './useAtletas'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ atleta_id: 1, nombre: 'Marc Márquez' }],
        error: null,
      }),
    })),
  },
}))

describe('useAtletas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve lista vacía inicialmente', () => {
    const { result } = renderHook(() => useAtletas())
    expect(result.current.atletas).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('carga atletas desde Supabase', async () => {
    const { result } = renderHook(() => useAtletas())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.atletas).toHaveLength(1)
    expect(result.current.atletas[0].nombre).toBe('Marc Márquez')
  })
})
```
