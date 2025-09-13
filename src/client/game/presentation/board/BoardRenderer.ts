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

  // Cell visuals
  private cellGraphics: Map<string, Phaser.GameObjects.Graphics>; // background grid cells
  private cellPieceGraphics: Map<string, Phaser.GameObjects.Graphics>; // piece overlays
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

    this.cellGraphics = new Map();
    this.cellPieceGraphics = new Map();
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
    const availableWidth = viewport.width * 0.8;
    const availableHeight = viewport.height * 0.38; // Reduced to make room for score above and pieces below

    // Calculate hex size based on available space
    // Width: size * sqrt(3) * gridWidth
    // Height: size * 1.5 * gridHeight
    const sizeByWidth = availableWidth / (Math.sqrt(3) * gridWidth);
    const sizeByHeight = availableHeight / (1.5 * gridHeight);

    // Use the smaller to ensure it fits
    this.hexSize = Math.min(sizeByWidth, sizeByHeight, 50); // Cap at 50 for performance
    this.hexSize = Math.max(this.hexSize, 20); // Min size for visibility

    // Adjust spacing proportionally - more spacing for cleaner look
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
   * Create a single cell
   */
  private createCell(coords: HexCoordinates): void {
    const key = hexToKey(coords);
    const position = this.hexToPixelInternal(coords);

    // Graphics mode only
    const graphics = this.scene.add.graphics(); // background grid cell
    const pieceGraphics = this.scene.add.graphics(); // piece overlay

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

    // Add to containers (background, piece overlay, interaction)
    this.cellsContainer.add(graphics);
    this.cellsContainer.add(pieceGraphics);
    this.cellsContainer.add(zone);

    // Store references
    this.cellGraphics.set(key, graphics);
    this.cellPieceGraphics.set(key, pieceGraphics);
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
    const key = hexToKey(coords);
    const graphics = this.cellGraphics.get(key);
    if (graphics && !this.gridModel.isCellOccupied(coords)) {
      this.renderCell(coords, graphics, isHovering);
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
    this.cellGraphics.forEach((graphics, key) => {
      const coords = this.keyToCoords(key);
      this.renderCell(coords, graphics);
    });
  }

  /**
   * Render a single cell
   */
  private renderCell(
    coords: HexCoordinates,
    graphics: Phaser.GameObjects.Graphics,
    isHovering: boolean = false
  ): void {
    // Get piece overlay graphics for this cell
    const key = hexToKey(coords);
    const pieceGfx = this.cellPieceGraphics.get(key);

    graphics.clear();
    pieceGfx?.clear();

    const position = this.hexToPixelInternal(coords);
    const px = position.x;
    const py = position.y;
    const cell = this.gridModel.getCell(coords);
    const isOccupied = cell?.isOccupied || false;
    const theme = this.themeProvider.getTheme();

    // Background grid cell (always empty look, hover only if not occupied)
    const isAlt = (coords.q + coords.r) % 2 === 0;
    let bgFill = isAlt ? theme.cellEmpty : theme.cellEmptyAlt;
    let bgBorder = theme.borderSubtle;
    let bgBorderAlpha = 0.3;
    if (isHovering && !isOccupied) {
      bgFill = theme.cellHover;
      bgBorder = theme.borderHighlight;
      bgBorderAlpha = 0.5;
    }
    this.hexRenderer.drawHexagon(
      graphics,
      px,
      py,
      this.hexSize - this.hexSpacing / 2,
      bgFill,
      bgBorder,
      bgBorderAlpha
    );

    // Piece overlay if occupied
    if (isOccupied && pieceGfx) {
      const fillColor = cell?.pieceColorIndex !== undefined
        ? this.themeProvider.getPieceColorByIndex(cell.pieceColorIndex)
        : this.themeProvider.getPieceColor(cell?.pieceId || '');
      const borderColor = theme.borderDefault;
      this.hexRenderer.drawHexagon(
        pieceGfx,
        px,
        py,
        this.hexSize - this.hexSpacing / 2 - 1,
        fillColor,
        borderColor,
        0.35
      );
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
    // Position board lower on screen, below the score
    const boardY = viewport.height * 0.42; // Position at 42% from top
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
    this.cellGraphics.forEach(graphics => graphics.destroy());
    this.cellPieceGraphics.forEach(graphics => graphics.destroy());
    this.cellInteractives.forEach(zone => zone.destroy());
    this.cellGraphics.clear();
    this.cellPieceGraphics.clear();
    this.cellInteractives.clear();
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
   * Animate line clearing with a directional wave per line.
   * Randomly picks a start side for each line and clears cells one-by-one with ~50ms spacing.
   */
  animateLineClear(lines: any[]): Promise<void> {
    return new Promise(resolve => {
      if (!lines || lines.length === 0) {
        resolve();
        return;
      }
      // Helper: per-line sorting based on direction, with random starting side
      const sortLine = (cells: HexCoordinates[], direction: string): HexCoordinates[] => {
        const sorted = [...cells];
        switch (direction) {
          case 'horizontal':
            sorted.sort((a, b) => a.q - b.q); // left -> right
            break;
          case 'diagonalNESW':
            sorted.sort((a, b) => a.r - b.r); // top-right (lower r) -> bottom-left
            break;
          case 'diagonalNWSE':
            sorted.sort((a, b) => a.q - b.q); // north-west -> south-east
            break;
          default:
            sorted.sort((a, b) => a.q - b.q);
        }
        if (Math.random() < 0.5) sorted.reverse(); // random start side
        return sorted;
      };

      // Flatten total and prepare batches
      const batches = lines.map((line: any) => sortLine(line.cells, line.direction));
      const total = batches.reduce((s: number, arr: HexCoordinates[]) => s + arr.length, 0);
      if (total === 0) {
        resolve();
        return;
      }

      let done = 0;
      const perCellDelay = 50; // ms (0.05s)

      batches.forEach((cells) => {
        cells.forEach((coord, idx) => {
          const position = this.hexToPixelInternal(coord);
          const px = position.x;
          const py = position.y;
          const cell = this.gridModel.getCell(coord);
          const cellColor = cell?.pieceColorIndex !== undefined
            ? this.themeProvider.getPieceColorByIndex(cell.pieceColorIndex)
            : this.themeProvider.getTheme().glowSuccess;

          // Overlay container for animation (does not mutate board graphics directly)
          const container = this.scene.add.container(px, py);
          container.setDepth(95);
          this.boardContainer.add(container);

          const hexGraphics = this.scene.add.graphics();
          this.hexRenderer.drawHexagon(
            hexGraphics,
            0,
            0,
            this.hexSize - this.hexSpacing / 2,
            cellColor,
            cellColor,
            0.25,
            1
          );
          container.add(hexGraphics);

          const glow = this.scene.add.graphics();
          glow.setAlpha(0);
          glow.lineStyle(2.5, cellColor, 0.8);
          this.hexRenderer.drawHexagonOutline(glow, 0, 0, this.hexSize - this.hexSpacing / 2 + 2);
          container.add(glow);

          const jitter = Math.random() * 20;
          const delay = idx * perCellDelay + jitter;

          // Quick glow pulse
          this.scene.tweens.add({
            targets: glow,
            alpha: 1,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 160,
            delay,
            ease: 'Sine.easeOut',
          });

          // Also animate the piece overlay so the actual filled cell vanishes progressively (grid stays)
          const baseKey = hexToKey(coord);
          const baseGraphics = this.cellPieceGraphics.get(baseKey);
          if (baseGraphics) {
            // Fade only (avoid scaling vector graphics which can look blurry)
            this.scene.tweens.add({
              targets: baseGraphics,
              alpha: 0,
              duration: 260,
              delay: delay + 40,
              ease: 'Power2',
              onComplete: () => {
                baseGraphics.setVisible(false);
              }
            });
          }

          // Shrink + fade overlay container
          this.scene.tweens.add({
            targets: container,
            alpha: 0,
            scaleX: 0.6,
            scaleY: 0.6,
            rotation: Math.PI / 12,
            duration: 220,
            delay: delay + 60,
            ease: 'Power2',
            onComplete: () => {
              container.destroy();
              done++;
              if (done === total) {
                // Clear all cells in all lines
                const all = batches.flat();
                all.forEach(c => this.gridModel.setCellOccupied(c, false));
                // Reset piece overlay graphics for next renders
                all.forEach(c => {
                  const g = this.cellPieceGraphics.get(hexToKey(c));
                  if (g) {
                    g.setScale(1, 1);
                    g.setAlpha(1);
                    g.setVisible(true);
                    g.clear();
                  }
                });
                this.updateBoard();
                resolve();
              }
            }
          });
        });
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
