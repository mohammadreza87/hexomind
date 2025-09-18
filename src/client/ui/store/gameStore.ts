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

  // Actions
  setGameState: (state) => set({ gameState: state }),
  setScore: (score) => set((state) => ({
    score,
    highScore: Math.max(score, state.highScore),
  })),
  setHighScore: (highScore) => set({ highScore }),
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
}));
