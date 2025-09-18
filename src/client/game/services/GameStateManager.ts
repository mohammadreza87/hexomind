import { logger } from '../../utils/logger';
import { HexCoordinates } from '../../shared/types/grid';
import { PieceColor, PieceType } from '../../shared/types/piece';

interface SavedCell {
  q: number;
  r: number;
  color: PieceColor;
}

interface SavedPiece {
  type: PieceType;
  color: PieceColor;
  used: boolean;
}

interface GameSaveData {
  version: number;
  timestamp: number;
  grid: SavedCell[];
  pieces: SavedPiece[];
  score: number;
  highScore: number;
  moveCount: number;
}

/**
 * Manages game state persistence
 */
export class GameStateManager {
  private static readonly SAVE_KEY = 'hexomind_game_state';
  private static readonly CURRENT_VERSION = 1;

  /**
   * Save current game state
   */
  static saveGameState(
    grid: Map<string, PieceColor>,
    pieces: Array<{ type: PieceType; color: PieceColor; used: boolean }>,
    score: number,
    highScore: number,
    moveCount: number
  ): void {
    try {
      // Convert grid Map to array of cells
      const gridArray: SavedCell[] = [];
      grid.forEach((color, key) => {
        const [q, r] = key.split(',').map(Number);
        gridArray.push({ q, r, color });
      });

      const saveData: GameSaveData = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        grid: gridArray,
        pieces: pieces,
        score,
        highScore,
        moveCount
      };

      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
      logger.debug('Game state saved successfully');
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  /**
   * Load saved game state
   */
  static loadGameState(): GameSaveData | null {
    try {
      const saved = localStorage.getItem(this.SAVE_KEY);
      if (!saved) return null;

      const data = JSON.parse(saved) as GameSaveData;

      // Check version compatibility
      if (data.version !== this.CURRENT_VERSION) {
        logger.warn('Save version mismatch, clearing old save');
        this.clearGameState();
        return null;
      }

      // Check if save is too old (more than 30 days)
      const daysSinceSave = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceSave > 30) {
        logger.debug('Save is too old, clearing');
        this.clearGameState();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load game state:', error);
      this.clearGameState();
      return null;
    }
  }

  /**
   * Clear saved game state
   */
  static clearGameState(): void {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      logger.debug('Game state cleared');
    } catch (error) {
      console.error('Failed to clear game state:', error);
    }
  }

  /**
   * Check if there's a saved game
   */
  static hasSavedGame(): boolean {
    try {
      const saved = localStorage.getItem(this.SAVE_KEY);
      if (!saved) return false;

      const data = JSON.parse(saved) as GameSaveData;
      return data.version === this.CURRENT_VERSION && data.grid.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Convert saved grid array back to Map
   */
  static gridArrayToMap(gridArray: SavedCell[]): Map<string, PieceColor> {
    const map = new Map<string, PieceColor>();
    gridArray.forEach(cell => {
      map.set(`${cell.q},${cell.r}`, cell.color);
    });
    return map;
  }
}
