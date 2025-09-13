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

  // Safe area margins (for UI elements)
  private readonly MARGIN_TOP = 80;    // Space for score/UI
  private readonly MARGIN_BOTTOM = 150; // Space for piece tray
  private readonly MARGIN_SIDES = 20;   // Side margins

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.calculateSafeArea();
    this.setupResizeHandlers();
  }

  /**
   * Calculate the safe area for game content
   */
  private calculateSafeArea(): void {
    const { width, height } = this.scene.cameras.main;

    // Calculate safe area excluding UI margins
    const safeWidth = width - (this.MARGIN_SIDES * 2);
    const safeHeight = height - this.MARGIN_TOP - this.MARGIN_BOTTOM;

    this.safeArea = new Phaser.Geom.Rectangle(
      this.MARGIN_SIDES,
      this.MARGIN_TOP,
      safeWidth,
      safeHeight
    );

    // Calculate scale factor for responsive sizing
    this.calculateScaleFactor();
  }

  /**
   * Calculate scale factor based on device
   */
  private calculateScaleFactor(): void {
    const { width, height } = this.scene.cameras.main;

    // Base resolution for scale calculations
    const baseWidth = 1024;
    const baseHeight = 768;

    // Calculate scale based on smaller dimension to ensure fit
    const scaleX = width / baseWidth;
    const scaleY = height / baseHeight;

    this.scaleFactor = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x for performance
    this.scaleFactor = Math.max(this.scaleFactor, 0.5); // Min 0.5x for visibility
  }

  /**
   * Setup resize event handlers
   */
  private setupResizeHandlers(): void {
    this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.handleResize(gameSize);
    });

    // Also listen for orientation changes on mobile
    if (this.isMobile()) {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.calculateSafeArea();
          this.scene.events.emit('viewport:changed', this.getViewport());
        }, 100); // Small delay for orientation animation
      });
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
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
    const { width, height } = this.scene.cameras.main;

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
    return new Phaser.Geom.Rectangle(
      this.safeArea.x,
      this.safeArea.y,
      this.safeArea.width,
      this.safeArea.height * 0.7 // Leave space for pieces below
    );
  }

  /**
   * Get piece tray area (where draggable pieces are)
   */
  getPieceTrayArea(): Phaser.Geom.Rectangle {
    const boardArea = this.getBoardArea();

    return new Phaser.Geom.Rectangle(
      this.safeArea.x,
      boardArea.bottom + 20,
      this.safeArea.width,
      this.safeArea.height * 0.25
    );
  }

  /**
   * Get UI area (top bar for score, etc.)
   */
  getUIArea(): Phaser.Geom.Rectangle {
    const { width } = this.scene.cameras.main;

    return new Phaser.Geom.Rectangle(
      0,
      0,
      width,
      this.MARGIN_TOP
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