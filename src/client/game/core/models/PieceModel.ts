import { HexCoordinates, hexAdd } from '../../../../shared/types/hex';

/**
 * Represents a piece shape as a collection of hexagon positions
 */
export interface PieceShape {
  id: string;
  name: string;
  cells: HexCoordinates[]; // Relative positions from piece center
  color: string;
  category: 'single' | 'small' | 'medium' | 'large' | 'lineClear';
}

/**
 * Model class for game pieces.
 * Handles piece rotation, validation, and positioning.
 */
export class PieceModel {
  private id: string;
  private shape: PieceShape;
  private currentRotation: number = 0; // 0, 60, 120, 180, 240, 300 degrees
  private position: HexCoordinates | null = null;

  constructor(shape: PieceShape) {
    this.id = `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.shape = { ...shape };
  }

  /**
   * Get piece ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get piece shape
   */
  getShape(): PieceShape {
    return this.shape;
  }

  /**
   * Get piece color
   */
  getColor(): string {
    return this.shape.color;
  }

  /**
   * Get piece category
   */
  getCategory(): string {
    return this.shape.category;
  }

  /**
   * Get current rotation in degrees
   */
  getRotation(): number {
    return this.currentRotation;
  }

  /**
   * Get piece position (if placed)
   */
  getPosition(): HexCoordinates | null {
    return this.position;
  }

  /**
   * Set piece position
   */
  setPosition(position: HexCoordinates | null): void {
    this.position = position;
  }

  /**
   * Rotate piece by 60 degrees clockwise
   */
  rotateClockwise(): void {
    this.currentRotation = (this.currentRotation + 60) % 360;
    this.shape.cells = this.shape.cells.map(cell => this.rotateHex(cell, 60));
  }

  /**
   * Rotate piece by 60 degrees counter-clockwise
   */
  rotateCounterClockwise(): void {
    this.currentRotation = (this.currentRotation - 60 + 360) % 360;
    this.shape.cells = this.shape.cells.map(cell => this.rotateHex(cell, -60));
  }

  /**
   * Rotate a hex coordinate by given degrees
   */
  private rotateHex(hex: HexCoordinates, degrees: number): HexCoordinates {
    // Convert to cube coordinates
    const x = hex.q;
    const z = hex.r;
    const y = -x - z;

    // Rotation matrices for hex grid (60-degree increments)
    let rotated: { q: number; r: number };

    const rotations = Math.round(degrees / 60) % 6;
    const absRotations = Math.abs(rotations);

    if (rotations >= 0) {
      // Clockwise rotations
      switch (absRotations) {
        case 0:
          rotated = { q: x, r: z };
          break;
        case 1: // 60° CW
          rotated = { q: -z, r: -y };
          break;
        case 2: // 120° CW
          rotated = { q: y, r: -x };
          break;
        case 3: // 180°
          rotated = { q: -x, r: -z };
          break;
        case 4: // 240° CW
          rotated = { q: z, r: y };
          break;
        case 5: // 300° CW
          rotated = { q: -y, r: x };
          break;
        default:
          rotated = { q: x, r: z };
      }
    } else {
      // Counter-clockwise rotations
      switch (absRotations) {
        case 1: // 60° CCW
          rotated = { q: -y, r: x };
          break;
        case 2: // 120° CCW
          rotated = { q: z, r: y };
          break;
        case 3: // 180°
          rotated = { q: -x, r: -z };
          break;
        case 4: // 240° CCW
          rotated = { q: y, r: -x };
          break;
        case 5: // 300° CCW
          rotated = { q: -z, r: -y };
          break;
        default:
          rotated = { q: x, r: z };
      }
    }

    return rotated;
  }

  /**
   * Get absolute positions of piece cells in world coordinates
   */
  getWorldPositions(centerPosition: HexCoordinates): HexCoordinates[] {
    return this.shape.cells.map(cell => hexAdd(centerPosition, cell));
  }

  /**
   * Get the bounding box of the piece
   */
  getBounds(): { minQ: number; maxQ: number; minR: number; maxR: number } {
    if (this.shape.cells.length === 0) {
      return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };
    }

    let minQ = this.shape.cells[0].q;
    let maxQ = this.shape.cells[0].q;
    let minR = this.shape.cells[0].r;
    let maxR = this.shape.cells[0].r;

    for (const cell of this.shape.cells) {
      minQ = Math.min(minQ, cell.q);
      maxQ = Math.max(maxQ, cell.q);
      minR = Math.min(minR, cell.r);
      maxR = Math.max(maxR, cell.r);
    }

    return { minQ, maxQ, minR, maxR };
  }

  /**
   * Get the size (number of cells) of the piece
   */
  getSize(): number {
    return this.shape.cells.length;
  }

  /**
   * Clone the piece
   */
  clone(): PieceModel {
    const clonedShape: PieceShape = {
      ...this.shape,
      cells: this.shape.cells.map(cell => ({ ...cell }))
    };

    const cloned = new PieceModel(clonedShape);
    cloned.currentRotation = this.currentRotation;
    cloned.position = this.position ? { ...this.position } : null;
    cloned.id = this.id; // Keep same ID for clones

    return cloned;
  }

  /**
   * Check if this piece is equivalent to another (same shape, ignoring rotation)
   */
  isEquivalent(other: PieceModel): boolean {
    if (this.shape.cells.length !== other.shape.cells.length) {
      return false;
    }

    // Try all rotations to see if shapes match
    for (let rotation = 0; rotation < 360; rotation += 60) {
      const rotatedOther = other.clone();

      // Rotate to target rotation
      while (rotatedOther.getRotation() !== rotation) {
        rotatedOther.rotateClockwise();
      }

      // Check if all cells match
      const match = this.shape.cells.every(cell1 =>
        rotatedOther.shape.cells.some(cell2 =>
          cell1.q === cell2.q && cell1.r === cell2.r
        )
      );

      if (match) {
        return true;
      }
    }

    return false;
  }

  /**
   * Reset piece to initial state
   */
  reset(): void {
    this.position = null;

    // Rotate back to 0
    while (this.currentRotation !== 0) {
      this.rotateCounterClockwise();
    }
  }
}