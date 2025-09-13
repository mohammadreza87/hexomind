import { PieceShape } from '../models/PieceModel';
import { HexCoordinates } from '../../../../shared/types/hex';
import { RNG } from './RNG';

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

  // Small pieces (2-3 hexes) - all within radius 1
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

  static readonly TRIPLE_V: PieceShape = {
    id: 'triple_v',
    name: 'Triple V',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 1, r: 0 }
    ],
    color: PieceShapes.COLORS.red,
    category: 'small'
  };

  static readonly TRIPLE_L: PieceShape = {
    id: 'triple_l',
    name: 'Triple L',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 }
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

  static readonly TRIPLE_LINE: PieceShape = {
    id: 'triple_line',
    name: 'Triple Line',
    cells: [
      { q: 0, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 1 }
    ],
    color: PieceShapes.COLORS.cyan,
    category: 'small'
  };

  // Medium pieces (4-5 hexes) - all within radius 1
  static readonly QUAD_DIAMOND: PieceShape = {
    id: 'quad_diamond',
    name: 'Quad Diamond',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 }
    ],
    color: PieceShapes.COLORS.orange,
    category: 'medium'
  };

  static readonly QUAD_STAR: PieceShape = {
    id: 'quad_star',
    name: 'Quad Star',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: 1 },
      { q: -1, r: 0 }
    ],
    color: PieceShapes.COLORS.pink,
    category: 'medium'
  };

  static readonly QUAD_C: PieceShape = {
    id: 'quad_c',
    name: 'Quad C',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 }
    ],
    color: PieceShapes.COLORS.blue,
    category: 'medium'
  };

  static readonly QUAD_Y: PieceShape = {
    id: 'quad_y',
    name: 'Quad Y',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: 1 }
    ],
    color: PieceShapes.COLORS.green,
    category: 'medium'
  };

  static readonly PENTA_PLUS: PieceShape = {
    id: 'penta_plus',
    name: 'Penta Plus',
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

  static readonly PENTA_FLOWER: PieceShape = {
    id: 'penta_flower',
    name: 'Penta Flower',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 }
    ],
    color: PieceShapes.COLORS.yellow,
    category: 'medium'
  };

  // Large pieces (6-7 hexes) - all within radius 1
  static readonly HEXA_RING: PieceShape = {
    id: 'hexa_ring',
    name: 'Hexa Ring',
    cells: [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 }
    ],
    color: PieceShapes.COLORS.purple,
    category: 'large'
  };

  static readonly HEXA_STAR: PieceShape = {
    id: 'hexa_star',
    name: 'Hexa Star',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 1, r: -1 }
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
      this.TRIPLE_V,
      this.TRIPLE_L,
      this.TRIPLE_TRIANGLE,
      this.TRIPLE_LINE,
      this.QUAD_DIAMOND,
      this.QUAD_STAR,
      this.QUAD_C,
      this.QUAD_Y,
      this.PENTA_PLUS,
      this.PENTA_FLOWER,
      this.HEXA_RING,
      this.HEXA_STAR,
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
  static getRandomShape(rng?: RNG): PieceShape {
    const shapes = this.getAllShapes();
    if (rng) return rng.pick(shapes);
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  /**
   * Get a random shape from specific categories
   */
  static getRandomShapeFromCategories(
    ...args: [...categories: PieceShape['category'][]]
  ): PieceShape | null {
    // Support optional rng as last argument
    const last = args[args.length - 1] as unknown;
    const rng = last instanceof RNG ? (args.pop() as unknown as RNG) : undefined;
    const categories = args as PieceShape['category'][];
    const shapes = this.getAllShapes().filter(shape =>
      categories.includes(shape.category)
    );

    if (shapes.length === 0) return null;
    if (rng) return rng.pick(shapes);
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  /**
   * Generate a random color from the palette
   */
  static getRandomColor(rng?: RNG): string {
    const colors = Object.values(this.COLORS);
    if (rng) return rng.pick(colors);
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
   * Generate a random procedural shape within radius 1
   */
  static generateProceduralShape(maxSize: number = 7, rng?: RNG): PieceShape {
    const cells: HexCoordinates[] = [{ q: 0, r: 0 }]; // Start with center
    const visited = new Set<string>();
    visited.add('0,0');

    // Ensure we don't exceed 7 cells (radius 1 limit)
    const rnd = rng ? rng.random() : Math.random();
    const targetSize = Math.min(Math.floor(rnd * (maxSize - 1)) + 2, 7);

    // Valid positions within radius 1
    const validPositions = [
      { q: 0, r: 0 },   // Center
      { q: 1, r: 0 },   // Right
      { q: 1, r: -1 },  // Top-right
      { q: 0, r: -1 },  // Top-left
      { q: -1, r: 0 },  // Left
      { q: -1, r: 1 },  // Bottom-left
      { q: 0, r: 1 }    // Bottom-right
    ];

    while (cells.length < targetSize) {
      // Get all possible neighbors within radius 1
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
          // Check if within radius 1 and not visited
          const isValid = validPositions.some(p => p.q === neighbor.q && p.r === neighbor.r);
          if (isValid && !visited.has(key)) {
            candidates.push(neighbor);
          }
        }
      }

      if (candidates.length === 0) break;

      // Pick a random candidate
      const newCell = rng ? rng.pick(candidates) : candidates[Math.floor(Math.random() * candidates.length)];
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
