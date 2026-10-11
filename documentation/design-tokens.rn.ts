/**
 * Y STEM and Chess — React Native Design Tokens
 * ============================================================
 * Import this file into any React Native / Expo component:
 *
 *   import { colors, spacing, typography, radius, shadows } from './design-tokens.rn';
 *
 * All values are React Native-compatible (unitless numbers for
 * dimensions, hex strings for colors, named shadow objects for
 * iOS/Android). No CSS units (rem, px) are used.
 *
 * Mirrors design-tokens.css and tailwind.config.js exactly.
 * See design.md for usage rules and anti-patterns.
 * ============================================================
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';


/* ============================================================
   1. COLOR PALETTE
   Source: tailwind.config.js → theme.extend.colors
   ============================================================ */

export const colors = {
  // Brand greens
  primary:     '#7FCC26', // Main brand green — CTAs, active states, focus rings
  secondary:   '#BFD99E', // Muted green — hover/inactive states, icon tints
  soft:        '#E5F3D2', // Light green — screen backgrounds, card tints, icon containers

  // Accent
  accent:      '#EAD94C', // Yellow — gamification highlights, active toolbar icons, badge borders

  // Neutrals
  dark:        '#1F1F1F', // Near-black — primary text, borders, btn-primary background
  gray:        '#5C5C5C', // Secondary text — body copy, descriptions
  muted:       '#8A8A8A', // Placeholder text, disabled states, metadata labels
  borderLight: '#D6D6D6', // Borders, dividers, separators
  light:       '#F9FAF7', // Off-white — card surfaces, form backgrounds, modals

  // Semantic / Error
  red:         '#D64545', // Errors, destructive actions, invalid input borders
  redLight:    '#F5E9E9', // Error state backgrounds

  // Transparent helpers
  primaryFaint:  'rgba(127, 204, 38, 0.1)',  // primary/10 — subtle green tint
  primaryLight:  'rgba(127, 204, 38, 0.2)',  // primary/20 — success icon container
  primaryMid:    'rgba(127, 204, 38, 0.3)',  // primary/30 — icon tint
  darkOverlay:   'rgba(31, 31, 31, 0.5)',    // dark/50 — modal backdrop
  accentFaint:   'rgba(234, 217, 76, 0.2)',  // accent/20 — tutor section bg
  white10:       'rgba(255, 255, 255, 0.1)',
  white20:       'rgba(255, 255, 255, 0.2)',
  white50:       'rgba(255, 255, 255, 0.5)',
  white60:       'rgba(255, 255, 255, 0.6)',
  white80:       'rgba(255, 255, 255, 0.8)',
} as const;

export type ColorKey = keyof typeof colors;


/* ============================================================
   2. TYPOGRAPHY
   Font: Lato (load via @expo-google-fonts/lato or embed assets)
   ============================================================ */

export const fontFamily = {
  /**
   * Load Lato via Expo:
   *   import { useFonts, Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
   *
   * Then use fontFamily.regular, fontFamily.bold, etc.
   */
  regular:  'Lato_400Regular',
  medium:   'Lato_500Medium',  // Load Lato_500Medium if available, else use regular
  bold:     'Lato_700Bold',

  // System fallback (use until fonts load)
  system:   Platform.OS === 'ios' ? 'System' : 'Roboto',
} as const;

export const fontWeight = {
  normal:   '400' as TextStyle['fontWeight'],
  medium:   '500' as TextStyle['fontWeight'],
  bold:     '700' as TextStyle['fontWeight'],
} as const;

/**
 * Type scale — matches the Tailwind/web type scale.
 * Values are unitless numbers (React Native interprets as dp/pt).
 */
export const fontSize = {
  xs:   12,  // Captions, metadata, copyright labels
  sm:   14,  // Labels, timestamps, small body text
  base: 16,  // Default body text
  lg:   18,  // Nav links, slightly larger body
  xl:   20,  // Large body, card descriptions, btn-green text
  '2xl': 24, // Sub-headings, footer wordmark
  '3xl': 30, // Section headings
  '4xl': 36, // Hero headings
} as const;

