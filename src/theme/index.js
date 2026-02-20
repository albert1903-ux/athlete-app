import { createTheme } from '@mui/material/styles'
import { tokens } from './tokens'

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        background: tokens.colors.background,
        text: tokens.colors.text,
        // Custom properties
        surface: tokens.colors.surface.main,
        onSurface: tokens.colors.surface.onSurface,
        onSurfaceVariant: tokens.colors.surface.onSurfaceVariant,
    },
    typography: tokens.typography,
    breakpoints: tokens.breakpoints,
    shape: {
        borderRadius: parseInt(tokens.borderRadius.lg), // 10
    },
    components: {
        // Card Styles
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.colors.background.paper,
                    boxShadow: tokens.shadows.card,
                    borderRadius: tokens.borderRadius.lg,
                },
            },
        },
        // Dialog Styles
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: tokens.borderRadius.lg,
                    maxWidth: 'calc(100% - 32px)',
                    maxHeight: 'calc(90% - 32px)',
                    margin: 16,
                    width: '100%',
                },
            },
        },
        // BottomNavigation Styles
        MuiBottomNavigation: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.colors.background.paper,
                    height: '80px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                },
            },
        },
        MuiBottomNavigationAction: {
            styleOverrides: {
                root: {
                    color: tokens.colors.text.secondary,
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    minWidth: '64px',
                    transition: 'color 0.2s ease-in-out',
                    '&.Mui-selected': {
                        color: tokens.colors.primary.main,
                    },
                },
                label: {
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginTop: '4px',
                    transition: 'font-size 0.2s ease-in-out, font-weight 0.2s ease-in-out',
                    '&.Mui-selected': {
                        fontSize: '0.75rem',
                        fontWeight: 600,
                    },
                },
            },
        },
        // Button Base Styles (to align with Atom)
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius.md, // slightly smaller than cards
                    textTransform: 'none',
                    fontWeight: 600,
                },
            },
        },
    },
})

export default theme
