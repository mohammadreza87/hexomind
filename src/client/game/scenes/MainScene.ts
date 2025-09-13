import * as Phaser from 'phaser';
import { BoardRenderer } from '../presentation/board/BoardRenderer';
import { ThemeProvider } from '../presentation/theme/ThemeProvider';
import { PieceGenerationService } from '../core/services/PieceGenerationService';
import { PieceModel } from '../core/models/PieceModel';
import { HexCoordinates } from '../../../shared/types/hex';

/**
 * MainScene - The main and only game scene for Hexomind
 */
export class MainScene extends Phaser.Scene {
  private boardRenderer!: BoardRenderer;
  private themeProvider!: ThemeProvider;
  private pieceGenerator!: PieceGenerationService;

  // UI Elements
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;

  // Game State
  private score: number = 0;
  private highScore: number = 0;
  private currentPieces: PieceModel[] = [];

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    // Load any assets here if needed
    // For now, we're using only graphics primitives
  }

  create(): void {
    // Initialize theme provider
    this.themeProvider = new ThemeProvider();

    // Set background based on theme
    const theme = this.themeProvider.getPhaserTheme();
    this.cameras.main.setBackgroundColor(theme.backgroundColor);

    // Create the board
    this.boardRenderer = new BoardRenderer(this);

    // Initialize piece generator
    this.pieceGenerator = new PieceGenerationService({
      guaranteeSolvability: true,
      useAdaptiveSizing: true
    });

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
    const { width } = this.cameras.main;

    // Score display
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 'bold',
      color: this.themeProvider.toCSS(theme.textPrimary)
    }).setDepth(100);

    // High score display
    this.highScoreText = this.add.text(width - 20, 20, 'Best: 0', {
      fontSize: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: this.themeProvider.toCSS(theme.textSecondary)
    }).setOrigin(1, 0).setDepth(100);

    // Title
    this.add.text(width / 2, 30, 'HEXOMIND', {
      fontSize: '42px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '900',
      color: this.themeProvider.toCSS(theme.textPrimary)
    }).setOrigin(0.5, 0.5).setDepth(100);
  }

  /**
   * Setup game interactions
   */
  private setupInteractions(): void {
    // Listen for board cell clicks
    this.events.on('board:cellClicked', (coords: HexCoordinates) => {
      this.handleCellClick(coords);
    });

    // Handle pointer events for piece placement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // This will be used for drag and drop later
      const coords = this.boardRenderer.pixelToHex(pointer.x, pointer.y);
      if (coords) {
        // Temporary: just toggle cell for testing
        this.handleCellClick(coords);
      }
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

    // TODO: Display pieces in the piece tray area
    // For now, just log them
    console.log('Generated pieces:', this.currentPieces);
  }

  /**
   * Handle cell click (temporary for testing)
   */
  private handleCellClick(coords: HexCoordinates): void {
    const grid = this.boardRenderer.getGridModel();
    const isOccupied = grid.isCellOccupied(coords);

    // Toggle cell state
    grid.setCellOccupied(coords, !isOccupied, 'manual');

    // Check for complete lines
    const lines = grid.detectCompleteLines();
    if (lines.length > 0) {
      this.handleLineCompletion(lines);
    }

    // Update score
    if (!isOccupied) {
      this.updateScore(10);
    }
  }

  /**
   * Handle line completion
   */
  private handleLineCompletion(lines: any[]): void {
    const grid = this.boardRenderer.getGridModel();

    // Calculate points
    const basePoints = 100 * lines.length;
    const comboMultiplier = lines.length > 1 ? lines.length : 1;
    const totalPoints = basePoints * comboMultiplier;

    // Update score
    this.updateScore(totalPoints);

    // Clear lines
    grid.clearLines(lines);

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

    const effectText = this.add.text(width / 2, height / 2 - 50, comboText, {
      fontSize: '48px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '900',
      color: this.themeProvider.toCSS(theme.scoreBonus)
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    const pointsText = this.add.text(width / 2, height / 2, `+${points}`, {
      fontSize: '36px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 'bold',
      color: this.themeProvider.toCSS(theme.scorePrimary)
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    // Animate in
    const timeline = this.tweens.createTimeline();

    timeline.add({
      targets: [effectText, pointsText],
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });

    timeline.add({
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

    timeline.play();

    // Screen flash
    this.cameras.main.flash(200, 255, 255, 255, false);
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