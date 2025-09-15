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

    const container = this.scene.add.container(width / 2, height / 2);
    container.setDepth(DS.LAYERS.modal);

    // Large text with Inter font
    const text = this.scene.add.text(0, 0, message.toUpperCase(), {
      fontSize: DS.TYPOGRAPHY.fontSize['4xl'],
      fontFamily: DS.TYPOGRAPHY.fontFamily.display,
      fontStyle: '700 normal', // Bold
      color: isDark ? DS.COLORS.solid.danger : '#d44860',
      align: 'center'
    }).setOrigin(0.5);

    // Add gradient effect for dark mode
    if (isDark) {
      const gradient = DS.COLORS.gradients.danger;
      text.setTint(
        DS.hexToNumber(gradient[0]),
        DS.hexToNumber(gradient[0]),
        DS.hexToNumber(gradient[1]),
        DS.hexToNumber(gradient[1])
      );
    }

    // Semi-transparent background
    const paddingX = DS.SPACING.xxxl;
    const paddingY = DS.SPACING.xl;
    const bgWidth = text.width + paddingX * 2;
    const bgHeight = text.height + paddingY * 2;

    const bg = this.scene.add.rectangle(
      0, 0, bgWidth, bgHeight,
      DS.hexToNumber(isDark ? DS.COLORS.solid.bgElevated : '#ffffff'),
      isDark ? 0.95 : 0.98
    )
      .setStrokeStyle(2, DS.hexToNumber(isDark ? DS.COLORS.solid.danger : '#d44860'))
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

    const container = this.scene.add.container(width / 2, height * 0.4);
    container.setDepth(DS.LAYERS.toast);

    // Score text with gradient
    const scoreText = this.scene.add.text(0, 0, `+${score}`, {
      fontSize: DS.TYPOGRAPHY.fontSize['3xl'],
      fontFamily: DS.TYPOGRAPHY.fontFamily.display,
      fontStyle: '800 normal', // Extra bold
      color: isDark ? '#00ff88' : '#00c550',
      align: 'center'
    }).setOrigin(0.5);

    // Apply gradient
    const gradient = isDark ? DS.COLORS.gradients.success : ['#00c550', '#00e560', '#00ff70'];
    scoreText.setTint(
      DS.hexToNumber(gradient[0]),
      DS.hexToNumber(gradient[0]),
      DS.hexToNumber(gradient[2]),
      DS.hexToNumber(gradient[2])
    );

    // Message text
    const msgText = this.scene.add.text(0, DS.SPACING.xl, message, {
      fontSize: DS.TYPOGRAPHY.fontSize.lg,
      fontFamily: DS.TYPOGRAPHY.fontFamily.body,
      fontStyle: '500 normal',
      color: isDark ? DS.COLORS.solid.textSecondary : 'rgba(10, 10, 15, 0.7)',
      align: 'center'
    }).setOrigin(0.5);

    container.add([scoreText, msgText]);
    container.setAlpha(0);
    container.setY(height * 0.4 + 20);

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

    const container = this.scene.add.container(width / 2, DS.SPACING.xxxl + DS.SPACING.xl);
    container.setDepth(DS.LAYERS.toast);

    const text = this.scene.add.text(0, 0, message, {
      fontSize: DS.TYPOGRAPHY.fontSize.base,
      fontFamily: DS.TYPOGRAPHY.fontFamily.body,
      fontStyle: '500 normal',
      color: isDark ? DS.COLORS.solid.textPrimary : DS.COLORS.solid.textInverse,
      align: 'center'
    }).setOrigin(0.5);

    const paddingX = DS.SPACING.lg;
    const paddingY = DS.SPACING.md;
    const bgWidth = Math.max(DS.SPACING.xxxl * 3, text.width + paddingX * 2);
    const bgHeight = Math.max(DS.SPACING.xxl, text.height + paddingY * 2);

    const bg = this.scene.add.rectangle(
      0, 0, bgWidth, bgHeight,
      DS.hexToNumber(isDark ? DS.COLORS.solid.bgElevated : '#ffffff'),
      isDark ? 0.95 : 0.98
    )
      .setStrokeStyle(1, DS.hexToNumber(isDark ? DS.COLORS.glass.border : 'rgba(102, 126, 234, 0.15)'))
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

