import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { measureResponsiveViewport, ResponsiveMetrics, getDevicePixelRatio } from './responsive';

/**
 * Hexomind Game Configuration
 * Optimized for Reddit Devvit with high-DPI support
 */

const FALLBACK_VIEWPORT = { width: 1080, height: 1920 };

const getViewportSize = (parent?: string): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return FALLBACK_VIEWPORT;
  }

  if (typeof document !== 'undefined' && parent) {
    const element = document.getElementById(parent) ?? document.querySelector<HTMLElement>(`#${parent}`);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
  }

  const viewport = window.visualViewport;
  if (viewport) {
    return { width: viewport.width, height: viewport.height };
  }

  return {
    width: window.innerWidth || FALLBACK_VIEWPORT.width,
    height: window.innerHeight || FALLBACK_VIEWPORT.height
  };
};

const buildGameConfig = (
  parent: string,
  metrics: ResponsiveMetrics,
  resolution: number
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.WEBGL, // Force WebGL for better performance
  parent,
  transparent: true, // Transparent background to show gradient
  resolution,
  scale: {
    mode: Phaser.Scale.NONE, // No scaling, fixed size
    autoCenter: Phaser.Scale.NO_CENTER, // We'll handle centering via CSS
    width: 1080,
    height: 1920,
    parent
  },
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    // Maximum quality settings for sharp rendering
    antialias: true,
    antialiasGL: true, // WebGL antialiasing
    pixelArt: false,
    roundPixels: false, // Don't round pixels - allow smooth positioning
    transparent: true, // Transparent background to show gradient
    clearBeforeRender: true,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
    batchSize: 4096,
    maxTextures: -1,
    maxLights: 10,
    desynchronized: true, // Better performance
    failIfMajorPerformanceCaveat: false,
    // WebGL specific for better quality
    autoMobilePipeline: false,
    multiTexture: true,
    mipmapFilter: 'LINEAR' // Enable mipmapping for better quality at different scales
  }
});

const resolveContainerElement = (parent?: string): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  if (parent) {
    const explicit = document.getElementById(parent);
    if (explicit) {
      return explicit;
    }

    const selector = document.querySelector<HTMLElement>(`#${parent}`);
    if (selector) {
      return selector;
    }
  }

  return null;
};

const applyContainerMetrics = (element: HTMLElement | null, metrics: ResponsiveMetrics) => {
  if (!element) {
    return;
  }

  element.dataset.orientation = metrics.orientation;
  element.style.setProperty('--game-aspect', metrics.aspectRatio.toString());
  element.style.setProperty('--game-display-width', `${metrics.displayWidth}px`);
  element.style.setProperty('--game-display-height', `${metrics.displayHeight}px`);
};

const StartGame = (parent: string) => {
  // Use fixed 1080x1920 dimensions for the game
  let metrics = measureResponsiveViewport(1080, 1920);
  const config = buildGameConfig(parent, metrics, getDevicePixelRatio());

  const game = new Phaser.Game(config);
  const containerElement = resolveContainerElement(parent);

  const publishMetrics = (next: ResponsiveMetrics) => {
    game.registry.set('responsive:metrics', next);
    game.events.emit('responsive:metrics', next);
  };

  applyContainerMetrics(containerElement, metrics);
  publishMetrics(metrics);

  if (typeof window !== 'undefined') {
    const updateSize = () => {
      // Always use fixed 1080x1920 dimensions
      metrics = measureResponsiveViewport(1080, 1920);
      applyContainerMetrics(containerElement, metrics);
      // Don't resize the game, keep it at 1080x1920
      publishMetrics(metrics);
    };

    window.addEventListener('resize', updateSize, { passive: true });
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', updateSize);

    const orientationHandler = () => {
      window.setTimeout(updateSize, 100);
    };

    window.addEventListener('orientationchange', orientationHandler);

    game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, updateSize);

    game.events.once(Phaser.Core.Events.DESTROY, () => {
      window.removeEventListener('resize', updateSize);
      visualViewport?.removeEventListener('resize', updateSize);
      game.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, updateSize);
      window.removeEventListener('orientationchange', orientationHandler);
    });
  }

  // Expose game instance globally for React integration
  if (typeof window !== 'undefined') {
    window.game = game;
  }

  return game;
};

export default StartGame;
