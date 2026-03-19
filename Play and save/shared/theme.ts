/**
 * Design System "Eco-friendly" — Play & Save
 * Dark-mode-first, solar gold + eco green accents
 */

export const Colors = {
    // Backgrounds
    background: '#0D1117',
    surface: '#161B22',
    surfaceLight: '#1C2333',
    card: '#1E2736',

    // Accents
    solarGold: '#F5A623',
    solarGoldLight: '#FFD580',
    ecoGreen: '#2ECC71',
    ecoGreenDark: '#1FAF5C',

    // Text
    textPrimary: '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted: '#484F58',

    // Status
    success: '#2ECC71',
    warning: '#F5A623',
    error: '#F85149',

    // Borders
    border: '#30363D',
    borderLight: '#3D444D',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};

export const FontSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
    hero: 48,
};

export const Shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    glow: {
        shadowColor: Colors.solarGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
};