export const lineHeight = {
  tight:   1.25,
  normal:  1.5,
  relaxed: 1.625, // Default for body text blocks
} as const;

/** Convenience: multiply fontSize by lineHeight to get absolute lineHeight for RN */
export const getLineHeight = (size: number, ratio: number = lineHeight.relaxed) =>
  Math.round(size * ratio);


/* ============================================================
   3. SPACING SCALE
   4px base, matches Tailwind default spacing.
   Values are unitless numbers (dp/pt in React Native).
   ============================================================ */

export const spacing = {
  0:  0,
  1:  4,   // space-1
  2:  8,   // space-2
  3:  12,  // space-3
  4:  16,  // space-4
  5:  20,  // space-5
  6:  24,  // space-6
  8:  32,  // space-8
  10: 40,  // space-10
  12: 48,  // space-12
  14: 56,  // space-14
  16: 64,  // space-16
  20: 80,  // space-20
  24: 96,  // space-24
} as const;


/* ============================================================
   4. BORDER RADIUS
   Values are unitless numbers (dp/pt in React Native).
   ============================================================ */

export const radius = {
  sm:   2,    // Rarely used
  md:   6,    // Small elements
  lg:   8,    // Dropdowns, icon containers — rounded-lg
  xl:   12,   // Inputs, btn-green — rounded-xl
  '2xl': 16,  // Modals, form cards — rounded-2xl
  '3xl': 24,  // Brand tier cards — rounded-3xl
  full: 9999, // Full pill — btn-primary, avatars, dots
} as const;


/* ============================================================
   5. SHADOWS
   React Native requires separate iOS and Android shadow styles.
   Use the spread operator to apply: { ...shadows.sm }
   ============================================================ */

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
  }) as ViewStyle,

  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 4,
    },
    android: { elevation: 3 },
  }) as ViewStyle,

  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
  }) as ViewStyle,

  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
    },
    android: { elevation: 12 },
  }) as ViewStyle,

  /**
   * Brand card shadows — the most visually distinctive pattern.
   * Offset yellow/green shadow used on the Free and Premium tier cards.
   * Note: React Native doesn't support offset shadows the same way CSS does.
   * These approximate the visual with a colored, offset shadow.
   */
  cardYellow: Platform.select({
    ios: {
      shadowColor: 'rgb(209, 230, 28)',
      shadowOffset: { width: 10, height: 10 },
      shadowOpacity: 0.9,
      shadowRadius: 1,
    },
    android: { elevation: 8 }, // Android elevation doesn't support colored shadows
  }) as ViewStyle,

  cardGreen: Platform.select({
    ios: {
      shadowColor: 'rgb(115, 179, 19)',
      shadowOffset: { width: 10, height: 10 },
      shadowOpacity: 0.9,
      shadowRadius: 1,
    },
    android: { elevation: 8 },
  }) as ViewStyle,
} as const;


/* ============================================================
   6. ANIMATION DURATIONS
   Use with React Native's Animated API or react-native-reanimated.
   Values in milliseconds.
   ============================================================ */

export const duration = {
  fast:   150, // Modal entry, snappy micro-interactions
  base:   300, // Nav transitions, card hover equivalents
  slow:   500, // Button color transitions
} as const;


/* ============================================================
   7. COMPONENT STYLE PRESETS
   Ready-to-use StyleSheet-compatible objects for common patterns.
   Spread into your StyleSheet.create() definitions.
   ============================================================ */

/**
 * Button: Primary
 * Dark pill CTA. Equivalent to .btn-primary on web.
 * Usage: "Donate", "Join Now!", "Get Started!"
 */
export const btnPrimaryStyle = {
  backgroundColor:  colors.dark,
  borderRadius:     radius.full,
  borderWidth:      2,
  borderColor:      colors.dark,
  paddingVertical:  spacing[3],
  paddingHorizontal: spacing[8],
  alignItems:       'center' as const,
  justifyContent:   'center' as const,
};

