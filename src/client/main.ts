import StartGame from './game/main';
import './game.css'; // High-DPI display optimizations
import { initializeReactUI } from './ui';

document.addEventListener('DOMContentLoaded', () => {
  // Start Phaser game
  StartGame('game-container');

  // Initialize React UI overlay after a short delay to ensure Phaser is ready
  setTimeout(() => {
    initializeReactUI();
  }, 100);
});
