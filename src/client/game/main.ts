import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

/**
 * Hexomind Game Configuration
 * Optimized for Reddit Devvit with high-DPI support
 */

const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') {
    return 2;
  }

  // Use actual device pixel ratio for best quality (up to 3 for retina displays)
  return Math.min(window.devicePixelRatio || 1, 3);
};

const FALLBACK_PARENT_SIZE = { width: 1080, height: 1920 };

const getViewportSize = (parent?: string): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { ...FALLBACK_PARENT_SIZE };
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
    width: window.innerWidth || FALLBACK_PARENT_SIZE.width,
    height: window.innerHeight || FALLBACK_PARENT_SIZE.height
  };
};

const buildGameConfig = (
  parent: string,
  resolution: number
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.WEBGL, // Force WebGL for better performance
  parent,
  backgroundColor: '#1a1a1b', // Reddit dark mode default
  resolution,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1080,
    height: 1920,
    expandParent: true,
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
    multiTexture: true,
    mipmapFilter: 'LINEAR' // Enable mipmapping for better quality at different scales
  }
});

const StartGame = (parent: string) => {
  const config = buildGameConfig(parent, getDevicePixelRatio());

  const game = new Phaser.Game(config);

  if (typeof window !== 'undefined') {
    const updateSize = () => {
      const viewport = getViewportSize(parent);
      if (viewport.width > 0 && viewport.height > 0) {
        game.scale.resize(viewport.width, viewport.height);
      } else {
        game.scale.refresh();
      }
    };

    window.addEventListener('resize', updateSize);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', updateSize);
    visualViewport?.addEventListener('scroll', updateSize);

    game.events.on(Phaser.Core.Events.READY, updateSize);

    game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, updateSize);

    game.events.once(Phaser.Core.Events.DESTROY, () => {
      window.removeEventListener('resize', updateSize);
      visualViewport?.removeEventListener('resize', updateSize);
      visualViewport?.removeEventListener('scroll', updateSize);
      game.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, updateSize);
    });
  }

  return game;
};

export default StartGame;
