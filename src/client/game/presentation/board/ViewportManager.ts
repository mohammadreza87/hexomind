import * as Phaser from 'phaser';
import { calculateResponsiveLayout, ResponsiveLayout, ResponsiveRect } from '../../responsive';

interface ViewportState {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  safeArea: Phaser.Geom.Rectangle;
  scaleFactor: number;
  isMobile: boolean;
  isLandscape: boolean;
}

export class ViewportManager {
  private scene: Phaser.Scene;
  private layout: ResponsiveLayout;
  private safeArea: Phaser.Geom.Rectangle;
  private boardArea: Phaser.Geom.Rectangle;
  private trayArea: Phaser.Geom.Rectangle;
  private uiArea: Phaser.Geom.Rectangle;
  private scaleFactor: number;
  private devicePixelRatio: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layout = this.getInitialLayout();

    this.safeArea = new Phaser.Geom.Rectangle();
    this.boardArea = new Phaser.Geom.Rectangle();
    this.trayArea = new Phaser.Geom.Rectangle();
    this.uiArea = new Phaser.Geom.Rectangle();
    this.scaleFactor = this.layout.nominalScale;
    this.devicePixelRatio = this.layout.dpr;

    this.applyLayout(this.layout);

    this.scene.scale.on('resize', this.handleScaleResize, this);
    this.scene.game.events.on('responsive:layout', this.handleExternalLayout, this);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
  }

  private getInitialLayout(): ResponsiveLayout {
    const stored = this.scene.game.registry.get('responsive:layout') as ResponsiveLayout | undefined;
    if (stored) {
      return stored;
    }

    const size = this.scene.scale.gameSize;
    return calculateResponsiveLayout(size.width, size.height);
  }

  private toPhaserRect(rect: ResponsiveRect): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height);
  }

  private applyLayout(layout: ResponsiveLayout): void {
    this.layout = layout;
    this.safeArea = this.toPhaserRect(layout.safeArea);
    this.boardArea = this.toPhaserRect(layout.boardArea);
    this.trayArea = this.toPhaserRect(layout.trayArea);
    this.uiArea = this.toPhaserRect(layout.uiArea);
    this.scaleFactor = layout.nominalScale;
    this.devicePixelRatio = layout.dpr;

    this.scene.events.emit('viewport:changed', this.getViewport());
  }

  private handleExternalLayout(layout: ResponsiveLayout): void {
    this.applyLayout(layout);
  }

  private handleScaleResize(gameSize: Phaser.Structs.Size): void {
    const stored = this.scene.game.registry.get('responsive:layout') as ResponsiveLayout | undefined;
    if (stored) {
      this.applyLayout(stored);
      return;
    }

    const fallback = calculateResponsiveLayout(gameSize.width, gameSize.height);
    this.applyLayout(fallback);
  }

  private teardown(): void {
    this.scene.scale.off('resize', this.handleScaleResize, this);
    this.scene.game.events.off('responsive:layout', this.handleExternalLayout, this);
  }

  getViewport(): ViewportState {
    const width = this.layout.viewportWidth;
    const height = this.layout.viewportHeight;

    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      safeArea: this.safeArea.clone(),
      scaleFactor: this.scaleFactor,
      isMobile: width <= 900,
      isLandscape: this.layout.orientation === 'landscape'
    };
  }

  getSafeCenter(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.safeArea.centerX, this.safeArea.centerY);
  }

  getBoardArea(): Phaser.Geom.Rectangle {
    return this.boardArea.clone();
  }

  getPieceTrayArea(): Phaser.Geom.Rectangle {
    return this.trayArea.clone();
  }

  getUIArea(): Phaser.Geom.Rectangle {
    return this.uiArea.clone();
  }

  getPixelRatio(): number {
    return this.devicePixelRatio;
  }

  getOptimalFontSize(baseSize: number): number {
    return Math.round(baseSize * this.scaleFactor);
  }

  getResponsiveValue(baseValue: number): number {
    return baseValue * this.scaleFactor;
  }

  getResponsiveMargin(): number {
    return this.layout.orientation === 'portrait'
      ? this.getResponsiveValue(16)
      : this.getResponsiveValue(24);
  }

  supportsContainerQueries(): boolean {
    return false;
  }

  isMobile(): boolean {
    return this.getViewport().isMobile;
  }

  isRedditApp(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const ua = navigator.userAgent;
    return ua.includes('RedditAndroid') || ua.includes('RedditIOS');
  }

  viewportToWorld(x: number, y: number): Phaser.Math.Vector2 {
    const camera = this.scene.cameras.main;
    return camera.getWorldPoint(x, y);
  }

  worldToViewport(x: number, y: number): Phaser.Math.Vector2 {
    const camera = this.scene.cameras.main;
    const point = new Phaser.Math.Vector2(x, y);
    camera.getScreenPoint(x, y, point);
    return point;
  }

  isInSafeArea(x: number, y: number): boolean {
    return this.safeArea.contains(x, y);
  }

  clampToSafeArea(x: number, y: number): Phaser.Math.Vector2 {
    const clampedX = Phaser.Math.Clamp(x, this.safeArea.left, this.safeArea.right);
    const clampedY = Phaser.Math.Clamp(y, this.safeArea.top, this.safeArea.bottom);
    return new Phaser.Math.Vector2(clampedX, clampedY);
  }

  debugDraw(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();

    graphics.lineStyle(2, 0x00ff00, 0.5);
    graphics.strokeRectShape(this.safeArea);

    graphics.lineStyle(2, 0x0000ff, 0.5);
    graphics.strokeRectShape(this.boardArea);

    graphics.lineStyle(2, 0xff0000, 0.5);
    graphics.strokeRectShape(this.trayArea);

    graphics.lineStyle(2, 0xffff00, 0.5);
    graphics.strokeRectShape(this.uiArea);
  }
}
