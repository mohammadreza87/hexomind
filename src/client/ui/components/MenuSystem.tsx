import React from 'react';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';

export const MenuSystem: React.FC = () => {
  const { closeAllPanels, toggleLeaderboard, toggleSettings } = useUIStore((state) => ({
    closeAllPanels: state.closeAllPanels,
    toggleLeaderboard: state.toggleLeaderboard,
    toggleSettings: state.toggleSettings,
  }));
  const { gameState, setGameState, resetGame } = useGameStore((state) => ({
    gameState: state.gameState,
    setGameState: state.setGameState,
    resetGame: state.resetGame,
  }));

  const handleResume = () => {
    setGameState('playing');
    closeAllPanels();
  };

  const handleNewGame = () => {
    resetGame();
    setGameState('playing');
    closeAllPanels();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleResume}
      />

      {/* Menu Panel */}
      <div className="relative glass-dark rounded-3xl p-8 max-w-md w-full animate-float">
        <h2 className="text-4xl font-bold text-center mb-8 text-gradient from-neon-purple to-neon-pink">
          HEXOMIND
        </h2>

        <div className="space-y-4">
          {gameState === 'paused' && (
            <button
              onClick={handleResume}
              className="w-full glass-effect rounded-2xl py-4 px-6 text-white font-semibold hover:bg-white/20 transition-all duration-200 group"
            >
              <span className="flex items-center justify-center gap-3">
                <span>▶️</span>
                <span>Resume Game</span>
              </span>
            </button>
          )}

          <button
            onClick={handleNewGame}
            className="w-full glass-effect rounded-2xl py-4 px-6 text-white font-semibold hover:bg-white/20 transition-all duration-200 group"
          >
            <span className="flex items-center justify-center gap-3">
              <span>🎮</span>
              <span>New Game</span>
            </span>
          </button>

          <button
            onClick={toggleLeaderboard}
            className="w-full glass-effect rounded-2xl py-4 px-6 text-white font-semibold hover:bg-white/20 transition-all duration-200 group"
          >
            <span className="flex items-center justify-center gap-3">
              <span>🏆</span>
              <span>Leaderboard</span>
            </span>
          </button>

          <button
            onClick={toggleSettings}
            className="w-full glass-effect rounded-2xl py-4 px-6 text-white font-semibold hover:bg-white/20 transition-all duration-200 group"
          >
            <span className="flex items-center justify-center gap-3">
              <span>⚙️</span>
              <span>Settings</span>
            </span>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={handleResume}
          className="absolute top-4 right-4 glass-effect rounded-full p-2 hover:bg-white/20 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};