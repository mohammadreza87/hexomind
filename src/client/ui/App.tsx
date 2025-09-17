import React, { useEffect } from 'react';
import { GameUIOverlay } from './components/GameUIOverlay';
import { MenuSystem } from './components/MenuSystem';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { GameOverPanel } from './components/GameOverPanel';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';
import { ThemeProvider } from './providers/ThemeProvider';

export const App: React.FC = () => {
  const { gameState, score, highScore, combo, resetGame } = useGameStore();
  const { showMenu, showLeaderboard, showSettings, setShowLeaderboard, setShowMenu } = useUIStore();

  const handleTryAgain = () => {
    console.log('Try Again clicked!');
    // Reset the game via the game store
    resetGame();
    // Trigger Phaser scene restart
    if (window.game) {
      const scene = window.game.scene.getScene('MainScene');
      if (scene && typeof scene.startNewGame === 'function') {
        console.log('Calling startNewGame');
        scene.startNewGame();
      } else {
        console.error('MainScene or startNewGame not found');
      }
    } else {
      console.error('Game instance not found');
    }
  };

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true);
  };

  return (
    <ThemeProvider>
      {/* Main game UI overlay - always visible during gameplay */}
      <GameUIOverlay
        score={score}
        highScore={highScore}
        combo={combo}
        gameState={gameState}
      />

      {/* Game Over Panel - shown when game ends */}
      {gameState === 'gameOver' && (
        <GameOverPanel
          score={score}
          highScore={highScore}
          onTryAgain={handleTryAgain}
          onShowLeaderboard={handleShowLeaderboard}
        />
      )}

      {/* Menu System - shown when game is paused or in menu */}
      {showMenu && (
        <MenuSystem />
      )}

      {/* Leaderboard Panel - slide in from right */}
      {showLeaderboard && (
        <LeaderboardPanel />
      )}

      {/* Settings Panel - modal overlay */}
      {showSettings && (
        <SettingsPanel />
      )}
    </ThemeProvider>
  );
};