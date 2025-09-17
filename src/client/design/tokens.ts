/**
 * Unified Design Token System for 2025
 * Works across Phaser and React components
 */

// Color primitives using modern OKLCH color space for better perceptual uniformity
export const colorPrimitives = {
  // Neon palette
  neon: {
    purple: 'oklch(70% 0.25 310)',
    pink: 'oklch(75% 0.35 350)',
    blue: 'oklch(65% 0.3 240)',
    cyan: 'oklch(75% 0.2 190)',
    green: 'oklch(70% 0.25 140)',
    yellow: 'oklch(85% 0.3 95)',
    orange: 'oklch(75% 0.35 50)',
    red: 'oklch(65% 0.4 20)',
  },

  // Neutral palette
  neutral: {
    50: 'oklch(98% 0.01 250)',
    100: 'oklch(95% 0.01 250)',
    200: 'oklch(90% 0.01 250)',
    300: 'oklch(80% 0.02 250)',
    400: 'oklch(60% 0.02 250)',
    500: 'oklch(50% 0.02 250)',
    600: 'oklch(40% 0.02 250)',
    700: 'oklch(30% 0.02 250)',
    800: 'oklch(20% 0.02 250)',
    900: 'oklch(10% 0.02 250)',
    950: 'oklch(5% 0.02 250)',
  },

  // Glass effects
  glass: {
    light: 'oklch(100% 0 0 / 0.1)',
    medium: 'oklch(100% 0 0 / 0.2)',
    heavy: 'oklch(100% 0 0 / 0.3)',
    dark: 'oklch(0% 0 0 / 0.1)',
    darker: 'oklch(0% 0 0 / 0.2)',
  },
} as const;

// Typography scale using fluid typography
export const typography = {
  fontSize: {
    '2xs': 'clamp(0.625rem, 1vw + 0.5rem, 0.75rem)',
    xs: 'clamp(0.75rem, 1.2vw + 0.6rem, 0.875rem)',
    sm: 'clamp(0.875rem, 1.4vw + 0.7rem, 1rem)',
    base: 'clamp(1rem, 1.6vw + 0.8rem, 1.125rem)',
    lg: 'clamp(1.125rem, 1.8vw + 0.9rem, 1.25rem)',
    xl: 'clamp(1.25rem, 2vw + 1rem, 1.5rem)',
    '2xl': 'clamp(1.5rem, 2.5vw + 1.2rem, 1.875rem)',
    '3xl': 'clamp(1.875rem, 3vw + 1.5rem, 2.25rem)',
    '4xl': 'clamp(2.25rem, 4vw + 1.8rem, 3rem)',
    '5xl': 'clamp(3rem, 5vw + 2.4rem, 4rem)',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.7,
    loose: 2,
  },
  fontFamily: {
    display: '"Inter Variable", system-ui, -apple-system, sans-serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "Cascadia Code", monospace',
  },
} as const;

// Spacing system using 8px grid
export const spacing = {
  0: 0,
  px: 1,
  0.5: 4,
  1: 8,
  1.5: 12,
  2: 16,
  2.5: 20,
  3: 24,
  3.5: 28,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
  9: 72,
  10: 80,
  12: 96,
  14: 112,
  16: 128,
  20: 160,
  24: 192,
  28: 224,
  32: 256,
} as const;

