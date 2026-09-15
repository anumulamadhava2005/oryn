/** 
 * Oryn Design System — Monochrome gray-scale dark theme
 * Single accent: near-white (#E5E5E7). Everything else is a gray shade.
 * Intentionally nonchalant, considered, not vibe-coded.
 */

import { MMKV } from 'react-native-mmkv';

export type ThemeMode = 'vibrant' | 'monochrome';

export const DISTRICT_THEME = {
  background: '#1A1A1A',       // Deep charcoal canvas matching entire app
  card: '#212121',             // Slightly lifted card
  cardElevated: '#2A2A2A',     // Hover / elevated card / button
  surface: '#272727',          // Inset field
  border: 'rgba(255, 255, 255, 0.09)', // Subtle border
  borderMuted: 'rgba(255, 255, 255, 0.05)', // Muted border
  text: '#EFEFEF',             // Primary text
  textSecondary: 'rgba(239, 239, 239, 0.60)', // Secondary gray
  textMuted: 'rgba(239, 239, 239, 0.38)', // Metadata gray
  accentOrange: '#E5E5E7',     // Core Oryn near-white accent (no random orange)
  accentOrangeFaded: 'rgba(255, 255, 255, 0.10)',
  buttonWhite: '#FFFFFF',      // Primary action pill
  buttonWhiteText: '#000000',
  pillDark: '#272727',         // Filter pill dark
  pillDarkBorder: 'rgba(255, 255, 255, 0.09)',
};

export const MIDNIGHT_PULSE = {
  primary: '#CCFF00',        // Acid Lime / Volt Green
  primaryText: '#0D0E12',    // Deep dark text for primary buttons
  secondary: '#6366F1',      // Indigo / Blurple
  tertiary: '#FF4154',       // Coral Red
  background: '#0D0E12',     // Midnight deep canvas
  card: '#161822',           // Dark card surface
  cardElevated: '#1C1F2D',   // Elevated card surface
  surface: '#151720',        // Inset field / pill background
  surfaceElevated: '#202330', // Raised pill
  border: '#252838',         // Fine border
  borderMuted: '#1A1C28',    // Very subtle border
  text: '#FFFFFF',           // High-contrast headline text
  textSecondary: '#C5C8D6',  // Readable body text
  textMuted: '#8E92A4',      // Metadata label
  textDisabled: '#525566',   // Disabled text
  badgeGreen: '#10B981',     // Live pulsing dot green
};

