import { PieceModel } from '../models/PieceModel';
import { GridModel } from '../models/GridModel';
import { HexCoordinates } from '../../../../shared/types/hex';

/**
 * PlacementValidator - Validates piece placement on the board
 * Handles placement logic and collision detection
 */
export class PlacementValidator {
  /**
   * Check if a piece can be placed at the given position
   */
  canPlacePiece(
    piece: PieceModel,
    anchorPosition: HexCoordinates,
    grid: GridModel
  ): boolean {
    const placementCells = this.getPlacementCells(piece, anchorPosition);

    // Check each cell
    for (const cell of placementCells) {
      // Check if cell is within grid bounds
      if (!grid.isValidCell(cell)) {
        return false;
      }

      // Check if cell is already occupied
      if (grid.isCellOccupied(cell)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the cells that would be occupied by placing a piece
   */
  getPlacementCells(
    piece: PieceModel,
    anchorPosition: HexCoordinates
  ): HexCoordinates[] {
    // The anchor is typically the center or first cell of the piece
    // We need to translate all piece cells relative to the anchor

    // Find the piece center (or use first cell as reference)
    const referenceCell = this.getPieceReferencePoint(piece);

    // Calculate offset from reference to anchor
    const offsetQ = anchorPosition.q - referenceCell.q;
    const offsetR = anchorPosition.r - referenceCell.r;

    // Apply offset to all piece cells
    const shape = piece.getShape();
    return shape.cells.map(cell => ({
      q: cell.q + offsetQ,
      r: cell.r + offsetR
    }));
  }

  /**
   * Get the reference point for a piece (center or first cell)
   */
  private getPieceReferencePoint(piece: PieceModel): HexCoordinates {
    // For better UX, use the visual center of the piece
    // Calculate the centroid of all cells
    const shape = piece.getShape();

    if (shape.cells.length === 0) {
      return { q: 0, r: 0 };
    }

    if (shape.cells.length === 1) {
      return shape.cells[0];
    }

    // Calculate average position (centroid)
    let sumQ = 0;
    let sumR = 0;

    shape.cells.forEach(cell => {
      sumQ += cell.q;
      sumR += cell.r;
    });

    // For hex grids, we need to round to nearest hex
    const avgQ = sumQ / shape.cells.length;
    const avgR = sumR / shape.cells.length;

    // Find the piece cell closest to the centroid
    let closestCell = shape.cells[0];
    let minDistance = Infinity;

    shape.cells.forEach(cell => {
      const distance = Math.abs(cell.q - avgQ) + Math.abs(cell.r - avgR);
      if (distance < minDistance) {
        minDistance = distance;
        closestCell = cell;
      }
    });

    return closestCell;
  }

  /**
   * Find all valid placements for a piece on the grid
   */
  findValidPlacements(piece: PieceModel, grid: GridModel): HexCoordinates[] {
    const validPlacements: HexCoordinates[] = [];
    const cells = grid.getAllCells();

    // Check each cell as a potential anchor
    cells.forEach(cell => {
      if (this.canPlacePiece(piece, cell.coordinates, grid)) {
        validPlacements.push(cell.coordinates);
      }
    });

    return validPlacements;
  }

  /**
   * Check if any of the given pieces can be placed on the grid
   */
  canPlaceAnyPiece(pieces: PieceModel[], grid: GridModel): boolean {
    for (const piece of pieces) {
      const validPlacements = this.findValidPlacements(piece, grid);
      if (validPlacements.length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get placement score (for AI or hints)
   */
  getPlacementScore(
    piece: PieceModel,
    position: HexCoordinates,
    grid: GridModel
  ): number {
    if (!this.canPlacePiece(piece, position, grid)) {
      return -1;
    }

    let score = 0;
    const placement = this.getPlacementCells(piece, position);

    // Basic score for piece size
    score += placement.length * 10;

    // Check potential line completions
    const tempGrid = grid.clone();
    placement.forEach(cell => {
      tempGrid.setCellOccupied(cell, true, 'temp');
    });

    const lines = tempGrid.detectCompleteLines();
    score += lines.length * 100;

    // Bonus for multiple lines
    if (lines.length > 1) {
      score += lines.length * 50;
    }

    // Penalty for creating isolated cells
    const isolatedCells = this.countIsolatedCells(tempGrid);
    score -= isolatedCells * 20;

    return score;
  }

  /**
   * Count isolated empty cells (harder to fill)
   */
  private countIsolatedCells(grid: GridModel): number {
    let isolated = 0;
    const cells = grid.getAllCells();

    cells.forEach(cell => {
      if (!cell.isOccupied) {
        const neighbors = grid.getNeighbors(cell.coordinates);
        const occupiedNeighbors = neighbors.filter(n => grid.isCellOccupied(n)).length;

        // Cell is isolated if most neighbors are occupied
        if (occupiedNeighbors >= 5) {
          isolated++;
        }
      }
    });

    return isolated;
  }
}
