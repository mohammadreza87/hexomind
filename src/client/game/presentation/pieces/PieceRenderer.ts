import * as Phaser from 'phaser';
import { PieceModel } from '../../core/models/PieceModel';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';
import { HexCoordinates } from '../../../../shared/types/hex';
import { RenderConfig } from '../../config/RenderConfig';

/**
 * PieceRenderer - Visual representation of a draggable piece
 * Renders hexagonal pieces with proper styling and effects
 */
export class PieceRenderer {
  private scene: Phaser.Scene;
  private piece: PieceModel;
  private themeProvider: NeonThemeProvider;
  private container: Phaser.GameObjects.Container;

  private hexagons: Phaser.GameObjects.Graphics[] = [];
  private shadow: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;

  private dragging: boolean = false;
  private hexSize: number; // Dynamic size
  private originalHexSize: number; // Store original size for tray
  private normalHexSize: number; // Normal size for board placement

  constructor(scene: Phaser.Scene, piece: PieceModel, themeProvider: NeonThemeProvider) {
    this.scene = scene;
    this.piece = piece;
    this.themeProvider = themeProvider;

    // Calculate dynamic hex size based on screen
    const { width, height } = scene.cameras.main;
    // Make pieces fit within the smaller slot placeholders
    // Start with a base size that should work for most pieces
    const slotSize = Math.min(100, Math.max(60, width / 8)); // Match PieceTray calculation

    // Calculate normal size for board (matching board hexagon size)
    this.normalHexSize = Math.min(50, Math.max(20, height * 0.45 / (1.5 * 7))); // Match board sizing

    // Base hex size for tray - will be adjusted if piece is too large
    this.hexSize = slotSize / 6; // Start with reasonable size
    this.originalHexSize = this.hexSize; // Store original for later

    // Create container - depth will be managed by parent
    this.container = scene.add.container(0, 0);

    // Create visual elements
    this.createShadow();
    this.createGlow();
    this.renderPiece();
  }

  /**
   * Create shadow effect
   */
  private createShadow(): void {
    this.shadow = this.scene.add.graphics();
    this.shadow.setAlpha(0.15);
    this.shadow.setVisible(false); // Hide shadow initially
    this.container.add(this.shadow);
  }

  /**
   * Create glow effect (shown when dragging)
   */
  private createGlow(): void {
    this.glow = this.scene.add.graphics();
    this.glow.setAlpha(0);
    this.container.add(this.glow);
  }

