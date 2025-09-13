import * as Phaser from 'phaser';
import { GridModel } from '../../core/models/GridModel';
import { HexCoordinates, hexToKey } from '../../../../shared/types/hex';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ViewportManager } from './ViewportManager';
import { HexagonRenderer } from './HexagonRenderer';

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
  private themeProvider: ThemeProvider;
  private viewportManager: ViewportManager;
  private hexRenderer: HexagonRenderer;

  // Containers
  private boardContainer: Phaser.GameObjects.Container;
  private cellsContainer: Phaser.GameObjects.Container;
  private effectsContainer: Phaser.GameObjects.Container;

  // Cell visuals
  private cellGraphics: Map<string, Phaser.GameObjects.Graphics>;
  private cellInteractives: Map<string, Phaser.GameObjects.Zone>;

  // Board configuration
  private readonly BOARD_RADIUS = 3; // Always radius 3 as specified
  private hexSize: number = 40;
  private hexSpacing: number = 2;

  // Animation state
  private isAnimating: boolean = false;
  private animationQueue: (() => Promise<void>)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gridModel = new GridModel(this.BOARD_RADIUS);
    this.themeProvider = new ThemeProvider();
    this.viewportManager = new ViewportManager(scene);
    this.hexRenderer = new HexagonRenderer(this.themeProvider);

    this.cellGraphics = new Map();
    this.cellInteractives = new Map();

    // Create container hierarchy
    this.boardContainer = scene.add.container(0, 0);
    this.cellsContainer = scene.add.container(0, 0);
    this.effectsContainer = scene.add.container(0, 0);

    this.boardContainer.add([this.cellsContainer, this.effectsContainer]);

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

    // Account for margins (10% on each side)
    const availableWidth = viewport.width * 0.8;
    const availableHeight = viewport.height * 0.8;

    // Calculate hex size based on available space
    // Width: size * sqrt(3) * gridWidth
    // Height: size * 1.5 * gridHeight
    const sizeByWidth = availableWidth / (Math.sqrt(3) * gridWidth);
    const sizeByHeight = availableHeight / (1.5 * gridHeight);

    // Use the smaller to ensure it fits
    this.hexSize = Math.min(sizeByWidth, sizeByHeight, 50); // Cap at 50 for performance
    this.hexSize = Math.max(this.hexSize, 20); // Min size for visibility

    // Adjust spacing proportionally
    this.hexSpacing = this.hexSize * 0.05;
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

    // Create graphics object
    const graphics = this.scene.add.graphics();

    // Create interactive zone
    const position = this.hexToPixel(coords);
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
    this.cellsContainer.add(graphics);
    this.cellsContainer.add(zone);

    // Store references
    this.cellGraphics.set(key, graphics);
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
    graphics.clear();

    const position = this.hexToPixel(coords);
    const isOccupied = this.gridModel.isCellOccupied(coords);
    const theme = this.themeProvider.getTheme();

    // Determine colors
    let fillColor: number;
    let borderColor: number;
    let borderAlpha: number = 0.3;

    if (isOccupied) {
      fillColor = theme.cellOccupied;
      borderColor = theme.borderHighlight;
      borderAlpha = 0.8;
    } else if (isHovering) {
      fillColor = theme.cellHover;
      borderColor = theme.borderHighlight;
      borderAlpha = 0.5;
    } else {
      // Alternating pattern for empty cells
      const isAlt = (coords.q + coords.r) % 2 === 0;
      fillColor = isAlt ? theme.cellEmpty : theme.cellEmptyAlt;
      borderColor = theme.borderSubtle;
    }

    // Draw hexagon
    this.hexRenderer.drawHexagon(
      graphics,
      position.x,
      position.y,
      this.hexSize,
      fillColor,
      borderColor,
      borderAlpha
    );
  }

  /**
   * Convert hex coordinates to pixel position
   */
  private hexToPixel(hex: HexCoordinates): Phaser.Math.Vector2 {
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
    this.boardContainer.setPosition(viewport.centerX, viewport.centerY);
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
    this.cellInteractives.forEach(zone => zone.destroy());
    this.cellGraphics.clear();
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
   * Destroy the board
   */
  destroy(): void {
    this.clearBoard();
    this.boardContainer.destroy();
  }
}