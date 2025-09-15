/**
 * Leaderboard UI component for displaying high scores
 */
import * as Phaser from 'phaser';
import { highScoreService, LeaderboardEntry } from '../../../services/HighScoreService';

export class LeaderboardUI extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private entriesContainer: Phaser.GameObjects.Container;
  private closeButton: Phaser.GameObjects.Text;
  private typeToggle: Phaser.GameObjects.Text;
  private loadingText: Phaser.GameObjects.Text;
  private currentType: 'global' | 'subreddit' = 'global';
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const { width, height } = scene.cameras.main;

    // Semi-transparent background overlay
    this.background = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.8
    );
    this.background.setInteractive();
    this.add(this.background);

    // Leaderboard panel
    const panelWidth = Math.min(400, width * 0.9);
    const panelHeight = Math.min(500, height * 0.8);
    const panel = scene.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      0x1a1a2e,
      1
    );
    panel.setStrokeStyle(2, 0x16213e);
    this.add(panel);

    // Title
    this.titleText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + 30,
      'LEADERBOARD',
      {
        fontSize: '28px',
        fontFamily: '"Lilita One", "Comic Sans MS", cursive',
        fontStyle: 'bold',
        color: '#FFD700'
      }
    ).setOrigin(0.5);
    this.add(this.titleText);

    // Type toggle button
    this.typeToggle = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + 65,
      'Global Rankings',
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#4ECDC4',
        backgroundColor: '#0f0f1e',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setInteractive();

    this.typeToggle.on('pointerdown', () => this.toggleType());
    this.typeToggle.on('pointerover', () => {
      this.typeToggle.setScale(1.05);
      scene.input.setDefaultCursor('pointer');
    });
    this.typeToggle.on('pointerout', () => {
      this.typeToggle.setScale(1);
      scene.input.setDefaultCursor('default');
    });
    this.add(this.typeToggle);

    // Entries container
    this.entriesContainer = scene.add.container(width / 2, height / 2);
    this.add(this.entriesContainer);

    // Loading text
    this.loadingText = scene.add.text(
      width / 2,
      height / 2,
      'Loading...',
      {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#FFFFFF'
      }
    ).setOrigin(0.5).setVisible(false);
    this.add(this.loadingText);

    // Close button
    this.closeButton = scene.add.text(
      width / 2 + panelWidth / 2 - 20,
      height / 2 - panelHeight / 2 + 20,
      '✕',
      {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#FF6B6B',
        padding: { x: 5, y: 5 }
      }
    ).setOrigin(0.5).setInteractive();

    this.closeButton.on('pointerdown', () => this.hide());
    this.closeButton.on('pointerover', () => {
      this.closeButton.setScale(1.2);
      scene.input.setDefaultCursor('pointer');
    });
    this.closeButton.on('pointerout', () => {
      this.closeButton.setScale(1);
      scene.input.setDefaultCursor('default');
    });
    this.add(this.closeButton);

    // Initially hidden
    this.setVisible(false);
    this.setDepth(1000);

    scene.add.existing(this);
  }

  /**
   * Toggle between global and subreddit leaderboards
   */
  private toggleType(): void {
    this.currentType = this.currentType === 'global' ? 'subreddit' : 'global';
    this.typeToggle.setText(
      this.currentType === 'global' ? 'Global Rankings' : 'Subreddit Rankings'
    );
    this.loadLeaderboard();
  }

  /**
   * Show the leaderboard
   */
  async show(): Promise<void> {
    if (this.isVisible) return;

    this.isVisible = true;
    this.setVisible(true);
    this.setAlpha(0);

    // Fade in animation
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    await this.loadLeaderboard();
  }

  /**
   * Hide the leaderboard
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;

    // Fade out animation
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
   * Load and display leaderboard data
   */
  private async loadLeaderboard(): Promise<void> {
    // Clear previous entries
    this.entriesContainer.removeAll(true);
    this.loadingText.setVisible(true);

    try {
      const entries = await highScoreService.getLeaderboard(this.currentType, 10);
      this.loadingText.setVisible(false);

      if (entries.length === 0) {
        const noDataText = this.scene.add.text(
          0,
          0,
          'No scores yet. Be the first!',
          {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#666666'
          }
        ).setOrigin(0.5);
        this.entriesContainer.add(noDataText);
        return;
      }

      // Display entries
      const startY = -120;
      const spacing = 35;
      const currentUser = highScoreService.getUsername();

      entries.forEach((entry, index) => {
        const isCurrentUser = entry.username === currentUser;
        const yPos = startY + index * spacing;

        // Rank
        const rankText = this.scene.add.text(
          -140,
          yPos,
          `#${entry.rank}`,
          {
            fontSize: '18px',
            fontFamily: 'monospace',
            fontStyle: entry.rank <= 3 ? 'bold' : 'normal',
            color: this.getRankColor(entry.rank)
          }
        ).setOrigin(0.5);

        // Username
        const nameText = this.scene.add.text(
          -30,
          yPos,
          entry.username.substring(0, 15),
          {
            fontSize: '16px',
            fontFamily: 'monospace',
            fontStyle: isCurrentUser ? 'bold' : 'normal',
            color: isCurrentUser ? '#4ECDC4' : '#FFFFFF'
          }
        ).setOrigin(0, 0.5);

        // Score
        const scoreText = this.scene.add.text(
          130,
          yPos,
          entry.score.toLocaleString(),
          {
            fontSize: '18px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#FFD700'
          }
        ).setOrigin(1, 0.5);

        // Highlight current user
        if (isCurrentUser) {
          const highlight = this.scene.add.rectangle(
            0,
            yPos,
            300,
            30,
            0x4ECDC4,
            0.1
          );
          highlight.setStrokeStyle(1, 0x4ECDC4, 0.3);
          this.entriesContainer.add(highlight);
        }

        this.entriesContainer.add([rankText, nameText, scoreText]);
      });

      // Add user's rank if not in top 10
      const userRank = await highScoreService.getUserRank();
      if (userRank && userRank > 10) {
        const separator = this.scene.add.text(
          0,
          startY + entries.length * spacing + 10,
          '···',
          {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#666666'
          }
        ).setOrigin(0.5);

        const userEntry = this.scene.add.text(
          0,
          startY + entries.length * spacing + 40,
          `Your Rank: #${userRank}`,
          {
            fontSize: '16px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#4ECDC4'
          }
        ).setOrigin(0.5);

        this.entriesContainer.add([separator, userEntry]);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.loadingText.setText('Failed to load scores');
      this.loadingText.setColor('#FF6B6B');
    }
  }

  /**
   * Get color based on rank
   */
  private getRankColor(rank: number): string {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#FFFFFF';
    }
  }

  /**
   * Check if leaderboard is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }
}

// Extension to get user rank
declare module '../../../services/HighScoreService' {
  interface HighScoreService {
    getUserRank(): Promise<number | null>;
  }
}

// Implement getUserRank in HighScoreService
highScoreService.getUserRank = async function(): Promise<number | null> {
  try {
    const username = this.getUsername();
    const response = await fetch(`/api/highscore/${username}/rank`);
    if (response.ok) {
      const data = await response.json();
      return data.rank || null;
    }
  } catch (error) {
    console.error('Error fetching user rank:', error);
  }
  return null;
};