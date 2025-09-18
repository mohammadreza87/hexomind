import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';

/**
 * Bridge between Phaser game and React UI
 * Provides methods for Phaser to update React state
 */
export class GameBridge {
  private static instance: GameBridge;

  private constructor() {}

  static getInstance(): GameBridge {
    if (!GameBridge.instance) {
      GameBridge.instance = new GameBridge();
    }
    return GameBridge.instance;
  }

  // Game state updates from Phaser to React
  updateScore(score: number): void {
    useGameStore.getState().setScore(score);
  }

  updateHighScore(highScore: number): void {
    useGameStore.getState().setHighScore(highScore);
  }

  updateCombo(combo: number): void {
    useGameStore.getState().setCombo(combo);
  }

  setGameState(state: 'idle' | 'playing' | 'paused' | 'gameOver' | 'sharePrompt'): void {
    useGameStore.getState().setGameState(state);
  }

  incrementMoves(): void {
    useGameStore.getState().incrementMoves();
  }

  // UI state updates from Phaser
  openMenu(): void {
    useGameStore.getState().setGameState('paused');
    useUIStore.getState().toggleMenu();
  }

  openLeaderboard(): void {
    useUIStore.getState().toggleLeaderboard();
  }

  openSettings(): void {
    useUIStore.getState().toggleSettings();
  }

  // Get current states for Phaser
  getGameState() {
    return useGameStore.getState().gameState;
  }

  getUIState() {
    return {
      showMenu: useUIStore.getState().showMenu,
      soundEnabled: useUIStore.getState().soundEnabled,
      hapticEnabled: useUIStore.getState().hapticEnabled,
      theme: useUIStore.getState().theme,
    };
  }

  // Subscribe to state changes
  subscribeToGameState(callback: (state: any) => void) {
    return useGameStore.subscribe(callback);
  }

  subscribeToUIState(callback: (state: any) => void) {
    return useUIStore.subscribe(callback);
  }
}

export const gameBridge = GameBridge.getInstance();
