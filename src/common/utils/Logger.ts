/**
 * Simple logging utility for the quantum mechanics simulation.
 * Provides methods for different log levels: debug, info, warn, error.
 *
 * This is the only module in src/ allowed to touch `console` — everything else logs through it.
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

let currentLevel: LogLevel = LogLevel.INFO;

export const Logger = {
  /**
   * Set the minimum log level. Messages below this level won't be displayed.
   */
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel {
    return currentLevel;
  },

  /**
   * Log a debug message.
   */
  debug(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.DEBUG) {
      // biome-ignore lint/suspicious/noConsole: Logger is the console sink for src/
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log an info message.
   */
  info(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      // biome-ignore lint/suspicious/noConsole: Logger is the console sink for src/
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log a warning message.
   */
  warn(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.WARN) {
      // biome-ignore lint/suspicious/noConsole: Logger is the console sink for src/
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log an error message.
   */
  error(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.ERROR) {
      // biome-ignore lint/suspicious/noConsole: Logger is the console sink for src/
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};

export default Logger;
