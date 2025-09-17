import React from 'react';
import { AnimatedScoreDisplay } from './AnimatedScoreDisplay';
import { AnimatedComboIndicator } from './AnimatedComboIndicator';
import { GameStateIndicator } from './GameStateIndicator';
import { useUIStore } from '../store/uiStore';

interface GameUIOverlayProps {
  score: number;
  highScore: number;
  combo: number;
  gameState: 'idle' | 'playing' | 'paused' | 'gameOver';
}

export const GameUIOverlay: React.FC<GameUIOverlayProps> = ({
  score,
  highScore,
  combo,
  gameState,
}) => {
  const { toggleSettings } = useUIStore();

  return (
    <div className="pointer-events-none">
      {/* Top HUD Bar */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="flex justify-between items-start">
          {/* Left side - Score */}
          <AnimatedScoreDisplay score={score} highScore={highScore} />

          {/* Center - Game State */}
          <GameStateIndicator state={gameState} />

          {/* Right side - Settings button */}
          <button
            onClick={toggleSettings}
            className="pointer-events-auto glass-effect rounded-2xl p-3 hover:bg-white/20 transition-all duration-200 group"
          >
            <span className="text-2xl">⚙️</span>
          </button>
        </div>
      </div>

      {/* Combo Indicator - Bottom center */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2">
        <AnimatedComboIndicator combo={combo} />
      </div>
    </div>
  );
};