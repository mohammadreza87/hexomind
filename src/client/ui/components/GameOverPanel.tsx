import React, { useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { CommunitySelector } from './CommunitySelector';
import { logger } from '../../utils/logger';

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
  const [sharing, setSharing] = useState<boolean>(false);
  const [showCommunitySelector, setShowCommunitySelector] = useState<boolean>(false);
  const [postingComment, setPostingComment] = useState<boolean>(false);
  const [commentPosted, setCommentPosted] = useState<boolean>(false);

  const postScoreToComments = useCallback(async () => {
    if (postingComment || commentPosted) return;

    setPostingComment(true);

    try {
      // Get username from store or use default
      const username = useGameStore.getState().username || 'Player';

      const response = await fetch('/api/post-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          username,
          rank: null, // We don't have rank info here yet
          period: 'global'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCommentPosted(true);
        logger.info('Score posted to comments!');

        // Show success animation
        const btn = document.querySelector('.comment-btn');
        if (btn) {
          btn.classList.add('comment-success');
        }
      } else {
        logger.error('Failed to post comment:', data.error || data.details);

        // Check if it's because Reddit API is not available
        if (data.error === 'Reddit API not available') {
          logger.info('Comment feature is currently unavailable in development mode');
        }
      }
    } catch (error) {
      logger.error('Error posting comment:', error);
    } finally {
      setPostingComment(false);
    }
  }, [score, postingComment, commentPosted]);

  const captureGameScreenshot = useCallback((): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const phaserGame = window.game;
    const canvas: HTMLCanvasElement | undefined = phaserGame?.canvas as HTMLCanvasElement | undefined;

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    try {
      const maxWidth = 720;
      const scale = canvas.width > maxWidth ? maxWidth / canvas.width : 1;
      const targetWidth = Math.round(canvas.width * scale);
      const targetHeight = Math.round(canvas.height * scale);

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;
      const context = outputCanvas.getContext('2d');

      if (!context) {
        return null;
      }

      context.drawImage(canvas, 0, 0, targetWidth, targetHeight);

      return outputCanvas.toDataURL('image/jpeg', 0.85);
    } catch (captureError) {
      console.error('Failed to capture game screenshot:', captureError);
      return null;
    }
  }, []);

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

  if (!isVisible) {
    return null;
  }

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

                {/* Share Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      if (sharing) return;
                      setShowCommunitySelector(true);
                    }}
                    disabled={sharing}
                    style={{padding: '0.75rem 1.5rem'}}
                    className={`share-gameover-btn w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group ${
                      sharing ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    <span>CHALLENGE FRIENDS</span>
                  </button>
                </div>

                {/* Post to Comments Button */}
                <div className="flex justify-center">
                  <button
                    onClick={postScoreToComments}
                    disabled={postingComment || commentPosted}
                    style={{padding: '0.75rem 1.5rem'}}
                    className={`comment-btn w-full rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm text-blue-400 font-bold text-sm hover:bg-blue-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                      postingComment ? 'opacity-60 cursor-wait' : ''
                    } ${
                      commentPosted ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : ''
                    }`}
                  >
                    {commentPosted ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>POSTED TO COMMENTS</span>
                      </>
                    ) : postingComment ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>POSTING...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>POST SCORE TO COMMENTS</span>
                      </>
                    )}
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

      {/* Community Selector Modal */}
      {showCommunitySelector && (
        <CommunitySelector
          onCancel={() => setShowCommunitySelector(false)}
          isLoading={sharing}
          onShare={async (targetSubreddit) => {
            setSharing(true);

            try {
              const screenshot = captureGameScreenshot();

              const response = await fetch('/api/share-challenge', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  score: score,
                  username: 'Player', // You may want to get the actual username
                  rank: 0, // This would need to be calculated or passed
                  period: 'game',
                  targetSubreddit,
                  screenshot
                })
              });

              const data = await response.json();

              if (data.success) {
                // Close the selector
                setShowCommunitySelector(false);

                // Animate button success
                const btn = document.querySelector('.share-gameover-btn');
                if (btn) {
                  btn.classList.add('share-success');
                  setTimeout(() => btn.classList.remove('share-success'), 2000);
                }

                // Log the URL instead of opening (sandbox restrictions)
                if (data.postUrl) {
                  logger.info(`Challenge posted! View at: ${data.postUrl}`);
                }

                // Show success message or warning
                if (data.actualSubreddit) {
                  logger.warn(`Shared to current subreddit - Hexomind needs to be installed in r/${targetSubreddit} to post there`);
                } else {
                  logger.info(data.message || 'Challenge shared successfully!');
                }
              }
            } catch (error) {
              console.error('Failed to share challenge:', error);
            } finally {
              setSharing(false);
            }
          }}
        />
      )}
    </div>
  );
};