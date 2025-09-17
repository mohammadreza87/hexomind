import * as Phaser from 'phaser';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';

/**
 * HexagonRenderer - Specialized renderer for hexagonal shapes
 *
 * Handles all hexagon drawing operations with consistent styling
 * and performance optimizations.
 */
export class HexagonRenderer {
  private themeProvider: NeonThemeProvider;

  // Cached calculations
  private cachedPoints: Map<number, Phaser.Math.Vector2[]> = new Map();
  private orientation: 'pointy' | 'flat' = 'pointy';
  private rotationOffset: number = 0; // additional rotation in radians

  constructor(themeProvider: NeonThemeProvider) {
    this.themeProvider = themeProvider;
  }

  /**
   * Get hexagon corner points for the configured orientation
   */
  getHexPoints(size: number): Phaser.Math.Vector2[] {
    // Check cache
    if (this.cachedPoints.has(size)) {
      return this.cachedPoints.get(size)!;
    }

    const points: Phaser.Math.Vector2[] = [];

    const base = (this.orientation === 'pointy' ? 0 : -Math.PI / 6) + this.rotationOffset;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + base; // pointy: start at 0, flat: -30deg
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      points.push(new Phaser.Math.Vector2(x, y));
    }

    // Cache for reuse
    this.cachedPoints.set(size, points);

