import React, { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import { gsap } from 'gsap';

interface GameUIOverlayProps {
  score: number;
  highScore: number;
  combo: number;
  gameState: 'idle' | 'playing' | 'paused' | 'gameOver' | 'sharePrompt';
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
  const heartRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(score);
  const prevHighScoreRef = useRef(highScore);
  const heartAnimationRef = useRef<gsap.core.Tween | null>(null);

  const handleTestShare = useCallback(() => {
    if (import.meta.env.PROD) {
      return;
    }

    const scene = window.game?.scene.getScene('MainScene') as unknown as {
      triggerShareRescueTest?: () => Promise<void> | void;
    } | undefined;

    if (scene && typeof scene.triggerShareRescueTest === 'function') {
      void scene.triggerShareRescueTest();
    }
  }, []);

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

  // Handle combo heart beating animation
  useEffect(() => {
    if (combo > 0 && heartRef.current) {
      // Start heart beating animation
      if (!heartAnimationRef.current) {
        heartAnimationRef.current = gsap.to(heartRef.current, {
          scale: 1.2,
          duration: 0.4,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
        // Make heart visible with fade in
        gsap.to(heartRef.current, {
          opacity: 1,
          duration: 0.3,
        });
      }
    } else if (combo === 0 && heartRef.current && heartAnimationRef.current) {
      // Stop heart animation and fade out
      heartAnimationRef.current.kill();
      heartAnimationRef.current = null;
      gsap.to(heartRef.current, {
        opacity: 0,
        scale: 1,
        duration: 0.3,
      });
    }
  }, [combo]);

  return (
    <div className="pointer-events-none">
      {/* Top Bar */}
      <div className="absolute" style={{ top: '1.25rem', left: '1.25rem', right: '1.25rem' }}>
        <div className="flex justify-between items-start">
          {/* Left side - Best Score with Crown */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <span ref={highScoreRef} className="text-base font-bold" style={{ color: '#FFD700' }}>{highScore}</span>
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

      {import.meta.env.DEV && (
        <div className="absolute bottom-6 left-6 pointer-events-auto">
          <button
            onClick={handleTestShare}
            className="px-4 py-2 rounded-lg bg-orange-500/80 text-white text-xs font-semibold shadow hover:bg-orange-500 transition"
          >
            Test Share Rescue
          </button>
        </div>
      )}

      {/* Score above the grid - centered, moved closer to top */}
      <div className="absolute top-12 left-0 right-0 flex justify-center">
        <div className="relative">
          {/* Glassmorphic Heart Behind Score */}
          <div
            ref={heartRef}
            className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none"
            style={{
              transform: 'translate(-50%, -50%)',
              top: '50%',
              left: '50%',
              zIndex: -1,
            }}
          >
            {/* High Quality SVG Heart with glassmorphism */}
            <svg
              width="200"
              height="180"
              viewBox="0 0 200 180"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(255, 20, 147, 0.6))',
                transform: 'scale(1.5)',
              }}
            >
              <defs>
                <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ff1493', stopOpacity: 0.5 }} />
                  <stop offset="25%" style={{ stopColor: '#ff69b4', stopOpacity: 0.45 }} />
                  <stop offset="50%" style={{ stopColor: '#ff85c1', stopOpacity: 0.4 }} />
                  <stop offset="75%" style={{ stopColor: '#ffa0d2', stopOpacity: 0.35 }} />
                  <stop offset="100%" style={{ stopColor: '#ffb6c1', stopOpacity: 0.3 }} />
                </linearGradient>
                <radialGradient id="heartGlow" cx="50%" cy="40%">
                  <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0 }} />
                </radialGradient>
                <filter id="glassBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
                  <feComponentTransfer>
                    <feFuncA type="table" tableValues="0 1 1" />
                  </feComponentTransfer>
                  <feComposite operator="over" />
                </filter>
              </defs>

              {/* Main heart shape with better curves */}
              <path
                d="M100,40 C100,20 85,5 65,5 C45,5 30,20 30,40 C30,60 50,80 100,140 C150,80 170,60 170,40 C170,20 155,5 135,5 C115,5 100,20 100,40 Z"
                fill="url(#heartGradient)"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="2"
                filter="url(#glassBlur)"
              />

              {/* Glass reflection overlay */}
              <ellipse
                cx="70"
                cy="45"
                rx="25"
                ry="20"
                fill="url(#heartGlow)"
                opacity="0.6"
              />

              {/* Secondary highlight */}
              <ellipse
                cx="130"
                cy="45"
                rx="20"
                ry="15"
                fill="rgba(255, 255, 255, 0.15)"
                opacity="0.5"
              />
            </svg>
          </div>
          {/* Score Text */}
          <span ref={scoreRef} className="text-white text-4xl font-bold relative z-10">{score}</span>
        </div>
      </div>

      {/* Combo indicator disabled */}
    </div>
  );
};
