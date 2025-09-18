import { create } from 'zustand';

interface GameStore {
  // Game state
  gameState: 'idle' | 'playing' | 'paused' | 'gameOver';
  score: number;
  highScore: number;
  combo: number;
  level: number;
  moves: number;
  showNoSpaceToast: boolean;
  lineClearPopup: { lines: number; score: number } | null;

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
  }),
  setShowNoSpaceToast: (show) => set({ showNoSpaceToast: show }),
  showLineClearPopup: (lines, score) => set({ lineClearPopup: { lines, score } }),
  hideLineClearPopup: () => set({ lineClearPopup: null }),
}));