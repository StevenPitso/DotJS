// src/bridge/proxy/RefCache.js
// Local cache for ref reads to avoid roundtrips

class RefCache {
  constructor() {
    this.cache = new Map();
    this.dirtyKeys = new Set();
    this.maxSize = 1000;
  }

  /**
   * Get a value from cache
   * @param {string} key - Ref key
   * @param {string} prop - Property name
   * @returns {any} - Cached value or undefined
   */
  get(key, prop) {
    if (!this.cache.has(key)) return undefined;
    const ref = this.cache.get(key);
    return ref[prop];
  }

  /**
   * Get entire cached ref
   * @param {string} key - Ref key
   * @returns {Object|null} - Cached ref or null
   */
  getRef(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Set a value in cache
   * @param {string} key - Ref key
   * @param {string} prop - Property name
   * @param {any} value - Value to cache
   */
  set(key, prop, value) {
    if (!this.cache.has(key)) {
      this.cache.set(key, {});
    }
    const ref = this.cache.get(key);
    ref[prop] = value;
    this.dirtyKeys.add(key);
    
    // Enforce max size
    if (this.cache.size > this.maxSize) {
      this.prune();
    }
  }

  /**
   * Set entire ref in cache
   * @param {string} key - Ref key
   * @param {Object} data - Ref data
   */
  setRef(key, data) {
    this.cache.set(key, { ...data });
    this.dirtyKeys.add(key);
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Ref key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete a ref from cache
   * @param {string} key - Ref key
   */
  delete(key) {
    this.cache.delete(key);
    this.dirtyKeys.delete(key);
  }

  /**
   * Get all dirty keys (keys that have been modified)
   * @returns {string[]} - Array of dirty keys
   */
  getDirtyKeys() {
    return Array.from(this.dirtyKeys);
  }

  /**
   * Clear dirty flags
   */
  clearDirty() {
    this.dirtyKeys.clear();
  }

  /**
   * Mark a key as dirty (needs sync)
   * @param {string} key - Ref key
   */
  markDirty(key) {
    this.dirtyKeys.add(key);
  }

  /**
   * Prune cache to max size (LRU-like)
   * @private
   */
  prune() {
    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, entries.length - this.maxSize / 2);
    for (const [key] of toRemove) {
      this.cache.delete(key);
      this.dirtyKeys.delete(key);
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.dirtyKeys.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      dirtyCount: this.dirtyKeys.size,
      maxSize: this.maxSize,
    };
  }
}

module.exports = RefCache;