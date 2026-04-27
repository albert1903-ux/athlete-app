---
title: "2026-04-02: Tests de componentes — OrganizationsDialog y RoleManagementDialog"
date: "2026-04-02"
tags: [bitácora, tests, vitest, react-testing-library, organizaciones, roles, superadmin]
---

# Bitácora: 2 de Abril 2026 — Tests de componentes OrganizationsDialog y RoleManagementDialog

## Contexto

En la sesión del 2026-04-01 se refactorizaron `OrganizationsDialog` y `RoleManagementDialog` para el rol superadmin (nuevas funcionalidades de gestión SaaS). En esta sesión se escriben los tests de cobertura para esos dos componentes con Vitest + React Testing Library.

---

## Archivos creados

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `src/test/components/OrganizationsDialog.test.jsx` | 14 | Cobertura del diálogo de gestión de orgs |
| `src/test/components/RoleManagementDialog.test.jsx` | 12 | Cobertura del diálogo de gestión de usuarios |
| `src/test/hooks/useScopedAthletes.test.jsx` | 14 | Hook de scoping de atletas por rol |

**Total sesión:** 40 tests nuevos. **Total acumulado:** 165 tests.

---

## Casos de test — useScopedAthletes (14 tests)

| Caso | Verifica |
|------|---------|
| user null → no RPC, scopedAthletes null | Sin usuario autenticado no se hace ninguna consulta |
| superadmin → null (búsqueda global) | El superadmin no tiene restricción de scope |
| consulta → null (búsqueda global) | El rol consulta tampoco restringe |
| club con organization_id → get_club_athletes | Carga atletas del club via RPC |
| club sin organization_id → no RPC | No llama si falta organization_id |
| club devuelve lista vacía | `scopedAthletes = []` |
| club devuelve null → [] | Normaliza null a array vacío |
| trainer → get_trainer_athletes | Carga atletas asignados al entrenador |
| trainer sin atletas → [] | Normaliza null a array vacío |
| athlete → get_my_athlete | Carga el propio registro del atleta |
| athlete sin vinculación → [] | Cuenta = 0 |
| athlete data null → [] | Normaliza null a array vacío |
| cambio de rol trainer→club dispara re-fetch | Reacciona al cambio de rol rellamando RPC correcto |
| cambio de rol club→superadmin resetea a null | Vuelve a null al pasar a rol global |

---

## Casos de test — OrganizationsDialog (14 tests)

| Caso | Verifica |
|------|---------|
| Spinner mientras carga | Estado `loading=true` muestra `CircularProgress` |
| Mensaje vacío | `get_organizations` devuelve `[]` → texto "No hay organizaciones creadas" |
| Nombre de org activa | Renderiza el campo `name` de la organización |
| Chip "Deshabilitada" + opacidad | `is_active=false` → chip rojo + `opacity: 0.5` en el `<li>` |
| Botón power color error | Org activa → `.MuiIconButton-colorError` |
| Botón power color success | Org inactiva → `.MuiIconButton-colorSuccess` |
| Confirmar disable: aviso trainers | Abre diálogo con texto sobre desvinculación de entrenadores |
| Confirmar disable: RPC correcto | `disable_organization({ p_org_id })` |
| Confirmar enable: aviso restauración | Abre diálogo con texto sobre reinvitación manual |
| Confirmar enable: RPC correcto | `enable_organization({ p_org_id })` |
| Edit dialog abre con nombre actual | Campo `<input>` muestra el nombre actual de la org |
| Edit dialog llama get_club_users_for_club | RPC llamado con `p_club_id` del club vinculado |
| Guardar edit llama update_organization | Siempre se llama con `p_org_id`, `p_name`, `p_club_id` |
| NO llama update_organization_contact si adminId no cambió | Solo se actualiza el contacto si el usuario de contacto fue modificado |

---

## Casos de test — RoleManagementDialog (12 tests)

| Caso | Verifica |
|------|---------|
| Spinner mientras carga | `loading=true` muestra `CircularProgress` |
| Mensaje vacío | `get_all_users` devuelve `[]` → texto correcto |
| Título "Gestión de Usuarios" | Verificación del rename del diálogo |
| Chip "Club" para rol club | `.MuiChip-label` con texto "Club" |
| Chip "Entrenador" para rol trainer | `.MuiChip-label` con texto "Entrenador" |
| Chip "Atleta" para rol athlete | `.MuiChip-label` con texto "Atleta" |
| Selector Club visible para role=club | `<label>Club</label>` presente |
| Selector Club visible para role=trainer | `<label>Club</label>` presente |
| Selector Club oculto para role=athlete | `<label>Club</label>` ausente |
| Selector Club oculto para role=consulta | `<label>Club</label>` ausente |
| handleClubChange llama RPC correcto | `update_user_club({ p_target_user_id, p_club_id })` |
| Layout flex — sin posición absoluta | `.MuiListItemSecondaryAction-root` ausente del DOM |

---

## Problemas encontrados y soluciones

### 1. Nombres de usuario que coinciden con etiquetas de chips

Los constantes de test usaban nombres como `name: 'Entrenador'`. El chip de rol y el nombre del usuario renderizaban el mismo texto → `screen.getByText('Entrenador')` encontraba múltiples elementos → `waitFor` hacía timeout.

**Solución:** Nombres de usuario genéricos que no coincidan con los textos de chip (`'Ana García'`, `'Juan López'`, etc.).

### 2. MUI Select muestra el valor seleccionado como texto en el DOM

Para `role='club'`, el Select del rol muestra "Club" en el área de display del componente cerrado. El chip también muestra "Club". Dos elementos → `getByText('Club')` fallaba.

**Solución:** Consultar directamente las etiquetas del chip: `document.querySelectorAll('.MuiChip-label')` y comprobar que alguna tiene el texto buscado.

### 3. `getByLabelText` con MUI Select y IDs auto-generados

`getByLabelText(/^Club$/i)` no encontraba el Select porque MUI genera IDs aleatorios para la conexión `InputLabel ↔ Select` y la asociación `aria-labelledby` puede no estar disponible en jsdom.

**Solución:** Buscar por el texto del `<label>` con un selector CSS específico: `screen.getByText('Club', { selector: 'label' })`.

### 4. Interacción con MUI Select en tests

Para simular la apertura del Select de "Club", navegar por el DOM: label → FormControl → combobox.

```js
const clubLabel = screen.getByText('Club', { selector: 'label' })
const formControl = clubLabel.closest('.MuiFormControl-root')
const clubCombobox = formControl.querySelector('[role="combobox"]')
fireEvent.mouseDown(clubCombobox)
const option = await screen.findByRole('option', { name: 'Club B' })
fireEvent.click(option)
```

---

## Resultados finales

```
npm test → ✅ 26/26 tests pasando, 0 fallos
```

| Archivo | Tests | Estado |
|---------|-------|--------|
| `useScopedAthletes.test.jsx` | 14 | ✅ |
| `OrganizationsDialog.test.jsx` | 14 | ✅ |
| `RoleManagementDialog.test.jsx` | 12 | ✅ |

---

## Notas para sesiones futuras

- Los tests de componentes se ubican en `src/test/components/` (análogo a `src/test/hooks/` para hooks)
- Los nombres de constantes de test NO deben coincidir con los labels de chips de MUI
- Para interactuar con MUI Selects: navegar vía `label.closest('.MuiFormControl-root')`, no usar `getByLabelText`
- Los chips de rol se verifican vía `.MuiChip-label`, no `getByText` directo
