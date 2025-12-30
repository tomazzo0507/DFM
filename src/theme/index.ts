export const colors = {
    background: '#FFFFFF',
    surface: '#F7FAFC',
    surfaceHighlight: '#EDF2F7',
    primary: '#1D4ED8',       // Azul principal
    secondary: '#2563EB',     // Azul de realce
    accent: '#0EA5E9',        // Azul claro para énfasis
    // success/warning/error retirados del uso visual; mantener referencias neutras/azules
    success: '#2563EB',       // usar azul en lugar de verde
    warning: '#1F2937',       // gris oscuro para avisos sobrios
    error: '#1F2937',         // gris oscuro para errores (sin rojo)
    text: '#0B0F14',          // casi negro
    textSecondary: '#4B5563', // gris
    border: '#E5E7EB',        // gris claro
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
    button: { fontSize: 16, fontWeight: '600', color: colors.surface },
};

export const theme = {
    colors,
    spacing,
    typography,
};
