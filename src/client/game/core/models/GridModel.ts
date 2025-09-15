import { HexCoordinates, hexToKey, HEX_DIRECTIONS } from '../../../../shared/types/hex';

/**
 * Represents the state of a single cell in the grid
 */
export interface CellState {
  coordinates: HexCoordinates;
  isOccupied: boolean;
  pieceId?: string;
  pieceColorIndex?: number; // Store the color index of the piece
  cellColor?: string;
}

/**
 * Represents a complete line in the grid
 */
export interface Line {
  cells: HexCoordinates[];
  direction: 'horizontal' | 'diagonalNESW' | 'diagonalNWSE';
}

/**
 * Pure model class for the hexagonal grid game logic.
 * No UI dependencies - only game state and rules.
 */
export class GridModel {
  private cells: Map<string, CellState>;
  private radius: number;

  constructor(radius: number = 4) {
    this.radius = radius;
    this.cells = new Map();
    this.initializeGrid();
  }

  /**
   * Initialize empty grid with all cells
   */
  private initializeGrid(): void {
    for (let q = -this.radius; q <= this.radius; q++) {
      const r1 = Math.max(-this.radius, -q - this.radius);
      const r2 = Math.min(this.radius, -q + this.radius);

      for (let r = r1; r <= r2; r++) {
        const coords: HexCoordinates = { q, r };
        const key = hexToKey(coords);

        this.cells.set(key, {
          coordinates: coords,
          isOccupied: false
        });
      }
    }
  }

  /**
   * Get cell state at coordinates
   */
  getCell(coords: HexCoordinates): CellState | undefined {
    return this.cells.get(hexToKey(coords));
  }

  /**
   * Get all cells as an array
   */
  getAllCells(): CellState[] {
    return Array.from(this.cells.values());
  }

  /**
   * Get neighbors (up to 6) for a coordinate within grid bounds
   */
  getNeighbors(coords: HexCoordinates): HexCoordinates[] {
    const neighbors: HexCoordinates[] = [];
    for (const dir of HEX_DIRECTIONS) {
      const n = { q: coords.q + dir.q, r: coords.r + dir.r };
      if (this.isValidCoordinate(n)) {
        neighbors.push(n);
      }
    }
    return neighbors;
  }

  /**
   * Check if coordinates are valid within grid bounds
   */
  isValidCoordinate(coords: HexCoordinates): boolean {
    const s = -coords.q - coords.r;
    return (
      Math.abs(coords.q) <= this.radius &&
      Math.abs(coords.r) <= this.radius &&
      Math.abs(s) <= this.radius
    );
  }

  /**
   * Alias for isValidCoordinate for compatibility
   */
  isValidCell(coords: HexCoordinates): boolean {
    return this.isValidCoordinate(coords);
  }

  /**
   * Check if a cell is occupied
   */
  isCellOccupied(coords: HexCoordinates): boolean {
    const cell = this.getCell(coords);
    return cell ? cell.isOccupied : false;
  }

  /**
   * Set cell occupation status
   */
  setCellOccupied(coords: HexCoordinates, occupied: boolean, pieceId?: string, colorIndex?: number): boolean {
    const cell = this.getCell(coords);
    if (!cell) return false;

    cell.isOccupied = occupied;
    cell.pieceId = occupied ? pieceId : undefined;
    cell.pieceColorIndex = occupied ? colorIndex : undefined;
    return true;
  }

