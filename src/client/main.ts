import StartGame from './game/main';
import './game.css'; // High-DPI display optimizations

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
