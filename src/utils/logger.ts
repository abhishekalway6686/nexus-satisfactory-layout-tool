/**
 * Production-ready logging utility
 *
 * In development (npm run dev): All logs enabled
 * In production (built app): Only errors and warnings shown
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('Debug info', data);  // Hidden in production
 *   logger.info('User action');         // Hidden in production
 *   logger.warn('Warning message');     // Always shown
 *   logger.error('Error occurred', err); // Always shown
 */

const isDev = import.meta.env.DEV;

// Feature-specific debug flags (all disabled in production)
const DEBUG_FLAGS = {
  railway: isDev && false,      // Railway drawing/snapping
  conveyor: isDev && false,     // Conveyor belt system
  pipe: isDev && false,         // Pipe system
  powerline: isDev && false,    // Powerline calculations
  spatial: isDev && false,      // Spatial indexing
  performance: isDev && false,  // Performance monitoring
  state: isDev && false,        // State management
  render: isDev && false,       // Render operations
  rust: isDev && false,         // Rust backend communication
  general: isDev && false,      // General debug logs
};

export type DebugCategory = keyof typeof DEBUG_FLAGS;

/**
 * Check if a debug category is enabled
 */
export function isDebugEnabled(category: DebugCategory): boolean {
  return DEBUG_FLAGS[category] ?? false;
}

/**
 * Enable/disable debug categories at runtime (dev only)
 */
export function setDebugFlag(category: DebugCategory, enabled: boolean): void {
  if (isDev) {
    DEBUG_FLAGS[category] = enabled;
  }
}

/**
 * Production-safe logger
 */
export const logger = {
  /**
   * Debug logs - hidden in production
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Category-specific debug - requires flag to be enabled
   */
  debugCategory: (category: DebugCategory, message: string, ...args: unknown[]): void => {
    if (DEBUG_FLAGS[category]) {
      console.log(`[${category.toUpperCase()}] ${message}`, ...args);
    }
  },

  /**
   * Info logs - hidden in production
   */
  info: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning logs - always shown
   */
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Error logs - always shown
   */
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Performance timing - only in dev with performance flag
   */
  time: (label: string): void => {
    if (DEBUG_FLAGS.performance) {
      console.time(label);
    }
  },

  timeEnd: (label: string): void => {
    if (DEBUG_FLAGS.performance) {
      console.timeEnd(label);
    }
  },

  /**
   * Group logs - only in dev
   */
  group: (label: string): void => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: (): void => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

// Expose to window for debugging in browser console (dev only)
if (isDev && typeof window !== 'undefined') {
  (window as unknown as { debugFlags: typeof DEBUG_FLAGS; setDebugFlag: typeof setDebugFlag }).debugFlags = DEBUG_FLAGS;
  (window as unknown as { setDebugFlag: typeof setDebugFlag }).setDebugFlag = setDebugFlag;
}

export default logger;
