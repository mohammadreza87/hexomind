import * as Phaser from 'phaser';
import { BoardRenderer } from '../presentation/board/BoardRenderer';
import { NeonThemeProvider } from '../presentation/theme/NeonThemeProvider';
import { PieceGenerationService } from '../core/services/PieceGenerationService';
import { PieceModel } from '../core/models/PieceModel';
import { HexCoordinates } from '../../../shared/types/hex';
import { PieceTray } from '../presentation/pieces/PieceTray';
import { PlacementValidator } from '../core/services/PlacementValidator';
import { PuzzleValidator } from '../core/services/PuzzleValidator';
import { GameOverService } from '../core/services/GameOverService';
import { RenderConfig } from '../config/RenderConfig';
import { errorBoundary } from '../../utils/ErrorBoundary';
import { logger } from '../../utils/logger';
import { highScoreService } from '../../services/HighScoreService';
import { SharpText } from '../utils/SharpText';
import { DS } from '../config/DesignSystem';
import { createGradientText } from '../presentation/ui/GradientText';
import { GameStateManager } from '../services/GameStateManager';
import { ResponsiveMetrics, measureResponsiveViewport } from '../responsive';
import { gameBridge } from '../../ui/GameBridge';
import { shareService } from '../../services/ShareService';
// Asset URLs (bundled by Vite) - commented out for now since SVG not available
// import hexSvgUrl from '../../assets/images/hex.svg';

/**
 * MainScene - The main and only game scene for Hexomind
 */
export class MainScene extends Phaser.Scene {
  private boardRenderer!: BoardRenderer;
  private themeProvider!: NeonThemeProvider;
  private pieceGenerator!: PieceGenerationService;
  private pieceTray!: PieceTray;
  private placementValidator!: PlacementValidator;
  private puzzleValidator!: PuzzleValidator;
  private gameOverService!: GameOverService;

  // UI Elements
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private responsiveMetrics!: ResponsiveMetrics;

  // Game State
  private score: number = 0;
  private highScore: number = 0;
  private hasShownGameOver: boolean = false;
  private currentPieces: PieceModel[] = [];
  private moveCount: number = 0;
  private draggedPiece: PieceModel | null = null;
  private draggedRenderer: any = null; // Store the renderer for positioning
  private previewCells: HexCoordinates[] = [];
  // Debounce game-over checks and avoid racing with tray spawn
  private gameOverCheckTimer: Phaser.Time.TimerEvent | null = null;
  private isSpawningSet: boolean = false;
  private consecutiveClears: number = 0; // Track consecutive line clears (increases with each clear)
  private nonClearingPlacements: number = 0; // Track pieces placed without clearing lines
  private comboResetTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    // Setup error recovery for asset loading
    errorBoundary.registerRecoveryStrategy('assets', () => {
      logger.debug('Attempting to use fallback rendering');
      // Could switch to programmatic rendering here
    });

    // Add error handler for load failures
    this.load.on('loaderror', (file: any) => {
      errorBoundary.handleError(
        new Error(`Failed to load asset: ${file.key} from ${file.url}`),
        'assets'
      );
    });

