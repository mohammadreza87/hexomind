import * as Phaser from 'phaser';
import { UIComponent } from './components/UIComponent';
import { highScoreService } from '../../../services/HighScoreService';
import {
  leaderboardService,
  type LeaderboardViewEntry,
  type LeaderboardViewPeriod,
} from '../../../services/LeaderboardService';

type LeaderboardType = LeaderboardViewPeriod;

/**
 * Modern Leaderboard UI with tabs, animations, and beautiful design
 */
export class ModernLeaderboardUI extends UIComponent {
  private background: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private closeButton: Phaser.GameObjects.Container;

  // Tabs
  private tabContainer: Phaser.GameObjects.Container;
  private dailyTab: Phaser.GameObjects.Container;
  private weeklyTab: Phaser.GameObjects.Container;
  private allTimeTab: Phaser.GameObjects.Container;
  private activeTab: LeaderboardType = 'daily';
  private tabIndicator: Phaser.GameObjects.Rectangle;

  // Content
  private contentContainer: Phaser.GameObjects.Container;
  private entriesContainer: Phaser.GameObjects.Container;
  private scrollMask: Phaser.GameObjects.Graphics;
  private loadingText: Phaser.GameObjects.Text;
  private emptyText: Phaser.GameObjects.Text;

  // Player position display
  private playerPositionContainer: Phaser.GameObjects.Container;
  private playerPositionBg: Phaser.GameObjects.Rectangle;
  private playerPositionText: Phaser.GameObjects.Text;

