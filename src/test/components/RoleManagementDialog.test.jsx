import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import RoleManagementDialog from '../../components/RoleManagementDialog'

const theme = createTheme()

// Module-level constants — names must NOT match chip label strings to avoid multiple-element errors
const CURRENT_USER = { id: 'current-uid', email: 'me@admin.com' }

const USER_CLUB = {
  id: 'u-club',
  email: 'club@org.com',
  raw_user_meta_data: { name: 'Ana García' },
  raw_app_meta_data: { role: 'club', club_id: 10 },
}

const USER_TRAINER = {
  id: 'u-trainer',
  email: 'trainer@org.com',
  raw_user_meta_data: { name: 'Juan López' },
  raw_app_meta_data: { role: 'trainer', club_id: 10 },
}

const USER_ATHLETE = {
  id: 'u-athlete',
  email: 'athlete@org.com',
  raw_user_meta_data: { name: 'María Torres' },
  raw_app_meta_data: { role: 'athlete' },
}

const USER_CONSULTA = {
  id: 'u-consulta',
  email: 'consulta@org.com',
  raw_user_meta_data: { name: 'Pedro Ruiz' },
  raw_app_meta_data: { role: 'consulta' },
}

const CLUBS = [
  { club_id: 10, nombre: 'Club A' },
  { club_id: 20, nombre: 'Club B' },
]

function mockData(users = [USER_CLUB]) {
  supabase.rpc.mockResolvedValue({ data: users, error: null })
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: CLUBS, error: null }),
  })
}

const renderDialog = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <RoleManagementDialog open={true} onClose={vi.fn()} {...props} />
    </ThemeProvider>
  )

describe('RoleManagementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: CURRENT_USER })
  })

  // ─── Loading & empty state ───────────────────────────────────────────────

  it('muestra spinner mientras carga', () => {
    supabase.rpc.mockReturnValue(new Promise(() => {}))
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: CLUBS, error: null }),
    })
    renderDialog()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('muestra mensaje vacío cuando no hay usuarios', async () => {
    mockData([])
    renderDialog()
    await waitFor(() =>
      expect(screen.getByText('No hay usuarios registrados.')).toBeInTheDocument()
    )
  })

  // ─── Título y estructura ─────────────────────────────────────────────────

  it('muestra el título "Gestión de Usuarios"', async () => {
    mockData([USER_CLUB])
    renderDialog()
    await waitFor(() => expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument())
  })

  // ─── Chips de rol ─────────────────────────────────────────────────────────
  // MUI Select also renders the current value text in the DOM, so we query by .MuiChip-label

  it('muestra chip "Club" para usuario con rol club', async () => {
    mockData([USER_CLUB])
    renderDialog()
    await waitFor(() => screen.getByText('Ana García'))
    const chipLabels = document.querySelectorAll('.MuiChip-label')
    expect(Array.from(chipLabels).some((el) => el.textContent === 'Club')).toBe(true)
  })

  it('muestra chip "Entrenador" para usuario con rol trainer', async () => {
    mockData([USER_TRAINER])
    renderDialog()
    await waitFor(() => screen.getByText('Juan López'))
    const chipLabels = document.querySelectorAll('.MuiChip-label')
    expect(Array.from(chipLabels).some((el) => el.textContent === 'Entrenador')).toBe(true)
  })

  it('muestra chip "Atleta" para usuario con rol athlete', async () => {
    mockData([USER_ATHLETE])
    renderDialog()
    await waitFor(() => screen.getByText('María Torres'))
    const chipLabels = document.querySelectorAll('.MuiChip-label')
    expect(Array.from(chipLabels).some((el) => el.textContent === 'Atleta')).toBe(true)
  })

  // ─── Selector de club ─────────────────────────────────────────────────────
  // MUI InputLabel renders as <label class="MuiInputLabel-root">Club</label>

  it('muestra selector de Club para usuario con rol club', async () => {
    mockData([USER_CLUB])
    renderDialog()
    await waitFor(() => screen.getByText('Ana García'))
    expect(screen.getByText('Club', { selector: 'label' })).toBeInTheDocument()
  })

  it('muestra selector de Club para usuario con rol trainer', async () => {
    mockData([USER_TRAINER])
    renderDialog()
    await waitFor(() => screen.getByText('Juan López'))
    expect(screen.getByText('Club', { selector: 'label' })).toBeInTheDocument()
  })

  it('NO muestra selector de Club para usuario con rol athlete', async () => {
    mockData([USER_ATHLETE])
    renderDialog()
    await waitFor(() => screen.getByText('María Torres'))
    expect(screen.queryByText('Club', { selector: 'label' })).not.toBeInTheDocument()
  })

  it('NO muestra selector de Club para usuario con rol consulta', async () => {
    mockData([USER_CONSULTA])
    renderDialog()
    await waitFor(() => screen.getByText('Pedro Ruiz'))
    expect(screen.queryByText('Club', { selector: 'label' })).not.toBeInTheDocument()
  })

  // ─── handleClubChange ─────────────────────────────────────────────────────

  it('llama a update_user_club con p_target_user_id y p_club_id al cambiar club', async () => {
    supabase.rpc.mockImplementation((name) => {
      if (name === 'get_all_users') return Promise.resolve({ data: [USER_CLUB], error: null })
      if (name === 'update_user_club') return Promise.resolve({ data: null, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: CLUBS, error: null }),
    })

    renderDialog()
    await waitFor(() => screen.getByText('Ana García'))

    // Navigate from InputLabel → FormControl → combobox to find the Club select
    const clubLabel = screen.getByText('Club', { selector: 'label' })
    const formControl = clubLabel.closest('.MuiFormControl-root')
    const clubCombobox = formControl.querySelector('[role="combobox"]')
    fireEvent.mouseDown(clubCombobox)

    const option = await screen.findByRole('option', { name: 'Club B' })
    fireEvent.click(option)

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('update_user_club', {
        p_target_user_id: 'u-club',
        p_club_id: 20,
      })
    )
  })

  // ─── Layout — sin posición absoluta ──────────────────────────────────────

  it('no usa ListItemSecondaryAction (sin posición absoluta en los items)', async () => {
    mockData([USER_CLUB, USER_TRAINER])
    const { container } = renderDialog()
    await waitFor(() => screen.getByText('Ana García'))
    expect(container.querySelector('.MuiListItemSecondaryAction-root')).not.toBeInTheDocument()
  })
})
