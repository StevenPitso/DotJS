// src/bridge/proxy/RefProxy.js
// Proxy that syncs writes to worker

const RefCache = require('./RefCache');
const { createNullRefProxy } = require('./NullRef');
const { COMMANDS } = require('../commands');
const { defaultLogger: logger } = require('../../utils/logger');

// Shared cache across all refs
const globalCache = new RefCache();

class RefProxy {
  constructor(key, bridge, initialData = {}) {
    this.key = key;
    this.bridge = bridge;
    this._pendingWrites = [];
    this._syncTimeout = null;
    this._isDisposed = false;

    // Initialize cache
    if (initialData && Object.keys(initialData).length > 0) {
      globalCache.setRef(key, initialData);
    }

    // Create the proxy
    return this.createProxy();
  }

  /**
   * Create the proxy handler
   * @private
   */
  createProxy() {
    const handler = {
      get: (target, prop) => {
        // Special properties
        if (prop === 'isNull') return () => false;
        if (prop === 'isValid') return () => true;
        if (prop === 'key') return this.key;
        if (prop === '_isProxy') return true;
        if (prop === 'toString') return () => `RefProxy(${this.key})`;
        if (prop === 'toJSON') return () => ({ key: this.key });

        // Method calls
        if (typeof prop === 'string' && prop in target) {
          const method = target[prop];
          if (typeof method === 'function') {
            return method.bind(target);
          }
        }

        // Property access - check cache first
        const cached = globalCache.get(this.key, prop);
        if (cached !== undefined) {
          return cached;
        }

        // If not in cache, try to fetch from worker
        // For now, return undefined (we'll sync later)
        logger.debug(`[RefProxy] Cache miss for ${this.key}.${String(prop)}`);
        return undefined;
      },

      set: (target, prop, value) => {
        // Don't allow setting internal properties
        if (prop === 'isNull' || prop === 'isValid' || prop === 'key' || prop === '_isProxy') {
          return false;
        }

        // Update cache
        globalCache.set(this.key, prop, value);

        // Queue write to worker
        this.queueWrite(prop, value);

        // Also update the target if it has the property
        if (prop in target) {
          target[prop] = value;
        }

        return true;
      },

      has: (target, prop) => {
        const cached = globalCache.get(this.key, prop);
        return cached !== undefined || prop in target;
      },

      ownKeys: (target) => {
        const ref = globalCache.getRef(this.key);
        if (ref) {
          return Object.keys(ref);
        }
        return Object.keys(target);
      },

      getOwnPropertyDescriptor: (target, prop) => {
        const cached = globalCache.get(this.key, prop);
        if (cached !== undefined) {
          return {
            value: cached,
            enumerable: true,
            configurable: true,
          };
        }
        return Object.getOwnPropertyDescriptor(target, prop);
      },

      deleteProperty: (target, prop) => {
        // Can't delete ref properties this way
        logger.warn(`[RefProxy] Cannot delete property ${String(prop)} from ref ${this.key}`);
        return false;
      },
    };

    // Create the target object
    const target = {};

    // Add common methods
    target.fill = (color) => {
      this.queueWrite('fill', color || '#000000');
      return this.proxy;
    };

    target.stroke = (color, width) => {
      this.queueWrite('stroke', color || '#000000');
      if (width !== undefined) {
        this.queueWrite('strokeWidth', width);
      }
      return this.proxy;
    };

    target.wavy = (amplitude, frequency) => {
      // This will be handled in the worker
      this.queueWrite('_wavy', { amplitude, frequency });
      return this.proxy;
    };

    target.bezier = (...points) => {
      this.queueWrite('_bezier', points);
      return this.proxy;
    };

    target.setRef = (newKey) => {
      // This is a no-op on proxy (handled elsewhere)
      logger.warn('[RefProxy] setRef() called on proxy, use the returned shape instead');
      return this.proxy;
    };

    // Create the proxy
    this.proxy = new Proxy(target, handler);

    return this.proxy;
  }

  /**
   * Queue a write to be sent to worker
   * @private
   */
  queueWrite(prop, value) {
    if (this._isDisposed) return;

    this._pendingWrites.push({ prop, value });

    // Debounce writes
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
    }

    this._syncTimeout = setTimeout(() => {
      this.flushWrites();
    }, 16); // ~1 frame
  }

  /**
   * Flush all pending writes to worker
   * @private
   */
  async flushWrites() {
    if (this._pendingWrites.length === 0 || this._isDisposed) return;

    const writes = this._pendingWrites.slice();
    this._pendingWrites = [];
    this._syncTimeout = null;

    try {
      // Send batch update to worker
      await this.bridge.send({
        type: COMMANDS.UPDATE_SHAPE,
        payload: {
          key: this.key,
          updates: writes,
        },
      });

      // Clear dirty flags
      globalCache.clearDirty();
    } catch (err) {
      logger.error(`[RefProxy] Failed to sync writes for ${this.key}:`, err);
      // Re-queue writes
      this._pendingWrites = [...writes, ...this._pendingWrites];
    }
  }

  /**
   * Manually sync all pending writes
   */
  async sync() {
    await this.flushWrites();
  }

  /**
   * Dispose the proxy
   */
  dispose() {
    this._isDisposed = true;
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = null;
    }
    this._pendingWrites = [];
    // Remove from cache
    globalCache.delete(this.key);
  }
}

// Factory function to create a ref proxy
function createRefProxy(key, bridge, initialData = {}) {
  // Check if key is valid
  if (!key || typeof key !== 'string') {
    throw new Error('Ref key must be a non-empty string');
  }

  // Check if ref exists in worker (we'll do this async)
  // For now, create the proxy and let it handle missing data
  
  // If initialData is provided, cache it
  if (initialData && Object.keys(initialData).length > 0) {
    globalCache.setRef(key, initialData);
  }

  const proxy = new RefProxy(key, bridge, initialData);
  return proxy.proxy;
}

// Get the global cache for inspection
function getRefCache() {
  return globalCache;
}

module.exports = {
  RefProxy,
  createRefProxy,
  getRefCache,
  globalCache,
};