export const VIBRANT_PALETTE = {
  // ── Base surfaces ───────────────────────────────────────────────
  background:       '#1A1A1A',  // Deep charcoal canvas
  card:             '#212121',  // Slightly lifted card
  cardHover:        '#2A2A2A',  // Hover / pressed card
  surface:          '#272727',  // Inset field / secondary surface
  surfaceHigh:      '#303030',  // Raised element (chips, segments)
  surfaceElevated:  '#383838',  // Top-layer pill / active chip

  // ── Borders ─────────────────────────────────────────────────────
  border:      'rgba(255, 255, 255, 0.09)',
  borderMuted: 'rgba(255, 255, 255, 0.05)',

  // ── Text ─────────────────────────────────────────────────────────
  text:         '#EFEFEF',                     // Primary — near-white, not harsh
  textSecondary: 'rgba(239, 239, 239, 0.60)',  // Secondary label
  textMuted:     'rgba(239, 239, 239, 0.38)',  // Tertiary / metadata
  textDisabled:  'rgba(239, 239, 239, 0.18)',  // Quaternary / disabled

  // ── Single accent ─────────────────────────────────────────────────
  accent:            '#007AFF',
  accentLight:       '#64D2FF',
  accentFaded:       'rgba(0, 122, 255, 0.15)',
  accentFadedBorder: 'rgba(0, 122, 255, 0.30)',

  secondary:       '#5856D6',
  secondaryLight:  '#AF52DE',
  secondaryFaded:  'rgba(88, 86, 214, 0.15)',

  // ── iOS System Colors ─────────────────────────────────────────────
  systemBlue:   '#007AFF',
  systemIndigo: '#5856D6',
  systemPurple: '#AF52DE',
  systemPink:   '#FF2D55',
  systemTeal:   '#30B0C7',
  systemOrange: '#FF9500',
  systemRed:    '#FF3B30',
  systemGreen:  '#34C759',
  systemYellow: '#FFCC00',
  systemGray:   '#8E8E93',
  systemGray2:  '#636366',
  systemGray3:  '#48484A',
  systemGray4:  '#3A3A3C',
  systemGray5:  '#2C2C2E',
  systemGray6:  '#1C1C1E',

  // ── Semantic ──────────────────────────────────────────────────────
  success:      '#34C759',
  successFaded: 'rgba(52, 199, 89, 0.15)',
  warning:      '#FF9500',
  warningFaded: 'rgba(255, 149, 0, 0.15)',
  error:        '#FF3B30',
  errorFaded:   'rgba(255, 59, 48, 0.15)',
  info:         '#007AFF',
  infoFaded:    'rgba(0, 122, 255, 0.15)',

  // ── Priority colours (Apple Semantic) ─────────────────────────────
  priority: {
    critical:      '#FF3B30',
    criticalFaded: 'rgba(255, 59, 48, 0.15)',
    high:          '#FF9500',
    highFaded:     'rgba(255, 149, 0, 0.15)',
    medium:        '#FFCC00',
    mediumFaded:   'rgba(255, 204, 0, 0.15)',
    low:           '#34C759',
    lowFaded:      'rgba(52, 199, 89, 0.15)',
    ignore:        '#8E8E93',
    ignoreFaded:   'rgba(142, 142, 147, 0.15)',
  },

  // ── Category group accent colours (Apple Vibrant Palette) ─────────
  categoryGroup: {
    academics:       '#007AFF',
    academicsFaded:  'rgba(0, 122, 255, 0.15)',
    placement:       '#AF52DE',
    placementFaded:  'rgba(175, 82, 222, 0.15)',
    mess:            '#FF9500',
    messFaded:       'rgba(255, 149, 0, 0.15)',
    hostel:          '#FF2D55',
    hostelFaded:     'rgba(255, 45, 85, 0.15)',
    technical:       '#30B0C7',
    technicalFaded:  'rgba(48, 176, 199, 0.15)',
    GCR:             '#34C759',
    GCRFaded:        'rgba(52, 199, 89, 0.15)',
    admin:           '#5856D6',
    adminFaded:      'rgba(88, 86, 214, 0.15)',
    events:          '#FFCC00',
    eventsFaded:     'rgba(255, 204, 0, 0.15)',
    important:       '#FF3B30',
    importantFaded:  'rgba(255, 59, 48, 0.15)',
    general:         '#636366',
    generalFaded:    'rgba(99, 99, 102, 0.15)',
  },

  // ── Gradients ─────────────────────────────────────────────────────
  gradient: {
    accent:  ['#007AFF', '#5856D6'] as [string, string],
    hero:    ['rgba(0,122,255,0.18)', 'rgba(26,26,26,0)'] as [string, string],
    card:    ['#272727', '#212121'] as [string, string],
    overlay: ['rgba(26,26,26,0)', 'rgba(26,26,26,0.96)'] as [string, string],
    glass:   ['rgba(56,56,56,0.65)', 'rgba(33,33,33,0.88)'] as [string, string],
  },

  // ── Misc ──────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const MONOCHROME_PALETTE = {
  // ── Base surfaces ───────────────────────────────────────────────
  background:       '#1A1A1A',  // Deep charcoal canvas
  card:             '#212121',  // Slightly lifted card
  cardHover:        '#2A2A2A',  // Hover / pressed card
  surface:          '#272727',  // Inset field / secondary surface
  surfaceHigh:      '#303030',  // Raised element (chips, segments)
  surfaceElevated:  '#383838',  // Top-layer pill / active chip

  // ── Borders ─────────────────────────────────────────────────────
  border:      'rgba(255, 255, 255, 0.09)',
  borderMuted: 'rgba(255, 255, 255, 0.05)',

  // ── Text (pure luminance hierarchy) ──────────────────────────────
  text:         '#EFEFEF',                     // Primary — near-white, not harsh
  textSecondary: 'rgba(239, 239, 239, 0.60)',  // Secondary label
  textMuted:     'rgba(239, 239, 239, 0.38)',  // Tertiary / metadata
  textDisabled:  'rgba(239, 239, 239, 0.18)',  // Quaternary / disabled

  // ── Single accent ─────────────────────────────────────────────────
  accent:            '#E5E5E7',
  accentLight:       '#FFFFFF',
  accentFaded:       'rgba(229, 229, 231, 0.10)',
  accentFadedBorder: 'rgba(229, 229, 231, 0.20)',

  secondary:       '#9A9A9E',
  secondaryLight:  '#B0B0B4',
  secondaryFaded:  'rgba(154, 154, 158, 0.12)',

  // ── iOS System Colors → mapped to gray equivalents ────────────────
  systemBlue:   '#D1D1D6',
  systemIndigo: '#AEAEB2',
  systemPurple: '#AEAEB2',
  systemPink:   '#C7C7CC',
  systemTeal:   '#B0B0B4',
  systemOrange: '#C7C7CC',
  systemRed:    '#C7C7CC',
  systemGreen:  '#B8B8BC',
  systemYellow: '#C7C7CC',
  systemGray:   '#8E8E93',
  systemGray2:  '#636366',
  systemGray3:  '#48484A',
  systemGray4:  '#3A3A3C',
  systemGray5:  '#2C2C2E',
  systemGray6:  '#1C1C1E',

  // ── Semantic — luminance-only tints ───────────────────────────────
  success:      '#B8B8BC',
  successFaded: 'rgba(184, 184, 188, 0.10)',
  warning:      '#AEAEB2',
  warningFaded: 'rgba(174, 174, 178, 0.10)',
  error:        '#C7C7CC',
  errorFaded:   'rgba(199, 199, 204, 0.10)',
  info:         '#D1D1D6',
  infoFaded:    'rgba(209, 209, 214, 0.10)',

  // ── Priority — luminance steps (high = brighter) ───────────────────
  priority: {
    critical:      '#EFEFEF',
    criticalFaded: 'rgba(239, 239, 239, 0.12)',
    high:          '#C7C7CC',
    highFaded:     'rgba(199, 199, 204, 0.10)',
    medium:        '#9A9A9E',
    mediumFaded:   'rgba(154, 154, 158, 0.10)',
    low:           '#636366',
    lowFaded:      'rgba(99, 99, 102, 0.10)',
    ignore:        '#48484A',
    ignoreFaded:   'rgba(72, 72, 74, 0.10)',
  },

  // ── Category group accents — gray shades by luminance ─────────────
  categoryGroup: {
    academics:       '#D1D1D6',
    academicsFaded:  'rgba(209, 209, 214, 0.10)',
    placement:       '#AEAEB2',
    placementFaded:  'rgba(174, 174, 178, 0.10)',
    mess:            '#B8B8BC',
    messFaded:       'rgba(184, 184, 188, 0.10)',
    hostel:          '#C7C7CC',
    hostelFaded:     'rgba(199, 199, 204, 0.10)',
    technical:       '#9A9A9E',
    technicalFaded:  'rgba(154, 154, 158, 0.10)',
    GCR:             '#B0B0B4',
    GCRFaded:        'rgba(176, 176, 180, 0.10)',
    admin:           '#8E8E93',
    adminFaded:      'rgba(142, 142, 147, 0.10)',
    events:          '#EFEFEF',
    eventsFaded:     'rgba(239, 239, 239, 0.10)',
    important:       '#FFFFFF',
    importantFaded:  'rgba(255, 255, 255, 0.10)',
    general:         '#636366',
    generalFaded:    'rgba(99, 99, 102, 0.10)',
  },

  // ── Gradients ─────────────────────────────────────────────────────
  gradient: {
    accent:  ['#EFEFEF', '#9A9A9E'] as [string, string],
    hero:    ['rgba(239,239,239,0.08)', 'rgba(26,26,26,0)'] as [string, string],
    card:    ['#272727', '#212121'] as [string, string],
    overlay: ['rgba(26,26,26,0)', 'rgba(26,26,26,0.96)'] as [string, string],
    glass:   ['rgba(56,56,56,0.65)', 'rgba(33,33,33,0.88)'] as [string, string],
  },

  // ── Misc ──────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Read initial theme mode synchronously from preferences storage on module evaluation
const _prefStorage = new MMKV({ id: 'oryn-app-preferences' });
const _storedTheme = _prefStorage.getString('pref:theme_mode') as ThemeMode | undefined;
const _initialMode: ThemeMode = (_storedTheme === 'monochrome' || _storedTheme === 'vibrant') ? _storedTheme : 'monochrome';
const _initialPalette = _initialMode === 'monochrome' ? MONOCHROME_PALETTE : VIBRANT_PALETTE;

export const Colors = {
  ..._initialPalette,

  // Legacy compat
  light: {
    text: '#EFEFEF',
    background: '#1A1A1A',
    backgroundElement: '#272727',
    backgroundSelected: '#303030',
    textSecondary: 'rgba(239, 239, 239, 0.60)',
  },
  dark: {
    text: '#EFEFEF',
    background: '#1A1A1A',
    backgroundElement: '#272727',
    backgroundSelected: '#303030',
    textSecondary: 'rgba(239, 239, 239, 0.60)',
  },
};

/** Dynamically apply theme tokens in-place to Colors */
export function applyTheme(mode: ThemeMode) {
  const target = mode === 'monochrome' ? MONOCHROME_PALETTE : VIBRANT_PALETTE;
  Object.assign(Colors, target);
  Colors.priority = { ...target.priority };
  Colors.categoryGroup = { ...target.categoryGroup };
  Colors.gradient = { ...target.gradient };
}

/** Retrieve palette for specified mode without altering current active Colors */
export function getThemeColors(mode: ThemeMode) {
  return mode === 'monochrome' ? MONOCHROME_PALETTE : VIBRANT_PALETTE;
}

export const Typography = {
  // iOS Typography scale — v2: bumped for legibility on mobile
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 17,
    lg: 20,
    xl: 22,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },
  leading: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.45,
    relaxed: 1.6,
  },
  tracking: {
    tight: -0.4,
    normal: -0.1,
    wide: 0.2,
    wider: 0.5,
    widest: 1.0,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const Spacing = {
  '0.5': 2,
  1: 4,
  '1.5': 6,
  2: 8,
  '2.5': 10,
  3: 12,
  '3.5': 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  // legacy named
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.50,
    shadowRadius: 24,
    elevation: 10,
  },
  accent: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

/** Interaction state opacity presets */
export const Opacity = {
  pressed: 0.7,
  disabled: 0.4,
  hover: 0.85,
} as const;

/** Shared animation configuration presets */
export const AnimationConfig = {
  spring: { damping: 18, stiffness: 200, mass: 0.8 },
  springSnappy: { damping: 22, stiffness: 300, mass: 0.6 },
  timing: { duration: 250 },
  timingSlow: { duration: 450 },
} as const;

/** Safe insets used for tab bar height estimate */
export const BottomTabInset = 84;
export const MaxContentWidth = 600;
