import { logger } from '../../../utils/logger';
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
   * Core principle: All 3 pieces MUST be placeable in current grid state
   * Players may need to place pieces strategically to clear lines and make room
   */
  generatePieceSet(grid: GridModel, count: number = 3): PieceModel[] {
    if (!this.config.guaranteeSolvability) {
      // Generate without validation
      return this.generateRandomPieces(grid, count);
    }

    // Generate with solvability guarantee
    let attempts = 0;
    let pieces: PieceModel[] = [];
    const gridFullness = grid.getFullnessPercentage();
    const emptyCells = grid.getEmptyCells().length;

    logger.debug(
      `Generating pieces for grid at ${(gridFullness * 100).toFixed(1)}% fullness (${emptyCells} empty cells)`
    );

    // Strategy based on grid state
    if (emptyCells < 3) {
      // Critical: Grid almost full, can only generate as many pieces as empty cells
      logger.warn(`Only ${emptyCells} empty cells - generating ${emptyCells} single cell pieces`);
      return this.generateFallbackPieces(emptyCells);
    }

    while (attempts < this.config.maxGenerationAttempts) {
      pieces = this.generateSmartPieces(grid, count, gridFullness);

      // CRITICAL: Check that ALL 3 pieces can be placed (in some order)
      // This is the core game mechanic - players must be able to place all pieces
      if (this.puzzleValidator.hasSolution(pieces, grid, false)) {
        logger.debug(`✓ Found solvable set after ${attempts + 1} attempts`);

        // Additional validation: At least one piece should be immediately placeable
        // This prevents deadlock situations
        const hasImmediateMove = pieces.some(p =>
          this.puzzleValidator.canPlaceSinglePiece(p, grid, false)
        );

        if (hasImmediateMove) {
          logger.debug('✓ At least one piece can be placed immediately');
          // Shuffle return order slightly for variety
          this.shuffleInPlace(pieces);
          return pieces;
        } else {
          logger.warn('No piece can be placed immediately, regenerating...');
        }
      }

      attempts++;
    }

    // Fallback: Generate very small pieces that are guaranteed to fit
    logger.warn(`Could not generate solvable piece set after ${attempts} attempts, using guaranteed fallback`);

    // Try to generate small but varied pieces first
    const fallbackPieces = this.generateSmallPieces(grid, count);
    if (this.puzzleValidator.hasSolution(fallbackPieces, grid, false)) {
      logger.debug('Small pieces are solvable');
      return fallbackPieces;
    }

    // Ultimate fallback: single cells (MUST check solvability even for singles!)
    logger.warn('Small pieces not solvable, trying single-cell fallback');
    const singleCells = this.generateFallbackPieces(count);

    // Even single cells must be validated - if grid has < 3 empty cells, not all can be placed!
    if (this.puzzleValidator.hasSolution(singleCells, grid, false)) {
      logger.debug('Single cells are solvable');
      return singleCells;
    }

    // If even single cells aren't all placeable, return as many as can fit
    console.error('WARNING: Even single cells cannot all be placed! Grid has very few empty cells.');
    const remainingEmpty = grid.getEmptyCells().length;
    if (remainingEmpty > 0) {
      // Generate only as many single cells as there are empty spaces
      const limitedCount = Math.min(count, remainingEmpty);
      logger.debug(`Generating only ${limitedCount} single cells (grid has ${remainingEmpty} empty cells)`);
      return this.generateFallbackPieces(limitedCount);
    }

    // Grid is completely full - this shouldn't happen in normal gameplay
    console.error('CRITICAL: Grid is completely full, cannot generate any pieces!');
    return [];
  }

  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
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
   * Generate smart pieces that encourage line clearing
   */
  private generateSmartPieces(grid: GridModel, count: number, gridFullness: number): PieceModel[] {
    const pieces: PieceModel[] = [];

    // Analyze grid to find potential line completions
    const needsLineClear = gridFullness > 0.5;

    for (let i = 0; i < count; i++) {
      let shape: PieceShape;

      if (needsLineClear && i === 0 && this.rng.random() < 0.4) {
        // First piece: Higher chance of line-clearing shapes when grid is full
        shape = this.selectLineClearingShape();
      } else if (gridFullness > 0.7) {
        // Very full grid: Prefer small pieces
        shape = this.selectSmallShape();
      } else if (gridFullness < 0.3) {
        // Empty grid: Allow larger pieces
        shape = this.selectLargeShape();
      } else {
        // Normal selection
        shape = this.selectShapeForGridState(gridFullness);
      }

      const colorIndex = Math.floor(this.rng.random() * 8);
      pieces.push(new PieceModel(shape, colorIndex, () => this.rng.random()));
    }

    return pieces;
  }

  /**
   * Select shapes that are good for clearing lines
   */
  private selectLineClearingShape(): PieceShape {
    // Use existing shapes that tend to align with lines in our library
    const candidates: PieceShape[] = [
      PieceShapes.TRIPLE_LINE,
      PieceShapes.QUAD_Y,
      PieceShapes.QUAD_DIAMOND,
      PieceShapes.DOUBLE_HORIZONTAL,
      PieceShapes.DOUBLE_DIAGONAL,
    ];
    const shape = this.rng.pick(candidates);
    return { ...shape, color: PieceShapes.getRandomColor(this.rng) };
  }

  /**
   * Select small shapes for tight spaces
   */
  private selectSmallShape(): PieceShape {
    const smallShapes: PieceShape[] = [
      PieceShapes.SINGLE,
      PieceShapes.DOUBLE_HORIZONTAL,
      PieceShapes.DOUBLE_DIAGONAL,
      PieceShapes.TRIPLE_L,
    ];
    const shape = this.rng.pick(smallShapes);
    return { ...shape, color: PieceShapes.getRandomColor(this.rng) };
  }

  /**
   * Select larger shapes for empty grids
   */
  private selectLargeShape(): PieceShape {
    const largeShapes: PieceShape[] = [
      PieceShapes.TRIPLE_LINE,
      PieceShapes.TRIPLE_L,
      PieceShapes.TRIPLE_V,
      PieceShapes.QUAD_DIAMOND,
      PieceShapes.QUAD_STAR,
    ];
    const shape = this.rng.pick(largeShapes);
    return { ...shape, color: PieceShapes.getRandomColor(this.rng) };
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
  /**
   * Generate small pieces (1-2 cells) that are easier to place
   */
  private generateSmallPieces(grid: GridModel, count: number): PieceModel[] {
    const pieces: PieceModel[] = [];
    const smallShapes: PieceShape[] = [
      PieceShapes.SINGLE,
      PieceShapes.DOUBLE_HORIZONTAL,
      PieceShapes.DOUBLE_DIAGONAL,
    ];

    for (let i = 0; i < count; i++) {
      const shape: PieceShape = {
        ...this.rng.pick(smallShapes),
        color: PieceShapes.getRandomColor(this.rng)
      };
      const colorIndex = Math.floor(this.rng.random() * 8);
      pieces.push(new PieceModel(shape, colorIndex, () => this.rng.random()));
    }

    return pieces;
  }

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
      logger.warn(`Shape with ID ${shapeId} not found`);
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
    const shapes: PieceShape[] = [
      PieceShapes.TRIPLE_LINE,
      PieceShapes.QUAD_Y,
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
