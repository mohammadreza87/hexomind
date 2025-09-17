import * as Phaser from 'phaser';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';

interface DepthPipelineConfig {
  intensity?: number;
  primaryColor?: [number, number, number];
  secondaryColor?: [number, number, number];
}

const GRADIENT_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

uniform float intensity;
uniform float time;
uniform vec3 primaryColor;
uniform vec3 secondaryColor;

void main() {
  vec4 baseColor = texture2D(uMainSampler, outTexCoord);
  vec3 gradient = mix(primaryColor, secondaryColor, outTexCoord.y);
  float shimmer = sin((outTexCoord.x + outTexCoord.y + time) * 6.28318) * 0.15 + 0.15;
  vec3 bloom = baseColor.rgb + gradient * (intensity + shimmer);
  bloom = clamp(bloom, 0.0, 1.0);
  vec3 blended = mix(baseColor.rgb, bloom, intensity);
  gl_FragColor = vec4(blended, baseColor.a);
}
`;

class DepthEffectsGradientPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private intensity: number;
  private readonly primary: Phaser.Math.Vector3;
  private readonly secondary: Phaser.Math.Vector3;
  private time: number = 0;

  constructor(game: Phaser.Game, config?: DepthPipelineConfig) {
    super({
      game,
      renderTarget: true,
      fragShader: GRADIENT_FRAGMENT_SHADER
    });

    this.intensity = config?.intensity ?? 0.45;
    const primaryConfig = config?.primaryColor ?? [0.6, 0.2, 0.9];
    const secondaryConfig = config?.secondaryColor ?? [0.3, 0.8, 1.0];

    this.primary = new Phaser.Math.Vector3(primaryConfig[0], primaryConfig[1], primaryConfig[2]);
    this.secondary = new Phaser.Math.Vector3(secondaryConfig[0], secondaryConfig[1], secondaryConfig[2]);
  }

  override onPreRender(): void {
    const delta = this.game.loop?.delta ?? 16;
    this.time += delta / 1000;

    this.set1f('intensity', this.intensity);
    this.set1f('time', this.time);
    this.set3f('primaryColor', this.primary.x, this.primary.y, this.primary.z);
    this.set3f('secondaryColor', this.secondary.x, this.secondary.y, this.secondary.z);
  }
}

export class DepthEffects {
  private static readonly PIPELINE_KEY = 'depth-effects-gradient';
  private static readonly MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  private static readonly INSTANCES = new WeakMap<Phaser.Scene, DepthEffects>();

  static forScene(scene: Phaser.Scene, themeProvider: NeonThemeProvider): DepthEffects {
    let instance = DepthEffects.INSTANCES.get(scene);
    if (!instance) {
      instance = new DepthEffects(scene, themeProvider);
      DepthEffects.INSTANCES.set(scene, instance);
    } else {
      instance.themeProvider = themeProvider;
    }

    return instance;
  }

  private themeProvider: NeonThemeProvider;
  private prefersReducedMotion: boolean = false;
  private motionQuery?: MediaQueryList;
  private readonly scene: Phaser.Scene;
  private readonly basePositions = new WeakMap<Phaser.GameObjects.Container, Phaser.Math.Vector2>();
  private readonly baseScales = new WeakMap<Phaser.GameObjects.Container, Phaser.Math.Vector2>();
  private readonly shadowBase = new WeakMap<Phaser.GameObjects.Graphics, { alpha: number }>();
  private readonly glowBase = new WeakMap<Phaser.GameObjects.GameObject, { alpha: number }>();
  private readonly objectDepth = new WeakMap<Phaser.GameObjects.GameObject, number>();

  private constructor(scene: Phaser.Scene, themeProvider: NeonThemeProvider) {
    this.scene = scene;
    this.themeProvider = themeProvider;

    this.prefersReducedMotion = false;
    this.configureMotionPreferences();
    this.registerPipeline();
  }

  isMotionReduced(): boolean {
    return this.prefersReducedMotion;
  }

  registerPiece(
    container: Phaser.GameObjects.Container,
    shadow?: Phaser.GameObjects.Graphics,
    glow?: Phaser.GameObjects.GameObject | null
  ): void {
    this.syncPieceBase(container, shadow, null); // Glow always null
  }

  syncPieceBase(
    container: Phaser.GameObjects.Container,
    shadow?: Phaser.GameObjects.Graphics,
    glow?: Phaser.GameObjects.GameObject | null
  ): void {
    this.basePositions.set(container, new Phaser.Math.Vector2(container.x, container.y));
    this.baseScales.set(container, new Phaser.Math.Vector2(container.scaleX, container.scaleY));

    if (shadow) {
      this.shadowBase.set(shadow, { alpha: shadow.alpha ?? 0 });
    }

    // Glow removed - no longer tracking glow state
  }

  updatePieceShadow(
    shadow: Phaser.GameObjects.Graphics,
    offsets: Phaser.Math.Vector2[],
    hexSize: number
  ): void {
    if (!shadow) return;

    shadow.clear();

    const opacity = this.prefersReducedMotion ? 0.12 : 0.22;
    shadow.fillStyle(0x000000, opacity);

    const offsetX = hexSize * 0.08;
    const offsetY = hexSize * 0.18;
    const scale = hexSize * 0.96;

    offsets.forEach((point) => {
      this.drawHexagon(shadow, point.x + offsetX, point.y + offsetY, scale, true);
    });

    const base = this.shadowBase.get(shadow);
    const baseAlpha = base?.alpha ?? opacity;
    shadow.setAlpha(baseAlpha);
    shadow.setVisible(true);
  }

  applyPieceHover(
    container: Phaser.GameObjects.Container,
    shadow?: Phaser.GameObjects.Graphics,
    glow?: Phaser.GameObjects.GameObject | null
  ): void {
    const base = this.basePositions.get(container);
    const scale = this.baseScales.get(container);

    if (!base || !scale) {
      this.syncPieceBase(container, shadow, glow);
      return this.applyPieceHover(container, shadow, glow);
    }

    if (this.prefersReducedMotion) {
      if (shadow) {
        shadow.setAlpha(0.18);
        shadow.setVisible(true);
      }
      // Glow removed
      return;
    }

    const hoverOffset = 12;

    this.scene.tweens.add({
      targets: container,
      y: base.y - hoverOffset,
      scaleX: scale.x * 1.04,
      scaleY: scale.y * 1.04,
      duration: 160,
      ease: Phaser.Math.Easing.Sine.Out
    });

    if (shadow) {
      this.scene.tweens.add({
        targets: shadow,
        alpha: 0.32,
        duration: 140,
        ease: Phaser.Math.Easing.Sine.Out,
        onStart: () => shadow.setVisible(true)
      });
    }

    // Glow animation removed

    // Pipeline disabled - no glow effects
    // this.applyPipeline(container, 0.55);
  }

  releasePieceHover(
    container: Phaser.GameObjects.Container,
    shadow?: Phaser.GameObjects.Graphics,
    glow?: Phaser.GameObjects.GameObject | null
  ): void {
    const base = this.basePositions.get(container);
    const scale = this.baseScales.get(container);

    if (!base || !scale) {
      return;
    }

    const shadowState = shadow ? this.shadowBase.get(shadow) : undefined;
    // Glow state removed

    if (this.prefersReducedMotion) {
      if (shadow && shadowState) {
        shadow.setAlpha(shadowState.alpha);
      }
      // Glow removed
      return;
    }

    this.scene.tweens.add({
      targets: container,
      y: base.y,
      scaleX: scale.x,
      scaleY: scale.y,
      duration: 180,
      ease: Phaser.Math.Easing.Sine.Out
    });

    if (shadow && shadowState) {
      this.scene.tweens.add({
        targets: shadow,
        alpha: shadowState.alpha,
        duration: 160,
        ease: Phaser.Math.Easing.Sine.Out
      });
    }

    if (glow && glowState) {
      this.scene.tweens.add({
        targets: glow,
        alpha: glowState.alpha,
        duration: 140,
        ease: Phaser.Math.Easing.Sine.Out
      });
    }

    // Pipeline disabled
    // this.removePipeline(container);
  }

  beginDragFocus(
    container: Phaser.GameObjects.Container,
    shadow?: Phaser.GameObjects.Graphics,
    glow?: Phaser.GameObjects.GameObject | null
  ): void {
    if (this.prefersReducedMotion) {
      // Glow removed
      if (shadow) {
        shadow.setAlpha(0.12);
      }
      return;
    }

    // Pipeline disabled - no glow effects
    // this.applyPipeline(container, 0.75);

    // Glow animation removed

    if (shadow) {
      this.scene.tweens.add({
        targets: shadow,
        alpha: 0.12,
        duration: 120,
        ease: Phaser.Math.Easing.Sine.Out
      });
    }
  }

  endDragFocus(
    container: Phaser.GameObjects.Container,
    shadow?: Phaser.GameObjects.Graphics,
    glow?: Phaser.GameObjects.GameObject | null
  ): void {
    const shadowState = shadow ? this.shadowBase.get(shadow) : undefined;
    // Glow state removed

    if (this.prefersReducedMotion) {
      if (shadow && shadowState) {
        shadow.setAlpha(shadowState.alpha);
      }
      // Glow removed
      return;
    }

    // Pipeline disabled
    // this.removePipeline(container);

    if (shadow && shadowState) {
      this.scene.tweens.add({
        targets: shadow,
        alpha: shadowState.alpha,
        duration: 160,
        ease: Phaser.Math.Easing.Sine.Out
      });
    }

    // Glow animation removed
  }

  celebrateCellFill(image: Phaser.GameObjects.Image, tint: number): void {
    if (this.prefersReducedMotion) {
      return;
    }

    this.pushDepth(image, 90);
    // Pipeline disabled - no glow effects
    // this.applyPipeline(image, 0.4, tint);

    this.scene.tweens.add({
      targets: image,
      scale: image.scale * 1.08,
      duration: 140,
      ease: Phaser.Math.Easing.Back.Out,
      yoyo: true,
      onComplete: () => {
        this.cleanupGameObject(image);
      }
    });
  }

  highlightLineClear(image: Phaser.GameObjects.Image, tint: number): void {
    if (this.prefersReducedMotion) {
      return;
    }

    this.pushDepth(image, 200);
    // Pipeline disabled - no glow effects
    // this.applyPipeline(image, 0.65, tint);
    const { x, y } = this.getWorldPosition(image);
    this.spawnParticleBurst(x, y, tint);
  }

  cleanupGameObject(gameObject: Phaser.GameObjects.GameObject): void {
    // Pipeline disabled
    // this.removePipeline(gameObject);
    this.popDepth(gameObject);
  }

  private configureMotionPreferences(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      this.prefersReducedMotion = false;
      return;
    }

    this.motionQuery = window.matchMedia(DepthEffects.MOTION_QUERY);
    this.prefersReducedMotion = this.motionQuery.matches;

    this.motionQuery.addEventListener('change', (event) => {
      this.prefersReducedMotion = event.matches;
    });
  }

  private registerPipeline(): void {
    const renderer = this.scene.game.renderer;

    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
      return;
    }

    renderer.pipelines.addPostPipeline(DepthEffects.PIPELINE_KEY, DepthEffectsGradientPipeline);
  }

  private applyPipeline(
    target: Phaser.GameObjects.GameObject,
    intensity: number,
    accentColor?: number
  ): void {
    if (this.prefersReducedMotion) return;

    const renderer = this.scene.game.renderer;
    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
      return;
    }

    const theme = this.themeProvider.getTheme();
    const primary = this.colorToArray(theme.glowPrimary);
    const secondarySource = accentColor ?? theme.glowSecondary ?? theme.glowPrimary;
    const secondary = this.colorToArray(secondarySource);

    // Remove any existing instance to refresh the configuration
    (target as any).removePostPipeline?.(DepthEffects.PIPELINE_KEY);

    (target as any).setPostPipeline?.(
      DepthEffects.PIPELINE_KEY,
      {
        intensity,
        primaryColor: primary,
        secondaryColor: secondary
      },
      false
    );
  }

  private removePipeline(target: Phaser.GameObjects.GameObject): void {
    (target as any).removePostPipeline?.(DepthEffects.PIPELINE_KEY);
  }

  private pushDepth(target: Phaser.GameObjects.GameObject, depth: number): void {
    if (!this.objectDepth.has(target)) {
      this.objectDepth.set(target, target.depth ?? 0);
    }

    target.setDepth(depth);
  }

  private popDepth(target: Phaser.GameObjects.GameObject): void {
    const original = this.objectDepth.get(target);
    if (original !== undefined) {
      target.setDepth(original);
      this.objectDepth.delete(target);
    }
  }

  private spawnParticleBurst(x: number, y: number, tint: number): void {
    if (this.prefersReducedMotion) {
      return;
    }

    const color = tint;

    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.circle(x, y, 3, color, 0.85);
      particle.setDepth(250);

      const angle = Phaser.Math.DegToRad((360 / particleCount) * i + Phaser.Math.Between(-12, 12));
      const distance = 26 + Phaser.Math.Between(-6, 8);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: { from: 1, to: 0.4 },
        duration: 220,
        ease: Phaser.Math.Easing.Sine.Out,
        onComplete: () => particle.destroy()
      });
    }
  }

  private colorToArray(color: number): [number, number, number] {
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;
    return [r, g, b];
  }

  private drawHexagon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    fill: boolean
  ): void {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(new Phaser.Geom.Point(px, py));
    }

    if (fill) {
      graphics.fillPoints(points, true);
    } else {
      graphics.strokePoints(points, true);
    }
  }

  private getWorldPosition(gameObject: Phaser.GameObjects.GameObject): { x: number; y: number } {
    const temp = new Phaser.Math.Vector2();
    gameObject.getWorldTransformMatrix().transformPoint(0, 0, temp);
    return { x: temp.x, y: temp.y };
  }
}
