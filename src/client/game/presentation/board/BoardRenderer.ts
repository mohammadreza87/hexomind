import * as Phaser from 'phaser';
import { GridModel } from '../../core/models/GridModel';
import { HexCoordinates, hexToKey } from '../../../../shared/types/hex';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';
import { ViewportManager } from './ViewportManager';
import { HexagonRenderer } from './HexagonRenderer';
import { RenderConfig } from '../../config/RenderConfig';

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
  private viewportManager: ViewportManager;
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
  private linePreviewContainer: Phaser.GameObjects.Container;
  private linePreviewGraphics: Phaser.GameObjects.Graphics[];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gridModel = new GridModel(this.BOARD_RADIUS);
    this.themeProvider = new NeonThemeProvider();
    this.viewportManager = new ViewportManager(scene);
    this.hexRenderer = new HexagonRenderer(this.themeProvider);
    // Ensure each grid cell is rotated by 30 degrees for pointy-top look
    this.hexRenderer.setRotationOffset(Math.PI / 6);

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
    this.previewGraphics.setDepth(75);
    this.boardContainer.add(this.previewGraphics);

    // Create line preview container and graphics array
    this.linePreviewContainer = scene.add.container(0, 0);
    this.linePreviewContainer.setDepth(70);
    this.boardContainer.add(this.linePreviewContainer);
    this.linePreviewGraphics = [];

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

    // Setup resize listener
    this.setupResizeListener();

    // Setup theme change listener
    this.setupThemeListener();

    // Initial render
    this.render();
  }

  /**
   * Calculate optimal hexagon size for viewport
   */
  private calculateOptimalSize(): void {
    const viewport = this.viewportManager.getViewport();

    // Calculate size needed for radius-3 grid to fit comfortably
    // Radius 3 = 7 hexagons wide, 7 hexagons tall
    const gridWidth = 7;
    const gridHeight = 7;

    // Account for margins and piece tray at bottom
    // Leave space for piece tray and margins
    const availableWidth = viewport.width * 0.85;  // Reasonable width
    const availableHeight = viewport.height * 0.48; // Reasonable height for grid

    // Calculate hex size based on available space
    // Width: size * sqrt(3) * gridWidth
    // Height: size * 1.5 * gridHeight
    const sizeByWidth = availableWidth / (Math.sqrt(3) * gridWidth);
    const sizeByHeight = availableHeight / (1.5 * gridHeight);

    // Use the smaller to ensure it fits
    this.hexSize = Math.min(sizeByWidth, sizeByHeight, 60); // Adjusted for smaller scale
    this.hexSize = Math.max(this.hexSize, 30); // Minimum size for visibility
    // Make grid 5% smaller overall
    this.hexSize *= 0.95;

    // Reduce spacing so cells sit closer together (less gap)
    this.hexSpacing = this.hexSize * 0.01; // even tighter gaps
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
   * Create a single cell
   */
  private createCell(coords: HexCoordinates): void {
    const key = hexToKey(coords);
    const position = this.hexToPixelInternal(coords);

    // Base and fill images using SVGs (pointy-top already baked in)
    const radius = this.hexSize - this.hexSpacing / 2;
    const dim = radius * 2;
    const base = this.scene.add.image(position.x, position.y, RenderConfig.TEXTURE_KEYS.HEX_BASE_SVG).setOrigin(0.5);
    base.setDisplaySize(dim, dim);
    base.setRotation(Math.PI / 6);
    const fill = this.scene.add.image(position.x, position.y, RenderConfig.TEXTURE_KEYS.HEX_FILL_SVG).setOrigin(0.5);
    fill.setDisplaySize(dim - 2, dim - 2);
    fill.setRotation(Math.PI / 6);
    fill.setVisible(false);

    // Create interactive zone
    const zone = this.scene.add.zone(
      position.x,
      position.y,
      this.hexSize * 2,
      this.hexSize * 2
    );

    zone.setInteractive({
      hitArea: new Phaser.Geom.Polygon(this.hexRenderer.getHexPoints(this.hexSize)),
      hitAreaCallback: Phaser.Geom.Polygon.Contains,
      useHandCursor: true
    });

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

    // Setup interaction events
    this.setupCellInteraction(zone, coords);
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

    // Base tint (grid)
    const isAlt = (coords.q + coords.r) % 2 === 0;
    let bgColor = isAlt ? theme.cellEmpty : theme.cellEmptyAlt;
    if (isHovering && !isOccupied) {
      bgColor = theme.cellHover;
    }
    base.setTint(bgColor);
    base.setAlpha(0.3);

    if (isOccupied) {
      const fillColor = cell?.pieceColorIndex !== undefined
        ? this.themeProvider.getPieceColorByIndex(cell.pieceColorIndex)
        : this.themeProvider.getPieceColor(cell?.pieceId || '');
      fill.setTint(fillColor);
      fill.setVisible(true);
      fill.setAlpha(1);
    } else {
      fill.setVisible(false);
    }
  }

  /**
   * Convert hex coordinates to pixel position (private internal version)
   */
  private hexToPixelInternal(hex: HexCoordinates): Phaser.Math.Vector2 {
    const size = this.hexSize + this.hexSpacing;
    const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
    const y = size * 1.5 * hex.r;

    return new Phaser.Math.Vector2(x, y);
  }

  /**
   * Convert pixel position to hex coordinates
   */
  public pixelToHex(x: number, y: number): HexCoordinates | null {
    // Convert to board-relative coordinates
    const localX = x - this.boardContainer.x;
    const localY = y - this.boardContainer.y;

    const size = this.hexSize + this.hexSpacing;

    // Approximate hex coordinates
    const q = (localX * Math.sqrt(3) / 3 - localY / 3) / size;
    const r = (localY * 2 / 3) / size;

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
    const viewport = this.viewportManager.getViewport();
    // Position board much lower on screen, very close to pieces
    const boardY = viewport.height * 0.55; // Position at 55% from top (much closer to pieces)
    // Allow subpixel positioning for smoother anti-aliased edges
    this.boardContainer.setPosition(viewport.centerX, boardY);
  }

  /**
   * Setup resize listener
   */
  private setupResizeListener(): void {
    this.scene.scale.on('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Handle viewport resize
   */
  private handleResize(): void {
    // Recalculate optimal size
    const oldSize = this.hexSize;
    this.calculateOptimalSize();

    // Rebuild if size changed significantly
    if (Math.abs(oldSize - this.hexSize) > 2) {
      this.generateBoard();
    }

    // Re-center
    this.centerBoard();

    // Re-render
    this.render();
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
    const color = isValid ? theme.cellValid : theme.cellInvalid;
    const alpha = 0.5;

    // Draw piece preview
    cells.forEach(coord => {
      // Check if cell is within board bounds
      if (!this.gridModel.isValidCell(coord)) return;

    const position = this.hexToPixelInternal(coord);
    const px = position.x;
    const py = position.y;

      // Draw preview hexagon with proper spacing
      this.hexRenderer.drawHexagon(
        this.previewGraphics,
        px,
        py,
        this.hexSize - this.hexSpacing / 2 - 2,
        color,
        color,
        alpha
      );

      // Add pulse effect
      if (isValid) {
        this.previewGraphics.lineStyle(2, theme.glowPrimary, 0.3);
        this.hexRenderer.drawHexagonOutline(
          this.previewGraphics,
          position.x,
          position.y,
          this.hexSize
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
          : this.themeProvider.getTheme().glowSuccess;

        // Create outline graphics for each cell
        potentialLines.forEach(line => {
          line.cells.forEach(coord => {
            const position = this.hexToPixelInternal(coord);
            const px = position.x;
            const py = position.y;

            // Create a separate graphics object for each hexagon outline
            const hexGraphics = this.scene.add.graphics();

            // Draw thin outline with the piece color
            hexGraphics.lineStyle(1.5, linePreviewColor, 1);

            const points = this.hexRenderer.getHexPoints(this.hexSize - this.hexSpacing / 2 + 2);

            hexGraphics.beginPath();
            hexGraphics.moveTo(px + points[0].x, py + points[0].y);

            for (let i = 1; i < points.length; i++) {
              hexGraphics.lineTo(px + points[i].x, py + points[i].y);
            }

            hexGraphics.closePath();
            hexGraphics.strokePath(); // Only stroke, no fill

            // Add to container and array
            this.linePreviewContainer.add(hexGraphics);
            this.linePreviewGraphics.push(hexGraphics);
          });
        });

        // Add animated pulse effect to the container
        this.scene.tweens.add({
          targets: this.linePreviewContainer,
          alpha: { from: 1, to: 0.5 },
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
   * Animate line clearing with a clean wave per line.
   * - Computes a per-target delay so cells in each line vanish in order.
   * - Deduplicates overlap cells (at line intersections) using the minimum delay.
   * - Smooth fade+shrink, no pre-bump.
   */
  animateLineClear(lines: { cells: HexCoordinates[] }[]): Promise<void> {
    return new Promise(resolve => {
      if (!lines || lines.length === 0) { resolve(); return; }

      // Build a delay map per unique cell so overlapping cells only animate once
      const perCellDelay = 60;    // ms between cells in a line
      const perLineDelay = 120;   // ms between separate lines starting

      const delayByKey = new Map<string, number>();
      const uniqueCells: HexCoordinates[] = [];

      lines.forEach((line, lineIndex) => {
        line.cells.forEach((c, idxInLine) => {
          const key = hexToKey(c);
          const candidate = lineIndex * perLineDelay + idxInLine * perCellDelay;
          if (!delayByKey.has(key)) {
            delayByKey.set(key, candidate);
            uniqueCells.push(c);
          } else {
            // Use the earliest delay if a cell appears in multiple lines
            const prev = delayByKey.get(key)!;
            if (candidate < prev) delayByKey.set(key, candidate);
          }
        });
      });

      if (uniqueCells.length === 0) { resolve(); return; }

      // Collect targets and assign their per-target delay via data
      const targets: Phaser.GameObjects.Image[] = [];
      uniqueCells.forEach(c => {
        const img = this.cellFillImages.get(hexToKey(c));
        if (img) {
          // Kill any existing tweens affecting this image before starting
          this.scene.tweens.killTweensOf(img);
          img.setData('clearDelay', delayByKey.get(hexToKey(c)) || 0);
          targets.push(img);
        }
      });

      if (targets.length === 0) { resolve(); return; }

      // Drive the wave: shrink + fade with individual delays
      this.scene.tweens.add({
        targets,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 220,
        ease: 'Cubic.easeInOut',
        delay: (target: any) => (target.getData && target.getData('clearDelay')) || 0,
        onComplete: () => {
          // Update model state
          uniqueCells.forEach(c => this.gridModel.setCellOccupied(c, false));

          // Reset visuals for reuse
          const radius = this.hexSize - this.hexSpacing / 2;
          const dim = radius * 2;
          uniqueCells.forEach(c => {
            const img = this.cellFillImages.get(hexToKey(c));
            if (img) {
              img.setDisplaySize(dim - 2, dim - 2);
              img.setAlpha(1);
              img.setVisible(false);
              img.removeData('clearDelay');
            }
          });

          this.updateBoard();
          resolve();
        }
      });
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