  /**
   * Check if multiple cells can be occupied (for piece placement)
   */
  canPlaceCells(cells: HexCoordinates[]): boolean {
    for (const coord of cells) {
      if (!this.isValidCoordinate(coord) || this.isCellOccupied(coord)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Place multiple cells at once (for piece placement)
   */
  placeCells(cells: HexCoordinates[], pieceId: string): boolean {
    if (!this.canPlaceCells(cells)) {
      return false;
    }

    for (const coord of cells) {
      this.setCellOccupied(coord, true, pieceId);
    }
    return true;
  }

  /**
   * Remove cells by piece ID
   */
  removePiece(pieceId: string): HexCoordinates[] {
    const removed: HexCoordinates[] = [];

    for (const cell of this.cells.values()) {
      if (cell.pieceId === pieceId) {
        cell.isOccupied = false;
        cell.pieceId = undefined;
        removed.push(cell.coordinates);
      }
    }

    return removed;
  }

  /**
   * Detect all complete lines in the grid
   */
  detectCompleteLines(): Line[] {
    const lines: Line[] = [];

    // Check horizontal lines (constant r)
    for (let r = -this.radius; r <= this.radius; r++) {
      const line = this.getHorizontalLine(r);
      if (this.isLineComplete(line)) {
        lines.push({ cells: line, direction: 'horizontal' });
      }
    }

    // Check diagonal lines NE-SW (constant q)
    for (let q = -this.radius; q <= this.radius; q++) {
      const line = this.getDiagonalLineNESW(q);
      if (this.isLineComplete(line)) {
        lines.push({ cells: line, direction: 'diagonalNESW' });
      }
    }

    // Check diagonal lines NW-SE (constant s = -q-r)
    for (let s = -this.radius; s <= this.radius; s++) {
      const line = this.getDiagonalLineNWSE(s);
      if (this.isLineComplete(line)) {
        lines.push({ cells: line, direction: 'diagonalNWSE' });
      }
    }

    return lines;
  }

  /**
   * Get all cells in a horizontal line (constant r)
   */
  private getHorizontalLine(r: number): HexCoordinates[] {
    const line: HexCoordinates[] = [];
    const q1 = Math.max(-this.radius, -r - this.radius);
    const q2 = Math.min(this.radius, -r + this.radius);

    for (let q = q1; q <= q2; q++) {
      line.push({ q, r });
    }
    return line;
  }

  /**
   * Get all cells in a diagonal line NE-SW (constant q)
   */
  private getDiagonalLineNESW(q: number): HexCoordinates[] {
    const line: HexCoordinates[] = [];
    const r1 = Math.max(-this.radius, -q - this.radius);
    const r2 = Math.min(this.radius, -q + this.radius);

    for (let r = r1; r <= r2; r++) {
      line.push({ q, r });
    }
    return line;
  }

  /**
   * Get all cells in a diagonal line NW-SE (constant s)
   */
  private getDiagonalLineNWSE(s: number): HexCoordinates[] {
    const line: HexCoordinates[] = [];
    const q1 = Math.max(-this.radius, -s - this.radius);
    const q2 = Math.min(this.radius, -s + this.radius);

    for (let q = q1; q <= q2; q++) {
      const r = -s - q;
      if (Math.abs(r) <= this.radius) {
        line.push({ q, r });
      }
    }
    return line;
  }

  /**
   * Check if a line is complete (all cells occupied)
   */
  private isLineComplete(line: HexCoordinates[]): boolean {
    if (line.length === 0) return false;

    for (const coords of line) {
      if (!this.isCellOccupied(coords)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a line would be complete with additional cells occupied
   */
  public wouldLineBeComplete(line: HexCoordinates[], additionalCells: HexCoordinates[]): boolean {
    if (line.length === 0) return false;

    // Create a temporary set of additional cells for faster lookup
    const additionalSet = new Set(additionalCells.map(c => hexToKey(c)));

    for (const coords of line) {
      const key = hexToKey(coords);
      // Check if cell is either already occupied or would be occupied by placement
      if (!this.isCellOccupied(coords) && !additionalSet.has(key)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Detect which lines would be completed if certain cells were occupied
   */
  public detectPotentialCompleteLines(additionalCells: HexCoordinates[]): Line[] {
    const completeLines: Line[] = [];

    // Check horizontal lines (constant r)
    for (let r = -this.radius; r <= this.radius; r++) {
      const line = this.getHorizontalLine(r);
      if (this.wouldLineBeComplete(line, additionalCells)) {
        completeLines.push({ cells: line, direction: 'horizontal' });
      }
    }

    // Check diagonal lines NE-SW (constant q)
    for (let q = -this.radius; q <= this.radius; q++) {
      const line = this.getDiagonalLineNESW(q);
      if (this.wouldLineBeComplete(line, additionalCells)) {
        completeLines.push({ cells: line, direction: 'diagonalNESW' });
      }
    }

    // Check diagonal lines NW-SE (constant s = -q - r)
    for (let s = -this.radius; s <= this.radius; s++) {
      const line = this.getDiagonalLineNWSE(s);
      if (this.wouldLineBeComplete(line, additionalCells)) {
        completeLines.push({ cells: line, direction: 'diagonalNWSE' });
      }
    }

    return completeLines;
  }

  /**
   * Clear lines from the grid
   */
  clearLines(lines: Line[]): Set<string> {
    const clearedPieceIds = new Set<string>();

    for (const line of lines) {
      for (const coords of line.cells) {
        const cell = this.getCell(coords);
        if (cell && cell.pieceId) {
          clearedPieceIds.add(cell.pieceId);
        }
        this.setCellOccupied(coords, false);
      }
    }

    return clearedPieceIds;
  }

  /**
   * Get grid fullness as a percentage
   */
  getFullnessPercentage(): number {
    let occupied = 0;
    let total = 0;

    for (const cell of this.cells.values()) {
      total++;
      if (cell.isOccupied) {
        occupied++;
      }
    }

    return total > 0 ? (occupied / total) : 0;
  }

  /**
   * Check if grid is completely full
   */
  isGridFull(): boolean {
    for (const cell of this.cells.values()) {
      if (!cell.isOccupied) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all empty cells
   */
  getEmptyCells(): HexCoordinates[] {
    const empty: HexCoordinates[] = [];
    for (const cell of this.cells.values()) {
      if (!cell.isOccupied) {
        empty.push(cell.coordinates);
      }
    }
    return empty;
  }

  /**
   * Get all occupied cells
   */
  getOccupiedCells(): HexCoordinates[] {
    const occupied: HexCoordinates[] = [];
    for (const cell of this.cells.values()) {
      if (cell.isOccupied) {
        occupied.push(cell.coordinates);
      }
    }
    return occupied;
  }

  /**
   * Clone the current grid state
   */
  clone(): GridModel {
    const cloned = new GridModel(this.radius);

    for (const [key, cell] of this.cells.entries()) {
      cloned.cells.set(key, {
        coordinates: { ...cell.coordinates },
        isOccupied: cell.isOccupied,
        pieceId: cell.pieceId,
        pieceColorIndex: cell.pieceColorIndex,
        cellColor: cell.cellColor
      });
    }

    return cloned;
  }

  /**
   * Reset grid to empty state
   */
  reset(): void {
    for (const cell of this.cells.values()) {
      cell.isOccupied = false;
      cell.pieceId = undefined;
      cell.cellColor = undefined;
    }
  }

  /**
   * Get grid radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Get total cell count
   */
  getCellCount(): number {
    return this.cells.size;
  }

  /**
   * Clear all pieces from the grid
   */
  clear(): void {
    this.cells.forEach((cell) => {
      cell.isOccupied = false;
      cell.pieceId = undefined;
      cell.pieceColorIndex = undefined;
    });
  }
}
