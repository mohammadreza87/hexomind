import * as Phaser from 'phaser';
import { BoardRenderer } from '../presentation/board/BoardRenderer';
import { NeonThemeProvider } from '../presentation/theme/NeonThemeProvider';
import { PieceGenerationService } from '../core/services/PieceGenerationService';
import { PieceModel } from '../core/models/PieceModel';
import { HexCoordinates } from '../../../shared/types/hex';
import { PieceTray } from '../presentation/pieces/PieceTray';
import { PlacementValidator } from '../core/services/PlacementValidator';
import { RenderConfig } from '../config/RenderConfig';

/**
 * MainScene - The main and only game scene for Hexomind
 */
export class MainScene extends Phaser.Scene {
  private boardRenderer!: BoardRenderer;
  private themeProvider!: NeonThemeProvider;
  private pieceGenerator!: PieceGenerationService;
  private pieceTray!: PieceTray;
  private placementValidator!: PlacementValidator;

  // UI Elements
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;

  // Game State
  private score: number = 0;
  private highScore: number = 0;
  private currentPieces: PieceModel[] = [];
  private draggedPiece: PieceModel | null = null;
  private draggedRenderer: any = null; // Store the renderer for positioning
  private previewCells: HexCoordinates[] = [];

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    // Load hexagon PNG images if enabled
    if (RenderConfig.USE_PNG_HEXAGONS) {
      this.load.image(RenderConfig.TEXTURE_KEYS.HEX_EMPTY, RenderConfig.ASSETS.HEX_EMPTY);
      this.load.image(RenderConfig.TEXTURE_KEYS.HEX_FILLED, RenderConfig.ASSETS.HEX_FILLED);
      this.load.image(RenderConfig.TEXTURE_KEYS.HEX_PIECE, RenderConfig.ASSETS.HEX_PIECE);

      // Show loading progress
      this.load.on('progress', (value: number) => {
        console.log('Loading:', Math.round(value * 100) + '%');
      });

      this.load.on('complete', () => {
        console.log('Assets loaded successfully');
      });
    } else {
      // Using programmatic graphics
    }
  }

  create(): void {
    // Use subpixel rendering for smoother AA on vector graphics
    this.cameras.main.roundPixels = false;

    // Initialize theme provider
    this.themeProvider = new NeonThemeProvider();

    // Set background based on theme
    const theme = this.themeProvider.getPhaserTheme();
    this.cameras.main.setBackgroundColor(theme.backgroundColor);

    // Create the board
    this.boardRenderer = new BoardRenderer(this);

    // Initialize services
    this.pieceGenerator = new PieceGenerationService({
      guaranteeSolvability: true,
      useAdaptiveSizing: true
    });
    this.placementValidator = new PlacementValidator();

    // Create piece tray
    this.pieceTray = new PieceTray(this, this.themeProvider);

    // Create UI
    this.createUI();

    // Setup interactions
    this.setupInteractions();

    // Setup theme listener
    this.themeProvider.onThemeChange(() => {
      this.handleThemeChange();
    });

    // Load high score
    this.loadHighScore();

    // Start the game
    this.startNewGame();
  }

  /**
   * Create UI elements
   */
  private createUI(): void {
    const theme = this.themeProvider.getTheme();
    const { width, height } = this.cameras.main;

    // Title at top
    this.add.text(width / 2, 30, 'HEXOMIND', {
      fontSize: '36px',
      fontFamily: '"Lilita One", "Comic Sans MS", cursive',
      fontStyle: 'bold',
      color: this.themeProvider.toCSS(theme.textPrimary)
    }).setOrigin(0.5, 0.5).setDepth(100);

    // Score display - smaller and above grid
    this.scoreText = this.add.text(width / 2, height * 0.12, 'Score: 0', {
      fontSize: '24px',
      fontFamily: '"Lilita One", "Comic Sans MS", cursive',
      fontStyle: 'bold',
      color: this.themeProvider.toCSS(theme.textPrimary)
    }).setOrigin(0.5, 0.5).setDepth(100);

    // High score display - smaller
    this.highScoreText = this.add.text(width / 2, height * 0.16, 'Best: 0', {
      fontSize: '18px',
      fontFamily: '"Lilita One", "Comic Sans MS", cursive',
      color: this.themeProvider.toCSS(theme.textSecondary)
    }).setOrigin(0.5, 0.5).setDepth(100);
  }

  /**
   * Setup game interactions
   */
  private setupInteractions(): void {
    // Piece drag events
    this.events.on('piece:dragstart', (piece: PieceModel, pointer: Phaser.Input.Pointer, renderer: any) => {
      this.draggedPiece = piece;
      this.draggedRenderer = renderer;
      this.updatePreview(pointer);
    });

    this.events.on('piece:drag', (piece: PieceModel, pointer: Phaser.Input.Pointer) => {
      this.updatePreview(pointer);
    });

    this.events.on('piece:dragend', (piece: PieceModel, pointer: Phaser.Input.Pointer, renderer: any, callback: (placed: boolean) => void) => {
      const placed = this.attemptPlacement(pointer, renderer);
      callback(placed);
      this.draggedPiece = null;
      this.draggedRenderer = null;
      this.clearPreview();
    });

    // Tray empty event
    this.events.on('tray:empty', () => {
      this.generateNewPieces();
    });
  }

  /**
   * Start a new game
   */
  private startNewGame(): void {
    // Reset score
    this.score = 0;
    this.updateScore(0);

    // Clear board
    this.boardRenderer.getGridModel().reset();

    // Generate initial pieces
    this.generateNewPieces();

    // Show welcome animation
    this.showWelcomeAnimation();
  }

  /**
   * Generate new pieces
   */
  private generateNewPieces(): void {
    const grid = this.boardRenderer.getGridModel();
    this.currentPieces = this.pieceGenerator.generatePieceSet(grid, 3);


    // Display pieces in the tray
    this.pieceTray.setPieces(this.currentPieces);
  }

  /**
   * Update preview while dragging
   */
  private updatePreview(pointer: Phaser.Input.Pointer): void {
    if (!this.draggedPiece) return;

    // Clear previous preview
    this.clearPreview();

    // Get board position from pointer
    const boardCoords = this.boardRenderer.pixelToHex(pointer.x, pointer.y);
    if (!boardCoords) return;

    // Calculate piece position relative to board
    const placement = this.placementValidator.getPlacementCells(
      this.draggedPiece,
      boardCoords
    );

    // Check if placement is valid
    const grid = this.boardRenderer.getGridModel();
    const isValid = this.placementValidator.canPlacePiece(
      this.draggedPiece,
      boardCoords,
      grid
    );

    // Show preview on board with color index for correct color
    this.previewCells = placement;
    this.boardRenderer.showPlacementPreview(placement, isValid, this.draggedPiece.getColorIndex());
  }

  /**
   * Clear placement preview
   */
  private clearPreview(): void {
    this.boardRenderer.clearPlacementPreview();
    this.previewCells = [];
  }

  /**
   * Attempt to place piece
   */
  private attemptPlacement(pointer: Phaser.Input.Pointer, renderer: any): boolean {
    if (!this.draggedPiece) return false;

    // Get board position
    const boardCoords = this.boardRenderer.pixelToHex(pointer.x, pointer.y);
    if (!boardCoords) return false;

    // Check if placement is valid
    const grid = this.boardRenderer.getGridModel();
    const canPlace = this.placementValidator.canPlacePiece(
      this.draggedPiece,
      boardCoords,
      grid
    );

    if (!canPlace) return false;

    // Place the piece
    const placement = this.placementValidator.getPlacementCells(
      this.draggedPiece,
      boardCoords
    );

    placement.forEach(coord => {
      grid.setCellOccupied(coord, true, this.draggedPiece.getId(), this.draggedPiece.getColorIndex());
    });

    // Remove the dragged piece visual (it will be shown by the board cells)
    if (renderer && renderer.getContainer) {
      const container = renderer.getContainer();
      // First remove all listeners and interactivity
      if (container.input) {
        container.removeInteractive();
      }
      container.removeAllListeners();
      // Now safely destroy
      container.destroy();
    }

    // Force board to re-render to show placed pieces
    this.boardRenderer.updateBoard();

    // Calculate points
    const piecePoints = placement.length * 10;
    this.updateScore(piecePoints);

    // Check for complete lines
    const lines = grid.detectCompleteLines();
    if (lines.length > 0) {
      this.handleLineCompletion(lines);
    }

    // Success effect
    this.showPlacementEffect(boardCoords);

    return true;
  }

  /**
   * Show placement effect
   */
  private showPlacementEffect(coords: HexCoordinates): void {
    const pos = this.boardRenderer.hexToPixel(coords);
    if (!pos) return;

    // Create pulse effect
    const circle = this.add.circle(pos.x, pos.y, 10, 0xffffff, 0.8);
    circle.setDepth(150);

    this.tweens.add({
      targets: circle,
      scale: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => circle.destroy()
    });
  }

  /**
   * Handle line completion
   */
  private async handleLineCompletion(lines: any[]): Promise<void> {
    const grid = this.boardRenderer.getGridModel();

    // Calculate points
    const basePoints = 100 * lines.length;
    const comboMultiplier = lines.length > 1 ? lines.length : 1;
    const totalPoints = basePoints * comboMultiplier;

    // Update score
    this.updateScore(totalPoints);

    // Animate the line clearing with smooth wave effect
    await this.boardRenderer.animateLineClear(lines);

    // Visual feedback
    this.showLinesClearedEffect(lines.length, totalPoints);

    // Generate new pieces if all current pieces have been placed
    // TODO: Implement piece tracking
  }

  /**
   * Update score
   */
  private updateScore(points: number): void {
    this.score += points;
    this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);

    // Update high score if needed
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreText.setText(`Best: ${this.highScore.toLocaleString()}`);
      this.saveHighScore();

      // Animate high score
      this.tweens.add({
        targets: this.highScoreText,
        scale: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      });
    }

    // Animate score text
    if (points > 0) {
      this.tweens.add({
        targets: this.scoreText,
        scale: 1.1,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    }
  }

  /**
   * Show lines cleared effect
   */
  private showLinesClearedEffect(lineCount: number, points: number): void {
    const theme = this.themeProvider.getTheme();
    const { width, height } = this.cameras.main;

    // Create combo text
    let comboText = '';
    if (lineCount === 1) {
      comboText = 'LINE CLEAR!';
    } else if (lineCount === 2) {
      comboText = 'DOUBLE!';
    } else if (lineCount === 3) {
      comboText = 'TRIPLE!';
    } else {
      comboText = `${lineCount}x COMBO!`;
    }

    const effectText = this.add.text(width / 2, height / 2 - 30, comboText, {
      fontSize: '32px',
      fontFamily: '"Lilita One", "Comic Sans MS", cursive',
      fontStyle: 'bold',
      color: this.themeProvider.toCSS(theme.scoreBonus)
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    const pointsText = this.add.text(width / 2, height / 2 + 10, `+${points}`, {
      fontSize: '24px',
      fontFamily: '"Lilita One", "Comic Sans MS", cursive',
      fontStyle: 'bold',
      color: this.themeProvider.toCSS(theme.scorePrimary)
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    // Animate in
    this.tweens.add({
      targets: [effectText, pointsText],
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Animate out after delay
        this.tweens.add({
          targets: [effectText, pointsText],
          alpha: 0,
          y: '-=50',
          duration: 500,
          delay: 1000,
          ease: 'Power2',
          onComplete: () => {
            effectText.destroy();
            pointsText.destroy();
          }
        });
      }
    });

    // Removed screen flash for cleaner animation
  }

  /**
   * Show welcome animation
   */
  private showWelcomeAnimation(): void {
    const theme = this.themeProvider.getTheme();
    const { width, height } = this.cameras.main;

    const welcomeText = this.add.text(width / 2, height / 2, 'TAP TO PLACE PIECES', {
      fontSize: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: this.themeProvider.toCSS(theme.textSecondary)
    }).setOrigin(0.5).setAlpha(0).setDepth(150);

    // Fade in and out
    this.tweens.add({
      targets: welcomeText,
      alpha: { from: 0, to: 0.8 },
      duration: 1000,
      yoyo: true,
      hold: 1000,
      ease: 'Power2',
      onComplete: () => welcomeText.destroy()
    });
  }

  /**
   * Handle theme change
   */
  private handleThemeChange(): void {
    const theme = this.themeProvider.getTheme();
    const bgColor = this.themeProvider.getPhaserTheme().backgroundColor;

    // Update background
    this.cameras.main.setBackgroundColor(bgColor);

    // Update text colors
    this.scoreText.setColor(this.themeProvider.toCSS(theme.textPrimary));
    this.highScoreText.setColor(this.themeProvider.toCSS(theme.textSecondary));
  }

  /**
   * Load high score from local storage
   */
  private loadHighScore(): void {
    const saved = localStorage.getItem('hexomind_highscore');
    if (saved) {
      this.highScore = parseInt(saved, 10) || 0;
      this.highScoreText.setText(`Best: ${this.highScore.toLocaleString()}`);
    }
  }

  /**
   * Save high score to local storage
   */
  private saveHighScore(): void {
    localStorage.setItem('hexomind_highscore', this.highScore.toString());
  }

  update(time: number, delta: number): void {
    // Game update logic will go here
    // For now, empty as we handle everything through events
  }
}
