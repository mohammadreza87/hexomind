import * as Phaser from 'phaser';

/**
 * ToastUI - Lightweight in-scene toast notification.
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
    const duration = opts?.duration ?? 220; // fade in/out
    const hold = opts?.hold ?? 900; // visible time

    // Clean any existing toast first
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    const { width } = this.scene.cameras.main;

    const container = this.scene.add.container(width / 2, 80);
    container.setDepth(2000);

    const paddingX = 18;
    const paddingY = 10;

    const text = this.scene.add.text(0, 0, message, {
      fontSize: '18px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    const bgWidth = Math.max(160, text.width + paddingX * 2);
    const bgHeight = Math.max(40, text.height + paddingY * 2);

    const bg = this.scene.add.rectangle(0, 0, bgWidth, bgHeight, 0x11111a, 0.92)
      .setStrokeStyle(2, 0xff6b6b, 0.9)
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

