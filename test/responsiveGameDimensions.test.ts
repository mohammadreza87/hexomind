import { describe, expect, it } from 'vitest';
import { calculateResponsiveDimensions } from '../src/client/game/responsive';
import { DesignSystem } from '../src/client/game/config/DesignSystem';

const ASPECT_RATIO = 900 / 800;

describe('calculateResponsiveDimensions', () => {
  it('adapts to narrow portrait viewports and reports xs breakpoint', () => {
    const result = calculateResponsiveDimensions(360, 780);

    expect(result.orientation).toBe('portrait');
    expect(result.breakpoint).toBe('xs');
    expect(result.width).toBe(360);
    expect(result.height).toBe(Math.round(360 * ASPECT_RATIO));
  });

  it('clamps width to the xxl breakpoint for extremely wide layouts', () => {
    const result = calculateResponsiveDimensions(2200, 2800);

    expect(result.breakpoint).toBe('xxl');
    expect(result.width).toBe(DesignSystem.BREAKPOINTS.xxl);
    expect(result.height).toBe(Math.round(DesignSystem.BREAKPOINTS.xxl * ASPECT_RATIO));
  });

  it('maintains aspect ratio when height is the constraining dimension', () => {
    const result = calculateResponsiveDimensions(1920, 1080);

    expect(result.orientation).toBe('landscape');
    expect(result.height).toBe(1080);
    expect(result.width).toBe(Math.round(1080 / ASPECT_RATIO));
  });

  it('selects the expected breakpoint for medium sized tablets', () => {
    const result = calculateResponsiveDimensions(1024, 1280);

    expect(result.width).toBe(1024);
    expect(result.breakpoint).toBe('lg');
  });
});
