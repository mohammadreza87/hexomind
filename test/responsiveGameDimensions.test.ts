import { describe, expect, it } from 'vitest';
import { measureResponsiveViewport } from '../src/client/game/responsive';

describe('measureResponsiveViewport', () => {
  it('selects the portrait layout for tall mobile viewports', () => {
    const metrics = measureResponsiveViewport(390, 844);

    expect(metrics.orientation).toBe('portrait');
    expect(metrics.width).toBe(1080);
    expect(metrics.height).toBe(1920);
    expect(metrics.displayWidth).toBe(390);
    expect(metrics.displayHeight).toBe(693);
    expect(metrics.safeArea.width).toBeLessThan(metrics.width);
  });

  it('chooses landscape metrics when the viewport is wider than tall', () => {
    const metrics = measureResponsiveViewport(1280, 720);

    expect(metrics.orientation).toBe('landscape');
    expect(metrics.width).toBe(1920);
    expect(metrics.height).toBe(1080);
    expect(metrics.displayWidth).toBe(1280);
    expect(metrics.displayHeight).toBe(720);
    expect(metrics.boardArea.height).toBeLessThan(metrics.safeArea.height);
  });

  it('clamps extremely small viewports to a safe rendering size', () => {
    const metrics = measureResponsiveViewport(280, 400);

    expect(metrics.displayWidth).toBeLessThanOrEqual(320);
    expect(metrics.displayHeight).toBeGreaterThan(0);
    expect(metrics.scale).toBeCloseTo(metrics.displayWidth / metrics.width, 5);
    expect(metrics.offsetX).toBeGreaterThanOrEqual(0);
  });

  it('provides a dedicated tray area beneath the board', () => {
    const metrics = measureResponsiveViewport(1024, 1366);

    expect(metrics.boardArea.bottom).toBeLessThan(metrics.trayArea.bottom);
    expect(metrics.trayArea.height).toBeGreaterThan(0);
    expect(metrics.safeArea.height).toBeGreaterThan(metrics.boardArea.height);
  });
});
