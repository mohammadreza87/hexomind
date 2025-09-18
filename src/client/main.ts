import StartGame from './game/main';
import './game.css'; // High-DPI display optimizations
import './styles/gradient-background.css'; // Import gradient styles
import { initializeReactUI } from './ui';

document.addEventListener('DOMContentLoaded', () => {
  // Add gradient background to body before game starts
  const gradientBg = document.createElement('div');
  gradientBg.className = 'gradient-background';
  gradientBg.innerHTML = `
    <div class="gradient-orb gradient-orb-1"></div>
    <div class="gradient-orb gradient-orb-2"></div>
    <div class="gradient-orb gradient-orb-3"></div>
  `;
  document.body.insertBefore(gradientBg, document.body.firstChild);

  // Start Phaser game
  StartGame('game-container');

  // Initialize React UI overlay after a short delay to ensure Phaser is ready
  setTimeout(() => {
    initializeReactUI();
  }, 100);
});
