/**
 * Design tokens bersama untuk menjaga konsistensi tampilan lintas halaman.
 * Gunakan StyleSheet React Native untuk komponen native; global.css hanya untuk web.
 */
export const DesignTokens = {
  color: {
    background: '#FFF6ED',
    cream: '#FFF5EA',
    backgroundWarm: '#FFF6EC',
    surface: '#FFFFFF',
    primary: '#8B5E3C',
    primaryLight: '#C08A5E',
    accent: '#C48B60',
    sand: '#EEE2D3',
    mango: '#E8B84B',
    iconButton: '#FFF3E6',
    overlay: 'rgba(58, 36, 24, 0.45)',
    primaryDark: '#8B5A3C',
    mutedTab: '#A79B91',
    tabBorder: '#EEE7E1',
    text: '#402D1E',
    textDark: '#3A2418',
    textMuted: '#8A7A6C',
    border: '#F1E3D3',
    borderWarm: '#F3E6D8',
    inputPlaceholder: '#A0A0A0',
    danger: '#C0392B',
    dangerSoft: '#FCEBE8',
    thumb: '#F1E3D3',
    white: '#FFFFFF',
    transparent: 'transparent',
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    pill: 999,
  },
  typography: {
    body: 14,
    bodySmall: 13,
    bodyLarge: 16,
    heading: 28,
  },
} as const;

export const StickyMilkColors = DesignTokens.color;
