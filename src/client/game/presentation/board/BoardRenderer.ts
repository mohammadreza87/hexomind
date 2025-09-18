import * as Phaser from 'phaser';
import { GridModel } from '../../core/models/GridModel';
import { HexCoordinates, hexToKey } from '../../../../shared/types/hex';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';
import { HexagonRenderer } from './HexagonRenderer';
import { RenderConfig } from '../../config/RenderConfig';
import { DepthEffects } from '../utils/DepthEffects';
import { ResponsiveMetrics } from '../../responsive';

/**
 * BoardRenderer - Manages the visual representation of the game board
 *
 * Responsibilities:
 * - Renders a radius-3 hexagonal grid
 * - Maintains center positioning
 * - Handles responsive sizing
 * - Manages theme changes
 * - Provides smooth animations
 */
export class BoardRenderer {
  private scene: Phaser.Scene;
  private gridModel: GridModel;
  private themeProvider: NeonThemeProvider;
  private viewport: ResponsiveMetrics;
  private hexRenderer: HexagonRenderer;

  // Containers
  private boardContainer: Phaser.GameObjects.Container;
  private cellsContainer: Phaser.GameObjects.Container;
  private effectsContainer: Phaser.GameObjects.Container;

  // Cell visuals using SVG images for base/fill
  private cellBaseImages: Map<string, Phaser.GameObjects.Image>;
  private cellFillImages: Map<string, Phaser.GameObjects.Image>;
  private cellInteractives: Map<string, Phaser.GameObjects.Zone>;

  // Board configuration
  private readonly BOARD_RADIUS = 3; // Always radius 3 as specified
  private hexSize: number = 40;
  private hexSpacing: number = 4; // Increased spacing between cells

  // Animation state
  private isAnimating: boolean = false;
  private animationQueue: (() => Promise<void>)[] = [];
  private clearAnimationGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // Preview state
  private previewGraphics: Phaser.GameObjects.Graphics;
  private previewHexRenderer: HexagonRenderer;
  private linePreviewContainer: Phaser.GameObjects.Container;
  private linePreviewGraphics: Phaser.GameObjects.Graphics[];
  private depthEffects: DepthEffects;

  constructor(scene: Phaser.Scene, viewport: ResponsiveMetrics) {
    this.scene = scene;
    this.gridModel = new GridModel(this.BOARD_RADIUS);
    this.themeProvider = new NeonThemeProvider();
    this.viewport = viewport;
    this.hexRenderer = new HexagonRenderer(this.themeProvider);
    this.hexRenderer.setOrientation('flat');
    this.hexRenderer.setRotationOffset(0);

    // Create a separate renderer for preview with rotation to match piece images
    this.previewHexRenderer = new HexagonRenderer(this.themeProvider);
    this.previewHexRenderer.setOrientation('flat');
    this.previewHexRenderer.setRotationOffset(Math.PI / 6);

    this.cellBaseImages = new Map();
    this.cellFillImages = new Map();
    this.cellInteractives = new Map();

    // Create container hierarchy with proper depth
    this.boardContainer = scene.add.container(0, 0);
    this.boardContainer.setDepth(10); // Board at lower depth
    this.cellsContainer = scene.add.container(0, 0);
    this.effectsContainer = scene.add.container(0, 0);

    this.boardContainer.add([this.cellsContainer, this.effectsContainer]);

    // Create preview graphics
    this.previewGraphics = scene.add.graphics();
    this.previewGraphics.setDepth(70);
    this.boardContainer.add(this.previewGraphics);

    // Create line preview container and graphics array (higher depth for filled hexagons)
    this.linePreviewContainer = scene.add.container(0, 0);
    this.linePreviewContainer.setDepth(75);
    this.boardContainer.add(this.linePreviewContainer);
    this.linePreviewGraphics = [];

    this.depthEffects = DepthEffects.forScene(scene, this.themeProvider);

    this.initialize();
  }

  /**
   * Initialize the board
   */
  private initialize(): void {
    // Calculate optimal hex size based on viewport
    this.calculateOptimalSize();

    // Generate board cells
    this.generateBoard();

    // Center the board
    this.centerBoard();

    // Setup theme change listener
    this.setupThemeListener();

    // Initial render
    this.render();
  }

