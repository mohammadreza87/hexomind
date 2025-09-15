/**
 * Modern Design System for Hexomind - 2025 UI Standards
 *
 * This centralized design system ensures consistency across all UI components
 * following modern design principles and 2025 trends.
 */

export class DesignSystem {
  private static instance: DesignSystem;

  // 8-Point Grid System - All spacing/sizing based on 8px increments
  static readonly SPACING = {
    xs: 4,    // 0.5x
    sm: 8,    // 1x base
    md: 16,   // 2x
    lg: 24,   // 3x
    xl: 32,   // 4x
    xxl: 48,  // 6x
    xxxl: 64, // 8x
  } as const;

  // Typography System - Modern, consistent font hierarchy
  static readonly TYPOGRAPHY = {
    fontFamily: {
      display: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      displayBlack: '"Inter Black", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "SF Mono", Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '20px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '40px',
      '4xl': '48px',
    },
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900', // Inter Black - the boldest weight
    },
    lineHeight: {
      tight: '1.1',
      normal: '1.5',
      relaxed: '1.75',
    },
  } as const;

  // Modern Color Palette with Gradients
  static readonly COLORS = {
    // Primary gradients for buttons and highlights
    gradients: {
      primary: ['#667eea', '#764ba2'],      // Purple gradient
      secondary: ['#f093fb', '#f5576c'],    // Pink gradient
      success: ['#00f260', '#0575e6'],      // Green-blue gradient
      warning: ['#f5af19', '#f12711'],      // Orange-red gradient
      danger: ['#ff6b6b', '#ee5a24'],       // Red gradient
      info: ['#667eea', '#63a4ff'],         // Blue gradient
      // Special gradient for HEXOMIND title
      title: ['#667eea', '#764ba2', '#f093fb'], // Purple to pink gradient
      titleAlt: ['#00f5ff', '#8b00ff', '#ff006e'], // Cyan to purple to pink
    },

    // Solid colors for text and backgrounds
    solid: {
      // Text hierarchy
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.8)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
      textInverse: '#0a0a0f',

      // Backgrounds
      bgPrimary: '#0a0a0f',
      bgSecondary: '#13131a',
      bgTertiary: '#1a1a26',
      bgElevated: '#1f1f2e',

      // Status colors
      success: '#00ff88',
      warning: '#ffaa00',
      danger: '#ff4444',
      info: '#00b4ff',

      // Interactive states
      hover: 'rgba(255, 255, 255, 0.1)',
      active: 'rgba(255, 255, 255, 0.15)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },

    // Glass morphism effects
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      backgroundHover: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderHover: 'rgba(255, 255, 255, 0.2)',
    },
  } as const;

  // Border Radius System
  static readonly RADIUS = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    full: '9999px',
  } as const;

  // Neon color gradients - Same hue, different brightness/saturation
  static readonly NEON_GRADIENTS = [
    // Cyan - from dark to bright neon
    ['#004c5c', '#007a8c', '#00b4cc', '#00f5ff', '#66ffff'],
    // Purple - from dark to bright
    ['#2d0047', '#5c00a3', '#8b00ff', '#b366ff', '#d9b3ff'],
    // Pink/Magenta - from dark to bright
    ['#660033', '#cc0066', '#ff006e', '#ff4d94', '#ff99c2'],
    // Blue - from dark to bright
    ['#001a4d', '#003d99', '#0066ff', '#4d94ff', '#99c2ff'],
    // Green - from dark to bright
    ['#003300', '#006600', '#00cc00', '#00ff00', '#66ff66'],
    // Orange - from dark to bright
    ['#663300', '#cc6600', '#ff8800', '#ffaa00', '#ffcc66'],
    // Red - from dark to bright
    ['#660000', '#cc0000', '#ff0000', '#ff4d4d', '#ff9999'],
    // Yellow - from dark to bright
    ['#666600', '#cccc00', '#ffff00', '#ffff66', '#ffffb3'],
    // Aqua/Teal - from dark to bright
    ['#003333', '#006666', '#00cccc', '#00ffff', '#66ffff'],
    // Violet - from dark to bright
    ['#330066', '#6600cc', '#9900ff', '#b366ff', '#d9b3ff'],
  ] as const;

  // Shadow System - Multi-layer shadows for depth
  static readonly SHADOWS = {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    md: '0 4px 6px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.12)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    xl: '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
    glow: '0 0 20px rgba(102, 126, 234, 0.4), 0 0 40px rgba(102, 126, 234, 0.2)',
    glowStrong: '0 0 30px rgba(102, 126, 234, 0.6), 0 0 60px rgba(102, 126, 234, 0.3)',
  } as const;

  // Z-Index Layers for proper stacking
  static readonly LAYERS = {
    background: 0,
    board: 10,
    pieces: 20,
    effects: 30,
    ui: 50,
    dropdown: 60,
    modal: 100,
    toast: 150,
    tooltip: 200,
  } as const;

  // Animation Durations
  static readonly ANIMATION = {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 800,
  } as const;

  // Breakpoints for responsive design
  static readonly BREAKPOINTS = {
    xs: 320,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1536,
  } as const;

  private constructor() {}

  static getInstance(): DesignSystem {
    if (!DesignSystem.instance) {
      DesignSystem.instance = new DesignSystem();
    }
    return DesignSystem.instance;
  }

  /**
   * Get text style configuration for Phaser
   */
  static getTextStyle(
    variant: 'display' | 'heading' | 'body' | 'caption' | 'button' = 'body',
    options?: {
      color?: string;
      weight?: keyof typeof DesignSystem.TYPOGRAPHY.fontWeight;
      align?: 'left' | 'center' | 'right';
    }
  ): Phaser.Types.GameObjects.Text.TextStyle {
    const sizeMap = {
      display: DesignSystem.TYPOGRAPHY.fontSize['3xl'],
      heading: DesignSystem.TYPOGRAPHY.fontSize['2xl'],
      body: DesignSystem.TYPOGRAPHY.fontSize.base,
      caption: DesignSystem.TYPOGRAPHY.fontSize.sm,
      button: DesignSystem.TYPOGRAPHY.fontSize.lg,
    };

    // Weight is handled through fontStyle in Phaser

    return {
      fontFamily: variant === 'display'
        ? DesignSystem.TYPOGRAPHY.fontFamily.display
        : DesignSystem.TYPOGRAPHY.fontFamily.body,
      fontSize: sizeMap[variant],
      fontStyle: options?.weight ? 'normal' : 'normal',
      color: options?.color || DesignSystem.COLORS.solid.textPrimary,
      align: options?.align || 'center',
    };
  }

  /**
   * Create a gradient color string for Canvas/WebGL
   */
  static createGradient(
    context: CanvasRenderingContext2D | WebGLRenderingContext,
    x1: number, y1: number, x2: number, y2: number,
    colors: string[]
  ): CanvasGradient | null {
    if (context instanceof CanvasRenderingContext2D) {
      const gradient = context.createLinearGradient(x1, y1, x2, y2);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
      return gradient;
    }
    return null;
  }

  /**
   * Convert hex color to Phaser number format
   */
  static hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Get consistent spacing value
   */
  static spacing(multiplier: number = 1): number {
    return DesignSystem.SPACING.sm * multiplier;
  }

  /**
   * Check if viewport matches breakpoint
   */
  static matchesBreakpoint(width: number, breakpoint: keyof typeof DesignSystem.BREAKPOINTS): boolean {
    return width >= DesignSystem.BREAKPOINTS[breakpoint];
  }

  /**
   * Get responsive value based on viewport width
   */
  static responsive<T>(
    width: number,
    values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T; xxl?: T }
  ): T | undefined {
    const breakpoints = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'] as const;

    for (const bp of breakpoints) {
      if (values[bp] !== undefined && width >= DesignSystem.BREAKPOINTS[bp]) {
        return values[bp];
      }
    }

    return values.xs;
  }
}

// Export as singleton for easy access
export const DS = DesignSystem;