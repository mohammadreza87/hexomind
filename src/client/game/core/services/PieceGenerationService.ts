import { PieceModel, PieceShape } from '../models/PieceModel';
import { GridModel } from '../models/GridModel';
import { PieceShapes } from './PieceShapes';
import { PuzzleValidator } from './PuzzleValidator';
import { RNG } from './RNG';

/**
 * Configuration for piece generation
 */
export interface GenerationConfig {
  useProceduralGeneration: boolean;
  useAdaptiveSizing: boolean;
  maxRadiusEarlyGame: number;
  maxRadiusLateGame: number;
  maxHexagonCount: number;
  adaptiveThreshold: number;
  guaranteeSolvability: boolean;
  maxGenerationAttempts: number;
}

/**
 * Service responsible for generating pieces for the game.
 * Ensures pieces are playable and optionally guarantees solvability.
 */
export class PieceGenerationService {
  private config: GenerationConfig;
  private puzzleValidator: PuzzleValidator;
  private rng: RNG;

  constructor(config?: Partial<GenerationConfig>, seed?: number | string, rng?: RNG) {
    this.config = {
      useProceduralGeneration: false,
      useAdaptiveSizing: true,
      maxRadiusEarlyGame: 7,  // Max 7 cells (radius 1)
      maxRadiusLateGame: 3,
      maxHexagonCount: 7,     // Never exceed radius 1 (7 cells max)
      adaptiveThreshold: 0.6,
      guaranteeSolvability: true,
      maxGenerationAttempts: 100,
      ...config
    };

    this.puzzleValidator = new PuzzleValidator();
    this.rng = rng ?? new RNG(seed ?? Date.now());
  }

  /**
   * Generate a set of pieces for the game
   */
  generatePieceSet(grid: GridModel, count: number = 3): PieceModel[] {
    if (!this.config.guaranteeSolvability) {
      // Generate without validation
      return this.generateRandomPieces(grid, count);
    }

    // Generate with solvability guarantee
    let attempts = 0;
    let pieces: PieceModel[] = [];

    while (attempts < this.config.maxGenerationAttempts) {
      pieces = this.generateRandomPieces(grid, count);

      // Validate that at least one ordering allows all pieces to be placed
      if (this.puzzleValidator.hasSolution(pieces, grid)) {
        return pieces;
      }

      attempts++;
    }

    // Fallback: Generate very small pieces that are guaranteed to fit
    console.warn('Could not generate solvable piece set, falling back to small pieces');
    return this.generateFallbackPieces(count);
  }

  /**
   * Generate random pieces based on grid state
   */
  private generateRandomPieces(grid: GridModel, count: number): PieceModel[] {
    const pieces: PieceModel[] = [];
    const gridFullness = grid.getFullnessPercentage();

    for (let i = 0; i < count; i++) {
      const shape = this.selectShapeForGridState(gridFullness);
      // Provide deterministic color index via rng
      const colorIndex = Math.floor(this.rng.random() * 8);
      pieces.push(new PieceModel(shape, colorIndex, () => this.rng.random()));
    }

    return pieces;
  }

  /**
   * Select appropriate shape based on grid fullness
   */
  private selectShapeForGridState(gridFullness: number): PieceShape {
    let shape: PieceShape;

    if (this.config.useProceduralGeneration) {
      // Generate procedural shape with size based on grid state
      const maxSize = this.getMaxSizeForFullness(gridFullness);
      shape = PieceShapes.generateProceduralShape(maxSize, this.rng);
    } else {
      // Select from predefined shapes
      shape = this.selectPredefinedShape(gridFullness);
    }

    // Apply random color
    return {
      ...shape,
      color: PieceShapes.getRandomColor(this.rng)
    };
  }

  /**
   * Get maximum piece size based on grid fullness
   */
  private getMaxSizeForFullness(gridFullness: number): number {
    if (!this.config.useAdaptiveSizing) {
      return this.config.maxHexagonCount;
    }

    if (gridFullness < 0.3) {
      // Early game - allow larger pieces (but max 7 for radius 1)
      return Math.min(7, this.config.maxHexagonCount);
    } else if (gridFullness < this.config.adaptiveThreshold) {
      // Mid game - moderate pieces
      return Math.min(5, this.config.maxHexagonCount);
    } else {
      // Late game - smaller pieces
      return Math.min(this.config.maxRadiusLateGame, 3);
    }
  }

  /**
   * Select a predefined shape based on grid state
   */
  private selectPredefinedShape(gridFullness: number): PieceShape {
    let categories: PieceShape['category'][];

    if (gridFullness < 0.3) {
      // Early game - all categories
      categories = ['single', 'small', 'medium', 'large'];
    } else if (gridFullness < 0.6) {
      // Mid game - avoid large pieces
      categories = ['single', 'small', 'medium'];
    } else if (gridFullness < 0.8) {
      // Late game - prefer smaller pieces
      categories = ['single', 'small'];
    } else {
      // Critical - mostly singles
      categories = ['single'];

      // 30% chance for small piece when critical
      if (this.rng.random() < 0.3) {
        categories.push('small');
      }
    }

    const shape = PieceShapes.getRandomShapeFromCategories(...categories, this.rng);
    return shape || PieceShapes.SINGLE;
  }

  /**
   * Generate fallback pieces that are guaranteed to fit
   */
  private generateFallbackPieces(count: number): PieceModel[] {
    const pieces: PieceModel[] = [];

    for (let i = 0; i < count; i++) {
      // Use single cells as fallback
      const shape: PieceShape = {
        ...PieceShapes.SINGLE,
        color: PieceShapes.getRandomColor(this.rng)
      };
      const colorIndex = Math.floor(this.rng.random() * 8);
      pieces.push(new PieceModel(shape, colorIndex, () => this.rng.random()));
    }

    return pieces;
  }

  /**
   * Generate a specific type of piece
   */
  generateSpecificPiece(shapeId: string): PieceModel | null {
    const allShapes = PieceShapes.getAllShapes();
    const shape = allShapes.find(s => s.id === shapeId);

    if (!shape) {
      console.warn(`Shape with ID ${shapeId} not found`);
      return null;
    }

    return new PieceModel({
      ...shape,
      color: PieceShapes.getRandomColor(this.rng)
    }, Math.floor(this.rng.random() * 8), () => this.rng.random());
  }

  /**
   * Generate pieces for tutorial or specific scenarios
   */
  generateTutorialPieces(): PieceModel[] {
    // Generate simple, easy-to-place pieces for tutorial
    const shapes = [
      PieceShapes.SINGLE,
      PieceShapes.DOUBLE_HORIZONTAL,
      PieceShapes.TRIPLE_LINE
    ];

    return shapes.map(shape => new PieceModel({
      ...shape,
      color: PieceShapes.getRandomColor(this.rng)
    }, Math.floor(this.rng.random() * 8), () => this.rng.random()));
  }

  /**
   * Generate a "line clear" focused set
   */
  generateLineClearSet(grid: GridModel): PieceModel[] {
    // Analyze grid to find potential line completions
    const pieces: PieceModel[] = [];

    // Add pieces that are likely to complete lines
    const shapes = [
      PieceShapes.TRIPLE_LINE,
      PieceShapes.QUAD_LINE,
      PieceShapes.DOUBLE_HORIZONTAL
    ];

    for (const shape of shapes) {
      pieces.push(new PieceModel({
        ...shape,
        color: PieceShapes.getRandomColor(this.rng)
      }, Math.floor(this.rng.random() * 8), () => this.rng.random()));
    }

    return pieces;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GenerationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): GenerationConfig {
    return { ...this.config };
  }
}
