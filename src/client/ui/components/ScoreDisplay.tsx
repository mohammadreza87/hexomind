import React, { useEffect, useRef } from 'react';

interface ScoreDisplayProps {
  score: number;
  highScore: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, highScore }) => {
  const scoreRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    if (score !== prevScoreRef.current && scoreRef.current) {
      // Trigger animation on score change
      scoreRef.current.classList.add('animate-pulse-neon');
      setTimeout(() => {
        scoreRef.current?.classList.remove('animate-pulse-neon');
      }, 500);
    }
    prevScoreRef.current = score;
  }, [score]);

  return (
    <div className="pointer-events-auto">
      {/* Glass container */}
      <div className="glass-effect rounded-3xl p-6 min-w-[200px]">
        {/* Current Score */}
        <div ref={scoreRef} className="mb-2">
          <div className="text-sm text-white/60 mb-1">SCORE</div>
          <div className="text-4xl font-bold text-gradient from-neon-yellow to-neon-orange">
            {score.toLocaleString()}
          </div>
        </div>

        {/* High Score */}
        <div className="pt-3 border-t border-white/10">
          <div className="text-xs text-white/50">BEST</div>
          <div className="text-sm font-semibold text-white/80">
            {highScore.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};