export const btnPrimaryTextStyle: TextStyle = {
  color:       colors.light,
  fontFamily:  fontFamily.bold,
  fontSize:    fontSize.base,
  fontWeight:  fontWeight.bold,
  lineHeight:  getLineHeight(fontSize.base, lineHeight.relaxed),
};

/**
 * Button: Green
 * Primary brand green rounded button. Equivalent to .btn-green on web.
 * Usage: "Enter", "Start Lesson", "Let's Go!"
 */
export const btnGreenStyle = {
  backgroundColor:  colors.primary,
  borderRadius:     radius.xl,
  paddingVertical:  spacing[3],
  paddingHorizontal: spacing[8],
  alignItems:       'center' as const,
  justifyContent:   'center' as const,
  ...shadows.md,
};

export const btnGreenTextStyle: TextStyle = {
  color:       colors.light,
  fontFamily:  fontFamily.bold,
  fontSize:    fontSize.xl,
  fontWeight:  fontWeight.bold,
};

/**
 * Input: Default
 * Rounded input with brand focus/error states.
 */
export const inputBaseStyle = {
  width:           '100%' as const,
  borderRadius:    radius.xl,
  borderWidth:     2,
  borderColor:     colors.borderLight,
  paddingVertical: spacing[3],
  paddingHorizontal: spacing[4],
  backgroundColor: '#ffffff',
  color:           colors.dark,
  fontSize:        fontSize.sm,
  fontFamily:      fontFamily.regular,
};

export const inputFocusStyle = {
  borderColor: colors.primary,
};

export const inputErrorStyle = {
  borderColor: colors.red,
};

/**
 * Card: Content (subtle)
 * Equivalent to .card on web. Activity entries, list items.
 */
export const cardStyle = {
  backgroundColor: colors.light,
  borderRadius:    radius.lg,
  borderWidth:     1,
  borderColor:     colors.borderLight,
  padding:         spacing[4],
  ...shadows.sm,
};

/**
 * Card: Brand Green (Free tier)
 * Equivalent to .card-brand-green on web.
 */
export const cardBrandGreenStyle = {
  backgroundColor: colors.primary,
  borderRadius:    radius['3xl'],
  padding:         spacing[8],
  alignItems:      'center' as const,
  ...shadows.cardYellow,
};

/**
 * Card: Brand Light (Premium tier)
 * Equivalent to .card-brand-light on web.
 */
export const cardBrandLightStyle = {
  backgroundColor: colors.light,
  borderRadius:    radius['3xl'],
  padding:         spacing[8],
  alignItems:      'center' as const,
  ...shadows.cardGreen,
};

/**
 * Card: Form / Auth panel
 * Equivalent to .card-form on web. Login, signup.
 */
export const cardFormStyle = {
  backgroundColor: colors.light,
  borderRadius:    radius['2xl'],
  borderWidth:     2,
  borderColor:     colors.dark,
  padding:         spacing[8],
  ...shadows.md,
};

/**
 * Modal overlay
 * Full-screen dark backdrop. Equivalent to .modal-overlay on web.
 */
export const modalOverlayStyle = {
  flex:            1,
  backgroundColor: colors.darkOverlay,
  alignItems:      'center' as const,
  justifyContent:  'center' as const,
  padding:         spacing[4],
};

/**
 * Modal content panel
 * Equivalent to .modal-content on web.
 */
export const modalContentStyle = {
  backgroundColor: colors.light,
  width:           '100%' as const,
  maxWidth:        384,
  borderRadius:    radius['2xl'],
  padding:         spacing[8],
  alignItems:      'center' as const,
  gap:             spacing[5],
  ...shadows.xl,
};

/**
 * Avatar / Profile picture circle
 */
