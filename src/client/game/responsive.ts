import { DesignSystem } from './config/DesignSystem';

export const GAME_ASPECT_RATIO = 900 / 800;
export const MIN_GAME_WIDTH = DesignSystem.BREAKPOINTS.xs;
export const MAX_GAME_WIDTH = DesignSystem.BREAKPOINTS.xxl;
export const MIN_GAME_HEIGHT = Math.round(MIN_GAME_WIDTH * GAME_ASPECT_RATIO);
export const MAX_GAME_HEIGHT = Math.round(MAX_GAME_WIDTH * GAME_ASPECT_RATIO);
export const FALLBACK_VIEWPORT_WIDTH = DesignSystem.BREAKPOINTS.md;
export const FALLBACK_VIEWPORT_HEIGHT = Math.round(FALLBACK_VIEWPORT_WIDTH * GAME_ASPECT_RATIO);

export type BreakpointKey = keyof typeof DesignSystem.BREAKPOINTS;
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveDimensions {
  width: number;
  height: number;
  breakpoint: BreakpointKey;
  orientation: Orientation;
}

const BREAKPOINT_ENTRIES = (Object.entries(DesignSystem.BREAKPOINTS) as [BreakpointKey, number][])
  .sort((a, b) => a[1] - b[1]);

const resolveBreakpoint = (width: number): BreakpointKey => {
  let active = BREAKPOINT_ENTRIES[0][0];
  for (const [key, value] of BREAKPOINT_ENTRIES) {
    if (width >= value) {
      active = key;
    } else {
      break;
    }
  }
  return active;
};

export const calculateResponsiveDimensions = (
  viewportWidth: number,
  viewportHeight: number
): ResponsiveDimensions => {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const orientation: Orientation = safeWidth >= safeHeight ? 'landscape' : 'portrait';

  let width = Math.min(safeWidth, MAX_GAME_WIDTH);
  if (orientation === 'landscape') {
    width = Math.min(width, safeHeight / GAME_ASPECT_RATIO);
  }

  width = Math.min(width, safeWidth);
  const preferredMinimum = Math.min(safeWidth, MIN_GAME_WIDTH);
  width = Math.max(width, preferredMinimum);

  let height = width * GAME_ASPECT_RATIO;

  if (height > safeHeight) {
    height = safeHeight;
    width = Math.min(safeWidth, height / GAME_ASPECT_RATIO);
  }

  width = Math.min(width, safeWidth);
  height = Math.min(height, safeHeight);

  const roundedWidth = Math.max(1, Math.round(width));
  const roundedHeight = Math.max(1, Math.round(height));

  const breakpoint = resolveBreakpoint(Math.max(roundedWidth, Math.round(preferredMinimum)));

  return {
    width: roundedWidth,
    height: roundedHeight,
    breakpoint,
    orientation
  };
};
