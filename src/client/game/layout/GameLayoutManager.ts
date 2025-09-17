import * as Phaser from 'phaser';

export type Orientation = 'portrait' | 'landscape';

export interface LayoutMetrics {
  designWidth: number;
  designHeight: number;
  parentWidth: number;
  parentHeight: number;
  orientation: Orientation;
  zoom: number;
  devicePixelRatio: number;
  safeArea: Phaser.Geom.Rectangle;
  boardArea: Phaser.Geom.Rectangle;
  pieceTrayArea: Phaser.Geom.Rectangle;
  uiArea: Phaser.Geom.Rectangle;
  worldView: Phaser.Geom.Rectangle;
}

interface SafeAreaConfig {
  top: number;
  bottom: number;
  sides: number;
}

interface BoardLayoutConfig {
  ratio: number;
}

interface TrayLayoutConfig {
  ratio: number;
  minRatio: number;
  gap: number;
}

interface OrientationLayout {
  safeArea: SafeAreaConfig;
  board: BoardLayoutConfig;
  tray: TrayLayoutConfig;
}

interface GameLayoutOptions {
  designWidth: number;
  designHeight: number;
  zoom: {
    min: number;
    max: number;
  };
  orientation: Record<Orientation, OrientationLayout>;
}

interface SafeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const DEFAULT_OPTIONS: GameLayoutOptions = {
  designWidth: 1080,
  designHeight: 1920,
  zoom: {
    min: 0.45,
    max: 1.75
  },
  orientation: {
    portrait: {
      safeArea: { top: 0.08, bottom: 0.22, sides: 0.06 },
      board: { ratio: 0.62 },
      tray: { ratio: 0.26, minRatio: 0.18, gap: 0.02 }
    },
    landscape: {
      safeArea: { top: 0.06, bottom: 0.14, sides: 0.12 },
      board: { ratio: 0.58 },
      tray: { ratio: 0.28, minRatio: 0.2, gap: 0.018 }
    }
  }
};

const EVENT_CHANGED = 'layout:changed';

