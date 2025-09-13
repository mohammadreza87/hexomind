/**
 * Centralized Color System for Hexomind
 *
 * Modern neon color palette with dark/light mode support
 * Integrates with Colormind API for dynamic palette generation
 */

export interface ColorScheme {
  // Grid colors
  gridBackground: string;
  gridCell: string;
  gridCellAlt: string;
  gridBorder: string;
  gridBorderSubtle: string;

  // Piece colors (neon palette)
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

  // Modern Neon Palette for Dark Mode
  private readonly NEON_DARK: ColorScheme = {
    // Grid - subtle dark backgrounds
    gridBackground: '#0a0a0f',
    gridCell: '#1a1a2e',
    gridCellAlt: '#1a1a2e', // Same color for uniform look
    gridBorder: '#2a2a3e',
    gridBorderSubtle: '#16213e',

    // Neon piece colors - vibrant and glowing
    pieceColors: [
      '#ff006e', // Hot Pink
      '#00f5ff', // Cyan
      '#00ff88', // Spring Green
      '#ffaa00', // Orange
      '#8b00ff', // Purple
      '#ff3366', // Red Pink
      '#00ffaa', // Aquamarine
      '#ffd700', // Gold
    ],

    // Interactions
    hoverColor: '#2a2a4e',
    validPlacement: '#00ff88',
    invalidPlacement: '#ff0055',

    // Effects
    glowColor: '#00f5ff',
    successGlow: '#00ff88',
    linePreviewGlow: '', // Will be set dynamically to match piece color

    // UI
    textPrimary: '#ffffff',
    textSecondary: '#aaaaaa',
    scorePrimary: '#00f5ff',
    scoreBonus: '#00ff88',
  };

  // Modern Light Mode Palette
  private readonly MODERN_LIGHT: ColorScheme = {
    // Grid - clean light backgrounds with subtle gray
    gridBackground: '#ffffff',
    gridCell: '#e8e8e8',
    gridCellAlt: '#e8e8e8', // Same color for uniform look
    gridBorder: '#d0d0d0',
    gridBorderSubtle: '#f0f0f0',

    // Vibrant piece colors for light mode
    pieceColors: [
      '#e60049', // Radical Red
      '#0bb4ff', // Blue Cyan
      '#50e991', // Emerald
      '#e6a300', // Gold
      '#9b19f5', // Purple
      '#ffa300', // Orange
      '#dc0ab4', // Magenta
      '#b3d300', // Lime
    ],

    // Interactions
    hoverColor: '#f5f5f5',
    validPlacement: '#50e991',
    invalidPlacement: '#e60049',

    // Effects
    glowColor: '#0bb4ff',
    successGlow: '#50e991',
    linePreviewGlow: '', // Will be set dynamically to match piece color

    // UI
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    scorePrimary: '#0bb4ff',
    scoreBonus: '#50e991',
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