/**
 * Neon Theme Provider - Modern neon aesthetic with centralized colors
 */

import { ColorSystem } from '../../core/colors/ColorSystem';
import { DesignSystem } from '../../config/DesignSystem';

export class NeonThemeProvider {
  private colorSystem: ColorSystem;
  private listeners: (() => void)[] = [];

  constructor() {
    this.colorSystem = ColorSystem.getInstance();

    // Listen for system theme changes
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.notifyListeners();
    });
  }

  /**
   * Get theme for Phaser components
   */
  getTheme() {
    const scheme = this.colorSystem.getScheme();

    return {
      // Grid colors
      boardBackground: this.colorSystem.hexToNumber(scheme.gridBackground),
      cellEmpty: this.colorSystem.hexToNumber(scheme.gridCell),
      cellEmptyAlt: this.colorSystem.hexToNumber(scheme.gridCellAlt),
      cellHover: this.colorSystem.hexToNumber(scheme.hoverColor),
      cellValid: this.colorSystem.hexToNumber(scheme.validPlacement),
      cellInvalid: this.colorSystem.hexToNumber(scheme.invalidPlacement),

      // Borders
      borderDefault: this.colorSystem.hexToNumber(scheme.gridBorder),
      borderSubtle: this.colorSystem.hexToNumber(scheme.gridBorderSubtle),
      borderHighlight: this.colorSystem.hexToNumber(scheme.glowColor),

      // Effects
      glowPrimary: this.colorSystem.hexToNumber(scheme.glowColor),
      glowSecondary: this.colorSystem.hexToNumber(scheme.successGlow),
      glowSuccess: this.colorSystem.hexToNumber(scheme.successGlow),

      // UI
      textPrimary: this.colorSystem.hexToNumber(scheme.textPrimary),
      textSecondary: this.colorSystem.hexToNumber(scheme.textSecondary),
      scorePrimary: this.colorSystem.hexToNumber(scheme.scorePrimary),
      scoreBonus: this.colorSystem.hexToNumber(scheme.scoreBonus),

      // Piece colors array
      pieceColors: scheme.pieceColors.map(color => this.colorSystem.hexToNumber(color))
    };
  }

  /**
   * Get piece color for a specific piece by color index
   */
  getPieceColorByIndex(colorIndex: number): number {
    return this.colorSystem.getPieceColorNumber(colorIndex);
  }

  /**
   * Get piece color for a specific piece ID (legacy)
   */
  getPieceColor(pieceId: string): number {
    // Use piece ID to consistently assign colors
    const index = Math.abs(pieceId.charCodeAt(0) + pieceId.charCodeAt(1) || 0);
    return this.colorSystem.getPieceColorNumber(index);
  }

  /**
   * Get line preview color (matches current piece)
   */
  getLinePreviewColor(pieceId: string): number {
    // Line preview uses same color as the piece being dragged
    return this.getPieceColor(pieceId);
  }

  /**
   * Convert hex number to CSS color string
   */
  toCSS(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  /**
   * Get Phaser scene background color
   */
  getPhaserTheme() {
    const scheme = this.colorSystem.getScheme();
    return {
      backgroundColor: this.colorSystem.hexToNumber(scheme.gridBackground)
    };
  }

  /**
   * Subscribe to theme changes
   */
  onThemeChange(callback: () => void): void {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Check if in dark mode
   */
  isDarkMode(): boolean {
    return this.colorSystem.isDark();
  }

  /**
   * Toggle theme mode
   */
  toggleTheme(): void {
    this.colorSystem.toggleMode();
    DesignSystem.applyCssVariables();
    this.notifyListeners();
  }

  /**
   * Load custom palette from Colormind
   */
  async loadCustomPalette(): Promise<void> {
    try {
      const colors = await this.colorSystem.generatePaletteFromColormind('default');
      this.colorSystem.applyCustomPalette(colors);
      DesignSystem.applyCssVariables();
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load custom palette:', error);
    }
  }
}