import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import {
  calculateResponsiveDimensions as computeResponsiveDimensions,
  FALLBACK_VIEWPORT_HEIGHT,
  FALLBACK_VIEWPORT_WIDTH,
  MAX_GAME_HEIGHT,
  MAX_GAME_WIDTH,
  MIN_GAME_HEIGHT,
  MIN_GAME_WIDTH,
  ResponsiveDimensions
} from './responsive';

/**
 * Hexomind Game Configuration
 * Optimized for Reddit Devvit with high-DPI support
 */

const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') {
    return 2;
  }

  return Math.max(window.devicePixelRatio || 1, 2);
};

const getViewportSize = (parent?: string): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: FALLBACK_VIEWPORT_WIDTH, height: FALLBACK_VIEWPORT_HEIGHT };
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
    width: window.innerWidth || FALLBACK_VIEWPORT_WIDTH,
    height: window.innerHeight || FALLBACK_VIEWPORT_HEIGHT
  };
};

const buildGameConfig = (
  parent: string,
  dimensions: ResponsiveDimensions,
  resolution: number
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.WEBGL, // Force WebGL for better performance
  parent,
  backgroundColor: '#1a1a1b', // Reddit dark mode default
  resolution,
  scale: {
    mode: Phaser.Scale.FIT, // Fit to container while maintaining aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: dimensions.width,
    height: dimensions.height,
    parent,
    minWidth: MIN_GAME_WIDTH,
    minHeight: MIN_GAME_HEIGHT,
    maxWidth: MAX_GAME_WIDTH,
    maxHeight: MAX_GAME_HEIGHT
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
    roundPixels: true, // Snap to pixels for sharper text
    transparent: false,
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
    multiTexture: true
  }
});

const StartGame = (parent: string) => {
  const viewport = getViewportSize(parent);
  const dimensions = computeResponsiveDimensions(viewport.width, viewport.height);
  const config = buildGameConfig(parent, dimensions, getDevicePixelRatio());

  const game = new Phaser.Game(config);

  if (typeof window !== 'undefined') {
    const updateSize = () => {
      const { width: vpWidth, height: vpHeight } = getViewportSize(parent);
      const nextDimensions = computeResponsiveDimensions(vpWidth, vpHeight);
      game.scale.resize(nextDimensions.width, nextDimensions.height);
      game.scale.refresh();
    };

    window.addEventListener('resize', updateSize);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', updateSize);

    game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, updateSize);

    game.events.once(Phaser.Core.Events.DESTROY, () => {
      window.removeEventListener('resize', updateSize);
      visualViewport?.removeEventListener('resize', updateSize);
      game.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, updateSize);
    });
  }

  return game;
};

export default StartGame;
export { computeResponsiveDimensions as calculateResponsiveDimensions };
