import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

vi.mock('../../components/CreateOrganizationDialog', () => ({
  default: () => null,
}))

import { supabase } from '../../lib/supabase'
import OrganizationsDialog from '../../components/OrganizationsDialog'

const theme = createTheme()

// Module-level constants — avoid React 19 inline object identity issues
const ORG_ACTIVE = {
  id: 'org-1',
  name: 'Club Activo',
  subscription_status: 'active',
  is_active: true,
  admin_id: 'user-1',
  admin_email: 'admin@club.com',
  admin_name: 'Admin Uno',
  club_id: 10,
  club_name: 'Club Ejemplo',
}

const ORG_DISABLED = {
  id: 'org-2',
  name: 'Club Deshabilitado',
  subscription_status: 'trial',
  is_active: false,
  admin_id: null,
  admin_email: null,
  admin_name: null,
  club_id: 11,
  club_name: 'Otro Club',
}

const CLUBS = [
  { club_id: 10, nombre: 'Club Ejemplo' },
  { club_id: 11, nombre: 'Otro Club' },
]

const CONTACT_USERS = [
  { id: 'user-1', email: 'admin@club.com', name: 'Admin Uno' },
  { id: 'user-2', email: 'otro@club.com', name: 'Otro Admin' },
]

function mockFromClubs() {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: CLUBS, error: null }),
  })
}

function mockRpcDefaults(orgs = [ORG_ACTIVE]) {
  supabase.rpc.mockImplementation((name) => {
    if (name === 'get_organizations') return Promise.resolve({ data: orgs, error: null })
    if (name === 'get_club_users_for_club') return Promise.resolve({ data: CONTACT_USERS, error: null })
    if (name === 'update_organization') return Promise.resolve({ data: null, error: null })
    if (name === 'update_organization_contact') return Promise.resolve({ data: null, error: null })
    if (name === 'disable_organization') return Promise.resolve({ data: null, error: null })
    if (name === 'enable_organization') return Promise.resolve({ data: null, error: null })
    return Promise.resolve({ data: null, error: null })
  })
}

const renderDialog = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <OrganizationsDialog open={true} onClose={vi.fn()} {...props} />
    </ThemeProvider>
  )

