import React, { useCallback, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useUIStore } from '../store/uiStore';
import { leaderboardService } from '../../services/LeaderboardService';
import { highScoreService } from '../../services/HighScoreService';
import { logger } from '../../utils/logger';
import { CommunitySelector } from './CommunitySelector';
import { ShareDialog } from './ShareDialog';
import type { LeaderboardViewEntry, LeaderboardViewPeriod } from '../../services/LeaderboardService';

type LeaderboardType = 'global' | 'daily' | 'weekly';

export const LeaderboardPanel: React.FC = () => {
  const { toggleLeaderboard } = useUIStore();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  const [entries, setEntries] = useState<LeaderboardViewEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [showCommunitySelector, setShowCommunitySelector] = useState<boolean>(false);
  const [showShareDialog, setShowShareDialog] = useState<any>(null);
  const [postingComment, setPostingComment] = useState<boolean>(false);
  const [commentPosted, setCommentPosted] = useState<boolean>(false);

  const postScoreToComments = useCallback(async (score: number, username: string, rank: number) => {
    if (postingComment || commentPosted) return;

    setPostingComment(true);

    try {
      const response = await fetch('/api/post-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          username,
          rank,
          period: activeTab
        })
      });

      const data = await response.json();

      if (data.success) {
        setCommentPosted(true);
        logger.info('Score posted to comments!');

        // Show success animation
        const btn = document.querySelector('.comment-leaderboard-btn');
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
  }, [activeTab, postingComment, commentPosted]);

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
    // Animate panel entrance
    gsap.fromTo(
      '.leaderboard-panel',
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
      '.leaderboard-content > *',
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.05,
        delay: 0.2,
        ease: 'power2.out',
      }
    );
  }, []);

  const fetchEntries = async (type: LeaderboardType) => {
    setLoading(true);
    setError(null);

    try {
      await highScoreService.awaitReady();
      const username = await highScoreService.getUsername();
      setCurrentUser(username);

      const limit = type === 'global' ? 100 : type === 'weekly' ? 35 : 25;
      const period = type as LeaderboardViewPeriod;
      const leaderboard = await leaderboardService.fetchLeaderboard(period, limit, username);
      setEntries(leaderboard);
    } catch (err) {
      console.error('Failed to fetch leaderboard for overlay:', err);
      setError('Failed to load leaderboard');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEntries(activeTab);
  }, [activeTab]);

  const handleClose = () => {
    // Animate out before closing
    gsap.to('.leaderboard-panel', {
      scale: 0.9,
      opacity: 0,
      y: -30,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => toggleLeaderboard(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel with stronger glassmorphism */}
      <div className="leaderboard-panel relative w-full max-w-md">
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
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content with reduced padding (30% smaller) */}
            <div className="leaderboard-content" style={{padding: '1.4rem 1.75rem'}}>

              {/* Title */}
              <div className="text-center" style={{marginBottom: '1.05rem'}}>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  LEADERBOARD
                </h1>
              </div>

              {/* Tab Selector */}
              <div className="flex gap-1" style={{marginBottom: '1.05rem'}}>
                {(['global', 'daily', 'weekly'] as LeaderboardType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`flex-1 py-4 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      activeTab === type
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Leaderboard List */}
              <div className="overflow-y-auto leaderboard-scroll"
                style={{
                  maxHeight: '280px',
                  marginBottom: '1.05rem',
                  paddingRight: '0.35rem',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                }}>
                <style>{`
                  .leaderboard-scroll::-webkit-scrollbar {
                    width: 4px;
                  }
                  .leaderboard-scroll::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .leaderboard-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                  }
                  .leaderboard-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.3);
                  }
                `}</style>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.35rem'}}>
                  {loading && (
                    <div className="text-center text-white/60 py-8">Loading…</div>
                  )}
                  {!loading && error && (
                    <div className="text-center text-red-400 py-8">{error}</div>
                  )}
                  {!loading && !error && entries.map((entry) => (
                    <div
                      key={entry.rank}
                      style={{
                        padding: '0.7rem 0.875rem',
                        minHeight: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      className={`rounded-xl transition-all ${
                        entry.isCurrentUser
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center" style={{gap: '0.7rem'}}>
                        <div
                          style={{
                            minWidth: '32px',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}
                          className={
                            entry.rank === 1 ? 'text-yellow-400' :
                            entry.rank === 2 ? 'text-gray-400' :
                            entry.rank === 3 ? 'text-orange-400' :
                            'text-white/60'
                          }
                        >
                          {entry.rank === 1 && '🥇'}
                          {entry.rank === 2 && '🥈'}
                          {entry.rank === 3 && '🥉'}
                          {entry.rank > 3 && `#${entry.rank}`}
                        </div>
                        <div
                          style={{fontSize: '0.75rem', fontWeight: '500'}}
                          className={entry.isCurrentUser ? 'text-purple-400' : 'text-white/80'}
                        >
                          {entry.username}
                          {entry.isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                        </div>
                      </div>
                      <div
                        style={{fontSize: '0.8rem', fontWeight: 'bold', paddingLeft: '0.7rem'}}
                        className={entry.isCurrentUser ? 'text-purple-400' : 'text-cyan-400'}
                      >
                        {entry.score.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Your Position */}
              <div className="pt-2" style={{ paddingRight: '0.35rem' }}>
                {!loading && !error && entries.length > 0 && (() => {
                  const mine = entries.find(entry => entry.username === currentUser);

                  if (!mine) {
                    return null;
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      <div
                        style={{
                          padding: '0.7rem 0.875rem',
                          minHeight: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        className="rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20"
                      >
                        <div className="flex items-center" style={{gap: '0.7rem'}}>
                          <div style={{
                            minWidth: '32px',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }} className="text-purple-400">
                            #{mine.rank}
                          </div>
                          <div style={{fontSize: '0.75rem', fontWeight: '500'}} className="text-purple-400">
                            {mine.username}
                          </div>
                        </div>
                        <div style={{fontSize: '0.8rem', fontWeight: 'bold', paddingLeft: '0.7rem'}} className="text-purple-400">
                          {mine.score.toLocaleString()}
                        </div>
                      </div>

                      {/* Viral Share Button with smooth bump animation */}
                      <button
                        onClick={() => {
                          if (sharing) {
                            return;
                          }
                          setShowCommunitySelector(true);
                        }}
                        className={`share-challenge-btn w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group animate-bump ${
                          sharing ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''
                        }`}
                        disabled={sharing}
                        style={{
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />

                        {/* Icon and text */}
                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        <span className="relative z-10">
                          🔥 CHALLENGE FRIENDS
                        </span>
                        <span className="text-xs opacity-75">
                          (#{mine.rank})
                        </span>
                      </button>

                      {/* Post to Comments Button */}
                      <button
                        onClick={() => postScoreToComments(mine.score, mine.username, mine.rank)}
                        disabled={postingComment || commentPosted}
                        className={`comment-leaderboard-btn w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm text-blue-400 font-bold text-sm hover:bg-blue-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
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
                            <span>POSTED!</span>
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
                            <span>POST TO COMMENTS</span>
                          </>
                        )}
                      </button>

                      <style jsx>{`
                        .animate-bump {
                          animation: smoothBump 3s ease-in-out infinite;
                        }

                        .animate-bump:hover {
                          animation: none;
                        }

                        @keyframes smoothBump {
                          0%, 100% {
                            transform: scale(1) translateY(0);
                            box-shadow: 0 10px 25px rgba(249, 115, 22, 0.3);
                          }
                          50% {
                            transform: scale(1.05) translateY(-2px);
                            box-shadow: 0 15px 35px rgba(249, 115, 22, 0.5);
                          }
                        }

                        .share-success {
                          animation: shareSuccess 0.5s ease-out;
                        }

                        @keyframes shareSuccess {
                          0% { transform: scale(1); }
                          50% { transform: scale(1.1); background: linear-gradient(to right, #10b981, #3b82f6); }
                          100% { transform: scale(1); }
                        }
                      `}</style>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-purple-500/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-cyan-500/20 rounded-full blur-2xl" />
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          {...showShareDialog}
          onClose={() => setShowShareDialog(null)}
        />
      )}

      {/* Community Selector Modal */}
      {showCommunitySelector && entries.length > 0 && (() => {
        const mine = entries.find(entry => entry.username === currentUser);
        if (!mine) return null;

        return (
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
                    score: mine.score,
                    username: mine.username,
                    rank: mine.rank,
                    period: activeTab,
                    targetSubreddit,
                    screenshot
                  })
                });

                const data = await response.json();

                if (data.success) {
                  // Close the selector
                  setShowCommunitySelector(false);

                  // If in fallback mode, show share dialog
                  if (data.fallbackMode) {
                    setShowShareDialog({
                      shareText: data.shareText,
                      shareableUrl: data.shareableUrl,
                      twitterUrl: data.twitterUrl,
                      score: mine.score,
                      username: mine.username
                    });
                  } else {
                    // Animate button success
                    const btn = document.querySelector('.share-challenge-btn');
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
                }
              } catch (error) {
                console.error('Failed to share challenge:', error);
              } finally {
                setSharing(false);
              }
            }}
          />
        );
      })()}
    </div>
  );
};