  private isVisible: boolean = false;
  private entries: Map<LeaderboardType, LeaderboardViewEntry[]> = new Map();
  private isLoading: Map<LeaderboardType, boolean> = new Map();
  private currentPlayerScore: number = 0;
  private scrollY: number = 0;
  private maxScrollY: number = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, { visible: false });

    const { width, height } = scene.cameras.main;

    const palette = this.getPalette();
    const displayFont = this.getFontFamily('display');
    const bodyFont = this.getFontFamily('body');

    // Dark overlay background
    this.background = scene.add.rectangle(
      width / 2, height / 2, width, height,
      this.colorToNumber(palette.overlay), 0.8
    );
    this.background.setInteractive();
    this.add(this.background);

    // Main panel with gradient-like effect
    const panelWidth = Math.min(width * 0.9, 480);
    const panelHeight = Math.min(height * 0.85, 640);

    this.panel = scene.add.rectangle(
      width / 2, height / 2,
      panelWidth, panelHeight,
      this.colorToNumber(palette.panelBackground), 1
    );
    this.panel.setStrokeStyle(2, this.colorToNumber(palette.panelBorder), 0.3);
    this.add(this.panel);

    // Title with gradient effect
    this.titleText = scene.add.text(
      width / 2, height / 2 - panelHeight / 2 + 40,
      'LEADERBOARD',
      {
        fontSize: this.getFontSize('2xl'),
        fontFamily: displayFont,
        fontStyle: '900 normal',
        color: palette.textPrimary
      }
    ).setOrigin(0.5);
    this.add(this.titleText);

    // Close button
    this.createCloseButton(scene, width / 2 + panelWidth / 2 - 30, height / 2 - panelHeight / 2 + 30);

    // Create tabs
    this.createTabs(scene, width / 2, height / 2 - panelHeight / 2 + 90, panelWidth);

    // Content container with scroll area
    const scrollAreaTop = height / 2 - panelHeight / 2 + 140;
    const scrollAreaBottom = height / 2 + panelHeight / 2 - 100; // Leave space for player position
    const scrollAreaHeight = scrollAreaBottom - scrollAreaTop;

    this.contentContainer = scene.add.container(width / 2, scrollAreaTop + scrollAreaHeight / 2);
    this.add(this.contentContainer);

    // Create mask for scrollable area (invisible, just for masking)
    this.scrollMask = scene.add.graphics();
    this.scrollMask.fillStyle(0xffffff, 1);
    this.scrollMask.fillRect(
      width / 2 - panelWidth / 2 + 20,
      scrollAreaTop,
      panelWidth - 40,
      scrollAreaHeight
    );
    this.scrollMask.setVisible(false); // Hide the mask graphics itself
    const mask = this.scrollMask.createGeometryMask();

    // Entries container (will be masked)
    this.entriesContainer = scene.add.container(0, 0);
    this.contentContainer.add(this.entriesContainer);
    this.entriesContainer.setMask(mask);

    // Enable scroll interaction on panel
    this.panel.setInteractive();
    this.setupScrolling(scene, scrollAreaHeight);

    // Loading indicator
    this.loadingText = scene.add.text(0, 0, 'Loading...', {
      fontSize: this.getFontSize('lg'),
      fontFamily: bodyFont,
      color: palette.gray
    }).setOrigin(0.5).setVisible(false);
    this.contentContainer.add(this.loadingText);

    // Empty state
    this.emptyText = scene.add.text(0, 0, 'No scores yet.\nBe the first!', {
      fontSize: this.getFontSize('lg'),
      fontFamily: bodyFont,
      color: palette.grayMuted,
      align: 'center'
    }).setOrigin(0.5).setVisible(false);
    this.contentContainer.add(this.emptyText);

    // Player position display at bottom
    this.createPlayerPositionDisplay(scene, width / 2, height / 2 + panelHeight / 2 - 50, panelWidth);

    // Initialize
    this.setDepth(this.layers.modal);
    this.setVisible(false);
  }

  /**
   * Create close button
   */
  private createCloseButton(scene: Phaser.Scene, x: number, y: number): void {
    this.closeButton = scene.add.container(x, y);

    const palette = this.getPalette();
    const bg = scene.add.circle(0, 0, 20, this.colorToNumber(palette.closeBg), 1);
    bg.setStrokeStyle(1, this.colorToNumber(palette.panelBorder), 0.3);
    bg.setInteractive();

    const closeX = scene.add.text(0, 0, '✕', {
      fontSize: this.getFontSize('lg'),
      fontFamily: this.getFontFamily('body'),
      color: palette.closeText
    }).setOrigin(0.5);

    this.closeButton.add([bg, closeX]);

    bg.on('pointerover', () => {
      bg.setFillStyle(this.colorToNumber(palette.closeBgHover));
      closeX.setColor(palette.textPrimary);
      scene.input.setDefaultCursor('pointer');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(this.colorToNumber(palette.closeBg));
      closeX.setColor(palette.closeText);
      scene.input.setDefaultCursor('default');
    });

    bg.on('pointerdown', () => this.hide());

    this.add(this.closeButton);
  }

  /**
   * Create tab buttons
   */
  private createTabs(scene: Phaser.Scene, x: number, y: number, panelWidth: number): void {
    this.tabContainer = scene.add.container(x, y);

    const tabWidth = (panelWidth - 60) / 3;
    const tabHeight = 40;
    const palette = this.getPalette();

    // Tab indicator (animated underline)
    this.tabIndicator = scene.add.rectangle(
      -tabWidth - 10, tabHeight / 2 + 5,
      tabWidth - 20, 3,
      this.colorToNumber(palette.highlight), 1
    );
    this.tabContainer.add(this.tabIndicator);

    // Daily tab
    this.dailyTab = this.createTab(scene, -tabWidth - 10, 0, 'DAILY', 'daily', tabWidth);
    this.tabContainer.add(this.dailyTab);

    // Weekly tab
    this.weeklyTab = this.createTab(scene, 0, 0, 'WEEKLY', 'weekly', tabWidth);
    this.tabContainer.add(this.weeklyTab);

    // All Time tab
    this.allTimeTab = this.createTab(scene, tabWidth + 10, 0, 'ALL TIME', 'global', tabWidth);
    this.tabContainer.add(this.allTimeTab);

    this.add(this.tabContainer);

    // Set initial active tab
    this.setActiveTab('daily');
  }

  /**
   * Create individual tab
   */
  private createTab(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    type: LeaderboardType,
    width: number
  ): Phaser.GameObjects.Container {
    const tab = scene.add.container(x, y);
    const palette = this.getPalette();
    const displayFont = this.getFontFamily('display');

    const bg = scene.add.rectangle(0, 0, width - 20, 35, 0x000000, 0);
    bg.setInteractive();

    const text = scene.add.text(0, 0, label, {
      fontSize: this.getFontSize('sm'),
      fontFamily: displayFont,
      fontStyle: '700 normal',
      color: type === this.activeTab ? palette.textPrimary : palette.grayMuted
    }).setOrigin(0.5);

    tab.add([bg, text]);
    tab.setData('type', type);
    tab.setData('text', text);

    bg.on('pointerover', () => {
      if (type !== this.activeTab) {
        text.setColor(palette.grayLight);
        scene.input.setDefaultCursor('pointer');
      }
    });

    bg.on('pointerout', () => {
      if (type !== this.activeTab) {
        text.setColor(palette.grayMuted);
        scene.input.setDefaultCursor('default');
      }
    });

    bg.on('pointerdown', () => {
      this.setActiveTab(type);
    });

    return tab;
  }

  /**
   * Set active tab with animation
   */
  private setActiveTab(type: LeaderboardType): void {
    if (this.activeTab === type) return;

    this.activeTab = type;

    // Update tab text colors
    const palette = this.getPalette();
    [this.dailyTab, this.weeklyTab, this.allTimeTab].forEach(tab => {
      const tabType = tab.getData('type') as LeaderboardType;
      const text = tab.getData('text') as Phaser.GameObjects.Text;
      text.setColor(tabType === type ? palette.textPrimary : palette.grayMuted);
    });

    // Animate indicator
    let targetX = 0;
    switch (type) {
      case 'daily':
        targetX = this.dailyTab.x;
        break;
      case 'weekly':
        targetX = this.weeklyTab.x;
        break;
      case 'global':
        targetX = this.allTimeTab.x;
        break;
    }

    this.scene.tweens.add({
      targets: this.tabIndicator,
      x: targetX,
      duration: 200,
      ease: 'Power2'
    });

    // Load content for this tab
    this.loadLeaderboard(type);
  }

  /**
   * Create leaderboard entry row
   */
  private createEntryRow(
    scene: Phaser.Scene,
    entry: LeaderboardViewEntry,
    y: number,
    width: number
  ): Phaser.GameObjects.Container {
    const row = scene.add.container(0, y);
    const palette = this.getPalette();
    const displayFont = this.getFontFamily('display');
    const bodyFont = this.getFontFamily('body');

    // Background for current user
    if (entry.isCurrentUser) {
      const highlightColor = this.colorToNumber(palette.highlight);
      const bg = scene.add.rectangle(0, 0, width - 40, 50, highlightColor, 0.1);
      bg.setStrokeStyle(1, highlightColor, 0.3);
      row.add(bg);
    }

    // Rank badge
    const rankBg = scene.add.circle(-width / 2 + 50, 0, 18, 0x000000, 0);
    if (entry.rank <= 3) {
      const colors = [palette.gold, palette.silver, palette.bronze];
      const colorValue = this.colorToNumber(colors[entry.rank - 1]);
      rankBg.setFillStyle(colorValue, 0.2);
      rankBg.setStrokeStyle(2, colorValue, 0.8);
    } else {
      rankBg.setStrokeStyle(1, this.colorToNumber(palette.highlightBorder), 0.5);
    }
    row.add(rankBg);

    const rankText = scene.add.text(-width / 2 + 50, 0, entry.rank.toString(), {
      fontSize: entry.rank <= 3 ? this.getFontSize('lg') : this.getFontSize('base'),
      fontFamily: displayFont,
      fontStyle: '700 normal',
      color: entry.rank <= 3
        ? [palette.gold, palette.silver, palette.bronze][entry.rank - 1]
        : palette.gray
    }).setOrigin(0.5);
    row.add(rankText);

    // Username
    const username = scene.add.text(-width / 2 + 100, 0, entry.username, {
      fontSize: this.getFontSize('base'),
      fontFamily: bodyFont,
      fontStyle: entry.isCurrentUser ? '600 normal' : '400 normal',
      color: entry.isCurrentUser ? palette.textPrimary : palette.grayLighter
    }).setOrigin(0, 0.5);
    row.add(username);

    // Score with gradient for top 3
    const scoreColor = entry.rank <= 3 ?
      [palette.gold, palette.silver, palette.bronze][entry.rank - 1] : palette.gray;

    const score = scene.add.text(width / 2 - 50, 0, this.formatScore(entry.score), {
      fontSize: this.getFontSize('lg'),
      fontFamily: displayFont,
      fontStyle: '600 normal',
      color: scoreColor
    }).setOrigin(1, 0.5);
    row.add(score);

    return row;
  }

  /**
   * Generate client-side dummy data
   */
  private generateDummyData(type: LeaderboardType, currentUsername: string): LeaderboardViewEntry[] {
    const usernames = [
      'PixelMaster2025', 'NeonKnight', 'HexWizard', 'CyberQueen', 'RetroGamer42',
      'ShadowNinja', 'GhostPlayer', 'DragonSlayer', 'PhoenixRising', 'ThunderBolt',
      'StormBreaker', 'CrystalMage', 'QuantumLeap', 'NebulaStar', 'CosmicWave',
      'SolarFlare', 'NovaBlast', 'VortexKing', 'PulseRider', 'WaveRunner'
    ];

    const maxScore = type === 'daily' ? 15000 : (type === 'weekly' ? 25000 : 40000);
    const count = type === 'daily' ? 10 : (type === 'weekly' ? 15 : 20);

    const entries: LeaderboardViewEntry[] = [];

    // Generate dummy entries
    for (let i = 0; i < Math.min(count, usernames.length); i++) {
      const score = Math.floor(maxScore * Math.exp(-i / 5)) + Math.floor(Math.random() * 1000);
      entries.push({
        rank: i + 1,
        username: usernames[i],
        score: score,
        isCurrentUser: false,
        timestamp: Date.now()
      });
    }

    // Add current user at a random position if not already there
    const currentUserScore = Math.floor(Math.random() * 10000) + 5000;
    const userRank = Math.floor(Math.random() * 5) + 8; // Rank 8-12

    entries.splice(userRank - 1, 0, {
      rank: userRank,
      username: currentUsername,
      score: currentUserScore,
      isCurrentUser: true,
      timestamp: Date.now()
    });

    // Adjust ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }

  /**
   * Load leaderboard data
   */
  private formatScore(score: number | null | undefined): string {
    if (typeof score === 'number' && Number.isFinite(score)) {
      const safeScore = Math.max(0, Math.floor(score));
      return safeScore.toLocaleString();
    }

    return '0';
  }

  /**
   * Load leaderboard data
   */
  private async loadLeaderboard(type: LeaderboardType): Promise<void> {
    // Show loading state
    this.entriesContainer.removeAll(true);
    this.loadingText.setVisible(true);
    this.emptyText.setVisible(false);

    // Check cache
    const cached = this.entries.get(type) || leaderboardService.getCached(type);
    if (cached && cached.length > 0 && !this.isLoading.get(type)) {
      this.entries.set(type, cached);
      await this.displayEntries(cached);
      return;
    }

    this.isLoading.set(type, true);

    try {
      // Get current username
      const currentUsername = await this.getCurrentUsername();

      // Fetch from API - get more entries to ensure user appears
      const limit = type === 'global' ? 20 : 15;

      let entries: LeaderboardViewEntry[] = [];

      try {
        entries = await leaderboardService.fetchLeaderboard(type, limit, currentUsername);
      } catch (fetchError) {
        console.warn('Failed to fetch leaderboard from server:', fetchError);
      }

      // If no server data, use client-side dummy data
      if (entries.length === 0) {
        console.log('Using client-side dummy data for leaderboard');
        entries = this.generateDummyData(type, currentUsername);
        leaderboardService.primeCache(type, entries);
      }

      this.entries.set(type, entries);
      await this.displayEntries(entries);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.loadingText.setVisible(false);
      this.emptyText.setText('Failed to load scores');
      this.emptyText.setVisible(true);
    } finally {
      this.isLoading.set(type, false);
    }
  }

  /**
   * Display leaderboard entries
   */
  private async displayEntries(entries: LeaderboardViewEntry[]): Promise<void> {
    this.loadingText.setVisible(false);
    this.entriesContainer.removeAll(true);

    if (entries.length === 0) {
      this.emptyText.setVisible(true);
      await this.updatePlayerPosition([]);
      return;
    }

    this.emptyText.setVisible(false);

    await highScoreService.waitForInitialization();
    const currentUsername = highScoreService.getUsername();

    const panelWidth = this.panel.width;
    const startY = -130; // Start from top of scrollable area
    const spacing = 60;

    // Reset scroll position
    this.scrollY = 0;
    this.entriesContainer.setY(0);

    entries.forEach((entry, index) => {
      const row = this.createEntryRow(this.scene, entry, startY + index * spacing, panelWidth);
      this.entriesContainer.add(row);

      entry.isCurrentUser = entry.username === currentUsername;

      // Animate in
      row.setAlpha(0);
      row.setX(-20);
      this.scene.tweens.add({
        targets: row,
        alpha: 1,
        x: 0,
        duration: 300,
        delay: index * 50,
        ease: 'Power2'
      });
    });

    // Calculate max scroll (total height - visible height)
    const totalHeight = entries.length * spacing;
    const visibleHeight = 280; // Approximate visible area height
    this.maxScrollY = Math.max(0, totalHeight - visibleHeight);

    // Update player position display
    await this.updatePlayerPosition(entries);
  }

  /**
   * Get current username from HighScoreService
   */
  private async getCurrentUsername(): Promise<string> {
    try {
      await highScoreService.waitForInitialization();
      // Import dynamically to avoid circular dependencies
      return highScoreService.getUsername();
    } catch (error) {
      console.error('Failed to get username:', error);
      return 'anonymous';
    }
  }

  /**
   * Show leaderboard with animation and optional score update
   */
  async show(newScore?: number): Promise<void> {
    if (this.isVisible) return;

    // Store the current player score for rank calculation
    if (newScore !== undefined) {
      this.currentPlayerScore = newScore;
    } else {
      // Try to get the last known score from HighScoreService
      try {
          this.currentPlayerScore = await highScoreService.getHighScore();
      } catch (error) {
        console.error('Failed to get player score:', error);
        this.currentPlayerScore = 0;
      }
    }

    // If a new score is provided, update the cached data
    if (newScore !== undefined) {
      const currentUsername = await this.getCurrentUsername();

      // Update each cached leaderboard with the new score
      ['daily', 'weekly', 'global'].forEach(type => {
        const cached = this.entries.get(type as LeaderboardType);
        if (cached) {
          // Find and update current user's score
          const userEntry = cached.find(e => e.isCurrentUser);
          if (userEntry && newScore > userEntry.score) {
            userEntry.score = newScore;
            // Re-sort and re-rank
            cached.sort((a, b) => b.score - a.score);
            cached.forEach((entry, index) => {
              entry.rank = index + 1;
            });
          }
        }
      });
    }

    this.isVisible = true;
    this.setVisible(true);
    this.setAlpha(0);
    this.panel.setScale(0.8);

    // Fade in
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });

    // Scale in panel
    this.scene.tweens.add({
      targets: this.panel,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    // Load initial tab
    this.loadLeaderboard(this.activeTab);
  }

  /**
   * Setup scrolling for entries
   */
  private setupScrolling(scene: Phaser.Scene, scrollAreaHeight: number): void {
    let isDragging = false;
    let dragStartY = 0;
    let dragStartScrollY = 0;

    this.panel.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isDragging = true;
      dragStartY = pointer.y;
      dragStartScrollY = this.scrollY;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!isDragging) return;

      const deltaY = pointer.y - dragStartY;
      this.scrollY = dragStartScrollY - deltaY;

      // Clamp scroll position
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY));

      // Update entries position
      this.entriesContainer.setY(-this.scrollY);
    });

    scene.input.on('pointerup', () => {
      isDragging = false;
    });

    // Mouse wheel support
    scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
      if (!this.isVisible) return;

      this.scrollY += deltaY * 0.5;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY));
      this.entriesContainer.setY(-this.scrollY);
    });
  }

  /**
   * Create player position display at bottom
   */
  private createPlayerPositionDisplay(scene: Phaser.Scene, x: number, y: number, panelWidth: number): void {
    this.playerPositionContainer = scene.add.container(x, y);
    const palette = this.getPalette();
    const displayFont = this.getFontFamily('display');

    // Background bar
    this.playerPositionBg = scene.add.rectangle(
      0, 0,
      panelWidth - 40, 60,
      this.colorToNumber(palette.closeBg), 1
    );
    this.playerPositionBg.setStrokeStyle(1, this.colorToNumber(palette.panelBorder), 0.5);
    this.playerPositionContainer.add(this.playerPositionBg);

    // Player rank text
    this.playerPositionText = scene.add.text(0, 0, 'Your Rank: Calculating...', {
      fontSize: this.getFontSize('lg'),
      fontFamily: displayFont,
      fontStyle: '600 normal',
      color: palette.textPrimary
    }).setOrigin(0.5);
    this.playerPositionContainer.add(this.playerPositionText);

    this.add(this.playerPositionContainer);
  }

  /**
   * Update player position based on score
   */
  private async updatePlayerPosition(entries: LeaderboardViewEntry[]): Promise<void> {
    const palette = this.getPalette();

    try {
      await highScoreService.waitForInitialization();
      const currentUsername = highScoreService.getUsername();
      const currentScore = this.currentPlayerScore || 0;

      // Find player in entries
      const playerEntry = entries.find(e => e.username === currentUsername);

      if (playerEntry) {
        // Player is in the visible leaderboard
        this.playerPositionText.setText(`Your Rank: #${playerEntry.rank} • Score: ${playerEntry.score.toLocaleString()}`);
        this.playerPositionText.setColor(palette.highlight);
      } else if (currentScore > 0) {
        // Calculate rank based on score
        let calculatedRank = entries.length + 1;
        for (let i = 0; i < entries.length; i++) {
          if (currentScore > entries[i].score) {
            calculatedRank = i + 1;
            break;
          }
        }

        if (calculatedRank <= entries.length) {
          this.playerPositionText.setText(`Your Rank: #${calculatedRank} • Score: ${currentScore.toLocaleString()}`);
          this.playerPositionText.setColor(palette.gray);
        } else {
          // Player is below all entries
          const estimatedRank = Math.floor(entries.length * 1.5 + Math.random() * 50);
          this.playerPositionText.setText(`Your Rank: ~#${estimatedRank} • Score: ${currentScore.toLocaleString()}`);
          this.playerPositionText.setColor(palette.grayMuted);
        }
      } else {
        this.playerPositionText.setText('Play to get ranked!');
        this.playerPositionText.setColor(palette.grayMuted);
      }
    } catch (error) {
      console.error('Failed to update player position:', error);
      this.playerPositionText.setText('Rank unavailable');
      this.playerPositionText.setColor(palette.grayMuted);
    }
  }

  private getPalette() {
    return {
      overlay: this.getColor('solid', 'bgPrimary'),
      panelBackground: this.getColor('accents', 'indigoSurface'),
      panelBorder: this.getColor('accents', 'indigo'),
      textPrimary: this.getColor('solid', 'textPrimary'),
      textMuted: this.getColor('accents', 'gray'),
      textSubtle: this.getColor('accents', 'grayMuted'),
      textSecondary: this.getColor('accents', 'grayLight'),
      closeBg: this.getColor('accents', 'indigoSurface'),
      closeBgHover: this.getColor('accents', 'indigoSurfaceHover'),
      closeText: this.getColor('accents', 'gray'),
      highlight: this.getColor('accents', 'indigo'),
      highlightSurface: this.getColor('accents', 'indigoSurface'),
      highlightHover: this.getColor('accents', 'indigoSurfaceHover'),
      highlightBorder: this.getColor('accents', 'indigoSurfaceBorder'),
      gold: this.getColor('accents', 'gold'),
      silver: this.getColor('accents', 'silver'),
      bronze: this.getColor('accents', 'bronze'),
      gray: this.getColor('accents', 'gray'),
      grayLight: this.getColor('accents', 'grayLight'),
      grayLighter: this.getColor('accents', 'grayLighter'),
      grayMuted: this.getColor('accents', 'grayMuted'),
      blueSoft: this.getColor('accents', 'blueSoft'),
    };
  }

  /**
   * Hide leaderboard
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
        this.emit('closed');
      }
    });
  }
}