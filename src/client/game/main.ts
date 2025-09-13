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
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

export default StartGame;