export const avatarStyle = {
  width:           56,
  height:          56,
  borderRadius:    radius.full,
  backgroundColor: colors.light,
  borderWidth:     2,
  borderColor:     colors.primary,
  alignItems:      'center' as const,
  justifyContent:  'center' as const,
  ...shadows.sm,
};

/**
 * Nav link text
 * Equivalent to .nav-link on web.
 */
export const navLinkTextStyle: TextStyle = {
  fontSize:   fontSize.lg,
  fontFamily: fontFamily.medium,
  fontWeight: fontWeight.medium,
  color:      colors.dark,
};

/**
 * Section heading
 * Equivalent to .text-section-heading on web.
 */
export const sectionHeadingStyle: TextStyle = {
  fontSize:   fontSize['3xl'],
  fontFamily: fontFamily.bold,
  fontWeight: fontWeight.bold,
  color:      colors.dark,
  textAlign:  'center',
};

/**
 * Hero heading
 * Equivalent to .text-hero on web.
 */
export const heroHeadingStyle: TextStyle = {
  fontSize:   fontSize['3xl'],
  fontFamily: fontFamily.bold,
  fontWeight: fontWeight.bold,
  color:      colors.dark,
  lineHeight: getLineHeight(fontSize['3xl'], lineHeight.relaxed),
};

/**
 * Body text — primary
 */
export const bodyTextStyle: TextStyle = {
  fontSize:   fontSize.base,
  fontFamily: fontFamily.regular,
  color:      colors.dark,
  lineHeight: getLineHeight(fontSize.base, lineHeight.relaxed),
};

/**
 * Body text — secondary / descriptive
 */
export const bodySecondaryTextStyle: TextStyle = {
  fontSize:   fontSize.base,
  fontFamily: fontFamily.regular,
  color:      colors.gray,
  lineHeight: getLineHeight(fontSize.base, lineHeight.relaxed),
};

/**
 * Label / metadata
 * Equivalent to .text-label on web.
 */
export const labelTextStyle: TextStyle = {
  fontSize:      fontSize.xs,
  fontFamily:    fontFamily.bold,
  fontWeight:    fontWeight.bold,
  color:         colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
};

/**
 * Error text
 */
export const errorTextStyle: TextStyle = {
  fontSize:   fontSize.sm,
  fontFamily: fontFamily.bold,
  fontWeight: fontWeight.bold,
  color:      colors.red,
};

/**
 * Timeline dot (activity feed)
 */
export const timelineDotStyle = {
  width:           12,
  height:          12,
  borderRadius:    radius.full,
  backgroundColor: colors.primary,
  borderWidth:     2,
  borderColor:     colors.light,
  ...shadows.sm,
};


/* ============================================================
   8. SCREEN LAYOUT CONSTANTS
   Common layout values for screen-level containers.
   ============================================================ */

export const layout = {
  screenPaddingH:   spacing[6],  // Horizontal padding for most screens (24px)
  screenPaddingV:   spacing[8],  // Vertical padding for most screens (32px)
  sectionSpacing:   spacing[12], // Space between major sections (48px)
  cardGap:          spacing[4],  // Gap between cards in a list (16px)
  formFieldGap:     spacing[6],  // Gap between form fields (24px)
  labelFieldGap:    spacing[2],  // Gap between label and input (8px)
  maxFormWidth:     384,         // Max width for auth/form screens (max-w-sm equivalent)
  navBarHeight:     96,          // NavBar height — h-24 equivalent
} as const;


/* ============================================================
   9. CHESS-SPECIFIC TOKENS
   Values used across the chess board UI components.
   ============================================================ */

export const chess = {
  boardBg:          '#f5f9f0',
  boardDotColor:    'rgba(127, 204, 38, 0.28)',
  boardDotSize:     22,           // Background dot grid spacing
  hatchColor:       'rgba(127, 204, 38, 0.07)',
  highlightSquare:  'rgba(127, 204, 38, 0.4)',
  lastMoveDark:     '#2D6A4F',    // Dark move cell background
} as const;
