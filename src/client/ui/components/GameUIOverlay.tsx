import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import { gsap } from 'gsap';

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
  const scoreRef = useRef<HTMLSpanElement>(null);
  const highScoreRef = useRef<HTMLSpanElement>(null);
  const prevScoreRef = useRef(score);
  const prevHighScoreRef = useRef(highScore);

  // Animate score changes
  useEffect(() => {
    if (scoreRef.current && score !== prevScoreRef.current) {
      const obj = { value: prevScoreRef.current };
      gsap.to(obj, {
        value: score,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (scoreRef.current) {
            scoreRef.current.textContent = Math.floor(obj.value).toString();
          }
        }
      });
      prevScoreRef.current = score;
    }
  }, [score]);

  // Animate high score changes
  useEffect(() => {
    if (highScoreRef.current && highScore !== prevHighScoreRef.current) {
      const obj = { value: prevHighScoreRef.current };
      gsap.to(obj, {
        value: highScore,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (highScoreRef.current) {
            highScoreRef.current.textContent = Math.floor(obj.value).toString();
          }
        }
      });
      prevHighScoreRef.current = highScore;
    }
  }, [highScore]);

  return (
    <div className="pointer-events-none">
      {/* Top Bar */}
      <div className="absolute" style={{ top: '1.25rem', left: '1.25rem', right: '1.25rem' }}>
        <div className="flex justify-between items-start">
          {/* Left side - Best Score with Crown */}
          <div className="flex items-center gap-2">
            <span className="text-3xl">👑</span>
            <span ref={highScoreRef} className="text-2xl font-bold" style={{ color: '#FFD700' }}>{highScore}</span>
          </div>

          {/* Right side - Settings button */}
          <button
            onClick={toggleSettings}
            className="pointer-events-auto rounded-2xl p-3 hover:bg-white/20 transition-all duration-200"
          >
            <span className="text-2xl">⚙️</span>
          </button>
        </div>
      </div>

      {/* Score above the grid - centered */}
      <div className="absolute top-20 left-0 right-0 flex justify-center">
        <span ref={scoreRef} className="text-white text-4xl font-bold">{score}</span>
      </div>

      {/* Combo indicator disabled */}
    </div>
  );
};
