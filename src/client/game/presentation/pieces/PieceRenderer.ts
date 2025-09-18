import * as Phaser from 'phaser';
import { PieceModel } from '../../core/models/PieceModel';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';
import { HexCoordinates } from '../../../../shared/types/hex';
import { RenderConfig } from '../../config/RenderConfig';
import { DepthEffects } from '../utils/DepthEffects';

/**
 * PieceRenderer - Visual representation of a draggable piece
 * Renders hexagonal pieces with proper styling and effects
 */
export class PieceRenderer {
  private scene: Phaser.Scene;
  private piece: PieceModel;
  private themeProvider: NeonThemeProvider;
  private container: Phaser.GameObjects.Container;

  private hexagons: Phaser.GameObjects.Image[] = [];
  private shadow: Phaser.GameObjects.Graphics;
  // Glow removed - no longer needed
  private depthEffects: DepthEffects;
  private readonly cellOffsets: Phaser.Math.Vector2[] = [];

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
    // For 1080x1920 resolution, use larger sizes
    const slotSize = 150; // Larger slots for 1080p

    // Calculate normal size for board (matching board hexagon size)
    // Should match the board's hex size calculation
    this.normalHexSize = 80; // Match the much bigger board hexagons

    // Base hex size for tray - will be adjusted if piece is too large
    this.hexSize = 32; // Bigger for better visibility in tray
    this.originalHexSize = this.hexSize; // Store original for later

    // Create container - depth will be managed by parent
    this.container = scene.add.container(0, 0);

    this.depthEffects = DepthEffects.forScene(scene, themeProvider);

    // Create visual elements
    this.createShadow();
    // Glow removed
    this.renderPiece();

    this.depthEffects.registerPiece(this.container, this.shadow, null);
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

  // Glow effect removed - no longer needed

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

    // Image mode: draw with rotated SVG fill texture for crisp edges
    this.cellOffsets.length = 0;

    shape.cells.forEach((coord) => {
      const pos = this.hexToPixel(coord);
      const relX = pos.x - centerX;
      const relY = pos.y - centerY;
      // Add spacing between piece hexagons (8% like the grid)
      const spacing = this.hexSize * 0.08;

      // Create graphics for hexagon shape with glassmorphism
      const hexGraphics = this.scene.add.graphics();

      // Draw filled hexagon with piece color - flat-top orientation with 30° rotation
      hexGraphics.fillStyle(pieceColor, 0.85);
      hexGraphics.lineStyle(1, 0xffffff, 0.125); // Subtle border

      hexGraphics.beginPath();
      const size = this.hexSize - spacing;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i; // Flat-top hexagon (starts at 0°)
        const px = relX + Math.cos(angle) * size;
        const py = relY + Math.sin(angle) * size;
        if (i === 0) {
          hexGraphics.moveTo(px, py);
        } else {
          hexGraphics.lineTo(px, py);
        }
      }
      hexGraphics.closePath();
      hexGraphics.fillPath();
      hexGraphics.strokePath();

      // Don't add the SVG overlay - it causes the square frame
      this.container.add(hexGraphics);
      // Store graphics as hexagons for compatibility
      this.hexagons.push(hexGraphics as any);

      this.cellOffsets.push(new Phaser.Math.Vector2(relX, relY));
    });

    this.depthEffects.updatePieceShadow(this.shadow, this.cellOffsets, this.hexSize);
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
    const x = this.hexSize * 1.5 * coord.q;
    const y = this.hexSize * Math.sqrt(3) * (coord.r + coord.q / 2);
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

      this.depthEffects.beginDragFocus(this.container, this.shadow, null);
    } else {
      this.depthEffects.endDragFocus(this.container, this.shadow, null);
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
    this.depthEffects.syncPieceBase(this.container, this.shadow, null);
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
    // Glow removed - no visual feedback for valid placement
  }

  /**
   * Highlight invalid placement
   */
  showInvalidPlacement(): void {
    // Glow removed - no visual feedback for invalid placement
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

    this.depthEffects.syncPieceBase(this.container, this.shadow, null);
  }

  /**
   * Keep piece at normal size (for when placed on board)
   */
  keepNormalSize(): void {
    this.hexSize = this.normalHexSize;
    // Ensure container scale reflects the normal size
    const scaleFactor = this.normalHexSize / this.originalHexSize;
    this.container.setScale(scaleFactor);
    this.depthEffects.syncPieceBase(this.container, this.shadow, null);
  }

  /**
   * Apply hover depth effects if available
   */
  applyHoverDepth(): void {
    if (this.dragging) return;
    this.depthEffects.applyPieceHover(this.container, this.shadow, null);
  }

  /**
   * Release hover depth effects and restore defaults
   */
  releaseHoverDepth(): void {
    if (this.dragging) return;
    this.depthEffects.releasePieceHover(this.container, this.shadow, null);
  }

  /**
   * Re-sync base metrics for depth effects (used after snapping)
   */
  syncDepthBase(): void {
    this.depthEffects.syncPieceBase(this.container, this.shadow, null);
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    this.depthEffects.cleanupGameObject(this.container);
    this.container.destroy();
  }
}