export class GameLayoutManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private options: GameLayoutOptions;
  private metrics: LayoutMetrics;
  private visualViewportHandler?: () => void;

  constructor(scene: Phaser.Scene, options?: Partial<GameLayoutOptions>) {
    super();
    this.scene = scene;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.metrics = this.computeMetrics(
      this.scene.scale.gameSize.width,
      this.scene.scale.gameSize.height
    );

    this.applyMetrics(this.metrics);

    this.scene.scale.on('resize', this.handleResize, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);

    if (typeof window !== 'undefined' && window.visualViewport) {
      this.visualViewportHandler = () => {
        this.refresh();
      };

      window.visualViewport.addEventListener('resize', this.visualViewportHandler, {
        passive: true
      });
      window.visualViewport.addEventListener('scroll', this.visualViewportHandler, {
        passive: true
      });
    }

    // Emit initial metrics after listeners are attached
    queueMicrotask(() => {
      this.emit(EVENT_CHANGED, this.metrics);
      this.scene.events.emit(EVENT_CHANGED, this.metrics);
    });
  }

  getMetrics(): LayoutMetrics {
    return this.metrics;
  }

  onChange(callback: (metrics: LayoutMetrics) => void): () => void {
    this.on(EVENT_CHANGED, callback);
    return () => this.off(EVENT_CHANGED, callback);
  }

  refresh(): void {
    const parent = this.getParentSize();
    const nextMetrics = this.computeMetrics(parent.width, parent.height);
    this.applyMetrics(nextMetrics);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const nextMetrics = this.computeMetrics(gameSize.width, gameSize.height);
    this.applyMetrics(nextMetrics);
  }

  private applyMetrics(metrics: LayoutMetrics): void {
    this.metrics = metrics;

    const camera = this.scene.cameras.main;
    const scale = this.scene.scale;

    const zoom = Phaser.Math.Clamp(metrics.zoom, this.options.zoom.min, this.options.zoom.max);
    const displayWidth = metrics.designWidth * zoom;
    const displayHeight = metrics.designHeight * zoom;
    const offsetX = (metrics.parentWidth - displayWidth) / 2;
    const offsetY = (metrics.parentHeight - displayHeight) / 2;

    camera.setBounds(0, 0, metrics.designWidth, metrics.designHeight);
    camera.setViewport(offsetX, offsetY, displayWidth, displayHeight);
    camera.setOrigin(0, 0);
    camera.setZoom(zoom);
    camera.setScroll(0, 0);
    camera.setSize(metrics.designWidth, metrics.designHeight);

    scale.displayScale.set(zoom, zoom);

    this.emit(EVENT_CHANGED, metrics);
    this.scene.events.emit(EVENT_CHANGED, metrics);
  }

  private computeMetrics(parentWidth: number, parentHeight: number): LayoutMetrics {
    const safeParentWidth = Math.max(parentWidth, 1);
    const safeParentHeight = Math.max(parentHeight, 1);
    const orientation: Orientation = safeParentWidth >= safeParentHeight ? 'landscape' : 'portrait';

    const config = this.options.orientation[orientation];

    const zoomX = safeParentWidth / this.options.designWidth;
    const zoomY = safeParentHeight / this.options.designHeight;
    const zoom = Phaser.Math.Clamp(Math.min(zoomX, zoomY), this.options.zoom.min, this.options.zoom.max);

    const insets = this.getSafeInsets(safeParentWidth, safeParentHeight);

    const safeSides = config.safeArea.sides * this.options.designWidth;
    const safeTop = config.safeArea.top * this.options.designHeight;
    const safeBottom = config.safeArea.bottom * this.options.designHeight;

    const totalLeft = safeSides + insets.left;
    const totalRight = safeSides + insets.right;
    const totalTop = safeTop + insets.top;
    const totalBottom = safeBottom + insets.bottom;

    const minSafeWidth = this.options.designWidth * 0.45;
    const minSafeHeight = this.options.designHeight * 0.48;

    let safeWidth = this.options.designWidth - totalLeft - totalRight;
    let safeHeight = this.options.designHeight - totalTop - totalBottom;

    if (safeWidth < minSafeWidth) {
      safeWidth = minSafeWidth;
    }
    if (safeHeight < minSafeHeight) {
      safeHeight = minSafeHeight;
    }

    const safeX = Phaser.Math.Clamp(totalLeft, 0, this.options.designWidth - safeWidth);
    const safeY = Phaser.Math.Clamp(totalTop, 0, this.options.designHeight - safeHeight);

    const safeArea = new Phaser.Geom.Rectangle(safeX, safeY, safeWidth, safeHeight);

    const gap = config.tray.gap * this.options.designHeight;
    const availableVertical = Math.max(safeArea.height - gap, 0);
    const trayRatio = config.tray.ratio;
    const boardRatio = config.board.ratio;
    const totalRatio = Math.max(trayRatio + boardRatio, Number.EPSILON);

    let boardHeight = availableVertical * (boardRatio / totalRatio);
    let trayHeight = availableVertical * (trayRatio / totalRatio);

    const minTrayHeight = safeArea.height * config.tray.minRatio;
    const minBoardHeight = safeArea.height * 0.5;

    if (trayHeight < minTrayHeight) {
      trayHeight = Math.min(Math.max(minTrayHeight, 0), availableVertical);
      boardHeight = Math.max(availableVertical - trayHeight, minBoardHeight);
    } else if (boardHeight < minBoardHeight) {
      boardHeight = Math.min(Math.max(minBoardHeight, 0), availableVertical);
      trayHeight = Math.max(availableVertical - boardHeight, minTrayHeight);
    }

    if (boardHeight + trayHeight > availableVertical) {
      const ratio = boardRatio / totalRatio;
      boardHeight = availableVertical * ratio;
      trayHeight = availableVertical - boardHeight;
    }

    const boardArea = new Phaser.Geom.Rectangle(
      safeArea.x,
      safeArea.y,
      safeArea.width,
      Phaser.Math.Clamp(boardHeight, 0, availableVertical)
    );

    const trayY = boardArea.bottom + gap;
    const trayHeightClamped = Phaser.Math.Clamp(
      trayHeight,
      0,
      Math.max(safeArea.bottom - trayY, 0)
    );

    const pieceTrayArea = new Phaser.Geom.Rectangle(
      safeArea.x,
      trayY,
      safeArea.width,
      trayHeightClamped
    );

    const uiArea = new Phaser.Geom.Rectangle(
      safeArea.x,
      0,
      safeArea.width,
      safeArea.y
    );

    const devicePixelRatio = typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, 3)
      : 1;

    return {
      designWidth: this.options.designWidth,
      designHeight: this.options.designHeight,
      parentWidth: safeParentWidth,
      parentHeight: safeParentHeight,
      orientation,
      zoom,
      devicePixelRatio,
      safeArea,
      boardArea,
      pieceTrayArea,
      uiArea,
      worldView: new Phaser.Geom.Rectangle(0, 0, this.options.designWidth, this.options.designHeight)
    };
  }

  private getParentSize(): { width: number; height: number } {
    const scale = this.scene.scale;

    if (scale.canvasBounds) {
      const bounds = scale.canvasBounds;
      if (bounds.width && bounds.height) {
        return { width: bounds.width, height: bounds.height };
      }
    }

    if (scale.parent instanceof HTMLElement) {
      const rect = scale.parent.getBoundingClientRect();
      if (rect.width && rect.height) {
        return { width: rect.width, height: rect.height };
      }
    }

    const canvas = this.scene.game.canvas;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        return { width: rect.width, height: rect.height };
      }
    }

    return {
      width: scale.gameSize.width,
      height: scale.gameSize.height
    };
  }

  private getSafeInsets(parentWidth: number, parentHeight: number): SafeInsets {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const viewport = window.visualViewport;

    const top = viewport.offsetTop || 0;
    const left = viewport.offsetLeft || 0;
    const right = Math.max(window.innerWidth - viewport.width - viewport.offsetLeft, 0);
    const bottom = Math.max(window.innerHeight - viewport.height - viewport.offsetTop, 0);

    const toWorldX = (value: number) => (value / Math.max(parentWidth, 1)) * this.options.designWidth;
    const toWorldY = (value: number) => (value / Math.max(parentHeight, 1)) * this.options.designHeight;

    return {
      top: toWorldY(top),
      bottom: toWorldY(bottom),
      left: toWorldX(left),
      right: toWorldX(right)
    };
  }

  destroy(): void {
    this.scene.scale.off('resize', this.handleResize, this);
    if (this.visualViewportHandler && typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.visualViewportHandler);
      window.visualViewport.removeEventListener('scroll', this.visualViewportHandler);
    }

    this.removeAllListeners();
  }
}
