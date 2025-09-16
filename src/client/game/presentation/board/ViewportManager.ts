import * as Phaser from 'phaser';

/**
 * ViewportManager - Handles responsive viewport calculations and scaling
 *
 * Ensures the game board always fits perfectly within the available space
 * while maintaining aspect ratio and centering.
 */
export class ViewportManager {
  private scene: Phaser.Scene;
  private safeArea: Phaser.Geom.Rectangle;
  private scaleFactor: number = 1;
  private containerElement: HTMLElement | null = null;
  private useContainerQueries: boolean = false;
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  private boardAreaRatio: number = 0.7;
  private pieceTrayRatio: number = 0.25;
  private pieceTrayGap: number = 20;
  private containerStyles: CSSStyleDeclaration | null = null;
  private resizeObserver?: ResizeObserver;

  // Safe area margins (for UI elements)
  private readonly MARGIN_TOP = 80;    // Space for score/UI
  private readonly MARGIN_BOTTOM = 150; // Space for piece tray
  private readonly MARGIN_SIDES = 20;   // Side margins

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.containerElement = this.resolveContainerElement();
    this.useContainerQueries = this.detectContainerQuerySupport();

    if (this.containerElement) {
      const rect = this.containerElement.getBoundingClientRect();
      this.containerWidth = rect.width || this.scene.cameras.main.width;
      this.containerHeight = rect.height || this.scene.cameras.main.height;
    } else {
      this.containerWidth = this.scene.cameras.main.width;
      this.containerHeight = this.scene.cameras.main.height;
    }

    if (this.useContainerQueries) {
      this.refreshContainerStyles();
    }

