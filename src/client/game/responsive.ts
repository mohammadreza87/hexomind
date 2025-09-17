import { ScreenConfig, getOptimalDimensions, calculateScaleFactor } from './config/ScreenConfig';

// Use optimal game dimensions from ScreenConfig
export const GAME_ASPECT_RATIO = ScreenConfig.GAME_OPTIMAL.mobile.aspectRatio; // 390/844 = 0.462

// Set reasonable min/max for mobile-first approach
export const MIN_GAME_WIDTH = ScreenConfig.DEVVIT.safe_width;  // 320
export const MAX_GAME_WIDTH = ScreenConfig.BREAKPOINTS.tablet; // 768

// Calculate heights based on mobile portrait aspect ratio (height should be ~2.16x width)
export const MIN_GAME_HEIGHT = Math.round(MIN_GAME_WIDTH / GAME_ASPECT_RATIO); // ~693
export const MAX_GAME_HEIGHT = Math.round(MAX_GAME_WIDTH / GAME_ASPECT_RATIO); // ~1663

// Fallback dimensions (Devvit optimized)
export const FALLBACK_VIEWPORT_WIDTH = ScreenConfig.GAME_OPTIMAL.devvit.width;  // 360
export const FALLBACK_VIEWPORT_HEIGHT = ScreenConfig.GAME_OPTIMAL.devvit.height; // 640

export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveDimensions {
  width: number;
  height: number;
  scale: number;
  orientation: Orientation;
  platform: 'mobile' | 'tablet' | 'desktop' | 'devvit';
}

/**
 * Calculate responsive dimensions based on viewport
 * Optimized for mobile-first with Devvit support
 */
export const calculateResponsiveDimensions = (
  viewportWidth: number,
  viewportHeight: number
): ResponsiveDimensions => {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const orientation: Orientation = safeWidth >= safeHeight ? 'landscape' : 'portrait';

  // Get optimal dimensions for this viewport
  const optimal = getOptimalDimensions(safeWidth, safeHeight);

  // Determine platform
  let platform: ResponsiveDimensions['platform'] = 'mobile';
  if (safeWidth >= ScreenConfig.BREAKPOINTS.desktop) {
    platform = 'desktop';
  } else if (safeWidth >= ScreenConfig.BREAKPOINTS.tablet) {
    platform = 'tablet';
  } else if (safeWidth <= ScreenConfig.DEVVIT.max_width && safeHeight <= ScreenConfig.DEVVIT.max_height) {
    platform = 'devvit';
  }

  let gameWidth: number;
  let gameHeight: number;

  if (orientation === 'portrait') {
    // Portrait mode - prioritize height
    gameWidth = Math.min(safeWidth, optimal.width);
    gameHeight = Math.round(gameWidth / optimal.aspectRatio);

    // If height exceeds viewport, scale down
    if (gameHeight > safeHeight) {
      gameHeight = safeHeight;
      gameWidth = Math.round(gameHeight * optimal.aspectRatio);
    }

    // Apply min/max constraints
    gameWidth = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, gameWidth));
    gameHeight = Math.max(MIN_GAME_HEIGHT, Math.min(MAX_GAME_HEIGHT, gameHeight));
  } else {
    // Landscape mode - flip the dimensions
    gameHeight = Math.min(safeHeight, optimal.width); // Use portrait width as landscape height
    gameWidth = Math.round(gameHeight / optimal.aspectRatio);

    // If width exceeds viewport, scale down
    if (gameWidth > safeWidth) {
      gameWidth = safeWidth;
      gameHeight = Math.round(gameWidth * optimal.aspectRatio);
    }

    // Apply constraints (swapped for landscape)
    gameHeight = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, gameHeight));
    gameWidth = Math.max(MIN_GAME_HEIGHT, Math.min(MAX_GAME_HEIGHT, gameWidth));
  }

  // Calculate scale factor for UI scaling
  const scale = calculateScaleFactor(gameWidth, gameHeight, safeWidth, safeHeight);

  // Final dimensions
  const finalWidth = Math.round(gameWidth);
  const finalHeight = Math.round(gameHeight);

  return {
    width: finalWidth,
    height: finalHeight,
    scale,
    orientation,
    platform
  };
};

/**
 * Get hex size based on game dimensions and grid size
 */
export function getResponsiveHexSize(
  gameWidth: number,
  gameHeight: number,
  gridCols: number,
  gridRows: number
): number {
  // Calculate hex size to fit the game area
  // Account for hex spacing and margins
  const marginPercent = 0.1; // 10% margin on each side
  const spacingFactor = 1.1; // 10% spacing between hexes

  const availableWidth = gameWidth * (1 - marginPercent * 2);
  const availableHeight = gameHeight * (1 - marginPercent * 2);

  // Hexagon width calculation (flat-top orientation)
  const hexWidthFromCols = availableWidth / (gridCols * spacingFactor);

  // Hexagon height calculation
  const hexHeightFromRows = availableHeight / (gridRows * 0.75 * spacingFactor); // 0.75 for hex overlap

  // Use the smaller to ensure everything fits
  const hexSize = Math.min(hexWidthFromCols, hexHeightFromRows) / 2;

  // Apply min/max constraints
  const minHexSize = 15; // Minimum playable size
  const maxHexSize = 50; // Maximum for visual clarity

  return Math.max(minHexSize, Math.min(maxHexSize, hexSize));
}