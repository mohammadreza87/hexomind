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
  // Render at device pixel ratio for crisp HiDPI without nearest-neighbor artifacts
  resolution: Math.min(2, (window.devicePixelRatio || 1)),
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
    // Smooth vector rendering (Graphics) looks best with AA on and pixelArt off
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance'
  }
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

export default StartGame;
