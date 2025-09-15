import * as Phaser from 'phaser';
import { DS } from '../../config/DesignSystem';

/**
 * ToastUI - Modern toast notification with Design System.
 * Usage: await toast.show('No more space');
 */
export class ToastUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a toast centered near the top. Returns a Promise that resolves
   * after the toast fully hides.
   */
  show(message: string, opts?: { duration?: number; hold?: number }): Promise<void> {
    const duration = opts?.duration ?? DS.ANIMATION.normal; // fade in/out
    const hold = opts?.hold ?? DS.ANIMATION.slower; // visible time

    // Clean any existing toast first
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    const { width } = this.scene.cameras.main;

    const container = this.scene.add.container(width / 2, DS.SPACING.xxxl + DS.SPACING.xl);
    container.setDepth(DS.LAYERS.toast);

    const paddingX = DS.SPACING.lg;
    const paddingY = DS.SPACING.md;

    const text = this.scene.add.text(0, 0, message,
      DS.getTextStyle('body', {
        color: DS.COLORS.solid.textPrimary
      })
    ).setOrigin(0.5);

    const bgWidth = Math.max(DS.SPACING.xxxl * 3, text.width + paddingX * 2);
    const bgHeight = Math.max(DS.SPACING.xxl, text.height + paddingY * 2);

    const bg = this.scene.add.rectangle(
      0, 0, bgWidth, bgHeight,
      DS.hexToNumber(DS.COLORS.solid.bgElevated),
      0.95
    )
      .setStrokeStyle(1, DS.hexToNumber(DS.COLORS.glass.border))
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setAlpha(0);
    container.setScale(0.95);

    this.container = container;

    return new Promise<void>((resolve) => {
      // Fade in
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        scale: 1,
        duration,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Hold, then fade out
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