describe('OrganizationsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromClubs()
  })

  // ─── Loading & empty state ───────────────────────────────────────────────

  it('muestra spinner mientras carga', () => {
    supabase.rpc.mockImplementation(() => new Promise(() => {}))
    renderDialog()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('muestra mensaje vacío cuando no hay organizaciones', async () => {
    mockRpcDefaults([])
    renderDialog()
    await waitFor(() =>
      expect(screen.getByText('No hay organizaciones creadas')).toBeInTheDocument()
    )
  })

  // ─── Lista de organizaciones ─────────────────────────────────────────────

  it('renderiza el nombre de una organización activa', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => expect(screen.getByText('Club Activo')).toBeInTheDocument())
  })

  it('muestra chip "Deshabilitada" y opacidad reducida para org deshabilitada', async () => {
    mockRpcDefaults([ORG_DISABLED])
    renderDialog()
    await waitFor(() => expect(screen.getByText('Club Deshabilitado')).toBeInTheDocument())
    expect(screen.getByText('Deshabilitada')).toBeInTheDocument()
    const listItem = screen.getByText('Club Deshabilitado').closest('li')
    expect(listItem).toHaveStyle('opacity: 0.5')
  })

  it('el botón power es color error (rojo) para org activa', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))
    const errorBtn = document.querySelector('.MuiIconButton-colorError')
    expect(errorBtn).toBeInTheDocument()
  })

  it('el botón power es color success (verde) para org deshabilitada', async () => {
    mockRpcDefaults([ORG_DISABLED])
    renderDialog()
    await waitFor(() => screen.getByText('Club Deshabilitado'))
    const successBtn = document.querySelector('.MuiIconButton-colorSuccess')
    expect(successBtn).toBeInTheDocument()
  })

  // ─── Diálogo confirmación disable ────────────────────────────────────────

  it('abre diálogo de confirmación con aviso de trainers al deshabilitar', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))

    const errorBtn = document.querySelector('.MuiIconButton-colorError')
    fireEvent.click(errorBtn)

    expect(screen.getByText('Deshabilitar organización')).toBeInTheDocument()
    expect(screen.getByText(/desvinculará a todos los entrenadores/i)).toBeInTheDocument()
  })

  it('llama a disable_organization con el org id correcto al confirmar', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))

    fireEvent.click(document.querySelector('.MuiIconButton-colorError'))
    const confirmBtn = screen.getByRole('button', { name: /deshabilitar/i })
    fireEvent.click(confirmBtn)

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('disable_organization', { p_org_id: 'org-1' })
    )
  })

  // ─── Diálogo confirmación enable ─────────────────────────────────────────

  it('abre diálogo de confirmación con aviso de restauración manual al habilitar', async () => {
    mockRpcDefaults([ORG_DISABLED])
    renderDialog()
    await waitFor(() => screen.getByText('Club Deshabilitado'))

    fireEvent.click(document.querySelector('.MuiIconButton-colorSuccess'))

    expect(screen.getByText('Habilitar organización')).toBeInTheDocument()
    expect(screen.getByText(/deberán ser reinvitados/i)).toBeInTheDocument()
  })

  it('llama a enable_organization con el org id correcto al confirmar', async () => {
    mockRpcDefaults([ORG_DISABLED])
    renderDialog()
    await waitFor(() => screen.getByText('Club Deshabilitado'))

    fireEvent.click(document.querySelector('.MuiIconButton-colorSuccess'))
    const confirmBtn = screen.getByRole('button', { name: /habilitar/i })
    fireEvent.click(confirmBtn)

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('enable_organization', { p_org_id: 'org-2' })
    )
  })

  // ─── Diálogo de edición ───────────────────────────────────────────────────

  it('abre el diálogo de edición con el nombre actual al hacer click en TbEdit', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))

    // Edit button is the first icon button in the list item (before the power button)
    const listItem = screen.getByText('Club Activo').closest('li')
    const iconButtons = listItem.querySelectorAll('button')
    fireEvent.click(iconButtons[0]) // first = edit

    expect(screen.getByText('Editar organización')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Club Activo')).toBeInTheDocument()
  })

  it('llama a get_club_users_for_club al abrir el diálogo de edición', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))

    const listItem = screen.getByText('Club Activo').closest('li')
    fireEvent.click(listItem.querySelectorAll('button')[0])

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('get_club_users_for_club', { p_club_id: 10 })
    )
  })

  it('llama a update_organization al guardar cambios del nombre', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))

    const listItem = screen.getByText('Club Activo').closest('li')
    fireEvent.click(listItem.querySelectorAll('button')[0])
    await waitFor(() => screen.getByText('Editar organización'))

    const nameInput = screen.getByDisplayValue('Club Activo')
    fireEvent.change(nameInput, { target: { value: 'Nuevo Nombre' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('update_organization', {
        p_org_id: 'org-1',
        p_name: 'Nuevo Nombre',
        p_club_id: 10,
      })
    )
  })

  it('NO llama a update_organization_contact si el adminId no cambió', async () => {
    mockRpcDefaults([ORG_ACTIVE])
    renderDialog()
    await waitFor(() => screen.getByText('Club Activo'))

    const listItem = screen.getByText('Club Activo').closest('li')
    fireEvent.click(listItem.querySelectorAll('button')[0])
    await waitFor(() => screen.getByText('Editar organización'))

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('update_organization', expect.any(Object))
    )
    const contactCalls = supabase.rpc.mock.calls.filter(
      ([name]) => name === 'update_organization_contact'
    )
    expect(contactCalls).toHaveLength(0)
  })
})
