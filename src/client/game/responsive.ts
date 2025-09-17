
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface ResponsiveMetrics {
  width: number;
  height: number;
  orientation: Orientation;
  aspectRatio: number;
  scale: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
  safeArea: ResponsiveRect;
  boardArea: ResponsiveRect;
  trayArea: ResponsiveRect;
}

interface OrientationConfig {
  width: number;
  height: number;
  safe: { top: number; bottom: number; sides: number };
  boardRatio: number;
  trayRatio: number;
}

const MIN_VIEWPORT_WIDTH = 320;
const MIN_VIEWPORT_HEIGHT = 480;
const MAX_VIEWPORT_WIDTH = 3840;
const MAX_VIEWPORT_HEIGHT = 3840;

const PORTRAIT_CONFIG: OrientationConfig = {
  width: 1080,
  height: 1920,
  safe: { top: 0.08, bottom: 0.18, sides: 0.06 },
  boardRatio: 0.64,
  trayRatio: 0.28
};

const LANDSCAPE_CONFIG: OrientationConfig = {
  width: 1920,
  height: 1080,
  safe: { top: 0.06, bottom: 0.12, sides: 0.08 },
  boardRatio: 0.7,
  trayRatio: 0.22
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const createRect = (x: number, y: number, width: number, height: number): ResponsiveRect => ({
  x,
  y,
  width,
  height,
  top: y,
  right: x + width,
  bottom: y + height,
  centerX: x + width / 2,
  centerY: y + height / 2
});

const pickConfig = (viewWidth: number, viewHeight: number): { orientation: Orientation; config: OrientationConfig } => {
  if (viewWidth >= viewHeight) {
    return { orientation: 'landscape', config: LANDSCAPE_CONFIG };
  }
  return { orientation: 'portrait', config: PORTRAIT_CONFIG };
};

const resolveScale = (viewWidth: number, viewHeight: number, config: OrientationConfig): { scale: number; displayWidth: number; displayHeight: number; offsetX: number; offsetY: number } => {
  const safeWidth = clamp(viewWidth, MIN_VIEWPORT_WIDTH, MAX_VIEWPORT_WIDTH);
  const safeHeight = clamp(viewHeight, MIN_VIEWPORT_HEIGHT, MAX_VIEWPORT_HEIGHT);

  const aspect = config.width / config.height;
  let displayWidth = safeWidth;
  let displayHeight = Math.round(displayWidth / aspect);

  if (displayHeight > safeHeight) {
    displayHeight = safeHeight;
    displayWidth = Math.round(displayHeight * aspect);
  }

  const scale = displayWidth / config.width;
  const offsetX = Math.floor((safeWidth - displayWidth) / 2);
  const offsetY = Math.floor((safeHeight - displayHeight) / 2);

  return { scale, displayWidth, displayHeight, offsetX, offsetY };
};

const buildLayout = (config: OrientationConfig): { safeArea: ResponsiveRect; boardArea: ResponsiveRect; trayArea: ResponsiveRect } => {
  const safeWidth = config.width * (1 - config.safe.sides * 2);
  const safeHeight = config.height * (1 - config.safe.top - config.safe.bottom);
  const safeArea = createRect(
    config.width * config.safe.sides,
    config.height * config.safe.top,
    safeWidth,
    safeHeight
  );

  const boardHeight = safeArea.height * config.boardRatio;
  const trayHeight = safeArea.height * config.trayRatio;

  const boardArea = createRect(safeArea.x, safeArea.y, safeArea.width, boardHeight);
  const trayArea = createRect(
    safeArea.x,
    safeArea.bottom - trayHeight,
    safeArea.width,
    trayHeight
  );

  return { safeArea, boardArea, trayArea };
};

export const measureResponsiveViewport = (viewWidth: number, viewHeight: number): ResponsiveMetrics => {
  const { orientation, config } = pickConfig(viewWidth, viewHeight);
  const { scale, displayWidth, displayHeight, offsetX, offsetY } = resolveScale(viewWidth, viewHeight, config);
  const { safeArea, boardArea, trayArea } = buildLayout(config);

  return {
    width: config.width,
    height: config.height,
    orientation,
    aspectRatio: config.width / config.height,
    scale,
    displayWidth,
    displayHeight,
    offsetX,
    offsetY,
    safeArea,
    boardArea,
    trayArea
  };
};

export const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') {
    return 2;
  }

  return Math.min(window.devicePixelRatio || 1, 3);
};
