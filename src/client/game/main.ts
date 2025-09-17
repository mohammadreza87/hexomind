import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import {
  resolveDeviceResolution,
  resolveResponsiveSizing,
  ResponsiveRules,
  type ResponsiveSizing
} from './display/ResponsiveDisplay';

/**
 * Hexomind Game Configuration
 * Optimized for Reddit Devvit with high-DPI support
 */

const getViewportSize = (parent?: string): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return {
      width: ResponsiveRules.DESIGN.portrait.width,
      height: ResponsiveRules.DESIGN.portrait.height
    };
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
    width: window.innerWidth || ResponsiveRules.DESIGN.portrait.width,
    height: window.innerHeight || ResponsiveRules.DESIGN.portrait.height
  };
};

const buildGameConfig = (
  parent: string,
  sizing: ResponsiveSizing,
  resolution: number
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.WEBGL, // Force WebGL for better performance
  parent,
  backgroundColor: '#1a1a1b', // Reddit dark mode default
  resolution,
  scale: {
    mode: Phaser.Scale.FIT, // Fit the fixed size to container
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: sizing.designWidth,
    height: sizing.designHeight,
    parent,
    expandParent: true,
    min: {
      width: Math.round(sizing.designWidth * ResponsiveRules.SCALE.min),
      height: Math.round(sizing.designHeight * ResponsiveRules.SCALE.min)
    },
    max: {
      width: Math.round(sizing.designWidth * ResponsiveRules.SCALE.max),
      height: Math.round(sizing.designHeight * ResponsiveRules.SCALE.max)
    }
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
  const viewport = getViewportSize(parent);
  const sizing = resolveResponsiveSizing(viewport.width, viewport.height);
  const config = buildGameConfig(parent, sizing, resolveDeviceResolution());

  const game = new Phaser.Game(config);
  game.scale.setZoom(sizing.zoom);

  if (typeof window !== 'undefined') {
    const updateSize = () => {
      const nextViewport = getViewportSize(parent);
      const nextSizing = resolveResponsiveSizing(nextViewport.width, nextViewport.height);

      game.scale.resize(nextSizing.designWidth, nextSizing.designHeight);
      game.scale.setZoom(nextSizing.zoom);
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
export { resolveResponsiveSizing as calculateResponsiveDimensions };
