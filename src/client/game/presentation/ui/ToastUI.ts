import * as Phaser from 'phaser';
import { ColorSystem } from '../../core/colors/ColorSystem';
import { UIComponent } from './components/UIComponent';

type ToastOptions = {
  duration?: number;
  hold?: number;
  type?: 'normal' | 'important' | 'score';
  score?: number;
};

/**
 * ToastUI - Modern toast notification with Design System.
 * Supports both small toasts and large center messages.
 */
export class ToastUI extends UIComponent {
  private readonly colorSystem: ColorSystem;
  private activeTween?: Phaser.Tweens.Tween;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    super(scene, { visible: false });
    this.setDepth(this.layers.toast);
    this.colorSystem = ColorSystem.getInstance();
  }

  show(message: string, opts: ToastOptions = {}): Promise<void> {
    const type = opts.type ?? (message.toLowerCase().includes('no more') ? 'important' : 'normal');

    this.clearCurrentToast();

    if (type === 'important') {
      return this.showImportantMessage(message, opts);
    }

    if (type === 'score') {
      return this.showScoreMessage(message, opts.score ?? 0, opts);
    }

    return this.showNormalToast(message, opts);
  }

  private showImportantMessage(message: string, opts: ToastOptions): Promise<void> {
    const duration = opts.duration ?? this.animation.normal;
    const hold = opts.hold ?? 1500;

    const { width, height } = this.scene.cameras.main;
    const isDark = this.colorSystem.isDark();

    const displayFont = this.getFontFamily('display');
    const spacingXxxl = this.getSpacing('xxxl');
    const spacingXl = this.getSpacing('xl');
    const dangerColor = isDark ? this.getColor('solid', 'danger') : this.getColor('accents', 'coralMuted');
    const backgroundColor = isDark ? this.getColor('solid', 'bgElevated') : this.getColor('solid', 'textPrimary');
    const borderColor = isDark ? this.getColor('solid', 'danger') : this.getColor('accents', 'coralMuted');

    const text = this.scene.add.text(0, 0, message.toUpperCase(), {
      fontSize: this.getFontSize('4xl'),
      fontFamily: displayFont,
      fontStyle: '700 normal',
      color: dangerColor,
      align: 'center',
    }).setOrigin(0.5);

    if (isDark) {
      const gradient = this.getGradient('danger');
      text.setTint(
        this.colorToNumber(gradient[0]),
        this.colorToNumber(gradient[0]),
        this.colorToNumber(gradient[1]),
        this.colorToNumber(gradient[1])
      );
    }

    const paddingX = spacingXxxl;
    const paddingY = spacingXl;
    const bgWidth = text.width + paddingX * 2;
    const bgHeight = text.height + paddingY * 2;

    const bg = this.scene.add.rectangle(
      0,
      0,
      bgWidth,
      bgHeight,
      this.colorToNumber(backgroundColor),
      isDark ? 0.95 : 0.98
    )
      .setStrokeStyle(2, this.colorToNumber(borderColor))
      .setOrigin(0.5);

    this.destroyChildren();
    this.add([bg, text]);

    this.setPosition(width / 2, height / 2);
    this.setAlpha(0);
    this.setScale(0.8);
    this.setVisible(true);

    return new Promise(resolve => {
      this.activeTween = this.scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration,
        ease: 'Power2.easeOut',
        onComplete: () => {
          this.hideTimer = this.scene.time.delayedCall(hold, () => {
            this.hideTimer = undefined;
            this.activeTween = this.scene.tweens.add({
              targets: this,
              alpha: 0,
              scale: 0.95,
              duration,
              ease: 'Power2.easeIn',
              onComplete: () => {
                this.clearCurrentToast();
                resolve();
              },
            });
          });
        },
      });
    });
  }

  private showScoreMessage(message: string, score: number, opts: ToastOptions): Promise<void> {
    const duration = opts.duration ?? this.animation.fast;
    const hold = opts.hold ?? 800;

    const { width, height } = this.scene.cameras.main;
    const isDark = this.colorSystem.isDark();

    const displayFont = this.getFontFamily('display');
    const bodyFont = this.getFontFamily('body');
    const spacingXl = this.getSpacing('xl');
    const spacingMd = this.getSpacing('md');
    const spacingXs = this.getSpacing('xs');

    const successColor = isDark ? this.getColor('solid', 'success') : this.getColor('accents', 'successSoft');
    const gradient = isDark ? this.getGradient('success') : this.getGradient('successSoft');
    const messageColor = isDark
      ? this.getColor('solid', 'textSecondary')
      : this.getColor('solid', 'textInverseMuted');
    const floatOffset = spacingMd + spacingXs;

    const scoreText = this.scene.add.text(0, 0, `+${score}`, {
      fontSize: this.getFontSize('3xl'),
      fontFamily: displayFont,
      fontStyle: '800 normal',
      color: successColor,
      align: 'center',
    }).setOrigin(0.5);

    scoreText.setTint(
      this.colorToNumber(gradient[0]),
      this.colorToNumber(gradient[0]),
      this.colorToNumber(gradient[2] ?? gradient[gradient.length - 1]),
      this.colorToNumber(gradient[2] ?? gradient[gradient.length - 1])
    );

    const msgText = this.scene.add.text(0, spacingXl, message, {
      fontSize: this.getFontSize('lg'),
      fontFamily: bodyFont,
      fontStyle: '500 normal',
      color: messageColor,
      align: 'center',
    }).setOrigin(0.5);

    this.destroyChildren();
    this.add([scoreText, msgText]);

    this.setPosition(width / 2, height * 0.4 + floatOffset);
    this.setAlpha(0);
    this.setVisible(true);

    return new Promise(resolve => {
      this.activeTween = this.scene.tweens.add({
        targets: this,
        alpha: 1,
        y: height * 0.4,
        duration,
        ease: 'Power2.easeOut',
        onComplete: () => {
          this.hideTimer = this.scene.time.delayedCall(hold, () => {
            this.hideTimer = undefined;
            this.activeTween = this.scene.tweens.add({
              targets: this,
              alpha: 0,
              y: height * 0.35,
              duration,
              ease: 'Power2.easeIn',
              onComplete: () => {
                this.clearCurrentToast();
                resolve();
              },
            });
          });
        },
      });
    });
  }

  private showNormalToast(message: string, opts: ToastOptions): Promise<void> {
    const duration = opts.duration ?? this.animation.normal;
    const hold = opts.hold ?? this.animation.slower;

    const { width } = this.scene.cameras.main;
    const isDark = this.colorSystem.isDark();

    const spacingXxxl = this.getSpacing('xxxl');
    const spacingXl = this.getSpacing('xl');
    const spacingLg = this.getSpacing('lg');
    const spacingMd = this.getSpacing('md');
    const spacingXxl = this.getSpacing('xxl');
    const bodyFont = this.getFontFamily('body');

    const textColor = isDark ? this.getColor('solid', 'textPrimary') : this.getColor('solid', 'textInverse');
    const backgroundColor = isDark ? this.getColor('solid', 'bgElevated') : this.getColor('solid', 'textPrimary');
    const borderColor = isDark ? this.getColor('glass', 'border') : this.getColor('glass', 'borderAccent');

    const text = this.scene.add.text(0, 0, message, {
      fontSize: this.getFontSize('base'),
      fontFamily: bodyFont,
      fontStyle: '500 normal',
      color: textColor,
      align: 'center',
    }).setOrigin(0.5);

    const paddingX = spacingLg;
    const paddingY = spacingMd;
    const bgWidth = Math.max(spacingXxxl * 3, text.width + paddingX * 2);
    const bgHeight = Math.max(spacingXxl, text.height + paddingY * 2);

    const bg = this.scene.add.rectangle(
      0,
      0,
      bgWidth,
      bgHeight,
      this.colorToNumber(backgroundColor),
      isDark ? 0.95 : 0.98
    )
      .setStrokeStyle(1, this.colorToNumber(borderColor))
      .setOrigin(0.5);

    this.destroyChildren();
    this.add([bg, text]);

    this.setPosition(width / 2, spacingXxxl + spacingXl);
    this.setAlpha(0);
    this.setScale(0.95);
    this.setVisible(true);

    return new Promise(resolve => {
      this.activeTween = this.scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.hideTimer = this.scene.time.delayedCall(hold, () => {
            this.hideTimer = undefined;
            this.activeTween = this.scene.tweens.add({
              targets: this,
              alpha: 0,
              scale: 0.98,
              duration,
              ease: 'Sine.easeIn',
              onComplete: () => {
                this.clearCurrentToast();
                resolve();
              },
            });
          });
        },
      });
    });
  }

  private clearCurrentToast(): void {
    this.scene.tweens.killTweensOf(this);

    if (this.activeTween) {
      if (this.activeTween.isPlaying()) {
        this.activeTween.stop();
      }
      this.activeTween = undefined;
    }

    if (this.hideTimer) {
      this.hideTimer.remove();
      this.hideTimer = undefined;
    }

    this.destroyChildren();
    this.setVisible(false);
    this.setAlpha(1);
    this.setScale(1);
  }
}
