export const colors = {
    background: '#0f172a', // Slate 900
    surface: '#1e293b',    // Slate 800
    surfaceHighlight: '#334155', // Slate 700
    primary: '#38bdf8',    // Sky 400
    secondary: '#818cf8',  // Indigo 400
    accent: '#f472b6',     // Pink 400
    success: '#4ade80',    // Green 400
    warning: '#fbbf24',    // Amber 400
    error: '#f87171',      // Red 400
    text: '#f8fafc',       // Slate 50
    textSecondary: '#94a3b8', // Slate 400
    border: '#334155',     // Slate 700
};

export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const typography = {
    h1: { fontSize: 32, fontWeight: '700', color: colors.text },
    h2: { fontSize: 24, fontWeight: '600', color: colors.text },
    h3: { fontSize: 20, fontWeight: '600', color: colors.text },
    body: { fontSize: 16, color: colors.text },
    caption: { fontSize: 14, color: colors.textSecondary },
    button: { fontSize: 16, fontWeight: '600', color: colors.background },
};

export const theme = {
    colors,
    spacing,
    typography,
};
