import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

/**
 * Hexomind Game Configuration
 * Clean setup with only the essential game scene
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a1b', // Reddit dark mode default
  // Use full device pixel ratio for maximum crispness
  resolution: window.devicePixelRatio || 1,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
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
    // Enable high quality rendering
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    transparent: false,
    clearBeforeRender: true,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
    batchSize: 4096,
    maxTextures: -1,
    maxLights: 10
  }
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

export default StartGame;
