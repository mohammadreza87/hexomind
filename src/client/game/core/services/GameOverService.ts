import { GridModel } from '../models/GridModel';
import { PieceModel } from '../models/PieceModel';
import { HexCoordinates, hexToKey } from '../../../../shared/types/hex';
import { PlacementValidator } from './PlacementValidator';

/**
 * GameOverService
 *
 * Block-Blast style move detection:
 * - For each remaining tray piece, try anchoring on every grid cell.
 * - A move exists if any anchor yields a placement where all cells are valid and empty.
 * - Returns early on first success. Otherwise, provides debug info.
 */
export class GameOverService {
  private validator: PlacementValidator;

  constructor(validator?: PlacementValidator) {
    this.validator = validator ?? new PlacementValidator();
  }

  /**
   * Find first legal move using the SAME anchoring logic as actual placement
   * (PlacementValidator.getPlacementCells with reference point). This ensures
   * we never report a move that the player cannot actually perform.
   */
  findAnyPlayerPlaceableMove(pieces: PieceModel[], grid: GridModel): { piece: PieceModel; anchor: HexCoordinates } | null {
    const cells = grid.getAllCells();
    for (const piece of pieces) {
      for (const cell of cells) {
        if (this.validator.canPlacePiece(piece, cell.coordinates, grid)) {
          return { piece, anchor: cell.coordinates };
        }
      }
    }
    return null;
  }

  /**
   * Legacy/alt: Empty-cell anchoring footprint test (rotationless).
   * Kept for diagnostics; not used for authoritative checks to avoid
   * over-reporting unreachable moves due to different anchoring.
   */
  findAnyMove(pieces: PieceModel[], grid: GridModel): { piece: PieceModel; anchor: HexCoordinates } | null {
    const empties = grid.getEmptyCells();

    for (const piece of pieces) {
      const shapeCells = piece.getShape().cells;
      if (shapeCells.length === 0) continue;

      // Try mapping each piece cell to each empty cell
      for (const empty of empties) {
        for (const pc of shapeCells) {
          const offsetQ = empty.q - pc.q;
          const offsetR = empty.r - pc.r;

          // Check the full footprint using this offset
          let fits = true;
          for (const sc of shapeCells) {
            const world: HexCoordinates = { q: sc.q + offsetQ, r: sc.r + offsetR };
            if (!grid.isValidCell(world) || grid.isCellOccupied(world)) {
              fits = false; break;
            }
          }
          if (fits) {
            return { piece, anchor: { q: offsetQ, r: offsetR } };
          }
        }
      }
    }
    return null;
  }

  /**
   * True if no piece has a legal placement anywhere on the board.
   * Uses the same PlacementValidator logic as actual game placement.
   */
  isGameOver(pieces: PieceModel[], grid: GridModel): boolean {
    return this.findAnyPlayerPlaceableMove(pieces, grid) === null;
  }

  /**
   * Compare algorithms and return diagnostic when they disagree.
   */
  diagnose(pieces: PieceModel[], grid: GridModel): { emptyAnchorsMove: boolean; playerAnchorsMove: boolean } {
    const byEmpty = this.findAnyMove(pieces, grid) !== null;
    const byPlayer = this.findAnyPlayerPlaceableMove(pieces, grid) !== null;
    return { emptyAnchorsMove: byEmpty, playerAnchorsMove: byPlayer };
  }

  /**
   * Optional: For diagnostics, return counts of valid anchors per piece.
   */
  getPlacementSummary(pieces: PieceModel[], grid: GridModel): Array<{ id: string; anchors: number }> {
    const result: Array<{ id: string; anchors: number }> = [];
    const cells = grid.getAllCells();
    for (const piece of pieces) {
      let count = 0;
      for (const cell of cells) {
        if (this.validator.canPlacePiece(piece, cell.coordinates, grid)) count++;
      }
      result.push({ id: piece.getId(), anchors: count });
    }
    return result;
  }
}
