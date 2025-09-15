/**
 * Sharp Text Helper
 * Ensures crisp text rendering on high-DPI displays
 */

export class SharpText {
  /**
   * Create ultra-sharp text for any display
   * Combines multiple techniques for maximum clarity
   */
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    // Get effective DPR (minimum 2 for sharpness)
    const dpr = Math.max(window.devicePixelRatio || 1, 2);

    // Create text with base style
    const textObj = scene.add.text(x, y, text, style);

    // Apply high resolution - this is the KEY for sharp text
    textObj.setResolution(dpr * 2); // Double the DPR for ultra-sharp text

    // Ensure pixel-perfect positioning
    textObj.x = Math.round(x);
    textObj.y = Math.round(y);

    // Additional sharpness settings
    textObj.setPadding(2, 2); // Small padding helps with edge clarity

    return textObj;
  }

  /**
   * Enhance existing text object for maximum sharpness
   */
  static enhance(textObj: Phaser.GameObjects.Text): void {
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    textObj.setResolution(dpr * 2);
    textObj.x = Math.round(textObj.x);
    textObj.y = Math.round(textObj.y);
  }

  /**
   * Update existing text position to integer values
   * Prevents sub-pixel rendering which causes blur
   */
  static snapToPixel(textObj: Phaser.GameObjects.Text): void {
    textObj.x = Math.round(textObj.x);
    textObj.y = Math.round(textObj.y);
  }

  /**
   * Apply CSS styles to canvas for optimal rendering on high-DPI displays
   */
  static applyCanvasStyles(canvas: HTMLCanvasElement): void {
    // Use auto rendering for smooth graphics (not pixel art)
    canvas.style.imageRendering = 'auto';

    // Ensure smooth fonts
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
  }
}