  /**
   * Calculate optimal hexagon size for viewport
   */
  private calculateOptimalSize(): void {
    // For fixed 1080x1920 viewport, calculate optimal hex size
    const gameWidth = 1080;
    const gameHeight = 1920;

    // Board radius is 3, so we need to fit the full diameter plus borders
    const gridWidth = 8.5;  // Slightly less to make hexagons bigger
    const gridHeight = 8.5; // Slightly less to make hexagons bigger

    // Use 95% of width for the board for much bigger hexagons
    const availableWidth = gameWidth * 0.95;
    // Use about 55% of height for the board area (bigger grid)
    const availableHeight = gameHeight * 0.55;

    const sizeByWidth = availableWidth / (1.5 * gridWidth);
    const sizeByHeight = availableHeight / (Math.sqrt(3) * gridHeight);

    const baseSize = Math.min(sizeByWidth, sizeByHeight);

    // Increase hex size bounds for bigger grid
    const minSize = 80;
    const maxSize = 100;

    this.hexSize = Phaser.Math.Clamp(baseSize, minSize, maxSize);
    this.hexSpacing = this.hexSize * 0.08;
  }

  /**
   * Generate board cells
   */
  private generateBoard(): void {
    // Clear existing cells
    this.clearBoard();

    // Generate cells for radius-3 grid
    for (let q = -this.BOARD_RADIUS; q <= this.BOARD_RADIUS; q++) {
      const r1 = Math.max(-this.BOARD_RADIUS, -q - this.BOARD_RADIUS);
      const r2 = Math.min(this.BOARD_RADIUS, -q + this.BOARD_RADIUS);

      for (let r = r1; r <= r2; r++) {
        const coords: HexCoordinates = { q, r };
        this.createCell(coords);
      }
    }
  }

  /**
   * Regenerate the board (public method for resetting the game)
   */
  public regenerateBoard(): void {
    // Clear the board model
    this.gridModel.reset();
    // Regenerate visual board
    this.generateBoard();
  }

  /**
   * Create a single cell
   */
  private createCell(coords: HexCoordinates): void {
    const key = hexToKey(coords);
    const position = this.hexToPixelInternal(coords);

    // Base and fill images with spacing applied
    // Reduce the visual size to create gaps between hexagons
    const radius = this.hexSize - this.hexSpacing;
    const dim = radius * 2;
    const base = this.scene.add.image(position.x, position.y, RenderConfig.TEXTURE_KEYS.HEX_BASE_SVG).setOrigin(0.5);
    base.setDisplaySize(dim, dim);
    base.setAlpha(0.3); // Set initial alpha for empty cell appearance
    // Use theme color instead of hardcoded tint
    const theme = this.themeProvider.getTheme();
    base.setTint(theme.cellEmpty);
    // No rotation - images should already be in correct orientation
    const fill = this.scene.add.image(position.x, position.y, RenderConfig.TEXTURE_KEYS.HEX_FILL_SVG).setOrigin(0.5);
    fill.setDisplaySize(dim - 2, dim - 2);
    // No rotation - hexagons should be flat-top orientation
    fill.setVisible(false);

    // Create interactive zone
    const zone = this.scene.add.zone(
      position.x,
      position.y,
      this.hexSize * 2,
      this.hexSize * 2
    );

    // Build a polygon hit area in the Zone's local space (top-left origin)
    // Phaser Zones use local coordinates with (0,0) at the top-left of the zone,
    // so shift the center-based hex points by +size in both axes.
    const hitSize = this.hexSize - this.hexSpacing / 2;
    const rawPoints = this.hexRenderer.getHexPoints(hitSize);
    const shiftedPoints = rawPoints.map(p => new Phaser.Geom.Point(p.x + this.hexSize, p.y + this.hexSize));

    // Remove interactivity - cells are not clickable
    // zone.setInteractive(new Phaser.Geom.Polygon(shiftedPoints), Phaser.Geom.Polygon.Contains);

    // Store data
    zone.setData('coords', coords);
    zone.setData('key', key);

    // Add to containers
    this.cellsContainer.add(base);
    this.cellsContainer.add(fill);
    this.cellsContainer.add(zone);

    // Store references
    this.cellBaseImages.set(key, base);
    this.cellFillImages.set(key, fill);
    this.cellInteractives.set(key, zone);

    // No interaction events needed - cells are not clickable
    // this.setupCellInteraction(zone, coords);
  }

