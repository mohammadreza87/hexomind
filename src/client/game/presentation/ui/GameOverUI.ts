/**
 * Game Over UI component - Modern Design System Implementation
 */
import * as Phaser from 'phaser';
import { highScoreService } from '../../../services/HighScoreService';
import { UIComponent } from './components/UIComponent';

export class GameOverUI extends UIComponent {
  private background: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private gameOverText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private bestScoreText: Phaser.GameObjects.Text;
  private dailyRankText: Phaser.GameObjects.Text;
  private leaderboardButton: Phaser.GameObjects.Container;
  private tryAgainButton: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, { visible: false });
    this.setDepth(2000);

    const { width, height } = scene.cameras.main;

    const spacing = this.spacing;

    const colors = {
      bgPrimary: this.getColor('solid', 'bgPrimary'),
      bgElevated: this.getColor('solid', 'bgElevated'),
      glassBorder: this.getColor('glass', 'border'),
      textPrimary: this.getColor('solid', 'textPrimary'),
      danger: this.getColor('solid', 'danger'),
      warning: this.getColor('solid', 'warning'),
      info: this.getColor('solid', 'info'),
      success: this.getColor('solid', 'success'),
    };

    // Ensure this UI sits above everything else and starts hidden
    this.setVisible(false);

    // Semi-transparent background overlay with blur effect
    this.background = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      this.colorToNumber(colors.bgPrimary),
      0.85
    );
    this.background.setInteractive();
    this.add(this.background);

    // Main panel with modern glassmorphism effect
    const panelWidth = Math.min(400, width * 0.9);
    const panelHeight = Math.min(480, height * 0.75);
    this.panel = scene.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      this.colorToNumber(colors.bgElevated),
      0.95
    );
    this.panel.setStrokeStyle(1, this.colorToNumber(colors.glassBorder));
    this.add(this.panel);

    // Game Over title with Inter Black font
    this.gameOverText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + spacing.xxl,
      'GAME OVER',
      {
        fontSize: this.getFontSize('3xl'),
        fontFamily: this.getFontFamily('displayBlack'),
        fontStyle: '900 normal', // Inter Black
        color: colors.danger,
        align: 'center'
      }
    ).setOrigin(0.5);
    this.add(this.gameOverText);

    // Score display with bold Inter font
    this.scoreText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + spacing.xxl + spacing.xxxl,
      'Score: 0',
      {
        fontSize: this.getFontSize('2xl'),
        fontFamily: this.getFontFamily('display'),
        fontStyle: '700 normal', // Bold
        color: colors.textPrimary,
        align: 'center'
      }
    ).setOrigin(0.5);
    this.add(this.scoreText);

    // Best score display with consistent spacing
    this.bestScoreText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + spacing.xxl + spacing.xxxl + spacing.xl,
      'Best: 0',
      this.getTextStyle('body', {
        color: colors.warning,
        weight: 'medium'
      })
    ).setOrigin(0.5);
    this.add(this.bestScoreText);

    // Daily rank display with modern font
    this.dailyRankText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + spacing.xxl + spacing.xxxl + spacing.xxxl,
      'Daily Rank: Loading...',
      this.getTextStyle('caption', {
        color: colors.info,
        weight: 'regular'
      })
    ).setOrigin(0.5);
    this.add(this.dailyRankText);

    // Leaderboard button with modern design
    this.leaderboardButton = this.createButton(
      scene,
      width / 2,
      height / 2 + spacing.xl,
      'Leaderboard',
      colors.info,
      () => {
        this.emit('showLeaderboard');
      }
    );
    this.add(this.leaderboardButton);

    // Try Again button with primary color
    this.tryAgainButton = this.createButton(
      scene,
      width / 2,
      height / 2 + spacing.xl + spacing.xxxl,
      'Try Again',
      colors.success,
      () => {
        this.emit('tryAgain');
        this.hide();
      }
    );
    this.add(this.tryAgainButton);

    // Initially hidden
    this.setVisible(false);
  }

  /**
   * Create a modern button with consistent design
   */
  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button = scene.add.container(x, y);

    const buttonWidth = 200;
    const buttonHeight = this.getSpacing('xxl');

    const bg = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, this.colorToNumber(color), 0.9);
    bg.setStrokeStyle(1, this.colorToNumber(this.getColor('glass', 'border')));
    bg.setInteractive();

    const label = scene.add.text(0, 0, text,
      this.getTextStyle('button', {
        color: this.getColor('solid', 'textPrimary'),
        weight: 'medium'
      })
    ).setOrigin(0.5);

    button.add([bg, label]);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.setAlpha(1);
      scene.input.setDefaultCursor('pointer');
    });
    bg.on('pointerout', () => {
      bg.setAlpha(0.9);
      scene.input.setDefaultCursor('default');
    });

    return button;
  }

  /**
   * Show game over screen with score and stats
   */
  async show(score: number, bestScore: number): Promise<void> {
    if (this.isVisible) return;

    this.isVisible = true;
    this.setVisible(true);
    this.setAlpha(0);

    // Update scores
    this.scoreText.setText(`Score: ${score.toLocaleString()}`);
    this.bestScoreText.setText(`Best: ${bestScore.toLocaleString()}`);

    // Animate game over text
    this.gameOverText.setScale(0);
    this.scene.tweens.add({
      targets: this.gameOverText,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Get daily rank
    this.dailyRankText.setText('Daily Rank: Loading...');
    this.getDailyRank(score);

    // Fade in
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    // No animation for try again button - keep it static
  }

  /**
   * Get and display daily rank
   */
  private async getDailyRank(score: number): Promise<void> {
    try {
      await highScoreService.waitForInitialization();
      // Submit score first
      const result = await highScoreService.submitScore(score);

      // Get daily leaderboard
      const dailyLeaderboard = await highScoreService.getDailyLeaderboard();

      // Find player's position
      const username = await highScoreService.getUsername();
      const position = dailyLeaderboard.findIndex(entry => entry.username === username) + 1;

      if (position > 0) {
        this.dailyRankText.setText(`Daily Rank: #${position}`);

        // Add celebration if in top 3
        if (position <= 3) {
          const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
          this.dailyRankText.setText(`${medal} Daily Rank: #${position} ${medal}`);

          // Glow effect for top 3
          this.scene.tweens.add({
            targets: this.dailyRankText,
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
          });
        }
      } else if (result.rank) {
        this.dailyRankText.setText(`Global Rank: #${result.rank}`);
      } else {
        this.dailyRankText.setText('Rank: Unranked');
      }
    } catch (error) {
      console.error('Failed to get daily rank:', error);
      this.dailyRankText.setText('Rank: Unavailable');
    }
  }

  /**
   * Hide the game over screen
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;

    // Stop button animation
    this.scene.tweens.killTweensOf(this.tryAgainButton);

    // Fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
      }
    });
  }

  /**
   * Check if visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }
}

// Extend HighScoreService to add daily leaderboard
declare module '../../../services/HighScoreService' {
  interface HighScoreService {
    getDailyLeaderboard(): Promise<LeaderboardEntry[]>;
  }
}

// Implement getDailyLeaderboard in HighScoreService
highScoreService.getDailyLeaderboard = async function(): Promise<any[]> {
  try {
    await this.waitForInitialization();
    // Get today's date for daily leaderboard
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/leaderboard?type=daily&date=${today}&limit=100`);
    if (response.ok) {
      const data = await response.json();
      return data.leaderboard || [];
    }
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error);
  }
  return [];
};
