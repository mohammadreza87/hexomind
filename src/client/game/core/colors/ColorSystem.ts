/**
 * Centralized Color System for Hexomind
 *
 * Modern neon color palette with dark/light mode support
 * Integrates with Colormind API for dynamic palette generation
 */

import { DesignSystem } from '../../config/DesignSystem';

export interface ColorScheme {
  // Grid colors
  gridBackground: string;
  gridCell: string;
  gridCellAlt: string;
  gridBorder: string;
  gridBorderSubtle: string;

  // Piece colors (modern gradient-inspired palette)
  pieceColors: string[];

  // Interaction states
  hoverColor: string;
  validPlacement: string;
  invalidPlacement: string;

  // Effects
  glowColor: string;
  successGlow: string;
  linePreviewGlow: string;

  // UI
  textPrimary: string;
  textSecondary: string;
  scorePrimary: string;
  scoreBonus: string;
}

export class ColorSystem {
  private static instance: ColorSystem;
  private isDarkMode: boolean = false;
  private currentScheme: ColorScheme;

  // Modern Dark Palette aligned with Design System
  private readonly NEON_DARK: ColorScheme = {
    // Grid - subtle dark backgrounds from Design System
    gridBackground: DesignSystem.COLORS.solid.bgPrimary,
    gridCell: DesignSystem.COLORS.solid.bgSecondary,
    gridCellAlt: DesignSystem.COLORS.solid.bgTertiary,
    gridBorder: DesignSystem.COLORS.glass.border,
    gridBorderSubtle: DesignSystem.COLORS.glass.background,

    // Modern piece colors - sophisticated gradients
    pieceColors: [
      '#e63946', // Red
      '#ffb703', // Yellow/Gold
      '#fb8500', // Orange
      '#8338ec', // Purple
      '#3a86ff', // Blue
      '#008000', // Green
      '#7209b7', // Deep Purple
    ],

    // Interactions
    hoverColor: DesignSystem.COLORS.solid.hover,
    validPlacement: DesignSystem.COLORS.solid.success,
    invalidPlacement: DesignSystem.COLORS.solid.danger,

    // Effects
    glowColor: '#667eea',
    successGlow: DesignSystem.COLORS.solid.success,
    linePreviewGlow: '', // Will be set dynamically to match piece color

    // UI from Design System
    textPrimary: DesignSystem.COLORS.solid.textPrimary,
    textSecondary: DesignSystem.COLORS.solid.textSecondary,
    scorePrimary: '#667eea',
    scoreBonus: DesignSystem.COLORS.solid.success,
  };

  // Modern Light Mode Palette aligned with Design System
  private readonly MODERN_LIGHT: ColorScheme = {
    // Grid - clean light backgrounds
    gridBackground: '#ffffff',
    gridCell: '#f0f0f4',
    gridCellAlt: '#e8e8ec',
    gridBorder: 'rgba(102, 126, 234, 0.15)',
    gridBorderSubtle: 'rgba(102, 126, 234, 0.08)',

    // Vibrant piece colors for light mode - slightly muted for elegance
    pieceColors: [
      '#e63946', // Red
      '#ffb703', // Yellow/Gold
      '#fb8500', // Orange
      '#8338ec', // Purple
      '#3a86ff', // Blue
      '#008000', // Green
      '#7209b7', // Deep Purple
    ],

    // Interactions
    hoverColor: 'rgba(102, 126, 234, 0.1)',
    validPlacement: '#00c550',
    invalidPlacement: '#d44860',

    // Effects
    glowColor: '#5468d4',
    successGlow: '#00c550',
    linePreviewGlow: '', // Will be set dynamically to match piece color

    // UI
    textPrimary: DesignSystem.COLORS.solid.textInverse,
    textSecondary: 'rgba(10, 10, 15, 0.7)',
    scorePrimary: '#5468d4',
    scoreBonus: '#00c550',
  };

  private constructor() {
    this.detectColorMode();
    this.currentScheme = this.isDarkMode ? this.NEON_DARK : this.MODERN_LIGHT;
  }

  static getInstance(): ColorSystem {
    if (!ColorSystem.instance) {
      ColorSystem.instance = new ColorSystem();
    }
    return ColorSystem.instance;
  }

  /**
   * Detect system color mode preference
   */
  private detectColorMode(): void {
    // Check Reddit's theme or system preference
    const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.isDarkMode = isDark ?? false;

    // Listen for changes
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode = e.matches;
      this.currentScheme = this.isDarkMode ? this.NEON_DARK : this.MODERN_LIGHT;
    });
  }

  /**
   * Get current color scheme
   */
  getScheme(): ColorScheme {
    return this.currentScheme;
  }

  /**
   * Convert hex color to Phaser number format
   */
  hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Convert Phaser number to hex string
   */
  numberToHex(num: number): string {
    return '#' + num.toString(16).padStart(6, '0');
  }

  /**
   * Get a piece color by index
   */
  getPieceColor(index: number): string {
    const colors = this.currentScheme.pieceColors;
    return colors[index % colors.length];
  }

  /**
   * Get piece color as Phaser number
   */
  getPieceColorNumber(index: number): number {
    return this.hexToNumber(this.getPieceColor(index));
  }

  /**
   * Set line preview glow to match current piece
   */
  setLinePreviewColor(pieceColorIndex: number): void {
    this.currentScheme.linePreviewGlow = this.getPieceColor(pieceColorIndex);
  }

  /**
   * Toggle between dark and light mode
   */
  toggleMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.currentScheme = this.isDarkMode ? this.NEON_DARK : this.MODERN_LIGHT;
  }

  /**
   * Check if in dark mode
   */
  isDark(): boolean {
    return this.isDarkMode;
  }

  /**
   * Generate palette from Colormind API
   * Note: This needs to be called from server due to CORS
   */
  async generatePaletteFromColormind(model: string = 'default'): Promise<string[]> {
    try {
      // This would need to be proxied through your server
      // due to CORS restrictions
      const response = await fetch('/api/colormind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          // Can provide input colors to influence the palette
          input: [[44, 43, 44], [90, 83, 82], "N", "N", "N"]
        })
      });

      const data = await response.json();
      const colors = data.result.map((rgb: number[]) => {
        const [r, g, b] = rgb;
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      });

      return colors;
    } catch (error) {
      console.error('Failed to fetch from Colormind:', error);
      // Return default palette on error
      return this.currentScheme.pieceColors;
    }
  }

  /**
   * Apply custom palette
   */
  applyCustomPalette(colors: string[]): void {
    if (colors.length >= 5) {
      // Use the colors for pieces
      this.currentScheme.pieceColors = colors;
    }
  }

  /**
   * Get color for grid cell
   */
  getGridCellColor(): number {
    return this.hexToNumber(this.currentScheme.gridCell);
  }

  /**
   * Get color for grid border
   */
  getGridBorderColor(): number {
    return this.hexToNumber(this.currentScheme.gridBorder);
  }

  /**
   * Add glow/bloom effect to color (for neon effect)
   */
  addNeonGlow(color: string, intensity: number = 1): string {
    // This would be used with Phaser's glow/bloom post-processing
    return color;
  }
}