import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

/**
 * Hexomind Game Configuration
 * Optimized for Reddit Devvit with high-DPI support
 */

// Calculate optimal dimensions with DPR consideration
const dpr = Math.max(window.devicePixelRatio || 1, 2); // Minimum 2x for sharpness
const baseWidth = 800;
const baseHeight = 900;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, // Force WebGL for better performance
  parent: 'game-container',
  backgroundColor: '#1a1a1b', // Reddit dark mode default
  // Enhanced resolution - use at least 2x for sharp rendering
  resolution: dpr,
  scale: {
    mode: Phaser.Scale.FIT, // Fit to container while maintaining aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: baseWidth,
    height: baseHeight,
    parent: 'game-container'
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
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

export default StartGame;
