/**
 * Theme Provider for Reddit-aware styling
 * Adapts to Reddit's dark/light mode automatically
 */

export interface ColorPalette {
  // Board colors
  boardBackground: number;
  cellEmpty: number;
  cellEmptyAlt: number;
  cellOccupied: number;
  cellHover: number;
  cellValid: number;
  cellInvalid: number;
  cellHighlight: number;

  // Line and borders
  borderDefault: number;
  borderHighlight: number;
  borderSubtle: number;

  // Piece colors
  pieceColors: number[];
  pieceGhost: number;
  pieceDragging: number;

  // Effects
  glowPrimary: number;
  glowSecondary: number;
  particleColor: number;

  // UI
  textPrimary: number;
  textSecondary: number;
  scorePrimary: number;
  scoreBonus: number;
}

export class ThemeProvider {
  private isDarkMode: boolean = false;
  private currentTheme: ColorPalette;

  // Reddit-inspired color schemes
  private readonly LIGHT_THEME: ColorPalette = {
    // Board colors - Clean, minimal light theme
    boardBackground: 0xffffff,
    cellEmpty: 0xf6f7f8,
    cellEmptyAlt: 0xeaeded,
    cellOccupied: 0x0079d3, // Reddit blue
    cellHover: 0xdae0e6,
    cellValid: 0x46d160,
    cellInvalid: 0xea0027,
    cellHighlight: 0xffd635,

    // Lines and borders
    borderDefault: 0xd7dadc,
    borderHighlight: 0x0079d3,
    borderSubtle: 0xe5e7e8,

    // Piece colors - Vibrant but not overwhelming
    pieceColors: [
      0xff4500, // OrangeRed (Reddit orange)
      0x0079d3, // Reddit blue
      0x46d160, // Green
      0xffd635, // Gold
      0x7193ff, // Periwinkle
      0xff66ac, // Pink
      0x00a6a5, // Teal
      0x9061c2, // Purple
    ],
    pieceGhost: 0xd7dadc,
    pieceDragging: 0x0079d3,

    // Effects
    glowPrimary: 0x0079d3,
    glowSecondary: 0xff4500,
    particleColor: 0xffd635,

    // UI
    textPrimary: 0x1c1c1c,
    textSecondary: 0x7c7c7c,
    scorePrimary: 0x0079d3,
    scoreBonus: 0x46d160,
  };

  private readonly DARK_THEME: ColorPalette = {
    // Board colors - Reddit dark mode inspired
    boardBackground: 0x1a1a1b,
    cellEmpty: 0x272729,
    cellEmptyAlt: 0x343536,
    cellOccupied: 0x4fbcff, // Lighter blue for dark mode
    cellHover: 0x3a3a3c,
    cellValid: 0x5ad275,
    cellInvalid: 0xff585b,
    cellHighlight: 0xffd635,

    // Lines and borders
    borderDefault: 0x343536,
    borderHighlight: 0x4fbcff,
    borderSubtle: 0x272729,

    // Piece colors - Adjusted for dark background
    pieceColors: [
      0xff6b35, // Brighter orange
      0x4fbcff, // Bright blue
      0x5ad275, // Bright green
      0xffd635, // Gold (same)
      0x9bb4ff, // Light periwinkle
      0xff79c6, // Light pink
      0x8be9fd, // Cyan
      0xbd93f9, // Light purple
    ],
    pieceGhost: 0x3a3a3c,
    pieceDragging: 0x4fbcff,

    // Effects
    glowPrimary: 0x4fbcff,
    glowSecondary: 0xff6b35,
    particleColor: 0xffd635,

    // UI
    textPrimary: 0xd7dadc,
    textSecondary: 0x818384,
    scorePrimary: 0x4fbcff,
    scoreBonus: 0x5ad275,
  };

  constructor() {
    this.detectTheme();
    this.currentTheme = this.isDarkMode ? this.DARK_THEME : this.LIGHT_THEME;
    this.setupThemeListener();
  }

  /**
   * Detect Reddit's current theme
   */
  private detectTheme(): void {
    // Check multiple sources for theme detection

    // 1. Check CSS custom properties (Reddit uses these)
    const rootStyles = getComputedStyle(document.documentElement);
    const bgColor = rootStyles.getPropertyValue('--color-background');

    // 2. Check meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    // 3. Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 4. Check Reddit-specific classes
    const hasRedditDark = document.body.classList.contains('theme-dark') ||
                          document.documentElement.classList.contains('theme-dark');

    // 5. Check background color luminance
    const isDarkByBg = this.isBackgroundDark();

    // Determine theme (prioritize Reddit-specific signals)
    this.isDarkMode = hasRedditDark || isDarkByBg || prefersDark;
  }

  /**
   * Check if background is dark by analyzing color
   */
  private isBackgroundDark(): boolean {
    const bgColor = window.getComputedStyle(document.body).backgroundColor;

    if (!bgColor || bgColor === 'transparent') {
      return false;
    }

    // Parse RGB values
    const match = bgColor.match(/\d+/g);
    if (!match || match.length < 3) {
      return false;
    }

    const [r, g, b] = match.map(Number);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance < 0.5;
  }

  /**
   * Setup listener for theme changes
   */
  private setupThemeListener(): void {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      this.isDarkMode = e.matches;
      this.updateTheme();
      this.notifyThemeChange();
    });

    // Listen for DOM changes (Reddit might add/remove theme classes)
    const observer = new MutationObserver(() => {
      const wasDark = this.isDarkMode;
      this.detectTheme();

      if (wasDark !== this.isDarkMode) {
        this.updateTheme();
        this.notifyThemeChange();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /**
   * Update current theme
   */
  private updateTheme(): void {
    this.currentTheme = this.isDarkMode ? this.DARK_THEME : this.LIGHT_THEME;
  }

  /**
   * Get current theme
   */
  getTheme(): ColorPalette {
    return this.currentTheme;
  }

  /**
   * Check if dark mode
   */
  getIsDarkMode(): boolean {
    return this.isDarkMode;
  }

  /**
   * Get specific color
   */
  getColor(key: keyof ColorPalette): number {
    return this.currentTheme[key] as number;
  }

  /**
   * Get piece color by index
   */
  getPieceColor(index: number): number {
    const colors = this.currentTheme.pieceColors;
    return colors[index % colors.length];
  }

  /**
   * Convert hex color to CSS string
   */
  toCSS(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  /**
   * Get contrast color (for text on colored backgrounds)
   */
  getContrastColor(backgroundColor: number): number {
    // Extract RGB
    const r = (backgroundColor >> 16) & 0xff;
    const g = (backgroundColor >> 8) & 0xff;
    const b = backgroundColor & 0xff;

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white or black based on luminance
    return luminance > 0.5 ? 0x000000 : 0xffffff;
  }

  // Event system for theme changes
  private listeners: Set<(isDark: boolean) => void> = new Set();

  /**
   * Subscribe to theme changes
   */
  onThemeChange(callback: (isDark: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyThemeChange(): void {
    this.listeners.forEach(callback => callback(this.isDarkMode));
  }

  /**
   * Force a specific theme (for testing)
   */
  forceTheme(isDark: boolean): void {
    this.isDarkMode = isDark;
    this.updateTheme();
    this.notifyThemeChange();
  }

  /**
   * Get theme for Phaser scenes
   */
  getPhaserTheme(): {
    backgroundColor: string;
    colors: ColorPalette;
  } {
    return {
      backgroundColor: this.toCSS(this.currentTheme.boardBackground),
      colors: this.currentTheme
    };
  }
}