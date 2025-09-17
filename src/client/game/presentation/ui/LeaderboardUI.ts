/**
 * Leaderboard UI component - Modern Design System Implementation
 */
import * as Phaser from 'phaser';
import { highScoreService } from '../../../services/HighScoreService';
import { DS } from '../../config/DesignSystem';

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

    const spacing = {
      xl: DS.getSpacingValue('xl'),
      xxl: DS.getSpacingValue('xxl'),
      sm: DS.getSpacingValue('sm'),
      xs: DS.getSpacingValue('xs'),
    };

    const palette = {
      overlay: DS.getColor('solid', 'bgPrimary'),
      panel: DS.getColor('solid', 'bgElevated'),
      border: DS.getColor('glass', 'border'),
      warning: DS.getColor('solid', 'warning'),
      textPrimary: DS.getColor('solid', 'textPrimary'),
      textMuted: DS.getColor('solid', 'textMuted'),
      toggleText: DS.getColor('accents', 'teal'),
      toggleBackground: DS.getColor('accents', 'midnight'),
      close: DS.getColor('accents', 'coral'),
      highlight: DS.getColor('accents', 'teal'),
      highlightSecondary: DS.getColor('accents', 'grayLighter'),
      separator: DS.getColor('accents', 'grayMuted'),
    };

    const typography = {
      displayBlack: DS.getFontFamily('displayBlack'),
      mono: DS.getFontFamily('mono'),
    };

    const togglePaddingX = spacing.sm + spacing.xs / 2;
    const togglePaddingY = spacing.xs + spacing.xs / 4;
    const closePadding = spacing.xs + spacing.xs / 4;
    const toggleOffsetY = spacing.xxl + spacing.sm + spacing.xs * 2;

    // Semi-transparent background overlay with modern blur
    this.background = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      DS.colorStringToNumber(palette.overlay),
      0.85
    );
    this.background.setInteractive();
    this.add(this.background);

    // Leaderboard panel with glassmorphism
    const panelWidth = Math.min(440, width * 0.9);
    const panelHeight = Math.min(560, height * 0.85);
    const panel = scene.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      DS.colorStringToNumber(palette.panel),
      0.95
    );
    panel.setStrokeStyle(1, DS.colorStringToNumber(palette.border));
    this.add(panel);

    // Title with Inter Black font
    this.titleText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + spacing.xl,
      'LEADERBOARD',
      {
        fontSize: DS.getFontSize('2xl'),
        fontFamily: typography.displayBlack,
        fontStyle: '900 normal', // Inter Black
        color: palette.warning,
        align: 'center'
      }
    ).setOrigin(0.5);
    this.add(this.titleText);

    // Type toggle button
    this.typeToggle = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + toggleOffsetY,
      'Global Rankings',
      {
        fontSize: DS.getFontSize('base'),
        fontFamily: typography.mono,
        color: palette.toggleText,
        backgroundColor: palette.toggleBackground,
        padding: { x: togglePaddingX, y: togglePaddingY }
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
        fontSize: DS.getFontSize('lg'),
        fontFamily: typography.mono,
        color: palette.textPrimary
      }
    ).setOrigin(0.5).setVisible(false);
    this.add(this.loadingText);

    // Close button
    this.closeButton = scene.add.text(
      width / 2 + panelWidth / 2 - 20,
      height / 2 - panelHeight / 2 + 20,
      '✕',
      {
        fontSize: DS.getFontSize('xl'),
        fontFamily: typography.mono,
        color: palette.close,
        padding: { x: closePadding, y: closePadding }
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

    const spacingXl = DS.getSpacingValue('xl');
    const spacingXxl = DS.getSpacingValue('xxl');
    const spacingXs = DS.getSpacingValue('xs');
    const monoFont = DS.getFontFamily('mono');
    const highlightColor = DS.getColor('accents', 'teal');
    const textPrimary = DS.getColor('solid', 'textPrimary');
    const separatorColor = DS.getColor('accents', 'grayMuted');
    const errorColor = DS.getColor('accents', 'coral');

    try {
      await highScoreService.waitForInitialization();
      const entries = await highScoreService.getLeaderboard(this.currentType, 10);
      this.loadingText.setVisible(false);

      if (entries.length === 0) {
        const noDataText = this.scene.add.text(
          0,
          0,
          'No scores yet. Be the first!',
          DS.getTextStyle('body', {
            color: DS.getColor('solid', 'textMuted')
          })
        ).setOrigin(0.5);
        this.entriesContainer.add(noDataText);
        return;
      }

      // Display entries
      const startY = -(spacingXxl * 2 + spacingXl / 2);
      const entrySpacing = spacingXl + spacingXs;
      const currentUser = highScoreService.getUsername();

      entries.forEach((entry, index) => {
        const isCurrentUser = entry.username === currentUser;
        const yPos = startY + index * entrySpacing;

        // Rank
        const rankText = this.scene.add.text(
          -140,
          yPos,
          `#${entry.rank}`,
          {
            fontSize: DS.getFontSize('lg'),
            fontFamily: monoFont,
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
            fontSize: DS.getFontSize('base'),
            fontFamily: monoFont,
            fontStyle: isCurrentUser ? 'bold' : 'normal',
            color: isCurrentUser ? highlightColor : textPrimary
          }
        ).setOrigin(0, 0.5);

        // Score
        const scoreText = this.scene.add.text(
          130,
          yPos,
          entry.score.toLocaleString(),
          {
            fontSize: DS.getFontSize('lg'),
            fontFamily: monoFont,
            fontStyle: 'bold',
            color: DS.getColor('accents', 'gold')
          }
        ).setOrigin(1, 0.5);

        // Highlight current user
        if (isCurrentUser) {
          const highlight = this.scene.add.rectangle(
            0,
            yPos,
            300,
            30,
            DS.colorStringToNumber(highlightColor),
            0.1
          );
          const highlightStroke = DS.colorStringToNumber(highlightColor);
          highlight.setStrokeStyle(1, highlightStroke, 0.3);
          this.entriesContainer.add(highlight);
        }

        this.entriesContainer.add([rankText, nameText, scoreText]);
      });

      // Add user's rank if not in top 10
      const userRank = await highScoreService.getUserRank();
      if (userRank && userRank > 10) {
        const separator = this.scene.add.text(
          0,
          startY + entries.length * entrySpacing + spacingXs * 2.5,
          '···',
          {
            fontSize: DS.getFontSize('base'),
            fontFamily: monoFont,
            color: separatorColor
          }
        ).setOrigin(0.5);

        const userEntry = this.scene.add.text(
          0,
          startY + entries.length * entrySpacing + spacingXl,
          `Your Rank: #${userRank}`,
          {
            fontSize: DS.getFontSize('base'),
            fontFamily: monoFont,
            fontStyle: 'bold',
            color: highlightColor
          }
        ).setOrigin(0.5);

        this.entriesContainer.add([separator, userEntry]);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.loadingText.setText('Failed to load scores');
      this.loadingText.setColor(errorColor);
    }
  }

  /**
   * Get color based on rank with modern palette
   */
  private getRankColor(rank: number): string {
    switch (rank) {
      case 1:
        return DS.getColor('accents', 'gold');
      case 2:
        return DS.getColor('accents', 'silver');
      case 3:
        return DS.getColor('accents', 'bronze');
      default:
        return DS.getColor('solid', 'textPrimary');
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
    await this.waitForInitialization();
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