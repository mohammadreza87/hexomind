import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';

interface GameOverPanelProps {
  score: number;
  highScore: number;
  onTryAgain: () => void;
  onShowLeaderboard: () => void;
}

export const GameOverPanel: React.FC<GameOverPanelProps> = ({
  score,
  highScore,
  onTryAgain,
  onShowLeaderboard,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    setIsNewHighScore(score > 0 && score >= highScore);
    setIsVisible(true);

    // Animate panel entrance
    gsap.fromTo(
      '.game-over-panel',
      {
        scale: 0.8,
        opacity: 0,
        y: 50,
        backdropFilter: 'blur(0px)',
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        backdropFilter: 'blur(20px)',
        duration: 0.5,
        ease: 'power3.out',
      }
    );

    // Animate content with stagger
    gsap.fromTo(
      '.game-over-content > *',
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
        delay: 0.3,
        ease: 'power2.out',
      }
    );
  }, [score, highScore]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel with stronger glassmorphism */}
      <div className="game-over-panel relative w-full max-w-xs">
        {/* Glass panel with gradient background */}
        <div className="relative rounded-2xl">
          {/* Glassmorphism layer */}
          <div className="relative rounded-2xl shadow-2xl"
               style={{
                 backdropFilter: 'blur(12px) saturate(115%)',
                 WebkitBackdropFilter: 'blur(12px) saturate(115%)',
                 backgroundColor: 'rgba(17, 25, 40, 0.36)',
                 border: '1px solid rgba(255, 255, 255, 0.125)'
               }}>

            {/* Content with normal padding */}
            <div className="game-over-content" style={{padding: '2rem 2.5rem'}}>

              {/* Game Over Title */}
              <div className="text-center" style={{marginBottom: '2rem'}}>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  GAME OVER
                </h1>
                {isNewHighScore && (
                  <div className="mt-4 text-yellow-400 text-sm font-semibold animate-pulse">
                    🏆 NEW HIGH SCORE! 🏆
                  </div>
                )}
              </div>

              {/* Score Display Section */}
              <div style={{marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                {/* Current Score */}
                <div className="text-center">
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider" style={{marginBottom: '0.5rem'}}>Score</div>
                  <div className="text-3xl font-bold text-white">
                    {score}
                  </div>
                </div>

                {/* Best Score */}
                <div className="text-center">
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider" style={{marginBottom: '0.5rem'}}>Best Score</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {highScore}
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {/* Try Again Button */}
                <div className="flex justify-center">
                  <button
                    onClick={onTryAgain}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      TRY AGAIN
                    </span>
                  </button>
                </div>

                {/* Leaderboard Button */}
                <div className="flex justify-center">
                  <button
                    onClick={onShowLeaderboard}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm text-cyan-400 font-bold text-sm hover:bg-cyan-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      LEADERBOARD
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-16 h-16 bg-purple-500/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-16 h-16 bg-cyan-500/20 rounded-full blur-2xl" />
      </div>
    </div>
  );
};