import React, { useState } from 'react';
import { shareService } from '../../services/ShareService';
import { useGameStore } from '../store/gameStore';

export const ShareRescuePanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    shareRescueOffer,
    setShareRescueOffer,
    setGameState,
    shareStatus,
    setShareStatus,
    score,
    highScore,
  } = useGameStore((state) => ({
    shareRescueOffer: state.shareRescueOffer,
    setShareRescueOffer: state.setShareRescueOffer,
    setGameState: state.setGameState,
    shareStatus: state.shareStatus,
    setShareStatus: state.setShareStatus,
    score: state.score,
    highScore: state.highScore,
  }));

  if (!shareRescueOffer) {
    return null;
  }

  const { username, screenshot } = shareRescueOffer;

  const handleDecline = () => {
    setShareRescueOffer(null);
    setGameState('gameOver');
  };

  const handleShare = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/share-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          username,
          rank: 999,
          period: 'global',
          screenshot,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Share request failed');
      }

      const timestamp = typeof data.lastShareAt === 'number' ? data.lastShareAt : Date.now();
      shareService.recordShareSuccess(username, timestamp);
      setShareStatus({
        sharedToday: true,
        shareCountToday: shareStatus.shareCountToday + 1,
        totalShares: shareStatus.totalShares + 1,
        lastShareAt: timestamp,
      });

      setShareRescueOffer(null);

      const mainScene = window.game?.scene.getScene('MainScene') as unknown as {
        continueAfterShareRescue?: () => void;
      } | undefined;

      if (mainScene && typeof mainScene.continueAfterShareRescue === 'function') {
        mainScene.continueAfterShareRescue();
      } else {
        setGameState('playing');
      }
    } catch (err) {
      console.error('Failed to share challenge:', err);
      setError(err instanceof Error ? err.message : 'Failed to share challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md">
        <div className="relative rounded-2xl">
          <div
            className="relative rounded-2xl shadow-2xl"
            style={{
              backdropFilter: 'blur(12px) saturate(125%)',
              WebkitBackdropFilter: 'blur(12px) saturate(125%)',
              backgroundColor: 'rgba(17, 25, 40, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div className="space-y-6" style={{ padding: '2rem 2.5rem' }}>
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold text-white">
                  Continue Your Run?
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  Share this clutch moment with your community to keep playing with a set of bite-sized lifeline pieces.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                    Current Score
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {score.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
                    Best Score
                  </div>
                  <div className="text-xl font-semibold text-cyan-400">
                    {highScore.toLocaleString()}
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-center text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleShare}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                    loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  {loading ? 'Sharing…' : 'Share & Continue'}
                </button>

                <button
                  onClick={handleDecline}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 text-white/70 font-semibold text-sm tracking-wide border border-white/10 transition-all duration-200 hover:bg-white/15"
                >
                  I’ll End Here
                </button>
              </div>

              <div className="text-xs text-white/40 text-center">
                One bonus rescue per day. Already shared today? You’re all set.
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -top-6 -left-10 w-20 h-20 bg-orange-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -right-12 w-24 h-24 bg-pink-500/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
};
