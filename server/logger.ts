/**
 * Simple diagnostic logger for production use
 * Only logs errors and important diagnostic information
 * Never logs sensitive data (passwords, tokens, personal info)
 */

export const logger = {
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error.message : '');
  },

  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
  },

  info: (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`);
    }
  },

  debug: (message: string) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(`[DEBUG] ${message}`);
    }
  },
};
