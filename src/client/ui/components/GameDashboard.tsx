import React from 'react';
import { BentoGrid } from './BentoGrid';
import { AnimatedScoreDisplay } from './AnimatedScoreDisplay';
import { useGameStore } from '../store/gameStore';
import { useTheme } from '../providers/ThemeProvider';
import { gsap } from 'gsap';

export const GameDashboard: React.FC = () => {
  const { score, highScore, level, moves, combo } = useGameStore();
  const { tokens } = useTheme();

  // Create bento grid items for game stats
  const dashboardItems = [
    {
      id: 'main-score',
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div className="p-6 h-full flex items-center justify-center">
          <AnimatedScoreDisplay score={score} highScore={highScore} />
        </div>
      ),
      className: 'bg-gradient-to-br from-neon-purple/20 to-neon-pink/20',
    },
    {
      id: 'level',
      content: (
        <div className="p-4">
          <div className="text-white/60 text-sm mb-1">LEVEL</div>
          <div className="text-3xl font-bold text-gradient from-neon-cyan to-neon-blue">
            {level}
          </div>
        </div>
      ),
    },
    {
      id: 'moves',
      content: (
        <div className="p-4">
          <div className="text-white/60 text-sm mb-1">MOVES</div>
          <div className="text-3xl font-bold text-gradient from-neon-green to-neon-cyan">
            {moves}
          </div>
        </div>
      ),
    },
    {
      id: 'stats',
      colSpan: 2,
      content: (
        <div className="p-4">
          <div className="text-white/60 text-sm mb-3">STATISTICS</div>
          <div className="grid grid-cols-3 gap-4">
            <StatItem label="Avg Score" value="850" />
            <StatItem label="Best Combo" value={`${combo}x`} />
            <StatItem label="Play Time" value="15m" />
          </div>
        </div>
      ),
      className: 'bg-gradient-to-br from-neon-blue/10 to-neon-cyan/10',
    },
    {
      id: 'achievements',
      colSpan: 2,
      content: (
        <div className="p-4">
          <div className="text-white/60 text-sm mb-3">RECENT ACHIEVEMENTS</div>
          <div className="flex gap-4">
            <AchievementBadge icon="🏆" title="First Win" />
            <AchievementBadge icon="🔥" title="Combo Master" />
            <AchievementBadge icon="⚡" title="Speed Demon" />
          </div>
        </div>
      ),
      className: 'bg-gradient-to-br from-neon-yellow/10 to-neon-orange/10',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <BentoGrid
        items={dashboardItems}
        columns={{ default: 2, md: 4, lg: 4 }}
        gap={16}
      />
    </div>
  );
};

// Helper components
const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-center">
    <div className="text-xs text-white/50">{label}</div>
    <div className="text-lg font-semibold text-white">{value}</div>
  </div>
);

const AchievementBadge: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <div className="flex flex-col items-center gap-1 group cursor-pointer">
    <div className="text-3xl group-hover:scale-110 transition-transform">{icon}</div>
    <div className="text-xs text-white/60 group-hover:text-white/80">{title}</div>
  </div>
);