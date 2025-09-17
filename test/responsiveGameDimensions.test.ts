import { describe, expect, it } from 'vitest';
import { ResponsiveRules, resolveResponsiveSizing } from '../src/client/game/display/ResponsiveDisplay';

describe('resolveResponsiveSizing', () => {
  it('returns portrait sizing for tall mobile viewports', () => {
    const sizing = resolveResponsiveSizing(375, 812);

    expect(sizing.orientation).toBe('portrait');
    expect(sizing.designWidth).toBe(ResponsiveRules.DESIGN.portrait.width);
    expect(sizing.designHeight).toBe(ResponsiveRules.DESIGN.portrait.height);
    expect(sizing.breakpoint).toBe('mobile');
    expect(sizing.zoom).toBeCloseTo(ResponsiveRules.SCALE.min);
  });

  it('switches to landscape layout when width dominates', () => {
    const sizing = resolveResponsiveSizing(1920, 1080);

    expect(sizing.orientation).toBe('landscape');
    expect(sizing.designWidth).toBe(ResponsiveRules.DESIGN.landscape.width);
    expect(sizing.designHeight).toBe(ResponsiveRules.DESIGN.landscape.height);
    expect(sizing.breakpoint).toBe('desktop');
  });

  it('limits zoom to configured maximum for ultra-wide displays', () => {
    const sizing = resolveResponsiveSizing(5000, 4000);

    expect(sizing.zoom).toBeCloseTo(ResponsiveRules.SCALE.max);
    expect(sizing.displayWidth).toBe(
      Math.round(ResponsiveRules.DESIGN.landscape.width * ResponsiveRules.SCALE.max)
    );
  });

  it('clamps to safe minimum viewport bounds', () => {
    const sizing = resolveResponsiveSizing(200, 200);

    expect(sizing.viewportWidth).toBe(ResponsiveRules.LIMITS.minWidth);
    expect(sizing.viewportHeight).toBe(ResponsiveRules.LIMITS.minHeight);
    expect(sizing.zoom).toBeCloseTo(ResponsiveRules.SCALE.min);
  });
});
