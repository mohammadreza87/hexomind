import { PieceModel } from '../models/PieceModel';
import { GridModel } from '../models/GridModel';
import { HexCoordinates } from '../../../../shared/types/hex';

/**
 * Validates that a set of pieces can be placed on the grid.
 * This is critical for ensuring the game is always solvable.
 */
export class PuzzleValidator {
  // All possible orderings for 3 pieces
  private static readonly PIECE_ORDERS = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0]
  ];

  /**
   * Check if a set of pieces has at least one valid solution
   */
  hasSolution(pieces: PieceModel[], grid: GridModel): boolean {
    if (pieces.length === 0) return true;
    if (pieces.length === 1) {
      return this.canPlaceSinglePiece(pieces[0], grid);
    }

    // For multiple pieces, try different orderings
    const maxOrdersToCheck = pieces.length <= 3 ? 6 : 24; // Limit for performance
    let ordersChecked = 0;

    for (const order of this.generateOrders(pieces.length)) {
      if (ordersChecked >= maxOrdersToCheck) break;
      ordersChecked++;

      if (this.canPlaceInOrder(pieces, grid, order)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if pieces can be placed in a specific order
   */
  private canPlaceInOrder(pieces: PieceModel[], grid: GridModel, order: number[]): boolean {
    // Clone the grid to simulate placement
    const simulatedGrid = grid.clone();

    for (const index of order) {
      const piece = pieces[index];
      const placement = this.findValidPlacement(piece, simulatedGrid);

      if (!placement) {
        return false; // Cannot place this piece
      }

      // Place the piece on simulated grid
      const worldPositions = piece.getWorldPositions(placement);
      simulatedGrid.placeCells(worldPositions, piece.getId());

      // Simulate line clearing
      const lines = simulatedGrid.detectCompleteLines();
      if (lines.length > 0) {
        simulatedGrid.clearLines(lines);
      }
    }

    return true;
  }

  /**
   * Find a valid placement for a single piece
   */
  private findValidPlacement(piece: PieceModel, grid: GridModel): HexCoordinates | null {
    const emptyCells = grid.getEmptyCells();

    // Try placing piece at each empty cell
    for (const emptyCell of emptyCells) {
      const worldPositions = piece.getWorldPositions(emptyCell);

      if (grid.canPlaceCells(worldPositions)) {
        return emptyCell;
      }
    }

    // Try with rotations
    for (let rotation = 0; rotation < 6; rotation++) {
      piece.rotateClockwise();

      for (const emptyCell of emptyCells) {
        const worldPositions = piece.getWorldPositions(emptyCell);

        if (grid.canPlaceCells(worldPositions)) {
          // Reset rotation before returning
          while (piece.getRotation() !== 0) {
            piece.rotateClockwise();
          }
          return emptyCell;
        }
      }
    }

    // Reset rotation
    while (piece.getRotation() !== 0) {
      piece.rotateClockwise();
    }

    return null;
  }

  /**
   * Check if a single piece can be placed anywhere
   */
  private canPlaceSinglePiece(piece: PieceModel, grid: GridModel): boolean {
    return this.findValidPlacement(piece, grid) !== null;
  }

  /**
   * Generate permutations for piece ordering
   */
  private *generateOrders(length: number): Generator<number[]> {
    if (length <= 3) {
      // Use predefined orders for better performance
      for (const order of PuzzleValidator.PIECE_ORDERS) {
        if (order.every(i => i < length)) {
          yield order.slice(0, length);
        }
      }
    } else {
      // Generate permutations for larger sets
      const indices = Array.from({ length }, (_, i) => i);
      yield* this.permute(indices);
    }
  }

  /**
   * Generate all permutations of an array
   */
  private *permute(arr: number[]): Generator<number[]> {
    if (arr.length <= 1) {
      yield arr;
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of this.permute(rest)) {
        yield [arr[i], ...perm];
      }
    }
  }

  /**
   * Advanced validation: Check if placement leads to unsolvable state
   */
  validatePlacement(
    piece: PieceModel,
    position: HexCoordinates,
    grid: GridModel,
    remainingPieces: PieceModel[]
  ): boolean {
    // Clone grid and place the piece
    const simulatedGrid = grid.clone();
    const worldPositions = piece.getWorldPositions(position);

    if (!simulatedGrid.placeCells(worldPositions, piece.getId())) {
      return false;
    }

    // Simulate line clearing
    const lines = simulatedGrid.detectCompleteLines();
    if (lines.length > 0) {
      simulatedGrid.clearLines(lines);
    }

    // Check if remaining pieces can still be placed
    if (remainingPieces.length > 0) {
      return this.hasSolution(remainingPieces, simulatedGrid);
    }

    return true;
  }

  /**
   * Find all valid placements for a piece
   */
  findAllValidPlacements(piece: PieceModel, grid: GridModel): HexCoordinates[] {
    const validPlacements: HexCoordinates[] = [];
    const emptyCells = grid.getEmptyCells();

    // Check all rotations
    for (let rotation = 0; rotation < 6; rotation++) {
      for (const emptyCell of emptyCells) {
        const worldPositions = piece.getWorldPositions(emptyCell);

        if (grid.canPlaceCells(worldPositions)) {
          validPlacements.push(emptyCell);
        }
      }

      piece.rotateClockwise();
    }

    // Reset rotation
    while (piece.getRotation() !== 0) {
      piece.rotateClockwise();
    }

    return validPlacements;
  }

  /**
   * Calculate difficulty score for a piece set
   */
  calculateDifficulty(pieces: PieceModel[], grid: GridModel): number {
    let totalPlacements = 0;
    let minPlacements = Infinity;

    for (const piece of pieces) {
      const placements = this.findAllValidPlacements(piece, grid).length;
      totalPlacements += placements;
      minPlacements = Math.min(minPlacements, placements);
    }

    // Lower scores = higher difficulty
    // Consider both total options and the piece with fewest options
    const avgPlacements = totalPlacements / pieces.length;
    const difficulty = 100 - (avgPlacements * 2 + minPlacements * 3);

    return Math.max(0, Math.min(100, difficulty));
  }

  /**
   * Check if the current grid state is in a "dead" position
   * (no pieces can be placed)
   */
  isDeadPosition(grid: GridModel, availablePieces: PieceModel[]): boolean {
    for (const piece of availablePieces) {
      if (this.canPlaceSinglePiece(piece, grid)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Suggest best placement for a piece (for hints/tutorial)
   */
  suggestBestPlacement(
    piece: PieceModel,
    grid: GridModel,
    remainingPieces: PieceModel[]
  ): { position: HexCoordinates; rotation: number } | null {
    let bestPlacement: { position: HexCoordinates; rotation: number } | null = null;
    let bestScore = -Infinity;

    for (let rotation = 0; rotation < 6; rotation++) {
      const placements = this.findAllValidPlacements(piece, grid);

      for (const position of placements) {
        // Score based on:
        // 1. Lines that would be completed
        // 2. Future placement options for remaining pieces
        const score = this.scorePlacement(piece, position, grid, remainingPieces);

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = { position, rotation: piece.getRotation() };
        }
      }

      piece.rotateClockwise();
    }

    // Reset rotation
    while (piece.getRotation() !== 0) {
      piece.rotateClockwise();
    }

    return bestPlacement;
  }

  /**
   * Score a potential placement
   */
  private scorePlacement(
    piece: PieceModel,
    position: HexCoordinates,
    grid: GridModel,
    remainingPieces: PieceModel[]
  ): number {
    const simulatedGrid = grid.clone();
    const worldPositions = piece.getWorldPositions(position);

    if (!simulatedGrid.placeCells(worldPositions, piece.getId())) {
      return -Infinity;
    }

    let score = 0;

    // Check for line completions
    const lines = simulatedGrid.detectCompleteLines();
    score += lines.length * 100;
    score += lines.reduce((sum, line) => sum + line.cells.length, 0) * 10;

    // Clear lines in simulation
    if (lines.length > 0) {
      simulatedGrid.clearLines(lines);
    }

    // Check if remaining pieces can be placed
    if (remainingPieces.length > 0) {
      if (!this.hasSolution(remainingPieces, simulatedGrid)) {
        return -Infinity; // This placement makes the game unsolvable
      }

      // Count placement options for remaining pieces
      for (const nextPiece of remainingPieces) {
        const options = this.findAllValidPlacements(nextPiece, simulatedGrid).length;
        score += options * 5;
      }
    }

    // Prefer placements that keep the board balanced
    const fullness = simulatedGrid.getFullnessPercentage();
    if (fullness < 0.5) {
      score += (0.5 - Math.abs(0.3 - fullness)) * 50;
    }

    return score;
  }
}