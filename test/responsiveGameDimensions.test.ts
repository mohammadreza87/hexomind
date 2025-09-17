import { describe, expect, it } from 'vitest';
import { calculateResponsiveLayout, DESIGN_HEIGHT, DESIGN_WIDTH } from '../src/client/game/responsive';

const DESIGN_ASPECT = DESIGN_WIDTH / DESIGN_HEIGHT;

const expectAspectRatio = (width: number, height: number) => {
  expect(width / height).toBeCloseTo(DESIGN_ASPECT, 3);
};

describe('calculateResponsiveLayout', () => {
  it('maintains the design aspect ratio for portrait viewports', () => {
    const layout = calculateResponsiveLayout(360, 780);

    expect(layout.orientation).toBe('portrait');
    expectAspectRatio(layout.safeArea.width, layout.safeArea.height);
    expect(layout.safeArea.width).toBeCloseTo(DESIGN_WIDTH * layout.scale, 3);
    expect(layout.safeArea.height).toBeCloseTo(DESIGN_HEIGHT * layout.scale, 3);
    expect(layout.boardArea.y).toBeGreaterThan(layout.uiArea.bottom);
    expect(layout.trayArea.bottom).toBeCloseTo(layout.safeArea.bottom, 3);
  });

  it('caps scaling and centers the safe area for oversized canvases', () => {
    const layout = calculateResponsiveLayout(4000, 4000);

    expect(layout.scale).toBeLessThanOrEqual(1.6);
    expectAspectRatio(layout.safeArea.width, layout.safeArea.height);
    expect(layout.safeArea.centerX).toBeGreaterThan(0);
    expect(layout.safeArea.centerY).toBeGreaterThan(0);
  });

  it('produces a landscape layout when width dominates', () => {
    const layout = calculateResponsiveLayout(1920, 1080);

    expect(layout.orientation).toBe('landscape');
    expectAspectRatio(layout.safeArea.width, layout.safeArea.height);
    expect(layout.trayArea.bottom).toBeCloseTo(layout.safeArea.bottom, 3);
    expect(layout.boardArea.height).toBeGreaterThan(0);
  });

  it('allocates space for UI, board, and tray sections', () => {
    const layout = calculateResponsiveLayout(1024, 1280);

    expect(layout.uiArea.height).toBeGreaterThan(0);
    expect(layout.boardArea.height).toBeGreaterThan(0);
    expect(layout.trayArea.height).toBeGreaterThan(0);
    expect(layout.boardArea.y).toBeGreaterThan(layout.uiArea.y);
    expect(layout.trayArea.y).toBeGreaterThan(layout.boardArea.y);
  });
});
