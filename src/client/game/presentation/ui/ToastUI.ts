import * as Phaser from 'phaser';
import { DS } from '../../config/DesignSystem';
import { ColorSystem } from '../../core/colors/ColorSystem';

/**
 * ToastUI - Modern toast notification with Design System.
 * Supports both small toasts and large center messages.
 */
export class ToastUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private colorSystem: ColorSystem;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.colorSystem = ColorSystem.getInstance();
  }

  /**
   * Show a toast message. For important messages like 'No more space',
   * shows large centered text. Otherwise shows small toast.
   */
  show(message: string, opts?: {
    duration?: number;
    hold?: number;
    type?: 'normal' | 'important' | 'score';
    score?: number;
  }): Promise<void> {
    const type = opts?.type ?? (message.toLowerCase().includes('no more') ? 'important' : 'normal');

    if (type === 'important') {
      return this.showImportantMessage(message, opts);
    } else if (type === 'score') {
      return this.showScoreMessage(message, opts?.score ?? 0, opts);
    } else {
      return this.showNormalToast(message, opts);
    }
  }

  /**
   * Show large centered important message (e.g., 'No more space')
   */
  private showImportantMessage(message: string, opts?: { duration?: number; hold?: number }): Promise<void> {
    const duration = opts?.duration ?? DS.ANIMATION.normal;
    const hold = opts?.hold ?? 1500; // Longer hold for important messages

    // Clean any existing toast
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    const { width, height } = this.scene.cameras.main;
    const isDark = this.colorSystem.isDark();

    const displayFont = DS.getFontFamily('display');
    const spacingXxxl = DS.getSpacingValue('xxxl');
    const spacingXl = DS.getSpacingValue('xl');
    const dangerColor = isDark ? DS.getColor('solid', 'danger') : DS.getColor('accents', 'coralMuted');
    const backgroundColor = isDark ? DS.getColor('solid', 'bgElevated') : DS.getColor('solid', 'textPrimary');
    const borderColor = isDark ? DS.getColor('solid', 'danger') : DS.getColor('accents', 'coralMuted');

    const container = this.scene.add.container(width / 2, height / 2);
    container.setDepth(DS.LAYERS.modal);

    // Large text with Inter font
    const text = this.scene.add.text(0, 0, message.toUpperCase(), {
      fontSize: DS.getFontSize('4xl'),
      fontFamily: displayFont,
      fontStyle: '700 normal', // Bold
      color: dangerColor,
      align: 'center'
    }).setOrigin(0.5);

    // Add gradient effect for dark mode
    if (isDark) {
      const gradient = DS.getGradient('danger');
      text.setTint(
        DS.colorStringToNumber(gradient[0]),
        DS.colorStringToNumber(gradient[0]),
        DS.colorStringToNumber(gradient[1]),
        DS.colorStringToNumber(gradient[1])
      );
    }

    // Semi-transparent background
    const paddingX = spacingXxxl;
    const paddingY = spacingXl;
    const bgWidth = text.width + paddingX * 2;
    const bgHeight = text.height + paddingY * 2;

    const bg = this.scene.add.rectangle(
      0, 0, bgWidth, bgHeight,
      DS.colorStringToNumber(backgroundColor),
      isDark ? 0.95 : 0.98
    )
      .setStrokeStyle(2, DS.colorStringToNumber(borderColor))
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setAlpha(0);
    container.setScale(0.8);

    this.container = container;

    return new Promise<void>((resolve) => {
      // Simple pop in
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        scale: 1,
        duration: duration,
        ease: 'Power2.easeOut',
        onComplete: () => {
          // Hold then fade out
          this.scene.time.delayedCall(hold, () => {
            this.scene.tweens.add({
              targets: container,
              alpha: 0,
              scale: 0.95,
              duration,
              ease: 'Power2.easeIn',
              onComplete: () => {
                container.destroy();
                if (this.container === container) this.container = null;
                resolve();
              }
            });
          });
        }
      });
    });
  }

  /**
   * Show score feedback with gradient text
   */
  private showScoreMessage(message: string, score: number, opts?: { duration?: number; hold?: number }): Promise<void> {
    const duration = opts?.duration ?? DS.ANIMATION.fast;
    const hold = opts?.hold ?? 800;

    const { width, height } = this.scene.cameras.main;
    const isDark = this.colorSystem.isDark();

    const displayFont = DS.getFontFamily('display');
    const bodyFont = DS.getFontFamily('body');
    const spacingXl = DS.getSpacingValue('xl');
    const spacingXxxl = DS.getSpacingValue('xxxl');
    const spacingXxl = DS.getSpacingValue('xxl');
    const spacingLg = DS.getSpacingValue('lg');
    const spacingMd = DS.getSpacingValue('md');
    const spacingXs = DS.getSpacingValue('xs');
    const successColor = isDark ? DS.getColor('solid', 'success') : DS.getColor('accents', 'successSoft');
    const gradient = isDark ? DS.getGradient('success') : DS.getGradient('successSoft');
    const messageColor = isDark ? DS.getColor('solid', 'textSecondary') : DS.getColor('solid', 'textInverseMuted');
    const backgroundColor = isDark ? DS.getColor('solid', 'bgElevated') : DS.getColor('solid', 'textPrimary');
    const borderColor = isDark ? DS.getColor('glass', 'border') : DS.getColor('glass', 'borderAccent');
    const floatOffset = spacingMd + spacingXs;

    const container = this.scene.add.container(width / 2, height * 0.4);
    container.setDepth(DS.LAYERS.toast);

    // Score text with gradient
    const scoreText = this.scene.add.text(0, 0, `+${score}`, {
      fontSize: DS.getFontSize('3xl'),
      fontFamily: displayFont,
      fontStyle: '800 normal', // Extra bold
      color: successColor,
      align: 'center'
    }).setOrigin(0.5);

    // Apply gradient
    scoreText.setTint(
      DS.colorStringToNumber(gradient[0]),
      DS.colorStringToNumber(gradient[0]),
      DS.colorStringToNumber(gradient[2] ?? gradient[gradient.length - 1]),
      DS.colorStringToNumber(gradient[2] ?? gradient[gradient.length - 1])
    );

    // Message text
    const msgText = this.scene.add.text(0, spacingXl, message, {
      fontSize: DS.getFontSize('lg'),
      fontFamily: bodyFont,
      fontStyle: '500 normal',
      color: messageColor,
      align: 'center'
    }).setOrigin(0.5);

    container.add([scoreText, msgText]);
    container.setAlpha(0);
    container.setY(height * 0.4 + floatOffset);

    this.container = container;

    return new Promise<void>((resolve) => {
      // Float up and fade in
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        y: height * 0.4,
        duration,
        ease: 'Power2.easeOut',
        onComplete: () => {
          // Hold then float up and fade out
          this.scene.time.delayedCall(hold, () => {
            this.scene.tweens.add({
              targets: container,
              alpha: 0,
              y: height * 0.35,
              duration,
              ease: 'Power2.easeIn',
              onComplete: () => {
                container.destroy();
                if (this.container === container) this.container = null;
                resolve();
              }
            });
          });
        }
      });
    });
  }

  /**
   * Show normal small toast
   */
  private showNormalToast(message: string, opts?: { duration?: number; hold?: number }): Promise<void> {
    const duration = opts?.duration ?? DS.ANIMATION.normal;
    const hold = opts?.hold ?? DS.ANIMATION.slower;

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    const { width } = this.scene.cameras.main;
    const isDark = this.colorSystem.isDark();

    const spacingXxxl = DS.getSpacingValue('xxxl');
    const spacingXl = DS.getSpacingValue('xl');
    const spacingLg = DS.getSpacingValue('lg');
    const spacingMd = DS.getSpacingValue('md');
    const spacingXxl = DS.getSpacingValue('xxl');
    const bodyFont = DS.getFontFamily('body');
    const textColor = isDark ? DS.getColor('solid', 'textPrimary') : DS.getColor('solid', 'textInverse');
    const backgroundColor = isDark ? DS.getColor('solid', 'bgElevated') : DS.getColor('solid', 'textPrimary');
    const borderColor = isDark ? DS.getColor('glass', 'border') : DS.getColor('glass', 'borderAccent');

    const container = this.scene.add.container(width / 2, spacingXxxl + spacingXl);
    container.setDepth(DS.LAYERS.toast);

    const text = this.scene.add.text(0, 0, message, {
      fontSize: DS.getFontSize('base'),
      fontFamily: bodyFont,
      fontStyle: '500 normal',
      color: textColor,
      align: 'center'
    }).setOrigin(0.5);

    const paddingX = spacingLg;
    const paddingY = spacingMd;
    const bgWidth = Math.max(spacingXxxl * 3, text.width + paddingX * 2);
    const bgHeight = Math.max(spacingXxl, text.height + paddingY * 2);

    const bg = this.scene.add.rectangle(
      0, 0, bgWidth, bgHeight,
      DS.colorStringToNumber(backgroundColor),
      isDark ? 0.95 : 0.98
    )
      .setStrokeStyle(1, DS.colorStringToNumber(borderColor))
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setAlpha(0);
    container.setScale(0.95);

    this.container = container;

    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        scale: 1,
        duration,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(hold, () => {
            this.scene.tweens.add({
              targets: container,
              alpha: 0,
              scale: 0.98,
              duration,
              ease: 'Sine.easeIn',
              onComplete: () => {
                container.destroy();
                if (this.container === container) this.container = null;
                resolve();
              }
            });
          });
        }
      });
    });
  }
}

