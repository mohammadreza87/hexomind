import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { highScoreService } from '../../services/HighScoreService';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';

export const SettingsPanel: React.FC = () => {
  const { toggleSettings, setShowLeaderboard } = useUIStore();
  const { resetGame } = useGameStore();
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Load saved username
    const savedUsername = localStorage.getItem('hexomind_username') || '';
    setUsername(savedUsername);

    // Animate panel entrance
    gsap.fromTo(
      '.settings-panel',
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
      '.settings-content > *',
      {
        opacity: 0,
        x: -20,
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.05,
        delay: 0.2,
        ease: 'power2.out',
      }
    );
  }, []);

  const handleClose = (afterClose?: () => void) => {
    // Animate out before closing
    gsap.to('.settings-panel', {
      scale: 0.9,
      opacity: 0,
      y: -30,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        toggleSettings();
        afterClose?.();
      },
    });
  };

  const handleSaveUsername = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      return;
    }

    try {
      await highScoreService.setCustomUsername(trimmedUsername, { offlineOnly: true });
      setUsername(trimmedUsername);
    } catch (error) {
      console.error('Failed to save username locally:', error);
      localStorage.setItem('hexomind_custom_username', JSON.stringify({
        username: trimmedUsername,
        timestamp: Date.now()
      }));
      localStorage.setItem('hexomind_username', trimmedUsername);
    }

    // Show save animation
    const indicator = document.querySelector('.save-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      gsap.fromTo('.save-indicator',
        { scale: 0, opacity: 0 },
        {
          scale: 1.2,
          opacity: 1,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            indicator.classList.add('hidden');
          }
        }
      );
    }
  };

  const handleShowLeaderboard = () => {
    handleClose(() => {
      setShowLeaderboard(true);
    });
  };

  const handleReplay = () => {
    // Reset game in Phaser
    if (window.game) {
      const scene = window.game.scene.getScene('MainScene');
      if (scene && typeof scene.startNewGame === 'function') {
        scene.startNewGame();
      }
    }

    // Reset game state
    resetGame();

    // Close settings
    handleClose();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all game data? This cannot be undone.')) {
      // Clear all local storage
      localStorage.removeItem('hexomind_gamestate');
      localStorage.removeItem('hexomind_highscore');
      localStorage.removeItem('hexomind_custom_username');
      localStorage.removeItem('hexomind_username');

      // Reset game in Phaser
      if (window.game) {
        const scene = window.game.scene.getScene('MainScene');
        if (scene && typeof scene.startNewGame === 'function') {
          scene.startNewGame();
        }
      }

      // Reset UI stores
      if (window.gameStore) {
        window.gameStore.getState().resetGame();
      }

      // Close settings panel
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel with stronger glassmorphism */}
      <div className="settings-panel relative w-full max-w-xs">
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

            {/* Content with normal padding */}
            <div className="settings-content" style={{padding: '2rem 2.5rem'}}>

              {/* Title */}
              <div className="text-center" style={{marginBottom: '2rem'}}>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  SETTINGS
                </h1>
              </div>

              {/* Username Input Section */}
              <div style={{marginBottom: '2rem'}}>
                <label className="text-white/80 text-xs font-semibold uppercase tracking-wider block" style={{marginBottom: '0.75rem'}}>Username</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={20}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none  text-sm text-center"
                  />
                  <button
                    onClick={handleSaveUsername}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm  text-purple-400 font-bold text-sm hover:bg-purple-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Save Username
                  </button>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {/* Leaderboard Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleShowLeaderboard}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm  text-cyan-400 font-bold text-sm hover:bg-cyan-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>🏆</span>
                      LEADERBOARD
                    </span>
                  </button>
                </div>

                {/* Replay Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleReplay}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm  text-purple-400 font-bold text-sm hover:bg-purple-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>🔄</span>
                      NEW GAME
                    </span>
                  </button>
                </div>

                {/* Reset Data Button */}
                <div className="flex justify-center" style={{marginTop: '1.5rem'}}>
                  <button
                    onClick={handleReset}
                    style={{padding: '0.75rem 1.5rem'}}
                    className="w-full rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm  text-red-400 font-bold text-sm hover:bg-red-500/30 transform transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>🗑️</span>
                      RESET DATA
                    </span>
                  </button>
                </div>
              </div>

              {/* Save Indicator */}
              <div className="save-indicator hidden absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  ✓ Username Saved!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-purple-500/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-cyan-500/20 rounded-full blur-2xl" />
      </div>
    </div>
  );
};
