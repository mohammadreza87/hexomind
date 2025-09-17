/**
 * Settings UI component with username customization
 */
import * as Phaser from 'phaser';
import { highScoreService } from '../../../services/HighScoreService';
import { UIComponent } from './components/UIComponent';

export class SettingsUI extends UIComponent {
  private background: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private closeButton: Phaser.GameObjects.Container;

  // Username section
  private currentUsernameText: Phaser.GameObjects.Text;
  private usernameInput: Phaser.GameObjects.Text;
  private usernameInputBg: Phaser.GameObjects.Rectangle;
  private changeUsernameButton: Phaser.GameObjects.Container;
  private usernameStatusText: Phaser.GameObjects.Text;
  private redditUsernameLabel?: Phaser.GameObjects.Text;

  // Buttons
  private leaderboardButton: Phaser.GameObjects.Container;
  private resetButton: Phaser.GameObjects.Container;

  private isVisible: boolean = false;
  private isEditingUsername: boolean = false;
  private pendingUsername: string = '';

  constructor(scene: Phaser.Scene) {
    super(scene, { visible: false });

    const { width, height } = scene.cameras.main;

    const spacing = this.spacing;

    const palette = {
      overlay: this.getColor('solid', 'bgPrimary'),
      panelBackground: this.getColor('accents', 'indigoSurface'),
      panelBorder: this.getColor('accents', 'indigo'),
      title: this.getColor('solid', 'textPrimary'),
      closeBg: this.getColor('accents', 'indigoSurface'),
      closeBgHover: this.getColor('accents', 'indigoSurfaceHover'),
      closeText: this.getColor('accents', 'gray'),
      sectionLabel: this.getColor('accents', 'gray'),
      usernameCustom: this.getColor('accents', 'indigo'),
      usernameDefault: this.getColor('accents', 'grayLight'),
      redditLabel: this.getColor('accents', 'grayMuted'),
      inputBg: this.getColor('accents', 'indigoSurface'),
      inputBorder: this.getColor('accents', 'indigo'),
      buttonPrimary: this.getColor('accents', 'indigo'),
      buttonDanger: this.getColor('accents', 'crimson'),
      buttonSuccess: this.getColor('accents', 'mint'),
      statusDanger: this.getColor('accents', 'crimson'),
      statusSuccess: this.getColor('accents', 'mint'),
      statusWarning: this.getColor('accents', 'amber'),
    };

    const fonts = this.typography.fontFamily;

    // Dark overlay background
    this.background = scene.add.rectangle(
      width / 2, height / 2, width, height,
      this.colorToNumber(palette.overlay), 0.8
    );
    this.background.setInteractive();
    this.add(this.background);

    // Main panel
    const panelWidth = Math.min(width * 0.9, 400);
    const panelHeight = Math.min(height * 0.8, 500);

    this.panel = scene.add.rectangle(
      width / 2, height / 2,
      panelWidth, panelHeight,
      this.colorToNumber(palette.panelBackground), 1
    );
    this.panel.setStrokeStyle(2, this.colorToNumber(palette.panelBorder), 0.3);
    this.add(this.panel);

    // Title
    this.titleText = scene.add.text(
      width / 2, height / 2 - panelHeight / 2 + spacing.xl + spacing.sm,
      'SETTINGS',
      {
        fontSize: this.getFontSize('xl'),
        fontFamily: fonts.displayBlack,
        fontStyle: '900 normal',
        color: palette.title
      }
    ).setOrigin(0.5);
    this.add(this.titleText);

    // Close button
    this.createCloseButton(scene, width / 2 + panelWidth / 2 - 30, height / 2 - panelHeight / 2 + 30);

    // Username section
    const usernameY = height / 2 - panelHeight / 2 + 120;
    this.createUsernameSection(scene, width / 2, usernameY, panelWidth);

    // Leaderboard button
    this.leaderboardButton = this.createActionButton(
      scene,
      width / 2,
      height / 2 + 20,
      '🏆 LEADERBOARD',
      this.getColor('accents', 'indigo'),
      () => {
        this.hide();
        this.emit('showLeaderboard');
      }
    );
    this.add(this.leaderboardButton);

    // Reset game button
    this.resetButton = this.createActionButton(
      scene,
      width / 2,
      height / 2 + 80,
      '🔄 RESET GAME',
      this.getColor('accents', 'crimson'),
      () => {
        this.confirmReset(scene);
      }
    );
    this.add(this.resetButton);

    // Initially hidden
    this.setDepth(this.layers.modal);
    this.setVisible(false);
  }

