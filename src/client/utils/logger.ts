const noop = () => {};

const isProd = import.meta.env.PROD;

const debug = isProd ? noop : (...args: unknown[]) => {
  console.log(...args);
};

const info = isProd ? noop : (...args: unknown[]) => {
  console.info(...args);
};

const warn = isProd ? noop : (...args: unknown[]) => {
  console.warn(...args);
};

const error = (...args: unknown[]) => {
  // Surface errors regardless of environment so issues are not silenced.
  console.error(...args);
};

export const logger = {
  debug,
  info,
  warn,
  error,
};

export type Logger = typeof logger;
