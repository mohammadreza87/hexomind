import React from 'react';
import { GameUIOverlay } from './components/GameUIOverlay';
import { MenuSystem } from './components/MenuSystem';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { GameOverPanel } from './components/GameOverPanel';
import { ShareRescuePanel } from './components/ShareRescuePanel';
import { NoSpaceToast } from './components/NoSpaceToast';
import { LineClearPopup } from './components/LineClearPopup';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';
import { ThemeProvider } from './providers/ThemeProvider';
import { logger } from '../utils/logger';

export const App: React.FC = () => {
  const { gameState, score, highScore, combo, resetGame, showNoSpaceToast, setShowNoSpaceToast, lineClearPopup, hideLineClearPopup, shareRescueOffer } = useGameStore();
  const { showMenu, showLeaderboard, showSettings, setShowLeaderboard } = useUIStore();


  const handleTryAgain = () => {
    logger.debug('Try Again clicked!');
    // Reset the game via the game store
    resetGame();
    // Set game state to playing
    useGameStore.getState().setGameState('playing');
    // Trigger Phaser scene restart
    if (window.game) {
      const scene = window.game.scene.getScene('MainScene');
      if (scene && typeof scene.startNewGame === 'function') {
        logger.debug('Calling startNewGame');
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

      {/* Line Clear Popup - shown when clearing lines */}
      {lineClearPopup && (
        <LineClearPopup
          lines={lineClearPopup.lines}
          score={lineClearPopup.score}
          onComplete={hideLineClearPopup}
        />
      )}

      {/* No More Space Toast - shown before game over */}
      {showNoSpaceToast && (
        <NoSpaceToast
          onComplete={() => setShowNoSpaceToast(false)}
        />
      )}

      {/* Share to Continue Panel - offered once per day */}
      {shareRescueOffer && (
        <ShareRescuePanel />
      )}

      {/* Game Over Panel - shown when game ends */}
      {(gameState === 'gameOver' || gameState === 'sharePrompt') && (
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