  /**
   * Create close button
   */
  private createCloseButton(scene: Phaser.Scene, x: number, y: number): void {
    this.closeButton = scene.add.container(x, y);

    const bg = scene.add.circle(0, 0, 20, this.colorToNumber(this.getColor('accents', 'indigoSurface')), 1);
    bg.setStrokeStyle(1, this.colorToNumber(this.getColor('accents', 'indigo')), 0.3);
    bg.setInteractive();

    const closeX = scene.add.text(0, 0, '✕', {
      fontSize: this.getFontSize('lg'),
      fontFamily: this.getFontFamily('body'),
      color: this.getColor('accents', 'gray')
    }).setOrigin(0.5);

    this.closeButton.add([bg, closeX]);

    bg.on('pointerover', () => {
      bg.setFillStyle(this.colorToNumber(this.getColor('accents', 'indigoSurfaceHover')));
      closeX.setColor(this.getColor('solid', 'textPrimary'));
      scene.input.setDefaultCursor('pointer');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(this.colorToNumber(this.getColor('accents', 'indigoSurface')));
      closeX.setColor(this.getColor('accents', 'gray'));
      scene.input.setDefaultCursor('default');
    });

    bg.on('pointerdown', () => this.hide());

    this.add(this.closeButton);
  }

  /**
   * Create username section
   */
  private createUsernameSection(scene: Phaser.Scene, x: number, y: number, panelWidth: number): void {
    // Section title
    const sectionTitle = scene.add.text(x, y, 'USERNAME', {
      fontSize: this.getFontSize('sm'),
      fontFamily: this.getFontFamily('display'),
      fontStyle: '600 normal',
      color: this.getColor('accents', 'gray')
    }).setOrigin(0.5);
    this.add(sectionTitle);

    // Current username display
    this.currentUsernameText = scene.add.text(x, y + 30, 'Loading username...', {
      fontSize: this.getFontSize('lg'),
      fontFamily: this.getFontFamily('display'),
      fontStyle: '700 normal',
      color: this.getColor('accents', 'grayLight')
    }).setOrigin(0.5);
    this.add(this.currentUsernameText);

    // Reddit username indicator (hidden until initialized)
    this.redditUsernameLabel = scene.add.text(x, y + 55, '(Reddit Username)', {
      fontSize: this.getFontSize('sm'),
      fontFamily: this.getFontFamily('body'),
      color: this.getColor('accents', 'grayMuted')
    }).setOrigin(0.5).setVisible(false);
    this.add(this.redditUsernameLabel);

    // Username input field (hidden by default)
    this.usernameInputBg = scene.add.rectangle(
      x, y + 90,
      panelWidth - 80, 40,
      this.colorToNumber(this.getColor('accents', 'indigoSurface')), 1
    );
    this.usernameInputBg.setStrokeStyle(2, this.colorToNumber(this.getColor('accents', 'indigo')), 0.5);
    this.usernameInputBg.setVisible(false);
    this.add(this.usernameInputBg);

    this.usernameInput = scene.add.text(x, y + 90, '', {
      fontSize: this.getFontSize('base'),
      fontFamily: this.getFontFamily('body'),
      color: this.getColor('solid', 'textPrimary')
    }).setOrigin(0.5);
    this.usernameInput.setVisible(false);
    this.add(this.usernameInput);

    // Status text
    this.usernameStatusText = scene.add.text(x, y + 130, '', {
      fontSize: this.getFontSize('sm'),
      fontFamily: this.getFontFamily('body'),
      color: this.getColor('accents', 'grayMuted')
    }).setOrigin(0.5).setVisible(false);
    this.add(this.usernameStatusText);

    // Change username button
    this.changeUsernameButton = this.createActionButton(
      scene, x, y + 90,
      'SET CUSTOM USERNAME',
      this.getColor('accents', 'mint'),
      () => this.toggleUsernameEdit(scene)
    );
    this.add(this.changeUsernameButton);

    highScoreService.waitForInitialization()
      .then(() => {
        this.updateUsernameUI();
      })
      .catch(error => console.error('Failed to initialize username for settings UI:', error));
  }

  /**
   * Create action button
   */
  private createActionButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button = scene.add.container(x, y);

    const buttonWidth = 260;
    const buttonHeight = 45;

