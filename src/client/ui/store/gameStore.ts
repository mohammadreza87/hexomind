import { create } from 'zustand';

interface GameStore {
  // Game state
  gameState: 'idle' | 'playing' | 'paused' | 'gameOver' | 'sharePrompt';
  score: number;
  highScore: number;
  combo: number;
  level: number;
  moves: number;
  showNoSpaceToast: boolean;
  lineClearPopup: { lines: number; score: number } | null;
  shareRescueOffer: ShareRescueOffer | null;
  shareStatus: ShareStatus;
  username: string | null;
  lastSharedPostId: string | null;
  lastSharedPostUrl: string | null;

  // Actions
  setGameState: (state: GameStore['gameState']) => void;
  setScore: (score: number) => void;
  setHighScore: (highScore: number) => void;
  setCombo: (combo: number) => void;
  incrementLevel: () => void;
  incrementMoves: () => void;
  resetGame: () => void;
  setShowNoSpaceToast: (show: boolean) => void;
  showLineClearPopup: (lines: number, score: number) => void;
  hideLineClearPopup: () => void;
  setShareRescueOffer: (offer: ShareRescueOffer | null) => void;
  setShareStatus: (status: Partial<ShareStatus>) => void;
  setUsername: (username: string) => void;
  setLastSharedPost: (postId: string | null, postUrl: string | null) => void;
}

export interface ShareStatus {
  sharedToday: boolean;
  shareCountToday: number;
  totalShares: number;
  lastShareAt: number | null;
}

export interface ShareRescueOffer {
  score: number;
  highScore: number;
  screenshot: string | null;
  username: string;
}


export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  gameState: 'idle',
  score: 0,
  highScore: 0,
  combo: 0,
  level: 1,
  moves: 0,
  showNoSpaceToast: false,
  lineClearPopup: null,
  shareRescueOffer: null,
  shareStatus: {
    sharedToday: false,
    shareCountToday: 0,
    totalShares: 0,
    lastShareAt: null,
  },
  username: null,
  lastSharedPostId: null,
  lastSharedPostUrl: null,

  // Actions
  setGameState: (state) => set({ gameState: state }),
  setScore: (score) => set((state) => {
    const nextScore = Number.isFinite(score) ? score : state.score;

    // When the game has ended we only keep the final score in sync.
    if (state.gameState === 'gameOver' || state.gameState === 'sharePrompt') {
      if (state.score === nextScore) {
        return state;
      }
      return { score: nextScore };
    }

    const nextHighScore = Math.max(nextScore, state.highScore);

    // Bail out early when nothing actually changed to prevent unnecessary updates.
    if (state.score === nextScore && state.highScore === nextHighScore) {
      return state;
    }

    // Only update highScore through setScore to avoid double updates
    return {
      score: nextScore,
      highScore: nextHighScore,
    };
  }),
  setHighScore: (highScore) => set((state) => {
    // Prevent redundant updates if highScore is already set
    if (state.highScore === highScore) return state;
    return { highScore };
  }),
  setCombo: (combo) => set({ combo }),
  incrementLevel: () => set((state) => ({ level: state.level + 1 })),
  incrementMoves: () => set((state) => ({ moves: state.moves + 1 })),
  resetGame: () => set({
    gameState: 'idle',
    score: 0,
    combo: 0,
    level: 1,
    moves: 0,
    showNoSpaceToast: false,
    lineClearPopup: null,
    shareRescueOffer: null,
    }),
  setShowNoSpaceToast: (show) => set({ showNoSpaceToast: show }),
  showLineClearPopup: (lines, score) => set({ lineClearPopup: { lines, score } }),
  hideLineClearPopup: () => set({ lineClearPopup: null }),
  setShareRescueOffer: (offer) => set({ shareRescueOffer: offer }),
  setShareStatus: (status) => set((state) => ({
    shareStatus: {
      ...state.shareStatus,
      ...status,
    },
  })),
  setUsername: (username) => set({ username }),
  setLastSharedPost: (postId, postUrl) => set({
    lastSharedPostId: postId,
    lastSharedPostUrl: postUrl
  }),
}));
