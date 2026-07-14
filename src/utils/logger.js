// src/utils/logger.js
// Debug logging utility - tree-shaken in production

const DEBUG = typeof globalThis !== 'undefined' && typeof globalThis.process !== 'undefined'
  ? globalThis.process.env.NODE_ENV !== 'production'
  : true;

class Logger {
  constructor(prefix = 'dotjs') {
    this.prefix = prefix;
    this.enabled = DEBUG;
  }

  log(...args) {
    if (this.enabled) {
      console.log(`[${this.prefix}]`, ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(`[${this.prefix}]`, ...args);
    }
  }

  error(...args) {
    if (this.enabled) {
      console.error(`[${this.prefix}]`, ...args);
    }
  }

  debug(...args) {
    if (this.enabled && DEBUG) {
      console.debug(`[${this.prefix}]`, ...args);
    }
  }

  time(label) {
    if (this.enabled) {
      console.time(`[${this.prefix}] ${label}`);
    }
  }

  timeEnd(label) {
    if (this.enabled) {
      console.timeEnd(`[${this.prefix}] ${label}`);
    }
  }
}

// Singleton instance
const defaultLogger = new Logger();

module.exports = {
  Logger,
  defaultLogger,
  log: defaultLogger.log.bind(defaultLogger),
  warn: defaultLogger.warn.bind(defaultLogger),
  error: defaultLogger.error.bind(defaultLogger),
  debug: defaultLogger.debug.bind(defaultLogger),
  time: defaultLogger.time.bind(defaultLogger),
  timeEnd: defaultLogger.timeEnd.bind(defaultLogger),
};