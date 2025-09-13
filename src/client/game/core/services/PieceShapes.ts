import { PieceShape } from '../models/PieceModel';
import { HexCoordinates } from '../../../../shared/types/hex';

/**
 * Predefined piece shapes for the game.
 * All coordinates are relative to the piece center (0, 0).
 */
export class PieceShapes {
  // Color palette for pieces
  static readonly COLORS = {
    red: '#FF6B6B',
    blue: '#4ECDC4',
    green: '#95E77E',
    yellow: '#FFE66D',
    purple: '#A78BFA',
    orange: '#FB923C',
    pink: '#F472B6',
    cyan: '#67E8F9'
  };

  // Single hex piece
  static readonly SINGLE: PieceShape = {
    id: 'single',
    name: 'Single',
    cells: [{ q: 0, r: 0 }],
    color: PieceShapes.COLORS.cyan,
    category: 'single'
  };

  // Small pieces (2-3 hexes)
  static readonly DOUBLE_HORIZONTAL: PieceShape = {
    id: 'double_h',
    name: 'Double Horizontal',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 }
    ],
    color: PieceShapes.COLORS.blue,
    category: 'small'
  };

  static readonly DOUBLE_DIAGONAL: PieceShape = {
    id: 'double_d',
    name: 'Double Diagonal',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: -1 }
    ],
    color: PieceShapes.COLORS.green,
    category: 'small'
  };

  static readonly TRIPLE_LINE: PieceShape = {
    id: 'triple_line',
    name: 'Triple Line',
    cells: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 }
    ],
    color: PieceShapes.COLORS.red,
    category: 'small'
  };

  static readonly TRIPLE_V: PieceShape = {
    id: 'triple_v',
    name: 'Triple V',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 1, r: 0 }
    ],
    color: PieceShapes.COLORS.yellow,
    category: 'small'
  };

  static readonly TRIPLE_TRIANGLE: PieceShape = {
    id: 'triple_triangle',
    name: 'Triple Triangle',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 }
    ],
    color: PieceShapes.COLORS.purple,
    category: 'small'
  };

  // Medium pieces (4-5 hexes)
  static readonly QUAD_LINE: PieceShape = {
    id: 'quad_line',
    name: 'Quad Line',
    cells: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 }
    ],
    color: PieceShapes.COLORS.orange,
    category: 'medium'
  };

  static readonly QUAD_SQUARE: PieceShape = {
    id: 'quad_square',
    name: 'Quad Square',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: -1 }
    ],
    color: PieceShapes.COLORS.pink,
    category: 'medium'
  };

  static readonly QUAD_L: PieceShape = {
    id: 'quad_l',
    name: 'Quad L',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 0, r: 1 }
    ],
    color: PieceShapes.COLORS.blue,
    category: 'medium'
  };

  static readonly QUAD_Z: PieceShape = {
    id: 'quad_z',
    name: 'Quad Z',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 2, r: -1 }
    ],
    color: PieceShapes.COLORS.green,
    category: 'medium'
  };

  static readonly PENTA_CROSS: PieceShape = {
    id: 'penta_cross',
    name: 'Penta Cross',
    cells: [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 1 }
    ],
    color: PieceShapes.COLORS.red,
    category: 'medium'
  };

  static readonly PENTA_ARROW: PieceShape = {
    id: 'penta_arrow',
    name: 'Penta Arrow',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 1, r: -1 },
      { q: 1, r: 1 }
    ],
    color: PieceShapes.COLORS.yellow,
    category: 'medium'
  };

  // Large pieces (6-7 hexes)
  static readonly HEXA_LINE: PieceShape = {
    id: 'hexa_line',
    name: 'Hexa Line',
    cells: [
      { q: -2, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: 0 }
    ],
    color: PieceShapes.COLORS.purple,
    category: 'large'
  };

  static readonly HEXA_FLOWER: PieceShape = {
    id: 'hexa_flower',
    name: 'Hexa Flower',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 }
    ],
    color: PieceShapes.COLORS.orange,
    category: 'large'
  };

  static readonly HEPTA_FULL: PieceShape = {
    id: 'hepta_full',
    name: 'Hepta Full',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 }
    ],
    color: PieceShapes.COLORS.pink,
    category: 'large'
  };

  /**
   * Get all predefined shapes
   */
  static getAllShapes(): PieceShape[] {
    return [
      this.SINGLE,
      this.DOUBLE_HORIZONTAL,
      this.DOUBLE_DIAGONAL,
      this.TRIPLE_LINE,
      this.TRIPLE_V,
      this.TRIPLE_TRIANGLE,
      this.QUAD_LINE,
      this.QUAD_SQUARE,
      this.QUAD_L,
      this.QUAD_Z,
      this.PENTA_CROSS,
      this.PENTA_ARROW,
      this.HEXA_LINE,
      this.HEXA_FLOWER,
      this.HEPTA_FULL
    ];
  }

  /**
   * Get shapes by category
   */
  static getShapesByCategory(category: PieceShape['category']): PieceShape[] {
    return this.getAllShapes().filter(shape => shape.category === category);
  }

  /**
   * Get shapes by size (number of cells)
   */
  static getShapesBySize(minSize: number, maxSize: number): PieceShape[] {
    return this.getAllShapes().filter(shape =>
      shape.cells.length >= minSize && shape.cells.length <= maxSize
    );
  }

  /**
   * Get a random shape from all available shapes
   */
  static getRandomShape(): PieceShape {
    const shapes = this.getAllShapes();
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  /**
   * Get a random shape from specific categories
   */
  static getRandomShapeFromCategories(...categories: PieceShape['category'][]): PieceShape | null {
    const shapes = this.getAllShapes().filter(shape =>
      categories.includes(shape.category)
    );

    if (shapes.length === 0) return null;
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  /**
   * Generate a random color from the palette
   */
  static getRandomColor(): string {
    const colors = Object.values(this.COLORS);
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Create a custom shape
   */
  static createCustomShape(
    id: string,
    name: string,
    cells: HexCoordinates[],
    color?: string,
    category?: PieceShape['category']
  ): PieceShape {
    return {
      id,
      name,
      cells,
      color: color || this.getRandomColor(),
      category: category || this.categorizeBySize(cells.length)
    };
  }

  /**
   * Categorize shape by number of cells
   */
  private static categorizeBySize(size: number): PieceShape['category'] {
    if (size === 1) return 'single';
    if (size <= 3) return 'small';
    if (size <= 5) return 'medium';
    return 'large';
  }

  /**
   * Generate a random procedural shape
   */
  static generateProceduralShape(maxSize: number = 5): PieceShape {
    const cells: HexCoordinates[] = [{ q: 0, r: 0 }]; // Start with center
    const visited = new Set<string>();
    visited.add('0,0');

    const targetSize = Math.floor(Math.random() * (maxSize - 1)) + 2; // 2 to maxSize

    while (cells.length < targetSize) {
      // Get all possible neighbors
      const candidates: HexCoordinates[] = [];

      for (const cell of cells) {
        const neighbors = [
          { q: cell.q + 1, r: cell.r },
          { q: cell.q - 1, r: cell.r },
          { q: cell.q, r: cell.r + 1 },
          { q: cell.q, r: cell.r - 1 },
          { q: cell.q + 1, r: cell.r - 1 },
          { q: cell.q - 1, r: cell.r + 1 }
        ];

        for (const neighbor of neighbors) {
          const key = `${neighbor.q},${neighbor.r}`;
          if (!visited.has(key)) {
            candidates.push(neighbor);
          }
        }
      }

      if (candidates.length === 0) break;

      // Pick a random candidate
      const newCell = candidates[Math.floor(Math.random() * candidates.length)];
      cells.push(newCell);
      visited.add(`${newCell.q},${newCell.r}`);
    }

    // Normalize positions (center around 0,0)
    const avgQ = cells.reduce((sum, c) => sum + c.q, 0) / cells.length;
    const avgR = cells.reduce((sum, c) => sum + c.r, 0) / cells.length;

    const normalizedCells = cells.map(c => ({
      q: Math.round(c.q - avgQ),
      r: Math.round(c.r - avgR)
    }));

    return this.createCustomShape(
      `proc_${Date.now()}`,
      `Procedural Shape`,
      normalizedCells
    );
  }
}