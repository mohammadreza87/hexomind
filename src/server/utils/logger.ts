const noop = () => {};

const isProd = process.env.NODE_ENV === 'production';

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
  // Always surface server-side errors.
  console.error(...args);
};

export const logger = {
  debug,
  info,
  warn,
  error,
};

export type Logger = typeof logger;
