/** 
 * Apple HIG Design System — iOS dark-mode tokens, system colors, typography, continuous radii, glassmorphism
 * v2 — Redesigned for legibility, breathing room, and consistent interaction states
 */

export const Colors = {
  // Oryn palette — #2D2D2D signature background
  background: '#2D2D2D',           // Signature Oryn background (#2D2D2D from oryn.svg)
  card: '#222224',                 // Dark grouped card fill
  cardHover: '#343438',            // Active / hovered card fill
  surface: '#252528',              // Secondary surface fill
  surfaceHigh: '#36363A',          // Tertiary fill / active segment background
  surfaceElevated: '#424246',      // Quaternary fill / touch highlight
  border: 'rgba(255, 255, 255, 0.12)',       // Separator line
  borderMuted: 'rgba(255, 255, 255, 0.07)',  // Subtle card inner line

  // iOS System Colors
  systemBlue: '#007AFF',
  systemIndigo: '#5856D6',
  systemPurple: '#AF52DE',
  systemPink: '#FF2D55',
  systemTeal: '#30B0C7',
  systemOrange: '#FF9500',
  systemRed: '#FF3B30',
  systemGreen: '#34C759',
  systemYellow: '#FFCC00',
  systemGray: '#8E8E93',
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: '#1C1C1E',

  // Text colors (iOS Label system)
  text: '#FFFFFF',                           // System primary label
  textSecondary: 'rgba(235, 235, 245, 0.65)', // System secondary label
  textMuted: 'rgba(235, 235, 245, 0.40)',     // System tertiary label
  textDisabled: 'rgba(235, 235, 245, 0.20)',  // System quaternary label

  // Accents (Primary Apple Blue & Indigo)
  accent: '#007AFF',
  accentLight: '#64D2FF',
  accentFaded: 'rgba(0, 122, 255, 0.15)',
  accentFadedBorder: 'rgba(0, 122, 255, 0.3)',

  secondary: '#5856D6',
  secondaryLight: '#5E5CE6',
  secondaryFaded: 'rgba(88, 86, 214, 0.15)',

  // Semantic
  success: '#34C759',
  successFaded: 'rgba(52, 199, 89, 0.15)',
  warning: '#FF9500',
  warningFaded: 'rgba(255, 149, 0, 0.15)',
  error: '#FF3B30',
  errorFaded: 'rgba(255, 59, 48, 0.15)',
  info: '#007AFF',
  infoFaded: 'rgba(0, 122, 255, 0.15)',

  // Priority colours
  priority: {
    critical: '#FF3B30',
    criticalFaded: 'rgba(255, 59, 48, 0.15)',
    high: '#FF9500',
    highFaded: 'rgba(255, 149, 0, 0.15)',
    medium: '#FFCC00',
    mediumFaded: 'rgba(255, 204, 0, 0.15)',
    low: '#34C759',
    lowFaded: 'rgba(52, 199, 89, 0.15)',
    ignore: '#8E8E93',
    ignoreFaded: 'rgba(142, 142, 147, 0.15)',
  },

  // Category group accent colours (Apple Vibrant Palette)
  categoryGroup: {
    academics: '#007AFF',
    academicsFaded: 'rgba(0, 122, 255, 0.15)',
    placement: '#AF52DE',
    placementFaded: 'rgba(175, 82, 222, 0.15)',
    mess: '#FF9500',
    messFaded: 'rgba(255, 149, 0, 0.15)',
    hostel: '#FF2D55',
    hostelFaded: 'rgba(255, 45, 85, 0.15)',
    technical: '#30B0C7',
    technicalFaded: 'rgba(48, 176, 199, 0.15)',
    GCR: '#34C759',
    GCRFaded: 'rgba(52, 199, 89, 0.15)',
    admin: '#5856D6',
    adminFaded: 'rgba(88, 86, 214, 0.15)',
    events: '#FFCC00',
    eventsFaded: 'rgba(255, 204, 0, 0.15)',
    important: '#FF3B30',
    importantFaded: 'rgba(255, 59, 48, 0.15)',
    general: '#636366',
    generalFaded: 'rgba(99, 99, 102, 0.15)',
  },

  // Gradients
  gradient: {
    accent: ['#007AFF', '#5856D6'] as [string, string],
    hero: ['rgba(0,122,255,0.2)', 'rgba(45,45,45,0)'] as [string, string],
    card: ['#252528', '#1E1E20'] as [string, string],
    overlay: ['rgba(45,45,45,0)', 'rgba(45,45,45,0.95)'] as [string, string],
    glass: ['rgba(54,54,58,0.7)', 'rgba(36,36,38,0.85)'] as [string, string],
  },

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Legacy compat
  light: {
    text: '#FFFFFF',
    background: '#2D2D2D',
    backgroundElement: '#252528',
    backgroundSelected: '#36363A',
    textSecondary: 'rgba(235, 235, 245, 0.65)',
  },
  dark: {
    text: '#FFFFFF',
    background: '#2D2D2D',
    backgroundElement: '#252528',
    backgroundSelected: '#36363A',
    textSecondary: 'rgba(235, 235, 245, 0.65)',
  },
} as const;

export const Typography = {
  // iOS Typography scale — v2: bumped for legibility on mobile
  size: {
    xs: 12,       // was 11 — caption / metadata
    sm: 14,       // was 13 — secondary body
    base: 16,     // was 15 — primary body
    md: 17,       // unchanged — iOS body default
    lg: 20,       // unchanged — section titles
    xl: 22,       // unchanged — screen sub-titles
    '2xl': 28,    // unchanged — screen titles
    '3xl': 34,    // unchanged — large display
    '4xl': 40,    // unchanged — hero display
  },
  // Line heights
  leading: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.45,
    relaxed: 1.6,
  },
  // Letter spacing (SF Pro style)
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
  '1.5': 6,      // NEW — fine gap
  2: 8,
  '2.5': 10,     // NEW — medium gap
  3: 12,
  '3.5': 14,     // NEW — card padding
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
  none: 0,       // NEW — borderless elements
  sm: 8,
  md: 12,
  lg: 16,        // Standard Apple squircle card
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  accent: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
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