    return points;
  }

  /**
   * Draw a hexagon
   */
  drawHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    fillColor: number,
    borderColor: number = 0x000000,
    borderAlpha: number = 0.3,
    fillAlpha: number = 1
  ): void {
    const points = this.getHexPoints(size);

    // 1px border with AA for clean, non-jagged edges
    graphics.lineStyle(1, borderColor, borderAlpha);
    graphics.fillStyle(fillColor, fillAlpha);

    // Begin path
    graphics.beginPath();
    graphics.moveTo(x + points[0].x, y + points[0].y);

    // Draw hexagon
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i].x, y + points[i].y);
    }

    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  /**
   * Draw a hexagon with gradient fill
   */
  drawGradientHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    colorTop: number,
    colorBottom: number,
    borderColor: number = 0x000000,
    borderAlpha: number = 0.3
  ): void {
    // Note: Phaser doesn't support gradients directly in Graphics
    // We'll simulate with multiple layers
    const layers = 5;
    const points = this.getHexPoints(size);

    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const layerSize = size * (1 - t * 0.1);
      const layerPoints = this.getHexPoints(layerSize);

      // Interpolate color
      const color = this.interpolateColor(colorTop, colorBottom, t);

      // Draw layer
      graphics.fillStyle(color, 1);
      graphics.beginPath();
      graphics.moveTo(x + layerPoints[0].x, y + layerPoints[0].y);

      for (let j = 1; j < layerPoints.length; j++) {
        graphics.lineTo(x + layerPoints[j].x, y + layerPoints[j].y);
      }

      graphics.closePath();
      graphics.fillPath();
    }

    // Draw border
    graphics.lineStyle(1.5, borderColor, borderAlpha);
    graphics.beginPath();
    graphics.moveTo(x + points[0].x, y + points[0].y);

    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i].x, y + points[i].y);
    }

    graphics.closePath();
    graphics.strokePath();
  }

  /**
   * Draw a glowing hexagon
   */
  drawGlowingHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color: number,
    glowColor: number,
    glowIntensity: number = 0.5
  ): void {
    // Draw glow layers
    const glowLayers = 3;
    for (let i = glowLayers; i > 0; i--) {
      const glowSize = size + (i * 4);
      const alpha = (glowIntensity / glowLayers) * (glowLayers - i + 1) / glowLayers;

      this.drawHexagon(
        graphics,
        x,
        y,
        glowSize,
        glowColor,
        glowColor,
        0,
        alpha * 0.3
      );
    }

    // Draw main hexagon
    this.drawHexagon(graphics, x, y, size, color);
  }

  /**
   * Draw a dashed hexagon border
   */
  drawDashedHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color: number,
    dashLength: number = 5,
    gapLength: number = 3,
    lineWidth: number = 2,
    alpha: number = 1
  ): void {
    const points = this.getHexPoints(size);
    graphics.lineStyle(lineWidth, color, alpha);

    // Draw each edge with dashes
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      this.drawDashedLine(
        graphics,
        x + p1.x,
        y + p1.y,
        x + p2.x,
        y + p2.y,
        dashLength,
        gapLength
      );
    }
  }

  /**
   * Draw a filled hexagon with pattern
   */
  drawPatternHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    baseColor: number,
    patternColor: number,
    patternType: 'dots' | 'lines' | 'cross' = 'dots'
  ): void {
    // Draw base
    this.drawHexagon(graphics, x, y, size, baseColor);

    // Draw pattern
    graphics.lineStyle(1, patternColor, 0.3);

    switch (patternType) {
      case 'dots':
        this.drawDotPattern(graphics, x, y, size);
        break;
      case 'lines':
        this.drawLinePattern(graphics, x, y, size);
        break;
      case 'cross':
        this.drawCrossPattern(graphics, x, y, size);
        break;
    }
  }

  /**
   * Draw selection indicator around hexagon
   */
  drawSelectionIndicator(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color: number,
    animated: boolean = true,
    time: number = 0
  ): void {
    const pulseSize = animated ? size + Math.sin(time * 0.005) * 3 : size + 3;

    // Draw outer glow
    this.drawHexagon(
      graphics,
      x,
      y,
      pulseSize + 2,
      color,
      color,
      0.2,
      0.2
    );

    // Draw selection border
    graphics.lineStyle(3, color, 0.8);
    const points = this.getHexPoints(pulseSize);

    graphics.beginPath();
    graphics.moveTo(x + points[0].x, y + points[0].y);

    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i].x, y + points[i].y);
    }

    graphics.closePath();
    graphics.strokePath();
  }

  /**
   * Helper: Draw dashed line
   */
  private drawDashedLine(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number,
    gapLength: number
  ): void {
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const dashCount = Math.floor(distance / (dashLength + gapLength));

    const dx = (x2 - x1) / distance;
    const dy = (y2 - y1) / distance;

    let currentX = x1;
    let currentY = y1;

    for (let i = 0; i < dashCount; i++) {
      const dashEndX = currentX + dx * dashLength;
      const dashEndY = currentY + dy * dashLength;

      graphics.beginPath();
      graphics.moveTo(currentX, currentY);
      graphics.lineTo(dashEndX, dashEndY);
      graphics.strokePath();

      currentX = dashEndX + dx * gapLength;
      currentY = dashEndY + dy * gapLength;
    }

    // Draw remaining segment
    if (currentX !== x2 || currentY !== y2) {
      graphics.beginPath();
      graphics.moveTo(currentX, currentY);
      graphics.lineTo(x2, y2);
      graphics.strokePath();
    }
  }

  /**
   * Helper: Draw dot pattern
   */
  private drawDotPattern(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number
  ): void {
    const dotSize = 2;
    const spacing = size / 3;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const dotX = x + i * spacing;
        const dotY = y + j * spacing;

        // Check if dot is inside hexagon (approximate)
        if (Math.abs(dotX - x) < size * 0.8 && Math.abs(dotY - y) < size * 0.8) {
          graphics.fillCircle(dotX, dotY, dotSize);
        }
      }
    }
  }

  /**
   * Helper: Draw line pattern
   */
  private drawLinePattern(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number
  ): void {
    const lineCount = 5;
    const spacing = (size * 2) / lineCount;

    for (let i = 0; i < lineCount; i++) {
      const lineY = y - size + (i * spacing);
      graphics.beginPath();
      graphics.moveTo(x - size * 0.8, lineY);
      graphics.lineTo(x + size * 0.8, lineY);
      graphics.strokePath();
    }
  }

  /**
   * Helper: Draw cross pattern
   */
  private drawCrossPattern(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number
  ): void {
    const crossSize = size * 0.6;

    // Vertical line
    graphics.beginPath();
    graphics.moveTo(x, y - crossSize);
    graphics.lineTo(x, y + crossSize);
    graphics.strokePath();

    // Horizontal line
    graphics.beginPath();
    graphics.moveTo(x - crossSize, y);
    graphics.lineTo(x + crossSize, y);
    graphics.strokePath();
  }

  /**
   * Helper: Interpolate between two colors
   */
  private interpolateColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Draw just the outline of a hexagon
   */
  drawHexagonOutline(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color?: number,
    lineWidth: number = 2,
    alpha: number = 1
  ): void {
    const points = this.getHexPoints(size);

    // Use current line style if no color specified
    if (color !== undefined) {
      graphics.lineStyle(lineWidth, color, alpha);
    }

    graphics.beginPath();
    graphics.moveTo(x + points[0].x, y + points[0].y);

    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i].x, y + points[i].y);
    }

    graphics.closePath();
    graphics.strokePath();
  }

  /**
   * Clear cache (call when size changes significantly)
   */
  clearCache(): void {
    this.cachedPoints.clear();
  }

  /**
   * Configure the base orientation for generated hex points.
   */
  setOrientation(orientation: 'pointy' | 'flat'): void {
    if (this.orientation !== orientation) {
      this.orientation = orientation;
      this.clearCache();
    }
  }

  /**
   * Set an extra rotation for all hex computations (in radians).
   * Call when switching visual orientation (e.g., +PI/6 for 30 degrees).
   */
  setRotationOffset(radians: number): void {
    this.rotationOffset = radians;
    this.clearCache();
  }
}