  /**
   * Render the piece hexagons
   */
  private renderPiece(): void {
    const theme = this.themeProvider.getTheme();
    const shape = this.piece.getShape();

    // Get piece color from theme based on color index
    const pieceColor = this.themeProvider.getPieceColorByIndex(this.piece.getColorIndex());

    // Get slot size for bounds checking
    const slotSize = Math.min(100, Math.max(60, this.scene.cameras.main.width / 8));
    const maxDimension = slotSize * 0.7; // Leave some padding

    // Calculate initial bounds
    let bounds = this.calculatePieceBounds(shape.cells);

    // Check if piece is too large and scale down if needed
    const pieceWidth = bounds.maxX - bounds.minX + this.hexSize * 2;
    const pieceHeight = bounds.maxY - bounds.minY + this.hexSize * 2;

    if (pieceWidth > maxDimension || pieceHeight > maxDimension) {
      const scale = Math.min(maxDimension / pieceWidth, maxDimension / pieceHeight);
      this.hexSize *= scale;
      this.originalHexSize = this.hexSize; // Store scaled size
      // Recalculate bounds with new size
      bounds = this.calculatePieceBounds(shape.cells);
    }

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Graphics mode only
    shape.cells.forEach((coord, index) => {
      const hex = this.scene.add.graphics();
      const pos = this.hexToPixel(coord);
      const relX = pos.x - centerX;
      const relY = pos.y - centerY;

      // Draw filled hexagon with correct rotation (flat top)
      hex.fillStyle(pieceColor, 1);
      hex.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6; // Flat top orientation
        const px = relX + this.hexSize * Math.cos(angle);
        const py = relY + this.hexSize * Math.sin(angle);
        if (i === 0) {
          hex.moveTo(px, py);
        } else {
          hex.lineTo(px, py);
        }
      }
      hex.closePath();
      hex.fillPath();

      // Add border
      hex.lineStyle(1, 0x000000, 0.5);
      hex.strokePath();

      this.hexagons.push(hex);
      this.container.add(hex);
    });
  }

  /**
   * Draw a hexagon
   */
  private drawHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    fill: boolean = true
  ): void {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // Flat top orientation
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(new Phaser.Geom.Point(px, py));
    }

    if (fill) {
      graphics.fillPoints(points, true);
    } else {
      graphics.strokePoints(points, true);
    }
  }

  /**
   * Convert hex coordinates to pixel position
   */
  private hexToPixel(coord: HexCoordinates): { x: number, y: number } {
    const x = this.hexSize * Math.sqrt(3) * (coord.q + coord.r / 2);
    const y = this.hexSize * 1.5 * coord.r;
    return { x, y };
  }

  /**
   * Calculate piece bounds
   */
  private calculatePieceBounds(cells: HexCoordinates[]): { minX: number, maxX: number, minY: number, maxY: number } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    cells.forEach(coord => {
      const pos = this.hexToPixel(coord);
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });

    return { minX, maxX, minY, maxY };
  }

  /**
   * Set dragging state
   */
  setDragging(dragging: boolean): void {
    this.dragging = dragging;

    if (dragging) {
      // Scale to normal size when dragging
      this.scaleToNormalSize();

      // Show glow
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0.6,
        duration: 200,
        ease: 'Power2'
      });

      // Hide shadow
      this.scene.tweens.add({
        targets: this.shadow,
        alpha: 0,
        duration: 100
      });
    } else {
      // Hide glow
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0,
        duration: 200,
        ease: 'Power2'
      });

      // Show shadow
      this.scene.tweens.add({
        targets: this.shadow,
        alpha: 0.2,
        duration: 200
      });
    }
  }

  /**
   * Check if dragging
   */
  isDragging(): boolean {
    return this.dragging;
  }

  /**
   * Get the piece model
   */
  getPiece(): PieceModel {
    return this.piece;
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Get container
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Highlight valid placement
   */
  showValidPlacement(): void {
    const theme = this.themeProvider.getTheme();
    const shape = this.piece.getShape();
    this.glow.clear();
    this.glow.lineStyle(4, theme.cellValid, 0.8);

    shape.cells.forEach(coord => {
      const pos = this.hexToPixel(coord);
      const bounds = this.calculateBounds();
      this.drawHexagon(
        this.glow,
        pos.x - bounds.centerX,
        pos.y - bounds.centerY,
        this.hexSize + 2,
        false
      );
    });

    this.glow.setAlpha(0.8);
  }

  /**
   * Highlight invalid placement
   */
  showInvalidPlacement(): void {
    const theme = this.themeProvider.getTheme();
    const shape = this.piece.getShape();
    this.glow.clear();
    this.glow.lineStyle(4, theme.cellInvalid, 0.8);

    shape.cells.forEach(coord => {
      const pos = this.hexToPixel(coord);
      const bounds = this.calculateBounds();
      this.drawHexagon(
        this.glow,
        pos.x - bounds.centerX,
        pos.y - bounds.centerY,
        this.hexSize + 2,
        false
      );
    });

    this.glow.setAlpha(0.8);
  }

  /**
   * Calculate bounds for centering
   */
  private calculateBounds(): { centerX: number, centerY: number } {
    const bounds = this.calculatePieceBounds(this.piece.getShape().cells);
    return {
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2
    };
  }

  /**
   * Scale piece to normal board size
   */
  scaleToNormalSize(): void {
    if (Math.abs(this.hexSize - this.normalHexSize) < 0.01) return; // Already at normal size

    const scaleFactor = this.normalHexSize / this.hexSize;
    this.hexSize = this.normalHexSize;

    // Animate the scale change
    this.scene.tweens.add({
      targets: this.container,
      scaleX: scaleFactor,
      scaleY: scaleFactor,
      duration: 200,
      ease: 'Power2'
    });
  }

  /**
   * Scale piece back to tray size
   */
  scaleToTraySize(): void {
    if (Math.abs(this.hexSize - this.originalHexSize) < 0.01) return; // Already at tray size

    this.hexSize = this.originalHexSize;

    // Reset to original scale (1) since the piece was created at tray size
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Power2'
    });
  }

  /**
   * Keep piece at normal size (for when placed on board)
   */
  keepNormalSize(): void {
    this.hexSize = this.normalHexSize;
    // Ensure container scale reflects the normal size
    const scaleFactor = this.normalHexSize / this.originalHexSize;
    this.container.setScale(scaleFactor);
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    this.container.destroy();
  }
}