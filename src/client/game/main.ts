import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { calculateResponsiveLayout, measureViewport, ResponsiveLayout } from './responsive';

/**
 * Hexomind Game Configuration
 * Optimized for Reddit Devvit with high-DPI support
 */

const buildGameConfig = (
  parent: string,
  layout: ResponsiveLayout
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.WEBGL, // Force WebGL for better performance
  parent,
  backgroundColor: '#1a1a1b', // Reddit dark mode default
  resolution: layout.dpr,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent,
    width: Math.round(layout.viewportWidth),
    height: Math.round(layout.viewportHeight),
    min: {
      width: 320,
      height: 568
    },
    max: {
      width: 2560,
      height: 1440
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
  const viewport = measureViewport(parent);
  const initialLayout = calculateResponsiveLayout(viewport.width, viewport.height);
  const config = buildGameConfig(parent, initialLayout);

  const game = new Phaser.Game(config);

  const applyLayout = (layout: ResponsiveLayout) => {
    const roundedWidth = Math.round(layout.viewportWidth);
    const roundedHeight = Math.round(layout.viewportHeight);

    game.registry.set('responsive:layout', layout);
    game.events.emit('responsive:layout', layout);
    game.scale.resize(roundedWidth, roundedHeight);
    game.scale.refresh();
  };

  applyLayout(initialLayout);

  if (typeof window !== 'undefined') {
    let pendingFrame: number | null = null;

    const scheduleLayoutRefresh = () => {
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }

      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;
        const nextViewport = measureViewport(parent);
        const nextLayout = calculateResponsiveLayout(nextViewport.width, nextViewport.height);
        applyLayout(nextLayout);
      });
    };

    window.addEventListener('resize', scheduleLayoutRefresh);
    window.addEventListener('orientationchange', scheduleLayoutRefresh);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', scheduleLayoutRefresh);

    game.events.once(Phaser.Core.Events.DESTROY, () => {
      window.removeEventListener('resize', scheduleLayoutRefresh);
      window.removeEventListener('orientationchange', scheduleLayoutRefresh);
      visualViewport?.removeEventListener('resize', scheduleLayoutRefresh);

      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
    });
  }

  return game;
};

export default StartGame;