  /**
   * Setup cell interaction
   */
  private setupCellInteraction(zone: Phaser.GameObjects.Zone, coords: HexCoordinates): void {
    zone.on('pointerover', () => this.handleCellHover(coords, true));
    zone.on('pointerout', () => this.handleCellHover(coords, false));
    zone.on('pointerdown', () => this.handleCellClick(coords));
  }


  /**
   * Handle cell hover
   */
  private handleCellHover(coords: HexCoordinates, isHovering: boolean): void {
    if (!this.gridModel.isCellOccupied(coords)) {
      this.renderCell(coords, isHovering);
    }
  }

  /**
   * Handle cell click
   */
  private handleCellClick(coords: HexCoordinates): void {
    // Emit event for game logic to handle
    this.scene.events.emit('board:cellClicked', coords);
  }

  /**
   * Render all cells
   */
  private render(): void {
    this.cellBaseImages.forEach((_img, key) => {
      const coords = this.keyToCoords(key);
      this.renderCell(coords, false);
    });
  }

  /**
   * Render a single cell
   */
  private renderCell(coords: HexCoordinates, isHovering: boolean = false): void {
    const key = hexToKey(coords);
    const base = this.cellBaseImages.get(key);
    const fill = this.cellFillImages.get(key);
    if (!base || !fill) return;

    const cell = this.gridModel.getCell(coords);
    const isOccupied = cell?.isOccupied || false;
    const theme = this.themeProvider.getTheme();

    // ALWAYS reset scale and size to prevent growing hexagons
    const radius = this.hexSize - this.hexSpacing;
    const dim = radius * 2;
    base.setScale(1);
    base.setDisplaySize(dim, dim);
    // No rotation - images should already be in correct orientation for flat-top
    fill.setScale(1);
    fill.setDisplaySize(dim - 2, dim - 2);
    // No rotation - images should already be in correct orientation for flat-top

    // Base tint (grid) - no alternating colors, no hover
    const bgColor = theme.cellEmpty;
    base.setTint(bgColor);
    base.setAlpha(0.3);

    const wasVisible = fill.visible;

    if (isOccupied) {
      const fillColor = cell?.pieceColorIndex !== undefined
        ? this.themeProvider.getPieceColorByIndex(cell.pieceColorIndex)
        : this.themeProvider.getPieceColor(cell?.pieceId || '');
      fill.setTint(fillColor);
      fill.setVisible(true);
      fill.setAlpha(1);

      if (!wasVisible) {
        this.depthEffects.celebrateCellFill(fill, fillColor);
      }
    } else {
      if (wasVisible) {
        this.depthEffects.cleanupGameObject(fill);
      }
      fill.setVisible(false);
    }
  }

  /**
   * Convert hex coordinates to pixel position (private internal version)
   */
  private hexToPixelInternal(hex: HexCoordinates): Phaser.Math.Vector2 {
    const size = this.hexSize;
    // Flat-top hexagon axial-to-pixel conversion
    const x = size * 1.5 * hex.q;
    const y = size * Math.sqrt(3) * (hex.r + hex.q / 2);

    return new Phaser.Math.Vector2(x, y);
  }

  /**
   * Convert pixel position to hex coordinates
   */
  public pixelToHex(x: number, y: number): HexCoordinates | null {
    // Convert to board-relative coordinates
    const localX = x - this.boardContainer.x;
    const localY = y - this.boardContainer.y;

    const size = this.hexSize;

    // For flat-top hexagons:
    const q = ((2 / 3) * localX) / size;
    const r = ((-1 / 3) * localX + (Math.sqrt(3) / 3) * localY) / size;

    // Round to nearest hex
    return this.roundToNearestHex(q, r);
  }

  /**
   * Round to nearest hex
   */
  private roundToNearestHex(q: number, r: number): HexCoordinates {
    const s = -q - r;

    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    // Check if valid coordinate
    if (Math.abs(rq) <= this.BOARD_RADIUS &&
        Math.abs(rr) <= this.BOARD_RADIUS &&
        Math.abs(rq + rr) <= this.BOARD_RADIUS) {
      return { q: rq, r: rr };
    }

    return null;
  }

