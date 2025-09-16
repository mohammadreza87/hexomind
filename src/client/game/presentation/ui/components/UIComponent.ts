import * as Phaser from 'phaser';
import { DS } from '../../../config/DesignSystem';

type SpacingToken = keyof typeof DS.SPACING;
type FontFamilyToken = keyof typeof DS.TYPOGRAPHY.fontFamily;
type FontSizeToken = keyof typeof DS.TYPOGRAPHY.fontSize;
type FontWeightToken = keyof typeof DS.TYPOGRAPHY.fontWeight;
type TextVariant = 'display' | 'heading' | 'body' | 'caption' | 'button';

export interface UIComponentOptions {
  x?: number;
  y?: number;
  depth?: number;
  visible?: boolean;
}

type TypographyTokens = {
  fontFamily: Record<FontFamilyToken, string>;
  fontSize: Record<FontSizeToken, string>;
  fontWeight: Record<FontWeightToken, string>;
};

export abstract class UIComponent extends Phaser.GameObjects.Container {
  public readonly spacing: Readonly<Record<SpacingToken, number>>;
  public readonly typography: Readonly<TypographyTokens>;
  public readonly layers = DS.LAYERS;
  public readonly animation = DS.ANIMATION;
  public readonly radius = DS.RADIUS;

  constructor(scene: Phaser.Scene, options: UIComponentOptions = {}) {
    const { x = 0, y = 0, depth, visible = true } = options;
    super(scene, x, y);

    this.spacing = UIComponent.buildSpacing();
    this.typography = UIComponent.buildTypography();

    if (depth !== undefined) {
      this.setDepth(depth);
    }

    this.setVisible(visible);

    scene.add.existing(this);
  }

  public getSpacing(token: SpacingToken): number {
    return this.spacing[token];
  }

  public getFontFamily(token: FontFamilyToken): string {
    return this.typography.fontFamily[token];
  }

  public getFontSize(token: FontSizeToken): string {
    return this.typography.fontSize[token];
  }

  public getFontWeight(token: FontWeightToken): string {
    return this.typography.fontWeight[token];
  }

  public getTextStyle(
    variant: TextVariant = 'body',
    options?: {
      color?: string;
      weight?: FontWeightToken;
      align?: 'left' | 'center' | 'right';
    }
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return DS.getTextStyle(variant, options);
  }

  public getColor(category: 'solid' | 'glass' | 'accents', key: string): string {
    return DS.getColor(category, key);
  }

  public colorToNumber(color: string, fallback?: string): number {
    return DS.colorStringToNumber(color, fallback);
  }

  public getGradient(name: keyof typeof DS.COLORS.gradients): string[] {
    return DS.getGradient(name);
  }

  protected destroyChildren(): void {
    this.removeAll(true);
  }

  private static buildSpacing(): Readonly<Record<SpacingToken, number>> {
    const keys = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'] as const;
    const values = keys.reduce((acc, key) => {
      acc[key] = DS.getSpacingValue(key);
      return acc;
    }, {} as Record<SpacingToken, number>);

    return Object.freeze(values);
  }

  private static buildTypography(): Readonly<TypographyTokens> {
    const fontFamilyKeys = ['display', 'displayBlack', 'body', 'mono'] as const;
    const fontSizeKeys = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
    const fontWeightKeys = ['light', 'regular', 'medium', 'semibold', 'bold', 'black'] as const;

    const fontFamily = fontFamilyKeys.reduce((acc, key) => {
      acc[key] = DS.getFontFamily(key);
      return acc;
    }, {} as Record<FontFamilyToken, string>);

    const fontSize = fontSizeKeys.reduce((acc, key) => {
      acc[key] = DS.getFontSize(key);
      return acc;
    }, {} as Record<FontSizeToken, string>);

    const fontWeight = fontWeightKeys.reduce((acc, key) => {
      acc[key] = DS.getFontWeight(key);
      return acc;
    }, {} as Record<FontWeightToken, string>);

    return Object.freeze({
      fontFamily: Object.freeze(fontFamily),
      fontSize: Object.freeze(fontSize),
      fontWeight: Object.freeze(fontWeight),
    });
  }
}