    const fillColor = this.colorToNumber(color);
    const bg = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, fillColor, 0.9);
    bg.setStrokeStyle(1, fillColor, 0.3);
    bg.setInteractive();

    const label = scene.add.text(0, 0, text, {
      fontSize: this.getFontSize('base'),
      fontFamily: this.getFontFamily('display'),
      fontStyle: '600 normal',
      color: this.getColor('solid', 'textPrimary')
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setData('bg', bg);
    button.setData('label', label);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.setAlpha(1);
      bg.setScale(1.02);
      scene.input.setDefaultCursor('pointer');
    });
    bg.on('pointerout', () => {
      bg.setAlpha(0.9);
      bg.setScale(1);
      scene.input.setDefaultCursor('default');
    });

    return button;
  }

  /**
   * Toggle username editing mode
   */
  private toggleUsernameEdit(scene: Phaser.Scene): void {
    if (!this.isEditingUsername) {
      // Enter edit mode
      this.isEditingUsername = true;
      this.pendingUsername = '';

      this.usernameInputBg.setVisible(true);
      this.usernameInput.setVisible(true);
      this.usernameInput.setText('Enter new username...');
      this.usernameInput.setColor(this.getColor('accents', 'grayMuted'));

      // Update button
      const bg = this.changeUsernameButton.getData('bg') as Phaser.GameObjects.Rectangle;
      const label = this.changeUsernameButton.getData('label') as Phaser.GameObjects.Text;
      label.setText('SAVE USERNAME');
      bg.setFillStyle(this.colorToNumber(this.getColor('accents', 'indigo')));

      // Setup keyboard input
      this.setupKeyboardInput(scene);

      // Show status
      this.usernameStatusText.setText('3-20 characters, letters/numbers/underscore only');
      this.usernameStatusText.setColor(this.getColor('accents', 'grayMuted'));
      this.usernameStatusText.setVisible(true);
    } else {
      // Save username
      this.saveUsername();
    }
  }

  /**
   * Setup keyboard input for username
   */
  private setupKeyboardInput(scene: Phaser.Scene): void {
    // Clear any existing keyboard listeners
    scene.input.keyboard?.removeAllListeners();

    // Handle text input
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isEditingUsername || !this.isVisible) return;

      const key = event.key;

      if (key === 'Enter') {
        this.saveUsername();
        return;
      }

      if (key === 'Escape') {
        this.cancelUsernameEdit();
        return;
      }

      if (key === 'Backspace') {
        this.pendingUsername = this.pendingUsername.slice(0, -1);
      } else if (key.length === 1 && /[a-zA-Z0-9_]/.test(key)) {
        if (this.pendingUsername.length < 20) {
          this.pendingUsername += key;
        }
      }

      // Update display
      if (this.pendingUsername.length > 0) {
        this.usernameInput.setText(this.pendingUsername);
        this.usernameInput.setColor(this.getColor('solid', 'textPrimary'));
      } else {
        this.usernameInput.setText('Enter new username...');
        this.usernameInput.setColor(this.getColor('accents', 'grayMuted'));
      }

      // Validate
      this.validateUsername();
    });
  }

  /**
   * Validate username
   */
  private validateUsername(): void {
    const username = this.pendingUsername;

    if (username.length < 3) {
      this.usernameStatusText.setText('Username too short (min 3 characters)');
      this.usernameStatusText.setColor(this.getColor('accents', 'crimson'));
      return;
    }

    if (username.length > 20) {
      this.usernameStatusText.setText('Username too long (max 20 characters)');
      this.usernameStatusText.setColor(this.getColor('accents', 'crimson'));
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.usernameStatusText.setText('Only letters, numbers, and underscore allowed');
      this.usernameStatusText.setColor(this.getColor('accents', 'crimson'));
      return;
    }

    this.usernameStatusText.setText('✓ Valid username');
    this.usernameStatusText.setColor(this.getColor('accents', 'mint'));
  }

  /**
   * Save username
   */
  private async saveUsername(): Promise<void> {
    const username = this.pendingUsername;

    // Validate
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      this.validateUsername();
      return;
    }

    // Check uniqueness
    this.usernameStatusText.setText('Checking availability...');
    this.usernameStatusText.setColor(this.getColor('accents', 'amber'));

    try {
      // Check if username is available
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.available) {
          // Save the custom username
          highScoreService.setCustomUsername(username);

          // Update display
          this.updateUsernameUI();

          // Exit edit mode
          this.cancelUsernameEdit();

          // Show success
          this.usernameStatusText.setText('✓ Username saved!');
          this.usernameStatusText.setColor(this.getColor('accents', 'mint'));
          this.usernameStatusText.setVisible(true);

          // Hide status after 2 seconds
          this.scene.time.delayedCall(2000, () => {
            this.usernameStatusText.setVisible(false);
          });
        } else {
          this.usernameStatusText.setText('Username already taken');
          this.usernameStatusText.setColor(this.getColor('accents', 'crimson'));
        }
      } else {
        throw new Error('Failed to check username');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      // Allow setting username offline
      highScoreService.setCustomUsername(username);
      this.updateUsernameUI();
      this.cancelUsernameEdit();

      this.usernameStatusText.setText('✓ Username saved locally');
      this.usernameStatusText.setColor(this.getColor('accents', 'amber'));
      this.usernameStatusText.setVisible(true);

      this.scene.time.delayedCall(2000, () => {
        this.usernameStatusText.setVisible(false);
      });
    }
  }

  /**
   * Cancel username editing
   */
  private cancelUsernameEdit(): void {
    this.isEditingUsername = false;
    this.pendingUsername = '';

    this.usernameInputBg.setVisible(false);
    this.usernameInput.setVisible(false);

    // Update button
    const bg = this.changeUsernameButton.getData('bg') as Phaser.GameObjects.Rectangle;
    const label = this.changeUsernameButton.getData('label') as Phaser.GameObjects.Text;
    label.setText(highScoreService.hasCustomUsername() ? 'CHANGE USERNAME' : 'SET CUSTOM USERNAME');
    bg.setFillStyle(this.colorToNumber(this.getColor('accents', 'mint')));

    // Clear keyboard listeners
    this.scene.input.keyboard?.removeAllListeners();

    this.updateUsernameUI();
  }

  private updateUsernameUI(): void {
    const username = highScoreService.getUsername();
    const isCustom = highScoreService.hasCustomUsername();
    const redditUsername = highScoreService.getRedditUsername();

    this.currentUsernameText.setText(username);
    this.currentUsernameText.setColor(
      isCustom ? this.getColor('accents', 'indigo') : this.getColor('accents', 'grayLight')
    );

    if (!isCustom && this.redditUsernameLabel) {
      this.redditUsernameLabel.setText(redditUsername ? '(Reddit Username)' : '(Guest Username)');
      this.redditUsernameLabel.setVisible(true);
    } else {
      this.redditUsernameLabel?.setVisible(false);
    }

    if (!this.isEditingUsername) {
      const label = this.changeUsernameButton.getData('label') as Phaser.GameObjects.Text;
      label.setText(isCustom ? 'CHANGE USERNAME' : 'SET CUSTOM USERNAME');
    }
  }

  /**
   * Confirm game reset
   */
  private confirmReset(scene: Phaser.Scene): void {
    const confirmText = scene.add.text(
      scene.cameras.main.width / 2,
      scene.cameras.main.height / 2 + 140,
      'Are you sure? This will reset your progress!',
      {
        fontSize: this.getFontSize('sm'),
        fontFamily: this.getFontFamily('body'),
        color: this.getColor('accents', 'crimson')
      }
    ).setOrigin(0.5);
    this.add(confirmText);

    // Update reset button to confirm
    const bg = this.resetButton.getData('bg') as Phaser.GameObjects.Rectangle;
    const label = this.resetButton.getData('label') as Phaser.GameObjects.Text;
    label.setText('⚠️ CONFIRM RESET');

    // Remove old listeners
    bg.removeAllListeners();

    // Add confirm action
    bg.on('pointerdown', () => {
      this.emit('resetGame');
      this.hide();
    });

    // Cancel after 3 seconds
    scene.time.delayedCall(3000, () => {
      if (confirmText && confirmText.active) {
        confirmText.destroy();
        label.setText('🔄 RESET GAME');
        bg.removeAllListeners();
        bg.on('pointerdown', () => this.confirmReset(scene));
        bg.on('pointerover', () => {
          bg.setAlpha(1);
          bg.setScale(1.02);
          scene.input.setDefaultCursor('pointer');
        });
        bg.on('pointerout', () => {
          bg.setAlpha(0.9);
          bg.setScale(1);
          scene.input.setDefaultCursor('default');
        });
      }
    });
  }

  /**
   * Show settings
   */
  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.setVisible(true);
    this.setAlpha(0);
    this.panel.setScale(0.9);

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
  }

  /**
   * Hide settings
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;

    // Cancel any ongoing edits
    if (this.isEditingUsername) {
      this.cancelUsernameEdit();
    }

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