    // Load hexagon assets
    if (RenderConfig.USE_PNG_HEXAGONS) {
      this.load.image(RenderConfig.TEXTURE_KEYS.HEX_EMPTY, RenderConfig.ASSETS.HEX_EMPTY);
      this.load.image(RenderConfig.TEXTURE_KEYS.HEX_FILLED, RenderConfig.ASSETS.HEX_FILLED);
      this.load.image(RenderConfig.TEXTURE_KEYS.HEX_PIECE, RenderConfig.ASSETS.HEX_PIECE);
      // Load SVGs for base (grid) and fill (pieces) with higher resolution
      this.load.svg(RenderConfig.TEXTURE_KEYS.HEX_BASE_SVG, '/assets/hex-simple.svg', { width: 1024, height: 1024 });
      this.load.svg(RenderConfig.TEXTURE_KEYS.HEX_FILL_SVG, '/assets/hex-fill.svg', { width: 1024, height: 1024 });
      // Load glassmorphism piece SVG
      this.load.svg(RenderConfig.TEXTURE_KEYS.HEX_PIECE_GLASS, '/assets/hex-piece-glass.svg', { width: 512, height: 512 });

      // Show loading progress
      this.load.on('progress', (value: number) => {
        logger.debug('Loading:', Math.round(value * 100) + '%');
      });

      this.load.on('complete', () => {
        logger.debug('Assets loaded successfully');
      });
    } else if (RenderConfig.USE_SVG_HEXAGONS) {
      // Load SVG assets with high resolution for crisp rendering
      this.load.svg(RenderConfig.TEXTURE_KEYS.HEX_BASE, '/assets/hex-simple.svg', { width: 512, height: 512 });
      this.load.svg(RenderConfig.TEXTURE_KEYS.HEX_FILL, '/assets/hex-fill.svg', { width: 512, height: 512 });

      this.load.on('progress', (value: number) => {
        logger.debug('Loading SVG:', Math.round(value * 100) + '%');
      });
      this.load.on('complete', () => {
        logger.debug('SVG assets loaded');
      });
    } else {
      // Using programmatic graphics
    }
  }

  create(): void {
    // Don't force pixel rounding - allow smooth rendering
    this.cameras.main.roundPixels = false;

    // Apply canvas styles for optimal high-DPI rendering
    const canvas = this.game.canvas;
    if (canvas) {
      // Set canvas context for sharp rendering with smoothing
      const context = canvas.getContext('2d');
      if (context) {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
      }
    }

    // Initialize theme provider
    this.themeProvider = new NeonThemeProvider();

    // Don't set background color - let it be transparent to show gradient
    // this.cameras.main.setBackgroundColor(theme.backgroundColor);

    // Resolve initial responsive metrics
    this.responsiveMetrics = (this.registry.get('responsive:metrics') as ResponsiveMetrics | undefined)
      ?? measureResponsiveViewport(this.scale.gameSize.width, this.scale.gameSize.height);

    // Create the board
    this.boardRenderer = new BoardRenderer(this, this.responsiveMetrics);

    // Initialize services
    this.pieceGenerator = new PieceGenerationService({
      guaranteeSolvability: true,
      useAdaptiveSizing: true
    });
    this.placementValidator = new PlacementValidator();
    this.puzzleValidator = new PuzzleValidator();
    this.gameOverService = new GameOverService(this.placementValidator);

    // Create piece tray
    this.pieceTray = new PieceTray(this, this.themeProvider, this.responsiveMetrics);

    // Create UI
    this.createUI();
    // Toast UI

    // Setup interactions
    this.setupInteractions();

    // Setup theme listener
    this.themeProvider.onThemeChange(() => {
      this.handleThemeChange();
    });

    // Load high score
    this.loadHighScore();

    // Check for saved game and restore or start new
    // Only restore if there's a valid saved game (not a game-over state)
    const savedGame = GameStateManager.loadGameState();
    if (savedGame && savedGame.grid && savedGame.grid.length > 0) {
      // Check if the saved state is likely a game-over state
      // (e.g., if pieces can't be placed)
      if (!this.restoreSavedGame()) {
        // If restore fails, start new game
        this.startNewGame();
      }
    } else {
      // Start a new game if no save exists
      this.startNewGame();
    }

    this.game.events.on('responsive:metrics', this.handleResponsiveMetrics, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('responsive:metrics', this.handleResponsiveMetrics, this);
    });

    this.layoutUIForViewport(this.responsiveMetrics);
  }

  private handleResponsiveMetrics(metrics: ResponsiveMetrics): void {
    this.responsiveMetrics = metrics;
    this.boardRenderer.updateViewport(metrics);
    this.pieceTray.updateLayout(metrics);
    this.layoutUIForViewport(metrics);
  }

  private layoutUIForViewport(metrics: ResponsiveMetrics): void {
    // Use fixed 1080x1920 dimensions
    const width = 1080;
    const height = 1920;

    if (this.scoreText && this.highScoreText) {
      this.scoreText.setPosition(width / 2, 100);
      this.highScoreText.setPosition(width / 2, 150);
    }
  }

  /**
   * Create UI elements
   */
  private createUI(): void {
    const theme = this.themeProvider.getTheme();
    const { width, height } = this.cameras.main;

    // Title removed - HEXOMIND text hidden
    /*
    const titleText = createGradientText(
      this,
      width / 2,
      DS.SPACING.xl + DS.SPACING.sm,
      'HEXOMIND',
      '48px',
      undefined, // Let it pick a random neon gradient
      true // Enable auto color cycling
    );
    titleText.setDepth(DS.LAYERS.ui);
    */

    // Score display removed - Score text hidden
    /*
    this.scoreText = this.add.text(
      width / 2,
      height * 0.12,
      'Score: 0',
      {
        fontSize: DS.TYPOGRAPHY.fontSize['2xl'],
        fontFamily: DS.TYPOGRAPHY.fontFamily.display,
        fontStyle: '700 normal', // Bold weight
        color: DS.COLORS.solid.textPrimary,
        align: 'center'
      }
    );
    this.scoreText.setOrigin(0.5, 0.5).setDepth(DS.LAYERS.ui);
    this.scoreText.setResolution(window.devicePixelRatio || 1);
    */
    // Create empty text to prevent null reference errors
    this.scoreText = this.add.text(0, 0, '', {}).setVisible(false);

    // High score display removed - Best score text hidden
    /*
    this.highScoreText = this.add.text(
      width / 2,
      height * 0.16,
      'Best: 0',
      {
        fontSize: DS.TYPOGRAPHY.fontSize.lg,
        fontFamily: DS.TYPOGRAPHY.fontFamily.display,
        fontStyle: '500 normal', // Medium weight
        color: DS.COLORS.solid.textSecondary,
        align: 'center'
      }
    );
    this.highScoreText.setOrigin(0.5, 0.5).setDepth(DS.LAYERS.ui);
    this.highScoreText.setResolution(window.devicePixelRatio || 1);
    */
    // Create empty text to prevent null reference errors
    this.highScoreText = this.add.text(0, 0, '', {}).setVisible(false);

    // Leaderboard is now handled by React component

    // Game over UI is now handled by React component
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
      // Let the tray update its internal state first
      callback(placed);

      // Important: Do NOT run game-over checks immediately after a successful
      // placement. If a line is about to clear, checking early can produce a
      // false game over. We only check after animations complete in
      // handleLineCompletion(). If not placed, we can safely recheck now.
      if (!placed) {
        if (this.gameOverCheckTimer) this.gameOverCheckTimer.remove(false);
        this.gameOverCheckTimer = this.time.delayedCall(0, () => {
          this.gameOverCheckTimer = null;
          this.checkRemainingPiecesValidity();
        });
      }

      this.draggedPiece = null;
      this.draggedRenderer = null;
      this.clearPreview();
    });

    // Tray empty event - generate new pieces when all 3 are used
    this.events.on('tray:empty', () => {
      logger.debug('All pieces used - generating new set');
      this.generateNewPieces();
    });
  }

  /**
   * Start a new game (also called from React)
   */
  public startNewGame(): void {
    // Reset game over state before starting fresh
    if (this.gameOverCheckTimer) {
      this.gameOverCheckTimer.remove(false);
      this.gameOverCheckTimer = null;
    }
    this.hasShownGameOver = false;
    this.isSpawningSet = false;

    const store = window.gameStore?.getState();
    store?.setShowNoSpaceToast(false);

    // Reset score and move count
    this.score = 0;
    this.moveCount = 0;
    this.consecutiveClears = 0;
    this.nonClearingPlacements = 0;
    this.updateScore(0);

    // Clear board model
    this.boardRenderer.getGridModel().reset();

    // Regenerate the board visually to clear all placed pieces
    this.boardRenderer.regenerateBoard();

    // Clear saved game state
    GameStateManager.clearGameState();

    // Refresh high score from server and local sources for each new launch
    void this.loadHighScore();

    // Generate initial pieces
    this.generateNewPieces();

  }

  /**
   * Reset high score state (used when user clears data)
   */
  public resetHighScoreData(): void {
    this.highScore = 0;
    if (this.highScoreText) {
      this.highScoreText.setText('Best: 0');
    }
    gameBridge.updateHighScore(0);
    this.saveHighScore();
  }

  /**
   * Restore saved game state
   */
  private restoreSavedGame(): boolean {
    const savedGame = GameStateManager.loadGameState();
    if (!savedGame) return false;

    try {
      logger.debug('Restoring saved game...');

      // Restore grid state
      const grid = this.boardRenderer.getGridModel();
      grid.reset();

      // Restore cells
      savedGame.grid.forEach(cell => {
        grid.setCellOccupied(
          { q: cell.q, r: cell.r },
          true,
          undefined,
          cell.color
        );
      });

      // Force board to re-render
      this.boardRenderer.updateBoard();

      // Restore score and move count
      this.score = savedGame.score;
      this.moveCount = savedGame.moveCount;
      // Use the higher of saved high score or current high score
      this.highScore = Math.max(this.highScore, savedGame.highScore);
      this.updateScore(0); // Update display without adding points
      this.highScoreText.setText(`Best: ${this.highScore.toLocaleString()}`);

      // Restore pieces
      this.pieceTray.restorePieces(savedGame.pieces);

      logger.debug(
        `Game restored: Score ${this.score}, ${savedGame.grid.length} cells, ${savedGame.pieces.filter(p => !p.used).length} pieces remaining`
      );

      // Game restored - no toast needed

      return true;
    } catch (error) {
      console.error('Failed to restore game:', error);
      GameStateManager.clearGameState();
      return false;
    }
  }

  /**
   * Save current game state
   */
  private saveGameState(): void {
    const grid = this.boardRenderer.getGridModel();
    const pieces = this.pieceTray.getPiecesForSave();

    // Convert grid to color map
    const gridMap = new Map<string, number>();
    grid.getAllCells().forEach(cell => {
      if (cell.isOccupied && cell.pieceColorIndex !== undefined) {
        gridMap.set(`${cell.coordinates.q},${cell.coordinates.r}`, cell.pieceColorIndex);
      }
    });

    GameStateManager.saveGameState(
      gridMap,
      pieces,
      this.score,
      this.highScore,
      this.moveCount
    );
  }

  /**
   * Generate new pieces
   * Core rule: All 3 pieces must be placeable (in some order)
   */
  private generateNewPieces(): void {
    const grid = this.boardRenderer.getGridModel();
    const emptyCells = grid.getEmptyCells().length;

    logger.debug('=== Generating New Pieces ===');
    logger.debug(
      `Empty cells: ${emptyCells}, Grid fullness: ${(grid.getFullnessPercentage() * 100).toFixed(1)}%`
    );

    // Check if grid is completely full first
    if (emptyCells === 0) {
      logger.debug('Grid is completely full - GAME OVER');
      this.showGameOver();
      return;
    }

    // Cancel any pending game-over checks while spawning a new set
    if (this.gameOverCheckTimer) {
      this.gameOverCheckTimer.remove(false);
      this.gameOverCheckTimer = null;
    }
    this.isSpawningSet = true;

    // Try to generate a set that is (1) solvable as a round and
    // (2) has an immediate move under the same placement rules as players.
    const MAX_TRIES = 30;
    let tries = 0;
    let accepted = false;

    while (tries < MAX_TRIES && !accepted) {
      this.currentPieces = this.pieceGenerator.generatePieceSet(grid, 3);

      const roundSolvable = this.puzzleValidator.hasSolution(this.currentPieces, grid, false);
      const immediateMove = this.gameOverService.findAnyPlayerPlaceableMove(this.currentPieces, grid) !== null;

      if (roundSolvable && immediateMove) {
        accepted = true;
        break;
      }
      tries++;
    }

    if (!accepted) {
      console.error('❌ Failed to generate an immediately playable, round-solvable set');
      // Fallback: generate very small pieces that are guaranteed to fit
      this.currentPieces = this.pieceGenerator.generateLineClearSet(grid);
    }

    logger.debug('✓ All 3 pieces can be placed');
    const summary = this.gameOverService.getPlacementSummary(this.currentPieces, grid);
    console.table(summary);

    // Display pieces in the tray
    this.pieceTray.setPieces(this.currentPieces);
    // Mark spawn complete next tick to avoid mid-spawn checks
    this.time.delayedCall(0, () => {
      this.isSpawningSet = false;
      this.checkRemainingPiecesValidity();
    });
  }


  /**
   * Check if remaining pieces can be played
   * Game over only when NO piece can be placed (not when some can't be placed together)
   */
  private checkRemainingPiecesValidity(): void {
    const grid = this.boardRenderer.getGridModel();
    const remaining = this.pieceTray.getRemainingPieces();

    // Skip checks while a new set is being spawned to avoid transient counts
    if (this.isSpawningSet) {
      return;
    }

    // If tray is empty, new pieces will be generated
    if (remaining.length === 0) {
      return;
    }

    // First: full-round feasibility with remaining pieces (order + line clears)
    const roundSolvable = this.puzzleValidator.hasSolution(remaining, grid, false);

    // Second: immediate feasibility (at least one piece fits right now)
    const anyPieceCanBePlaced = this.gameOverService.findAnyPlayerPlaceableMove(remaining, grid) !== null;

    // Only game over if no immediate move AND the remaining set is not solvable
    if (!anyPieceCanBePlaced && !roundSolvable) {
      const emptyCells = grid.getEmptyCells().length;
      logger.debug('=== GAME OVER - No pieces can be placed and set is unsolvable ===');
      logger.debug(`Remaining pieces: ${remaining.length}`);
      logger.debug(`Empty cells: ${emptyCells}`);
      const summary = this.gameOverService.getPlacementSummary(remaining, grid);
      console.table(summary);
      this.showGameOver();
    }
  }

  /**
   * Show game over screen
   */
  private showGameOver(): void {
    if (this.hasShownGameOver) return;
    this.hasShownGameOver = true;

    // Clear saved game state immediately so restarting gives a fresh game
    GameStateManager.clearGameState();
    logger.debug('Game over - cleared saved game state');

    // Show "No More Space" toast first, then reveal panel with more delay
    if (window.gameStore) {
      window.gameStore.getState().setShowNoSpaceToast(true);
      this.time.delayedCall(1800, () => {
        void this.resolveGameOverFlow();
      });
    }
  }

  private async resolveGameOverFlow(): Promise<void> {
    const store = window.gameStore?.getState();
    if (!store) {
      return;
    }

    // Only update score - it will automatically handle highScore in the store
    store.setScore(this.score);

    const offeredRescue = await this.maybeOfferShareRescue();
    if (!offeredRescue) {
      store.setGameState('gameOver');
    }
  }

  private captureGameScreenshot(): string | null {
    const canvas = this.game?.canvas as HTMLCanvasElement | undefined;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      console.log('[SCREENSHOT DEBUG] Canvas invalid', {
        hasCanvas: !!canvas,
        width: canvas?.width,
        height: canvas?.height
      });
      return null;
    }

    try {
      const maxWidth = 720;
      const scale = canvas.width > maxWidth ? maxWidth / canvas.width : 1;
      const targetWidth = Math.round(canvas.width * scale);
      const targetHeight = Math.round(canvas.height * scale);

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;
      const context = outputCanvas.getContext('2d');
      if (!context) {
        console.log('[SCREENSHOT DEBUG] Could not get 2d context');
        return null;
      }

      context.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.85);

      console.log('[SCREENSHOT DEBUG] Screenshot captured successfully', {
        originalWidth: canvas.width,
        originalHeight: canvas.height,
        targetWidth,
        targetHeight,
        dataUrlLength: dataUrl.length,
        dataUrlPrefix: dataUrl.substring(0, 50)
      });

      return dataUrl;
    } catch (error) {
      console.error('[SCREENSHOT DEBUG] Failed to capture game screenshot:', error);
      return null;
    }
  }

  private async maybeOfferShareRescue(): Promise<boolean> {
    if (this.score < 2000) {
      return false;
    }

    try {
      await highScoreService.awaitReady();
      const username = await highScoreService.getUsername();

      if (shareService.hasShownPromptToday(username)) {
        logger.debug('Share prompt already shown today for', username);
        return false;
      }

      const status = await shareService.getStatus(username, { force: true });
      window.gameStore?.getState().setShareStatus(status);

      if (status.sharedToday) {
        logger.debug('User already shared today, skipping rescue prompt');
        return false;
      }

      const screenshot = this.captureGameScreenshot();
      window.gameStore?.getState().setShareRescueOffer({
        score: this.score,
        highScore: this.highScore,
        screenshot,
        username,
      });
      shareService.markPromptShown(username);
      window.gameStore?.getState().setGameState('sharePrompt');
      return true;
    } catch (error) {
      console.error('Failed to evaluate share rescue eligibility:', error);
      return false;
    }
  }

  public continueAfterShareRescue(): void {
    const store = window.gameStore?.getState();
    store?.setShowNoSpaceToast(false);
    store?.setShareRescueOffer(null);
    store?.setGameState('playing');

    const grid = this.boardRenderer.getGridModel();
    const rescuePieces = this.pieceGenerator.generateLineClearSet(grid);
    this.currentPieces = rescuePieces;
    this.pieceTray.clear();
    this.pieceTray.setPieces(rescuePieces);

    if (this.gameOverCheckTimer) {
      this.gameOverCheckTimer.remove(false);
      this.gameOverCheckTimer = null;
    }

    this.isSpawningSet = false;
    this.hasShownGameOver = false;

    // Re-run validity checks next tick to ensure gameplay resumes smoothly
    this.time.delayedCall(0, () => {
      this.checkRemainingPiecesValidity();
    });
  }

  public async triggerShareRescueTest(): Promise<void> {
    try {
      await highScoreService.awaitReady();
      const username = await highScoreService.getUsername();
      const store = window.gameStore?.getState();
      if (!store) {
        return;
      }

      const status = await shareService.getStatus(username, { force: true });
      store.setShareStatus(status);

      const screenshot = this.captureGameScreenshot();
      store.setShareRescueOffer({
        score: this.score,
        highScore: this.highScore,
        screenshot,
        username,
      });

      store.setShowNoSpaceToast(false);
      store.setGameState('sharePrompt');
    } catch (error) {
      console.error('Failed to trigger share rescue test:', error);
    }
  }

  /**
   * Reset the game for a new play
   */
  private resetGame(): void {
    logger.debug('Resetting game...');

    // Clear any saved game state to ensure fresh start
    GameStateManager.clearGameState();

    // Reset scores and move count
    this.score = 0;
    this.moveCount = 0;
    this.consecutiveClears = 0;
    this.nonClearingPlacements = 0;
    this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);

    // Clear the board
    const grid = this.boardRenderer.getGridModel();
    grid.clear();
    this.boardRenderer.updateBoard();

    // Clear current pieces first
    this.currentPieces = [];
    this.pieceTray.clear();

    // Generate new pieces after a small delay to ensure everything is cleared
    this.time.delayedCall(100, () => {
      logger.debug('Generating new pieces...');
      this.generateNewPieces();
    });
    this.hasShownGameOver = false;
  }

  /**
   * Update preview while dragging
   */
  private updatePreview(pointer: Phaser.Input.Pointer): void {
    if (!this.draggedPiece) return;

    // Clear previous preview
    this.clearPreview();

    // Account for touch offset when calculating board position
    const touchOffset = this.getPointerTouchOffset(pointer);
    const adjustedY = pointer.y + touchOffset; // Align preview with visual drag position

    // Get board position from adjusted pointer position
    const boardCoords = this.boardRenderer.pixelToHex(pointer.x, adjustedY);
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

  private getPointerTouchOffset(pointer: Phaser.Input.Pointer): number {
    const pointerType = (pointer as any).pointerType;
    const isTouchInput = pointer.wasTouch || pointerType === 'touch';
    return isTouchInput ? -100 : 0;
  }

  /**
   * Attempt to place piece
   */
  private attemptPlacement(pointer: Phaser.Input.Pointer, renderer: any): boolean {
    return errorBoundary.safeExecute(() => {
      if (!this.draggedPiece) return false;

      // Account for touch offset when calculating board position
      const touchOffset = this.getPointerTouchOffset(pointer);
      const adjustedY = pointer.y + touchOffset; // Align placement with visual drag position

      // Get board position from adjusted pointer position
      const boardCoords = this.boardRenderer.pixelToHex(pointer.x, adjustedY);
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

      // Increment move count and save game state
      this.moveCount++;
      this.saveGameState();

    // Check for complete lines
    const lines = grid.detectCompleteLines();
    if (lines.length > 0) {
      // Handle line clearing with animations and scoring; game-over check
      // happens after line clear completes inside handleLineCompletion.
      this.handleLineCompletion(lines);
    } else {
      // No lines cleared - increment non-clearing placements
      this.nonClearingPlacements++;

      // Break combo only after 3 non-clearing placements
      if (this.nonClearingPlacements >= 3 && this.consecutiveClears > 0) {
        this.consecutiveClears = 0;
        this.nonClearingPlacements = 0;
        gameBridge.updateCombo(0);
        if (this.comboResetTimer) {
          this.comboResetTimer.destroy();
          this.comboResetTimer = null;
        }
      }

      // No lines to clear – re-evaluate remaining pieces immediately.
      if (this.gameOverCheckTimer) this.gameOverCheckTimer.remove(false);
      this.gameOverCheckTimer = this.time.delayedCall(0, () => {
        this.gameOverCheckTimer = null;
        this.checkRemainingPiecesValidity();
      });
    }

      // Success effect
      this.showPlacementEffect(boardCoords);

      return true;
    }, false, 'piece-placement');
  }

  /**
   * Show placement effect
   */
  private showPlacementEffect(coords: HexCoordinates): void {
    const pos = this.boardRenderer.hexToPixel(coords);
    if (!pos) return;

    // Create quick pulse effect
    const circle = this.add.circle(pos.x, pos.y, 5, 0xffffff, 1);
    circle.setDepth(150);

    this.tweens.add({
      targets: circle,
      scale: 4,
      alpha: 0,
      duration: 200,
      ease: 'Expo.easeOut',
      onComplete: () => circle.destroy()
    });

    // Add small particles for extra juice
    for (let i = 0; i < 4; i++) {
      const particle = this.add.circle(pos.x, pos.y, 2, 0xffffff, 0.6);
      particle.setDepth(149);

      const angle = (Math.PI * 2 / 4) * i;
      const distance = 20;

      this.tweens.add({
        targets: particle,
        x: pos.x + Math.cos(angle) * distance,
        y: pos.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 250,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Handle line completion
   */
  private async handleLineCompletion(lines: any[]): Promise<void> {
    const grid = this.boardRenderer.getGridModel();

    // Increment consecutive clears count
    this.consecutiveClears++;

    // Reset non-clearing placements since we cleared lines
    this.nonClearingPlacements = 0;

    // Calculate base points
    const basePoints = 100 * lines.length;
    let totalPoints = basePoints;

    // Combo system: starts at 3rd consecutive clear
    if (this.consecutiveClears >= 3) {
      // Combo starts from 3rd clear: combo 1 at 3 clears, combo 2 at 4 clears, etc.
      const comboLevel = this.consecutiveClears - 2; // 3 clears = combo 1, 4 = combo 2, etc.
      const comboBonus = 1 + (0.1 * (comboLevel - 1)); // combo 1 = 1.0x, combo 2 = 1.1x, combo 3 = 1.2x
      totalPoints = Math.round(basePoints * comboBonus);

      // Show combo popup (starts from X1 at 3rd clear)
      this.createComboPopup(comboLevel, totalPoints);

      // Update combo in React UI
      gameBridge.updateCombo(comboLevel);
    } else {
      // No combo yet, just regular points
      gameBridge.updateCombo(0);
    }

    // Update score
    this.updateScore(totalPoints);

    // Cancel any existing reset timer
    if (this.comboResetTimer) {
      this.comboResetTimer.destroy();
      this.comboResetTimer = null;
    }

    // Camera shake disabled
    // const shakeIntensity = 0.003 + (lines.length * 0.002);
    // const shakeDuration = 200 + (lines.length * 50);
    // this.cameras.main.shake(shakeDuration, shakeIntensity, true);

    // Animate the line clearing with smooth wave effect
    await this.boardRenderer.animateLineClear(lines);

    // Visual feedback
    this.showLinesClearedEffect(lines.length, totalPoints);

    // Save game state after line clear
    this.saveGameState();

    // After clearing lines, check if remaining pieces can still be placed
    // Line clears create space, but pieces might still be unplaceable
    if (this.gameOverCheckTimer) this.gameOverCheckTimer.remove(false);
    this.gameOverCheckTimer = this.time.delayedCall(0, () => {
      this.gameOverCheckTimer = null;
      this.checkRemainingPiecesValidity();
    });
  }

  /**
   * Create combo popup with random gradient colors
   */
  private createComboPopup(combo: number, points: number): void {
    // Random color pairs for gradient
    const colorPairs = [
      [0xFF00FF, 0x00FFFF], // Magenta to Cyan
      [0xFF0080, 0xFFD700], // Pink to Gold
      [0x00FF00, 0x00FFFF], // Green to Cyan
      [0xFF4500, 0xFFFF00], // Orange to Yellow
      [0x9400D3, 0x4B0082], // Violet to Indigo
      [0xFF1493, 0xFF69B4], // Deep Pink to Hot Pink
      [0x00CED1, 0x48D1CC], // Dark Turquoise to Medium Turquoise
      [0xFF6347, 0xFFA500], // Tomato to Orange
      [0x7FFF00, 0x32CD32], // Chartreuse to Lime Green
      [0xDC143C, 0xFF0000], // Crimson to Red
    ];

    const randomPair = colorPairs[Math.floor(Math.random() * colorPairs.length)];

    // Get center of screen
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Create main text
    const comboText = this.add.text(centerX, centerY - 50, `COMBO X${combo}`, {
      fontSize: '72px',
      fontFamily: DS.getFontFamily('displayBlack'),
      fontStyle: '900 normal',
      stroke: '#000000',
      strokeThickness: 6
    });
    comboText.setOrigin(0.5);
    comboText.setDepth(1000);

    // Apply gradient effect using tint
    const gradient = comboText.setTint(randomPair[0], randomPair[0], randomPair[1], randomPair[1]);

    // Add points text below
    const pointsText = this.add.text(centerX, centerY + 10, `+${points}`, {
      fontSize: '36px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4
    });
    pointsText.setOrigin(0.5);
    pointsText.setDepth(1000);

    // Animate combo text - scale up and fade out
    this.tweens.add({
      targets: [comboText, pointsText],
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      y: '-=100',
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        comboText.destroy();
        pointsText.destroy();
      }
    });

    // Initial punch effect
    this.tweens.add({
      targets: [comboText, pointsText],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  /**
   * Update score
   */
  private async updateScore(points: number): Promise<void> {
    const previousHighScore = this.highScore;
    this.score += points;
    this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);

    // Update React UI - setScore will automatically update highScore if needed
    gameBridge.updateScore(this.score);

    // Update high score if needed
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreText.setText(`Best: ${this.highScore.toLocaleString()}`);

      // Don't call updateHighScore here - it's already handled by setScore

      // Celebrate new personal record once per run
      if (false) {

        const delta = Math.max(0, this.highScore - previousHighScore);
        const screenshot = this.captureGameScreenshot();
        let username: string | null = null;

        try {
          username = await highScoreService.getUsername();
        } catch (error) {
          console.error('Failed to resolve username for high score celebration:', error);
        }

        const payload = {
          newHighScore: this.highScore,
          previousHighScore,
          delta,
          screenshot,
          username: username ?? 'Hexomind Player'
        };

        this.time.delayedCall(0, () => {
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('hexomind:newHighScore', { detail: payload }));
          } else {
                  }
        });
      }

      // Submit to Reddit KV storage
      try {
        const result = await highScoreService.submitScore(this.score);
        if (result.updated && result.rank) {
          logger.debug(`New high score! Rank: #${result.rank}`);
          // Could show rank in UI
        }
      } catch (error) {
        console.error('Failed to submit high score:', error);
      }

      // Also save locally as fallback
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
    // Show the line clear popup with compliment and score
    if (window.gameStore) {
      window.gameStore.getState().showLineClearPopup(lineCount, points);
    }
  }

  /**
   * Show welcome animation
   */
  private showWelcomeAnimation(): void {
    // Welcome animation disabled - no text shown
    return;
  }

  /**
   * Handle theme change
   */
  private handleThemeChange(): void {
    const theme = this.themeProvider.getTheme();

    // Don't update background - keep it transparent
    // this.cameras.main.setBackgroundColor(bgColor);

    // Update text colors
    this.scoreText.setColor(this.themeProvider.toCSS(theme.textPrimary));
    this.highScoreText.setColor(this.themeProvider.toCSS(theme.textSecondary));
  }

  /**
   * Load high score from Reddit KV or local storage
   */
  private async loadHighScore(): Promise<void> {
    await highScoreService.awaitReady();
    let bestScore = 0;

    try {
      // Try to load from Reddit KV first
      const serverHighScore = await highScoreService.getHighScore();
      if (serverHighScore > 0) {
        bestScore = Math.max(bestScore, serverHighScore);
      }
    } catch (error) {
      console.error('Failed to load high score from server:', error);
    }

    // Check local storage
    const saved = localStorage.getItem('hexomind_highscore');
    if (saved) {
      const localHighScore = parseInt(saved, 10) || 0;
      bestScore = Math.max(bestScore, localHighScore);
    }

    // Check saved game state
    const savedGame = GameStateManager.loadGameState();
    if (savedGame && savedGame.highScore) {
      bestScore = Math.max(bestScore, savedGame.highScore);
    }

    // Set the best score from all sources
    this.highScore = bestScore;
    this.highScoreText.setText(`Best: ${this.highScore.toLocaleString()}`);
    gameBridge.updateHighScore(this.highScore);

    // Save it back to ensure consistency
    if (this.highScore > 0) {
      localStorage.setItem('hexomind_highscore', this.highScore.toString());
    }
  }

  /**
   * Save high score to local storage
   */
  private saveHighScore(): void {
    localStorage.setItem('hexomind_highscore', this.highScore.toString());
    // Also update the saved game state if it exists
    this.saveGameState();
  }

  update(time: number, delta: number): void {
    // Game update logic will go here
    // For now, empty as we handle everything through events
  }
}
