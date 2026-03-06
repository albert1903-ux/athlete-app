import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles'
import { tokens } from '../theme/tokens'
import useMediaQuery from '@mui/material/useMediaQuery'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [modePreference, setModePreference] = useState(() => {
        return localStorage.getItem('themeMode') || 'system'
    })

    const [primaryColor, setPrimaryColor] = useState(() => {
        return localStorage.getItem('themePrimaryColor') || tokens.colors.primary.main
    })

    const [secondaryColor, setSecondaryColor] = useState(() => {
        return localStorage.getItem('themeSecondaryColor') || tokens.colors.secondary.main
    })

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    // Calculate actual active mode based on preference rules
    const activeMode = useMemo(() => {
        if (modePreference === 'system') {
            return prefersDarkMode ? 'dark' : 'light'
        }
        return modePreference
    }, [modePreference, prefersDarkMode])

    // Update local storage when preference changes
    useEffect(() => {
        localStorage.setItem('themeMode', modePreference)
    }, [modePreference])

    useEffect(() => {
        localStorage.setItem('themePrimaryColor', primaryColor)
    }, [primaryColor])

    useEffect(() => {
        localStorage.setItem('themeSecondaryColor', secondaryColor)
    }, [secondaryColor])

    // Generate dynamic theme based on active mode
    const theme = useMemo(() => {
        return createTheme({
            palette: {
                mode: activeMode,
                primary: {
                    ...tokens.colors.primary,
                    main: primaryColor
                },
                secondary: {
                    ...tokens.colors.secondary,
                    main: secondaryColor
                },
                // Provide dynamic background/text based on mode
                background: {
                    default: activeMode === 'dark' ? '#121212' : tokens.colors.background.default,
                    paper: activeMode === 'dark' ? '#1e1e1e' : tokens.colors.background.paper,
                },
                text: {
                    primary: activeMode === 'dark' ? '#ffffff' : tokens.colors.text.primary,
                    secondary: activeMode === 'dark' ? '#b0b3b8' : tokens.colors.text.secondary,
                },
            },
            typography: tokens.typography,
            breakpoints: tokens.breakpoints,
            shape: {
                borderRadius: parseInt(tokens.borderRadius.lg),
            },
            components: {
                MuiCard: {
                    styleOverrides: {
                        root: {
                            backgroundColor: activeMode === 'dark' ? '#1e1e1e' : tokens.colors.background.paper,
                            boxShadow: tokens.shadows.card,
                            borderRadius: tokens.borderRadius.lg,
                            backgroundImage: 'none', // Remove MUI default overlay on dark mode cards
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: {
                            borderRadius: parseInt(tokens.borderRadius.lg),
                            maxWidth: 'calc(100% - 32px)',
                            maxHeight: 'calc(90% - 32px)',
                            margin: 16,
                            width: '100%',
                            backgroundImage: 'none',
                        },
                    },
                },
                MuiBottomNavigation: {
                    styleOverrides: {
                        root: {
                            backgroundColor: activeMode === 'dark' ? '#1e1e1e' : tokens.colors.background.paper,
                            height: '80px',
                            paddingTop: '8px',
                            paddingBottom: '8px',
                        },
                    },
                },
                MuiBottomNavigationAction: {
                    styleOverrides: {
                        root: {
                            color: activeMode === 'dark' ? '#b0b3b8' : tokens.colors.text.secondary,
                            paddingTop: '8px',
                            paddingBottom: '8px',
                            minWidth: '64px',
                            transition: 'color 0.2s ease-in-out',
                            '&.Mui-selected': {
                                color: primaryColor,
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
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: tokens.borderRadius.md,
                            textTransform: 'none',
                            fontWeight: 600,
                        },
                    },
                },
            },
        })
    }, [activeMode, primaryColor, secondaryColor])

    const toggleTheme = (newMode) => {
        setModePreference(newMode)
    }

    const contextValue = {
        modePreference, 
        activeMode, 
        toggleTheme,
        primaryColor,
        setPrimaryColor,
        secondaryColor,
        setSecondaryColor
    }

    return (
        <ThemeContext.Provider value={contextValue}>
            <MUIThemeProvider theme={theme}>
                {children}
            </MUIThemeProvider>
        </ThemeContext.Provider>
    )
}

export const useAppTheme = () => useContext(ThemeContext)
