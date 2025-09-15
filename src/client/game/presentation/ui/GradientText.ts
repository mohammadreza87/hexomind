/**
 * GradientText - Creates text with gradient effect using Phaser
 */
import * as Phaser from 'phaser';
import { DS } from '../../config/DesignSystem';

export class GradientText extends Phaser.GameObjects.Container {
  private mainText: Phaser.GameObjects.Text;
  private gradientGraphics: Phaser.GameObjects.Graphics;
  private gradientTexture: Phaser.Textures.CanvasTexture | null = null;
  private currentGradientIndex: number = 0;
  private colorTransitionTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    gradientColors: string[]
  ) {
    super(scene, x, y);

    // Create the main text with Inter Black (900 weight)
    this.mainText = scene.add.text(0, 0, text, {
      ...style,
      fontFamily: DS.TYPOGRAPHY.fontFamily.display,
      fontStyle: '900 normal', // Inter Black weight
    });
    this.mainText.setOrigin(0.5, 0.5);

    // Create gradient overlay
    this.gradientGraphics = scene.add.graphics();

    // Apply gradient effect
    this.applyGradient(gradientColors);

    this.add([this.mainText]);
    scene.add.existing(this);
  }

  private applyGradient(colors: string[]): void {
    // Get text bounds
    const bounds = this.mainText.getBounds();
    const width = bounds.width;
    const height = bounds.height;

    // Create a canvas texture for the gradient
    const textureKey = `gradient_${Date.now()}`;
    const canvas = this.scene.textures.createCanvas(textureKey, width, height);

    if (canvas) {
      const context = canvas.getContext();

      // Create linear gradient
      const gradient = context.createLinearGradient(0, 0, 0, height);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });

      // Fill with gradient
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      // Apply the gradient as a tint mask
      canvas.refresh();
      this.gradientTexture = canvas;

      // Use the gradient texture as a mask or tint
      // For web compatibility, we'll use CSS gradient via DOM manipulation
      this.applyWebGradient(colors);
    }
  }

  private applyWebGradient(colors: string[]): void {
    // Apply gradient via inline style for web renderer
    // This works best for WebGL and Canvas renderers
    const gradientCSS = `linear-gradient(180deg, ${colors.join(', ')})`;

    // Apply gradient effect using Phaser's tint system
    // We'll use top and bottom tints to simulate gradient
    if (colors.length >= 2) {
      const topColor = Phaser.Display.Color.HexStringToColor(colors[0]).color;
      const bottomColor = Phaser.Display.Color.HexStringToColor(colors[colors.length - 1]).color;

      // Apply gradient tint
      this.mainText.setTint(topColor, topColor, bottomColor, bottomColor);
    }
  }

  setText(text: string): void {
    this.mainText.setText(text);
  }

  setGradient(colors: string[]): void {
    this.applyWebGradient(colors);
  }

  /**
   * Start cycling through neon colors randomly
   */
  startColorCycle(intervalMs: number = 3000): void {
    // Stop any existing timer
    this.stopColorCycle();

    // Set initial random color
    this.setRandomNeonGradient();

    // Create timer for color changes
    this.colorTransitionTimer = this.scene.time.addEvent({
      delay: intervalMs,
      callback: () => {
        this.transitionToRandomColor();
      },
      loop: true
    });
  }

  /**
   * Stop color cycling
   */
  stopColorCycle(): void {
    if (this.colorTransitionTimer) {
      this.colorTransitionTimer.destroy();
      this.colorTransitionTimer = undefined;
    }
  }

  /**
   * Set a random neon gradient
   */
  private setRandomNeonGradient(): void {
    const gradients = DS.NEON_GRADIENTS;
    const randomIndex = Math.floor(Math.random() * gradients.length);
    this.currentGradientIndex = randomIndex;

    // Use 3 colors from the gradient for smooth transition
    const gradient = gradients[randomIndex];
    const selectedColors = [gradient[0], gradient[2], gradient[4]]; // Dark, mid, bright

    this.setGradient(selectedColors);
  }

  /**
   * Smoothly transition to a random color
   */
  private transitionToRandomColor(): void {
    const gradients = DS.NEON_GRADIENTS;

    // Pick a different gradient
    let newIndex = Math.floor(Math.random() * gradients.length);
    while (newIndex === this.currentGradientIndex && gradients.length > 1) {
      newIndex = Math.floor(Math.random() * gradients.length);
    }

    this.currentGradientIndex = newIndex;
    const gradient = gradients[newIndex];
    const selectedColors = [gradient[0], gradient[2], gradient[4]]; // Dark, mid, bright

    // Get current and target colors
    const currentTopColor = this.mainText.tintTopLeft;
    const currentBottomColor = this.mainText.tintBottomLeft;

    const targetTopColor = Phaser.Display.Color.HexStringToColor(selectedColors[0]).color;
    const targetBottomColor = Phaser.Display.Color.HexStringToColor(selectedColors[2]).color;

    // Animate the color transition
    this.scene.tweens.add({
      targets: this,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const progress = tween.progress;

        // Interpolate colors
        const topColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(currentTopColor),
          Phaser.Display.Color.IntegerToColor(targetTopColor),
          1,
          progress
        );

        const bottomColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(currentBottomColor),
          Phaser.Display.Color.IntegerToColor(targetBottomColor),
          1,
          progress
        );

        const topColorInt = Phaser.Display.Color.GetColor(topColor.r, topColor.g, topColor.b);
        const bottomColorInt = Phaser.Display.Color.GetColor(bottomColor.r, bottomColor.g, bottomColor.b);

        this.mainText.setTint(topColorInt, topColorInt, bottomColorInt, bottomColorInt);
      }
    });
  }

  destroy(): void {
    this.stopColorCycle();
    if (this.gradientTexture) {
      this.gradientTexture.destroy();
    }
    super.destroy();
  }
}

/**
 * Factory function for creating gradient text with neon colors
 */
export function createGradientText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: string = '48px',
  gradientColors?: string[],
  autoColorCycle: boolean = false
): GradientText {
  // If no colors provided, pick a random neon gradient
  let colors = gradientColors;
  if (!colors) {
    const randomGradient = DS.NEON_GRADIENTS[Math.floor(Math.random() * DS.NEON_GRADIENTS.length)];
    colors = [randomGradient[0], randomGradient[2], randomGradient[4]]; // Dark, mid, bright
  }

  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize,
    fontFamily: DS.TYPOGRAPHY.fontFamily.display,
    fontStyle: '900 normal', // Inter Black
    align: 'center'
  };

  const gradientText = new GradientText(scene, x, y, text, style, colors);

  if (autoColorCycle) {
    gradientText.startColorCycle();
  }

  return gradientText;
}