  /**
   * Convert key back to coordinates
   */
  private keyToCoords(key: string): HexCoordinates {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  /**
   * Center the board on screen
   */
  private centerBoard(): void {
    // For 1080x1920 fixed viewport, center the board in the screen
    const gameWidth = 1080;
    const gameHeight = 1920;

    // Center horizontally, move down vertically to be closer to pieces
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2 + 80; // Move down by 80 pixels

    this.boardContainer.setPosition(centerX, centerY);
  }

  /**
   * Setup theme change listener
   */
  private setupThemeListener(): void {
    this.themeProvider.onThemeChange(() => {
      this.handleThemeChange();
    });
  }

  /**
   * Handle theme change
   */
  private handleThemeChange(): void {
    // Update scene background
    const theme = this.themeProvider.getPhaserTheme();
    this.scene.cameras.main.setBackgroundColor(theme.backgroundColor);

    // Re-render all cells
    this.render();

    // Animate the transition
    this.animateThemeTransition();
  }

  public updateViewport(viewport: ResponsiveMetrics): void {
    const previousSize = this.hexSize;
    this.viewport = viewport;
    this.calculateOptimalSize();

    if (Math.abs(previousSize - this.hexSize) > 0.5) {
      this.generateBoard();
    } else {
      this.repositionCells();
    }

    this.centerBoard();
    this.render();
  }

  private repositionCells(): void {
    const radius = this.hexSize - this.hexSpacing;
    const dim = radius * 2;

    this.cellBaseImages.forEach((image, key) => {
      const coords = this.keyToCoords(key);
      const position = this.hexToPixelInternal(coords);
      image.setPosition(position.x, position.y);
      image.setDisplaySize(dim, dim);
    });

    this.cellFillImages.forEach((image, key) => {
      const coords = this.keyToCoords(key);
      const position = this.hexToPixelInternal(coords);
      image.setPosition(position.x, position.y);
      image.setDisplaySize(dim - 2, dim - 2);
    });

    this.cellInteractives.forEach((zone, key) => {
      const coords = this.keyToCoords(key);
      const position = this.hexToPixelInternal(coords);
      zone.setPosition(position.x, position.y);
      zone.setSize(this.hexSize * 2, this.hexSize * 2);

      const hitSize = this.hexSize - this.hexSpacing / 2;
      const rawPoints = this.hexRenderer.getHexPoints(hitSize);
      const shiftedPoints = rawPoints.map(p => new Phaser.Geom.Point(p.x + this.hexSize, p.y + this.hexSize));
      zone.setInteractive(new Phaser.Geom.Polygon(shiftedPoints), Phaser.Geom.Polygon.Contains);
    });
  }

  /**
   * Animate theme transition
   */
  private async animateThemeTransition(): Promise<void> {
    // Fade out
    await this.fadeBoard(0.3, 100);

    // Fade in with new colors
    await this.fadeBoard(1, 200);
  }

  /**
   * Fade board animation
   */
  private fadeBoard(alpha: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.boardContainer,
        alpha: alpha,
        duration: duration,
        ease: 'Power2',
        onComplete: () => resolve()
      });
    });
  }


  /**
   * Clear the board
   */
  private clearBoard(): void {
    if (this.cellBaseImages) {
      this.cellBaseImages.forEach(image => image.destroy());
      this.cellBaseImages.clear();
    }
    if (this.cellFillImages) {
      this.cellFillImages.forEach(image => image.destroy());
      this.cellFillImages.clear();
    }
    if (this.cellInteractives) {
      this.cellInteractives.forEach(zone => zone.destroy());
      this.cellInteractives.clear();
    }
  }

  /**
   * Get the grid model
   */
  getGridModel(): GridModel {
    return this.gridModel;
  }

  /**
   * Get the board container
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.boardContainer;
  }

  /**
   * Update board rendering (public method for external calls)
   */
  public updateBoard(): void {
    this.render();
  }

  /**
   * Show placement preview with potential line clears
   */
  showPlacementPreview(cells: HexCoordinates[], isValid: boolean, colorIndex?: number): void {
    this.previewGraphics.clear();
    this.clearLinePreview();

    const theme = this.themeProvider.getTheme();

    // Use piece color for preview if provided, otherwise fallback to valid/invalid colors
    let previewColor: number;
    if (colorIndex !== undefined && isValid) {
      // Get the actual piece color from theme provider
      previewColor = this.themeProvider.getPieceColorByIndex(colorIndex);
    } else {
      // Fallback to valid/invalid colors
      previewColor = isValid ? theme.cellValid : theme.cellInvalid;
    }

    const alpha = isValid ? 0.4 : 0.3; // Slightly transparent to show it's a preview

    // Draw piece preview
    cells.forEach(coord => {
      // Check if cell is within board bounds
      if (!this.gridModel.isValidCell(coord)) return;

    const position = this.hexToPixelInternal(coord);
    const px = position.x;
    const py = position.y;

      // Draw preview hexagon with proper spacing and piece color
      this.previewHexRenderer.drawHexagon(
        this.previewGraphics,
        px,
        py,
        this.hexSize - this.hexSpacing,
        previewColor,
        previewColor,
        alpha
      );

      // Add outline effect matching piece color
      if (isValid) {
        // No glow - use subtle outline instead
        this.previewGraphics.lineStyle(3, previewColor, 0.6);
        this.previewHexRenderer.drawHexagonOutline(
          this.previewGraphics,
          position.x,
          position.y,
          this.hexSize - this.hexSpacing
        );
      } else {
        // Red outline for invalid placement
        this.previewGraphics.lineStyle(2, theme.cellInvalid, 0.4);
        this.previewHexRenderer.drawHexagonOutline(
          this.previewGraphics,
          position.x,
          position.y,
          this.hexSize - this.hexSpacing
        );
      }
    });

    // Check for potential line clears if placement is valid
    if (isValid && cells.length > 0) {
      const potentialLines = this.gridModel.detectPotentialCompleteLines(cells);

      // Highlight cells that would be cleared
      if (potentialLines.length > 0) {
        // Get the piece color for line preview (same as piece being placed)
        const linePreviewColor = colorIndex !== undefined
          ? this.themeProvider.getPieceColorByIndex(colorIndex)
          : 0x10b981; // Success green color without glow

        // Track which cells are part of the line to clear
        const lineCells = new Set<string>();
        potentialLines.forEach(line => {
          line.cells.forEach(coord => {
            lineCells.add(hexToKey(coord));
          });
        });

        // First, hide the existing fill images for cells that will be in the line
        lineCells.forEach(key => {
          const fillImage = this.cellFillImages.get(key);
          if (fillImage && fillImage.visible) {
            // Temporarily hide the original piece
            fillImage.setVisible(false);
          }
        });

        // Now draw the line preview with the dragged piece color AND LED outline
        potentialLines.forEach(line => {
          line.cells.forEach(coord => {
            const position = this.hexToPixelInternal(coord);
            const px = position.x;
            const py = position.y;

            // Create a separate graphics object for each hexagon
            const hexGraphics = this.scene.add.graphics();

            // Fill the hexagon completely with the piece color (full opacity)
            hexGraphics.fillStyle(linePreviewColor, 1.0); // Full opacity

            // Use the preview renderer with rotation to match piece images
            const points = this.previewHexRenderer.getHexPoints(this.hexSize - this.hexSpacing);

            hexGraphics.beginPath();
            hexGraphics.moveTo(px + points[0].x, py + points[0].y);
            for (let i = 1; i < points.length; i++) {
              hexGraphics.lineTo(px + points[i].x, py + points[i].y);
            }
            hexGraphics.closePath();
            hexGraphics.fillPath(); // Fill with piece color

            // Add LED outline effect
            hexGraphics.lineStyle(3, linePreviewColor, 1.0);
            hexGraphics.strokePath();
            hexGraphics.lineStyle(6, linePreviewColor, 0.5);
            hexGraphics.strokePath();
            hexGraphics.lineStyle(10, linePreviewColor, 0.2);
            hexGraphics.strokePath();

            // Add to container and array
            this.linePreviewContainer.add(hexGraphics);
            this.linePreviewGraphics.push(hexGraphics);
          });
        });

        // Add smooth blinking LED effect
        this.scene.tweens.add({
          targets: this.linePreviewContainer,
          alpha: { from: 0.7, to: 1.0 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }

  /**
   * Clear placement preview
   */
  clearPlacementPreview(): void {
    this.previewGraphics.clear();
    this.clearLinePreview();
  }

  /**
   * Clear line preview graphics
   */
  private clearLinePreview(): void {
    // Kill any existing tweens
    this.scene.tweens.killTweensOf(this.linePreviewContainer);

    // Reset container alpha
    this.linePreviewContainer.setAlpha(1);

    // Restore visibility of all fill images that should be visible
    this.cellFillImages.forEach((img, key) => {
      const [q, r] = key.split(',').map(Number);
      if (!isNaN(q) && !isNaN(r)) {
        const coord = { q, r };
        if (this.gridModel.isCellOccupied(coord) && !img.visible) {
          img.setVisible(true);
        }
      }
    });

    // Destroy all graphics objects
    this.linePreviewGraphics.forEach(g => g.destroy());
    this.linePreviewGraphics = [];

    // Clear the container
    this.linePreviewContainer.removeAll(true);
  }

  /**
   * Convert hex to pixel (public for other components)
   */
  public hexToPixel(hex: HexCoordinates): { x: number, y: number } | null {
    // Use the internal version which doesn't check validity
    const position = this.hexToPixelInternal(hex);
    // Add board container position to get world coordinates
    return {
      x: position.x + this.boardContainer.x,
      y: position.y + this.boardContainer.y
    };
  }

  /**
   * Animate line clearing with wave effect - cells disappear one by one
   */
  animateLineClear(lines: { cells: HexCoordinates[] }[]): Promise<void> {
    return new Promise(resolve => {
      if (!lines || lines.length === 0) {
        resolve();
        return;
      }

      const tweens: Phaser.Tweens.Tween[] = [];
      let pending = 0;
      const baseDelay = 50; // milliseconds

      lines.forEach((line) => {
        const ordered = [...line.cells].sort((a, b) => {
          const posA = this.hexToPixelInternal(a);
          const posB = this.hexToPixelInternal(b);
          return posA.x - posB.x;
        });

        ordered.forEach((coord, index) => {
          const key = hexToKey(coord);
          const fill = this.cellFillImages.get(key);
          if (!fill) {
            this.gridModel.setCellOccupied(coord, false);
            return;
          }

          const delay = index * baseDelay + Phaser.Math.Between(0, 25);
          pending++;

          const originalTint = fill.tintTopLeft ?? 0xffffff;

          tweens.push(this.scene.tweens.add({
            targets: fill,
            scale: 0,
            alpha: 0,
            duration: 180,
            delay,
            ease: 'Quad.easeIn',
            onStart: () => {
              this.spawnHexClearParticle(coord, originalTint);
            },
            onComplete: () => {
              this.gridModel.setCellOccupied(coord, false);
              fill.setVisible(false);
              const radius = this.hexSize - this.hexSpacing;
              const dim = radius * 2;
              fill.setScale(1);
              fill.setDisplaySize(dim - 2, dim - 2);
              fill.setAlpha(1);
              pending--;

              if (pending === 0) {
                this.updateBoard();
                resolve();
              }
            }
          }));
        });
      });

      if (pending === 0) {
        this.updateBoard();
        resolve();
      } else {
        // Much softer camera shake - reduced intensity by ~70%
        const intensity = 0.003 + 0.001 * lines.length;
        const duration = 150 + lines.length * 30;
        this.scene.cameras.main.shake(duration, intensity, true);
      }
    });
  }

  private spawnHexClearParticle(coord: HexCoordinates, tint: number): void {
    const position = this.hexToPixelInternal(coord);
    const particle = this.scene.add.circle(position.x, position.y, (this.hexSize - this.hexSpacing) * 0.4, tint, 0.5);
    particle.setDepth(this.boardContainer.depth + 1);
    this.cellsContainer.add(particle);

    this.scene.tweens.add({
      targets: particle,
      scale: { from: 0.4, to: 1.2 },
      alpha: { from: 0.5, to: 0 },
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        particle.destroy();
      }
    });
  }

  /**
   * Destroy the board
   */
  destroy(): void {
    this.clearBoard();
    this.previewGraphics.destroy();
    this.clearLinePreview();
    this.linePreviewContainer.destroy();
    this.clearAnimationGraphics.forEach(g => g.destroy());
    this.clearAnimationGraphics.clear();
    this.boardContainer.destroy();
  }
}