    this.calculateSafeArea();
    this.setupResizeHandlers();
  }

  private resolveContainerElement(): HTMLElement | null {
    const scaleParent = this.scene.scale?.parent;
    if (scaleParent instanceof HTMLElement) {
      return scaleParent;
    }

    const canvasParent = this.scene.game.canvas?.parentElement;
    if (canvasParent instanceof HTMLElement) {
      return canvasParent;
    }

    return null;
  }

  private detectContainerQuerySupport(): boolean {
    if (typeof window === 'undefined' || typeof CSS === 'undefined') {
      return false;
    }

    const hasResizeObserver = 'ResizeObserver' in window;
    const supportsContainer = typeof CSS.supports === 'function' && CSS.supports('container-type: inline-size');

    return !!this.containerElement && hasResizeObserver && supportsContainer;
  }

  private refreshContainerStyles(): void {
    if (!this.containerElement || !this.useContainerQueries) {
      this.containerStyles = null;
      this.boardAreaRatio = 0.7;
      this.pieceTrayRatio = 0.25;
      this.pieceTrayGap = 20;
      return;
    }

    this.containerStyles = getComputedStyle(this.containerElement);
    this.boardAreaRatio = this.readMetric('--game-board-area-ratio', 0.7);
    this.pieceTrayRatio = this.readMetric('--game-piece-area-ratio', 0.25);
    this.pieceTrayGap = this.readMetric('--game-piece-area-gap', 20);
  }

  private readMetric(varName: string, fallback: number): number {
    if (!this.containerStyles) {
      return fallback;
    }

    const raw = this.containerStyles.getPropertyValue(varName);

    if (!raw) {
      return fallback;
    }

    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Calculate the safe area for game content
   */
  private calculateSafeArea(): void {
    const width = this.containerWidth || this.scene.cameras.main.width;
    const height = this.containerHeight || this.scene.cameras.main.height;

    const marginTop = this.useContainerQueries
      ? this.readMetric('--game-safe-margin-top', this.MARGIN_TOP)
      : this.MARGIN_TOP;
    const marginBottom = this.useContainerQueries
      ? this.readMetric('--game-safe-margin-bottom', this.MARGIN_BOTTOM)
      : this.MARGIN_BOTTOM;
    const marginSides = this.useContainerQueries
      ? this.readMetric('--game-safe-margin-sides', this.MARGIN_SIDES)
      : this.MARGIN_SIDES;

    const safeWidth = Math.max(width - (marginSides * 2), 0);
    const safeHeight = Math.max(height - marginTop - marginBottom, 0);

    this.safeArea = new Phaser.Geom.Rectangle(
      marginSides,
      marginTop,
      safeWidth,
      safeHeight
    );

    this.calculateScaleFactor(width, height);
  }

  /**
   * Calculate scale factor based on device or container size
   */
  private calculateScaleFactor(width: number, height: number): void {
    const baseWidth = 1024;
    const baseHeight = 768;

    const scaleX = width / baseWidth;
    const scaleY = height / baseHeight;

    const maxScale = this.getContainerMetric('--game-scale-max', 1.5);
    const minScale = this.getContainerMetric('--game-scale-min', 0.5);

    this.scaleFactor = Math.min(scaleX, scaleY, maxScale);
    this.scaleFactor = Math.max(this.scaleFactor, minScale);
  }

  /**
   * Setup resize event handlers
   */
  private setupResizeHandlers(): void {
    this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.handleResize(gameSize);
    });

    if (this.useContainerQueries && this.containerElement) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target !== this.containerElement) {
            continue;
          }

          const { width, height } = entry.contentRect;
          if (!width || !height) {
            continue;
          }

          this.containerWidth = width;
          this.containerHeight = height;
          this.refreshContainerStyles();

          if (
            this.scene.scale.gameSize.width !== width ||
            this.scene.scale.gameSize.height !== height
          ) {
            this.scene.scale.resize(width, height);
          } else {
            const size = { width, height } as Phaser.Structs.Size;
            this.handleResize(size);
          }
        }
      });

      this.resizeObserver.observe(this.containerElement);
    }

    // Also listen for orientation changes on mobile
    if (this.isMobile()) {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          if (this.useContainerQueries && this.containerElement) {
            const rect = this.containerElement.getBoundingClientRect();
            if (rect.width && rect.height) {
              this.containerWidth = rect.width;
              this.containerHeight = rect.height;
              this.refreshContainerStyles();
              this.scene.scale.resize(rect.width, rect.height);
              return;
            }
          }

          this.calculateSafeArea();
          this.scene.events.emit('viewport:changed', this.getViewport());
        }, 100);
      });
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.containerWidth = gameSize.width;
    this.containerHeight = gameSize.height;

    if (this.useContainerQueries) {
      this.refreshContainerStyles();
    }

    this.calculateSafeArea();
    this.scene.events.emit('viewport:changed', this.getViewport());
  }

  /**
   * Get viewport information
   */
  getViewport(): {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    safeArea: Phaser.Geom.Rectangle;
    scaleFactor: number;
    isMobile: boolean;
    isLandscape: boolean;
  } {
    const width = this.containerWidth || this.scene.cameras.main.width;
    const height = this.containerHeight || this.scene.cameras.main.height;

    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      safeArea: this.safeArea,
      scaleFactor: this.scaleFactor,
      isMobile: this.isMobile(),
      isLandscape: width > height
    };
  }

  /**
   * Get safe center point (center of safe area)
   */
  getSafeCenter(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.safeArea.centerX,
      this.safeArea.centerY
    );
  }

  /**
   * Get board area (where the hex grid should be)
   */
  getBoardArea(): Phaser.Geom.Rectangle {
    // Board takes up the safe area
    const boardHeight = Math.min(
      this.safeArea.height,
      this.safeArea.height * this.boardAreaRatio
    );

    return new Phaser.Geom.Rectangle(
      this.safeArea.x,
      this.safeArea.y,
      this.safeArea.width,
      boardHeight
    );
  }

  /**
   * Get piece tray area (where draggable pieces are)
   */
  getPieceTrayArea(): Phaser.Geom.Rectangle {
    const boardArea = this.getBoardArea();

    const desiredHeight = Math.max(this.safeArea.height * this.pieceTrayRatio, 0);
    const availableHeight = Math.max(
      this.safeArea.bottom - boardArea.bottom - this.pieceTrayGap,
      0
    );
    const trayHeight = Math.min(desiredHeight, availableHeight);
    const trayY = Math.min(
      boardArea.bottom + this.pieceTrayGap,
      this.safeArea.bottom - trayHeight
    );

    return new Phaser.Geom.Rectangle(
      this.safeArea.x,
      trayY,
      this.safeArea.width,
      trayHeight
    );
  }

  getContainerMetric(varName: string, fallback: number): number {
    if (!this.useContainerQueries) {
      return fallback;
    }

    if (!this.containerStyles) {
      this.refreshContainerStyles();
    }

    return this.readMetric(varName, fallback);
  }

  supportsContainerQueries(): boolean {
    return this.useContainerQueries;
  }

  /**
   * Get UI area (top bar for score, etc.)
   */
  getUIArea(): Phaser.Geom.Rectangle {
    const width = this.containerWidth || this.scene.cameras.main.width;

    return new Phaser.Geom.Rectangle(
      0,
      0,
      width,
      this.useContainerQueries
        ? this.readMetric('--game-safe-margin-top', this.MARGIN_TOP)
        : this.MARGIN_TOP
    );
  }

  /**
   * Check if running on mobile device
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Check if running in Reddit app
   */
  isRedditApp(): boolean {
    // Check for Reddit app user agent
    const ua = navigator.userAgent;
    return ua.includes('RedditAndroid') || ua.includes('RedditIOS');
  }

  /**
   * Get device pixel ratio for sharp rendering
   */
  getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  /**
   * Calculate optimal font size based on viewport
   */
  getOptimalFontSize(baseSize: number): number {
    return Math.floor(baseSize * this.scaleFactor);
  }

  /**
   * Get responsive value (scales with viewport)
   */
  getResponsiveValue(baseValue: number): number {
    return baseValue * this.scaleFactor;
  }

  /**
   * Convert viewport coordinates to world coordinates
   */
  viewportToWorld(x: number, y: number): Phaser.Math.Vector2 {
    const camera = this.scene.cameras.main;
    return camera.getWorldPoint(x, y);
  }

  /**
   * Convert world coordinates to viewport coordinates
   */
  worldToViewport(x: number, y: number): Phaser.Math.Vector2 {
    const camera = this.scene.cameras.main;
    const point = new Phaser.Math.Vector2(x, y);
    camera.getScreenPoint(x, y, point);
    return point;
  }

  /**
   * Check if point is within safe area
   */
  isInSafeArea(x: number, y: number): boolean {
    return this.safeArea.contains(x, y);
  }

  /**
   * Clamp position to safe area
   */
  clampToSafeArea(x: number, y: number): Phaser.Math.Vector2 {
    const clampedX = Phaser.Math.Clamp(
      x,
      this.safeArea.left,
      this.safeArea.right
    );

    const clampedY = Phaser.Math.Clamp(
      y,
      this.safeArea.top,
      this.safeArea.bottom
    );

    return new Phaser.Math.Vector2(clampedX, clampedY);
  }

  /**
   * Get margin for responsive padding
   */
  getResponsiveMargin(): number {
    if (this.isMobile()) {
      return this.getResponsiveValue(10);
    }
    return this.getResponsiveValue(20);
  }

  /**
   * Debug draw safe areas
   */
  debugDraw(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();

    // Draw safe area
    graphics.lineStyle(2, 0x00ff00, 0.5);
    graphics.strokeRectShape(this.safeArea);

    // Draw board area
    graphics.lineStyle(2, 0x0000ff, 0.5);
    graphics.strokeRectShape(this.getBoardArea());

    // Draw piece tray area
    graphics.lineStyle(2, 0xff0000, 0.5);
    graphics.strokeRectShape(this.getPieceTrayArea());

    // Draw UI area
    graphics.lineStyle(2, 0xffff00, 0.5);
    graphics.strokeRectShape(this.getUIArea());
  }
}