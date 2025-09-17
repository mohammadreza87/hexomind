import React from 'react';

interface GameStateIndicatorProps {
  state: 'idle' | 'playing' | 'paused' | 'gameOver';
}

export const GameStateIndicator: React.FC<GameStateIndicatorProps> = ({ state }) => {
  const getStateConfig = () => {
    switch (state) {
      case 'paused':
        return {
          text: 'PAUSED',
          color: 'from-neon-yellow to-neon-orange',
          icon: '⏸️',
        };
      case 'gameOver':
        return {
          text: 'GAME OVER',
          color: 'from-neon-red to-neon-pink',
          icon: '💔',
        };
      case 'playing':
        return {
          text: 'PLAYING',
          color: 'from-neon-green to-neon-cyan',
          icon: '🎮',
        };
      default:
        return {
          text: 'READY',
          color: 'from-neon-blue to-neon-purple',
          icon: '✨',
        };
    }
  };

  const config = getStateConfig();

  if (state === 'playing') {
    return null; // Don't show indicator during active gameplay
  }

  return (
    <div className="glass-effect rounded-full px-6 py-3 animate-float">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <span className={`text-lg font-bold text-gradient ${config.color}`}>
          {config.text}
        </span>
      </div>
    </div>
  );
};