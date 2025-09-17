import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';

type LeaderboardType = 'global' | 'daily' | 'weekly';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  isCurrentUser?: boolean;
}

export const LeaderboardPanel: React.FC = () => {
  const { toggleLeaderboard } = useUIStore();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');

  // Mock data - will be connected to actual API
  const mockData: LeaderboardEntry[] = [
    { rank: 1, username: 'Player1', score: 10000 },
    { rank: 2, username: 'Player2', score: 8500 },
    { rank: 3, username: 'You', score: 7200, isCurrentUser: true },
    { rank: 4, username: 'Player4', score: 6800 },
    { rank: 5, username: 'Player5', score: 5400 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={toggleLeaderboard}
      />

      {/* Leaderboard Panel */}
      <div className="relative glass-dark rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden animate-float">
        <h2 className="text-3xl font-bold text-center mb-6 text-gradient from-neon-yellow to-neon-orange">
          🏆 Leaderboard
        </h2>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          {(['global', 'daily', 'weekly'] as LeaderboardType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === type
                  ? 'bg-gradient-to-r from-neon-purple to-neon-blue text-white'
                  : 'glass-effect text-white/70 hover:bg-white/10'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        <div className="space-y-2 overflow-y-auto max-h-[400px]">
          {mockData.map((entry) => (
            <div
              key={entry.rank}
              className={`glass-effect rounded-xl p-4 flex items-center justify-between ${
                entry.isCurrentUser ? 'ring-2 ring-neon-yellow' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-bold ${
                  entry.rank <= 3 ? 'text-gradient from-neon-yellow to-neon-orange' : 'text-white/60'
                }`}>
                  #{entry.rank}
                </div>
                <div className="text-white font-semibold">
                  {entry.username}
                  {entry.isCurrentUser && <span className="ml-2 text-neon-yellow">(You)</span>}
                </div>
              </div>
              <div className="text-xl font-bold text-gradient from-neon-cyan to-neon-green">
                {entry.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={toggleLeaderboard}
          className="absolute top-4 right-4 glass-effect rounded-full p-2 hover:bg-white/20 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};