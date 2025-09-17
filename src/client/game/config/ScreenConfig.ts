/**
 * Screen Configuration for Multiple Platforms
 * Based on 2024-2025 responsive design best practices
 */

export const ScreenConfig = {
  // Mobile-first breakpoints (width)
  BREAKPOINTS: {
    mobile: 360,      // Minimum mobile width
    mobileL: 414,     // Large mobile (iPhone Plus/Max)
    tablet: 768,      // iPad portrait
    desktop: 1280,    // Desktop minimum
    desktopL: 1920,   // Full HD desktop
  },

  // Aspect ratios for different orientations
  ASPECT_RATIOS: {
    mobile_portrait: 9 / 19.5,    // Modern phones (roughly 9:19.5)
    mobile_landscape: 19.5 / 9,   // Flipped for landscape
    tablet_portrait: 3 / 4,        // iPad standard (768×1024)
    tablet_landscape: 4 / 3,       // iPad landscape
    desktop: 16 / 9,               // Standard widescreen
    square: 1 / 1,                 // Square for flexible layouts
  },

  // Common device dimensions (width × height)
  DEVICES: {
    // Mobile devices
    iphone_se: { width: 375, height: 667 },
    iphone_12: { width: 390, height: 844 },
    iphone_14_pro: { width: 393, height: 852 },
    iphone_14_pro_max: { width: 430, height: 932 },
    samsung_s21: { width: 360, height: 800 },
    pixel_6: { width: 412, height: 915 },

    // Tablets
    ipad_mini: { width: 768, height: 1024 },
    ipad_air: { width: 820, height: 1180 },
    ipad_pro_11: { width: 834, height: 1194 },
    ipad_pro_13: { width: 1024, height: 1366 },

    // Desktop
    laptop_13: { width: 1280, height: 800 },
    desktop_hd: { width: 1920, height: 1080 },
    desktop_2k: { width: 2560, height: 1440 },
  },

  // Reddit Devvit specific (estimated based on common webview sizes)
  DEVVIT: {
    // Webview tends to be constrained, similar to mobile/tablet
    min_width: 320,
    max_width: 768,
    min_height: 480,
    max_height: 1024,
    // Safe area considering UI chrome
    safe_width: 320,
    safe_height: 568,
    // Recommended game area
    game_width: 360,
    game_height: 640,
  },

  // Game-specific optimal dimensions
  GAME_OPTIMAL: {
    // Mobile portrait (primary target)
    mobile: {
      width: 390,
      height: 844,
      aspectRatio: 390 / 844,  // ~0.462
    },
    // Tablet portrait
    tablet: {
      width: 768,
      height: 1024,
      aspectRatio: 768 / 1024, // 0.75
    },
    // Desktop (windowed game)
    desktop: {
      width: 540,
      height: 960,
      aspectRatio: 540 / 960,  // 0.5625 (9:16)
    },
    // Reddit Devvit
    devvit: {
      width: 360,
      height: 640,
      aspectRatio: 360 / 640,  // 0.5625 (9:16)
    }
  },

  // Scaling configuration
  SCALING: {
    minScale: 0.5,
    maxScale: 2.0,
    baseScale: 1.0,
    scaleStep: 0.1,
  },

  // DPR (Device Pixel Ratio) support
  DPR: {
    standard: 1,
    retina: 2,
    super_retina: 3,
    max_supported: 3,
  }
};

/**
 * Get optimal dimensions based on viewport size
 */
export function getOptimalDimensions(viewportWidth: number, viewportHeight: number) {
  const isPortrait = viewportHeight > viewportWidth;
  const { GAME_OPTIMAL, DEVVIT } = ScreenConfig;

  // Detect platform based on viewport
  if (viewportWidth <= 480) {
    // Mobile
    return isPortrait ? GAME_OPTIMAL.mobile : {
      width: Math.min(viewportWidth, 844),
      height: Math.min(viewportHeight, 390),
      aspectRatio: 844 / 390
    };
  } else if (viewportWidth <= 1024) {
    // Tablet or Devvit
    if (viewportWidth <= DEVVIT.max_width && viewportHeight <= DEVVIT.max_height) {
      return GAME_OPTIMAL.devvit;
    }
    return GAME_OPTIMAL.tablet;
  } else {
    // Desktop
    return GAME_OPTIMAL.desktop;
  }
}

/**
 * Calculate responsive scale factor
 */
export function calculateScaleFactor(
  gameWidth: number,
  gameHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const scaleX = viewportWidth / gameWidth;
  const scaleY = viewportHeight / gameHeight;

  // Use the smaller scale to fit within viewport
  const scale = Math.min(scaleX, scaleY);

  // Clamp to min/max scale
  const { minScale, maxScale } = ScreenConfig.SCALING;
  return Math.max(minScale, Math.min(maxScale, scale));
}

/**
 * Get DPR-aware dimensions
 */
export function getDPRAwareDimensions(width: number, height: number): { width: number, height: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, ScreenConfig.DPR.max_supported);
  return {
    width: Math.round(width * dpr),
    height: Math.round(height * dpr)
  };
}