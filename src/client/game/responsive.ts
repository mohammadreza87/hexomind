export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1920;

const MAX_SCALE = 1.6;
const MIN_NOMINAL_SCALE = 0.75;
const MAX_NOMINAL_SCALE = 1.4;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export type Orientation = 'portrait' | 'landscape';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResponsiveRect {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface ResponsiveLayout {
  viewportWidth: number;
  viewportHeight: number;
  orientation: Orientation;
  scale: number;
  nominalScale: number;
  dpr: number;
  safeInsets: SafeAreaInsets;
  safeArea: ResponsiveRect;
  boardArea: ResponsiveRect;
  trayArea: ResponsiveRect;
  uiArea: ResponsiveRect;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface LayoutPreset {
  ui: number;
  board: number;
  tray: number;
  gapSplit: number;
}

const LAYOUT_PRESETS: Record<Orientation, LayoutPreset> = {
  portrait: {
    ui: 0.12,
    board: 0.62,
    tray: 0.2,
    gapSplit: 0.45
  },
  landscape: {
    ui: 0.1,
    board: 0.56,
    tray: 0.22,
    gapSplit: 0.5
  }
};

const DEFAULT_VIEWPORT: ViewportSize = {
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT
};

const toRect = (x: number, y: number, width: number, height: number): ResponsiveRect => ({
  x,
  y,
  width,
  height,
  right: x + width,
  bottom: y + height,
  centerX: x + width / 2,
  centerY: y + height / 2
});

const resolveSafeAreaInsets = (): SafeAreaInsets => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const top = viewport.offsetTop || 0;
  const left = viewport.offsetLeft || 0;
  const bottom = Math.max(0, (window.innerHeight || viewport.height) - viewport.height - top);
  const right = Math.max(0, (window.innerWidth || viewport.width) - viewport.width - left);

  return { top, right, bottom, left };
};

export const measureViewport = (parent?: string): ViewportSize => {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWPORT;
  }

  if (parent) {
    const element = document.getElementById(parent) ?? document.querySelector<HTMLElement>(`#${parent}`);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
  }

  const viewport = window.visualViewport;
  if (viewport) {
    return { width: viewport.width, height: viewport.height };
  }

  return {
    width: window.innerWidth || DEFAULT_VIEWPORT.width,
    height: window.innerHeight || DEFAULT_VIEWPORT.height
  };
};

export const calculateResponsiveLayout = (
  viewportWidth: number,
  viewportHeight: number
): ResponsiveLayout => {
  const safeInsets = resolveSafeAreaInsets();

  const safeWidth = Math.max(viewportWidth - safeInsets.left - safeInsets.right, 1);
  const safeHeight = Math.max(viewportHeight - safeInsets.top - safeInsets.bottom, 1);

  const orientation: Orientation = safeWidth >= safeHeight ? 'landscape' : 'portrait';

  const scale = clamp(Math.min(safeWidth / DESIGN_WIDTH, safeHeight / DESIGN_HEIGHT), 0, MAX_SCALE);
  const nominalScale = clamp(scale, MIN_NOMINAL_SCALE, MAX_NOMINAL_SCALE);

  const gameWidth = DESIGN_WIDTH * scale;
  const gameHeight = DESIGN_HEIGHT * scale;

  const offsetX = safeInsets.left + (safeWidth - gameWidth) / 2;
  const offsetY = safeInsets.top + (safeHeight - gameHeight) / 2;

  const safeArea = toRect(offsetX, offsetY, gameWidth, gameHeight);

  const preset = LAYOUT_PRESETS[orientation];
  const uiHeight = gameHeight * preset.ui;
  const boardHeight = gameHeight * preset.board;
  const trayHeight = gameHeight * preset.tray;
  const gapTotal = Math.max(gameHeight - (uiHeight + boardHeight + trayHeight), 0);
  const gapTop = gapTotal * preset.gapSplit;
  const gapBottom = gapTotal - gapTop;

  const uiArea = toRect(offsetX, offsetY, gameWidth, uiHeight);
  const boardArea = toRect(offsetX, uiArea.bottom + gapTop, gameWidth, boardHeight);
  const trayArea = toRect(offsetX, boardArea.bottom + gapBottom, gameWidth, trayHeight);

  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 3);

  return {
    viewportWidth,
    viewportHeight,
    orientation,
    scale,
    nominalScale,
    dpr,
    safeInsets,
    safeArea,
    boardArea,
    trayArea,
    uiArea
  };
};
