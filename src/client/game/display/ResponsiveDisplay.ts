const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export type Orientation = 'portrait' | 'landscape';
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveSizing {
  orientation: Orientation;
  breakpoint: Breakpoint;
  designWidth: number;
  designHeight: number;
  aspectRatio: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  displayWidth: number;
  displayHeight: number;
}

export const ResponsiveRules = {
  DESIGN: {
    portrait: {
      width: 1080,
      height: 1920,
    },
    landscape: {
      width: 1920,
      height: 1080,
    },
  },
  LIMITS: {
    minWidth: 320,
    maxWidth: 4096,
    minHeight: 480,
    maxHeight: 2160,
  },
  SCALE: {
    min: 0.75,
    max: 1.5,
  },
  BREAKPOINTS: {
    tablet: 768,
    desktop: 1280,
  },
  DPR: {
    min: 1,
    max: 3,
  },
} as const;

const resolveBreakpoint = (width: number): Breakpoint => {
  if (width >= ResponsiveRules.BREAKPOINTS.desktop) {
    return 'desktop';
  }

  if (width >= ResponsiveRules.BREAKPOINTS.tablet) {
    return 'tablet';
  }

  return 'mobile';
};

export const resolveResponsiveSizing = (
  viewportWidth: number,
  viewportHeight: number
): ResponsiveSizing => {
  const safeWidth = clamp(
    Math.round(viewportWidth) || ResponsiveRules.DESIGN.portrait.width,
    ResponsiveRules.LIMITS.minWidth,
    ResponsiveRules.LIMITS.maxWidth
  );
  const safeHeight = clamp(
    Math.round(viewportHeight) || ResponsiveRules.DESIGN.portrait.height,
    ResponsiveRules.LIMITS.minHeight,
    ResponsiveRules.LIMITS.maxHeight
  );

  const orientation: Orientation = safeWidth >= safeHeight ? 'landscape' : 'portrait';
  const design = ResponsiveRules.DESIGN[orientation];

  const scaleX = safeWidth / design.width;
  const scaleY = safeHeight / design.height;
  const targetZoom = Math.min(scaleX, scaleY);
  const zoom = clamp(targetZoom, ResponsiveRules.SCALE.min, ResponsiveRules.SCALE.max);

  return {
    orientation,
    breakpoint: resolveBreakpoint(safeWidth),
    designWidth: design.width,
    designHeight: design.height,
    aspectRatio: design.width / design.height,
    zoom,
    viewportWidth: safeWidth,
    viewportHeight: safeHeight,
    displayWidth: Math.round(design.width * zoom),
    displayHeight: Math.round(design.height * zoom),
  };
};

export const resolveDeviceResolution = (): number => {
  if (typeof window === 'undefined') {
    return ResponsiveRules.DPR.max;
  }

  const dpr = window.devicePixelRatio || ResponsiveRules.DPR.min;
  return clamp(dpr, ResponsiveRules.DPR.min, ResponsiveRules.DPR.max);
};
