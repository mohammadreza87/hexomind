import React from 'react';

interface ComboIndicatorProps {
  combo: number;
}

export const ComboIndicator: React.FC<ComboIndicatorProps> = ({ combo }) => {
  const getComboColor = () => {
    if (combo >= 5) return 'from-neon-red to-neon-pink';
    if (combo >= 3) return 'from-neon-purple to-neon-blue';
    return 'from-neon-cyan to-neon-green';
  };

  const getComboText = () => {
    if (combo >= 5) return 'MEGA COMBO!';
    if (combo >= 3) return 'SUPER COMBO!';
    return `${combo}x COMBO`;
  };

  return (
    <div className="animate-float">
      <div className="glass-effect rounded-full px-8 py-4 animate-glow">
        <div className={`text-3xl font-bold text-gradient ${getComboColor()}`}>
          {getComboText()}
        </div>
        <div className="text-center text-white/60 text-sm mt-1">
          +{combo * 100} points
        </div>
      </div>

      {/* Particle effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-neon-yellow to-neon-orange rounded-full animate-ping"
            style={{
              left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 30}%`,
              top: `${50 + Math.sin(i * 60 * Math.PI / 180) * 30}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};