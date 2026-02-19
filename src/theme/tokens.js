// Design Tokens

export const tokens = {
    colors: {
        primary: {
            main: '#E11141',
            light: '#FF4D6A',
            dark: '#B80D34',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#dc004e',
            light: '#ff5983',
            dark: '#9a0036',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f2f3f7',
            paper: '#ffffff',
        },
        text: {
            primary: '#1c1b1f',
            secondary: '#49454f',
            disabled: '#9e9e9e',
        },
        surface: {
            main: '#ffffff',
            onSurface: '#1c1b1f',
            onSurfaceVariant: '#49454f',
        },
        status: {
            success: '#2e7d32',
            warning: '#ed6c02',
            error: '#d32f2f',
            info: '#0288d1',
        },
        neutral: {
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
        },
    },
    typography: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
        h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
        h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 },
        h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2 },
        h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.2 },
        h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 },
        body1: { fontSize: '1rem', lineHeight: 1.5 },
        body2: { fontSize: '0.875rem', lineHeight: 1.43 },
        caption: { fontSize: '0.75rem', lineHeight: 1.66 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    spacing: (factor) => `${8 * factor}px`,
    borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '10px', // Matches main.jsx default
        xl: '16px',
        full: '9999px',
    },
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 960,
            lg: 1280,
            xl: 1920,
        },
    },
    shadows: {
        card: '0 2px 12px rgba(0, 0, 0, 0.06)',
    },
}