// Animation tokens
export const animation = {
  duration: {
    instant: 50,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    slowest: 1000,
  },
  easing: {
    // Cubic bezier curves
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Spring physics
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.85)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

    // Material design
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

// Shadows and effects
export const effects = {
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },
  glow: {
    sm: '0 0 10px rgba(var(--glow-color, 183, 148, 244), 0.5)',
    md: '0 0 20px rgba(var(--glow-color, 183, 148, 244), 0.6)',
    lg: '0 0 30px rgba(var(--glow-color, 183, 148, 244), 0.7)',
    xl: '0 0 40px rgba(var(--glow-color, 183, 148, 244), 0.8)',
  },
  blur: {
    xs: 2,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 40,
    '3xl': 64,
  },
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  full: 9999,
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  notification: 70,
  max: 9999,
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Semantic color tokens
export const semanticColors = {
  // UI colors
  background: {
    primary: colorPrimitives.neutral[950],
    secondary: colorPrimitives.neutral[900],
    tertiary: colorPrimitives.neutral[800],
    elevated: colorPrimitives.glass.dark,
  },

  text: {
    primary: colorPrimitives.neutral[50],
    secondary: colorPrimitives.neutral[300],
    tertiary: colorPrimitives.neutral[400],
    disabled: colorPrimitives.neutral[600],
    inverse: colorPrimitives.neutral[950],
  },

  // Interactive colors
  action: {
    primary: colorPrimitives.neon.purple,
    secondary: colorPrimitives.neon.blue,
    success: colorPrimitives.neon.green,
    warning: colorPrimitives.neon.yellow,
    danger: colorPrimitives.neon.red,
    info: colorPrimitives.neon.cyan,
  },

  // Game-specific colors
  game: {
    combo: {
      low: colorPrimitives.neon.cyan,
      medium: colorPrimitives.neon.purple,
      high: colorPrimitives.neon.red,
    },
    score: {
      normal: colorPrimitives.neon.yellow,
      bonus: colorPrimitives.neon.orange,
      mega: colorPrimitives.neon.pink,
    },
  },
} as const;

// Component-specific tokens
export const componentTokens = {
  button: {
    paddingX: spacing[4],
    paddingY: spacing[2],
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },

  card: {
    padding: spacing[6],
    borderRadius: borderRadius['2xl'],
    background: colorPrimitives.glass.dark,
    border: `1px solid ${colorPrimitives.glass.medium}`,
  },

  modal: {
    padding: spacing[8],
    borderRadius: borderRadius['3xl'],
    maxWidth: 560,
    background: colorPrimitives.glass.dark,
    backdropBlur: effects.blur['3xl'],
  },
} as const;

// Convert design tokens to CSS variables
export const getCSSVariables = () => {
  const cssVars: Record<string, string> = {};

  // Color variables
  Object.entries(colorPrimitives.neon).forEach(([key, value]) => {
    cssVars[`--color-neon-${key}`] = value;
  });

  Object.entries(colorPrimitives.neutral).forEach(([key, value]) => {
    cssVars[`--color-neutral-${key}`] = value;
  });

  // Spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = `${value}px`;
  });

  // Animation variables
  Object.entries(animation.duration).forEach(([key, value]) => {
    cssVars[`--duration-${key}`] = `${value}ms`;
  });

  return cssVars;
};

// Convert to Phaser-compatible hex colors
export const toPhaserColor = (oklchColor: string): number => {
  // This is a simplified conversion - in production, use a proper color conversion library
  const hexMap: Record<string, string> = {
    [colorPrimitives.neon.purple]: '#B794F4',
    [colorPrimitives.neon.pink]: '#F687B3',
    [colorPrimitives.neon.blue]: '#63B3ED',
    [colorPrimitives.neon.cyan]: '#4FD1C5',
    [colorPrimitives.neon.green]: '#68D391',
    [colorPrimitives.neon.yellow]: '#F6E05E',
    [colorPrimitives.neon.orange]: '#F6AD55',
    [colorPrimitives.neon.red]: '#FC8181',
  };

  const hex = hexMap[oklchColor] || '#FFFFFF';
  return parseInt(hex.replace('#', '0x'), 16);
};

// Export the complete design system
export const designSystem = {
  colors: colorPrimitives,
  typography,
  spacing,
  animation,
  effects,
  borderRadius,
  zIndex,
  breakpoints,
  semantic: semanticColors,
  components: componentTokens,
  getCSSVariables,
  toPhaserColor,
} as const;

export type DesignSystem = typeof designSystem;