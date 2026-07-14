// src/worker/Registry.js
// Flat registry - the heart of dot.js

const { defaultLogger: logger } = require('../utils/logger');

class Registry {
  constructor() {
    this.map = new Map();
    this.groups = new Map();
    this.dirtyKeys = new Set();
    this.stats = {
      totalShapes: 0,
      totalGroups: 0,
      operations: 0,
    };
  }

  /**
   * Register a polygon with a key
   * @param {string} key - Unique identifier
   * @param {Polygon} polygon - Polygon instance
   * @returns {boolean} - Success
   */
  set(key, polygon) {
    if (!key || typeof key !== 'string') {
      logger.error('Registry: Key must be a non-empty string');
      return false;
    }

    if (!polygon) {
      logger.error('Registry: Polygon must be provided');
      return false;
    }

    this.map.set(key, polygon);
    this.dirtyKeys.add(key);
    this.stats.totalShapes = this.map.size;
    this.stats.operations++;
    
    logger.debug(`Registry: Added "${key}" (${polygon.type})`);
    return true;
  }

  /**
   * Get a polygon by key
   * @param {string} key - Unique identifier
   * @returns {Polygon|null} - Polygon or null if not found
   */
  get(key) {
    if (!key || typeof key !== 'string') {
      return null;
    }

    const polygon = this.map.get(key);
    if (!polygon) {
      logger.debug(`Registry: "${key}" not found`);
    }
    return polygon || null;
  }

  /**
   * Check if a key exists
   * @param {string} key - Unique identifier
   * @returns {boolean}
   */
  has(key) {
    return this.map.has(key);
  }

  /**
   * Delete a polygon by key
   * @param {string} key - Unique identifier
   * @returns {boolean} - Success
   */
  delete(key) {
    if (!this.map.has(key)) {
      logger.warn(`Registry: "${key}" not found, cannot delete`);
      return false;
    }

    this.map.delete(key);
    this.dirtyKeys.delete(key);
    this.stats.totalShapes = this.map.size;
    this.stats.operations++;
    
    // Remove from all groups
    for (const [groupKey, members] of this.groups) {
      const index = members.indexOf(key);
      if (index !== -1) {
        members.splice(index, 1);
        if (members.length === 0) {
          this.groups.delete(groupKey);
          this.stats.totalGroups = this.groups.size;
        }
      }
    }
    
    logger.debug(`Registry: Deleted "${key}"`);
    return true;
  }

  /**
   * Mark a shape as dirty
   * @param {string} key - Shape key
   */
  markDirty(key) {
    if (this.map.has(key)) {
      this.dirtyKeys.add(key);
    }
  }

  /**
   * Get all dirty keys
   * @returns {string[]}
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
   * Check if a shape is dirty
   * @param {string} key - Shape key
   * @returns {boolean}
   */
  isDirty(key) {
    return this.dirtyKeys.has(key) || 
           (this.map.has(key) && this.map.get(key).isDirty);
  }

  /**
   * Get all keys
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.map.keys());
  }

  /**
   * Get all polygons
   * @returns {Polygon[]}
   */
  values() {
    return Array.from(this.map.values());
  }

  /**
   * Get all entries
   * @returns {[string, Polygon][]}
   */
  entries() {
    return Array.from(this.map.entries());
  }

  /**
   * Get the number of shapes
   * @returns {number}
   */
  size() {
    return this.map.size;
  }

  /**
   * Create a group from shape keys
   * @param {string} groupKey - Group identifier
   * @param {string[]} shapeKeys - Array of shape keys
   * @returns {boolean} - Success
   */
  createGroup(groupKey, shapeKeys) {
    if (!groupKey || typeof groupKey !== 'string') {
      logger.error('Registry: Group key must be a non-empty string');
      return false;
    }

    if (!Array.isArray(shapeKeys) || shapeKeys.length === 0) {
      logger.error('Registry: shapeKeys must be a non-empty array');
      return false;
    }

    // Validate all keys exist
    const validKeys = [];
    for (const key of shapeKeys) {
      if (this.map.has(key)) {
        validKeys.push(key);
      } else {
        logger.warn(`Registry: "${key}" not found, skipping from group`);
      }
    }

    if (validKeys.length === 0) {
      logger.error('Registry: No valid keys found for group');
      return false;
    }

    this.groups.set(groupKey, validKeys);
    this.stats.totalGroups = this.groups.size;
    this.stats.operations++;
    
    logger.debug(`Registry: Created group "${groupKey}" with ${validKeys.length} shapes`);
    return true;
  }

  /**
   * Get group members
   * @param {string} groupKey - Group identifier
   * @returns {string[]|null} - Array of shape keys or null
   */
  getGroup(groupKey) {
    if (!this.groups.has(groupKey)) {
      logger.debug(`Registry: Group "${groupKey}" not found`);
      return null;
    }
    return this.groups.get(groupKey);
  }

  /**
   * Delete a group
   * @param {string} groupKey - Group identifier
   * @returns {boolean} - Success
   */
  deleteGroup(groupKey) {
    if (!this.groups.has(groupKey)) {
      logger.warn(`Registry: Group "${groupKey}" not found`);
      return false;
    }

    this.groups.delete(groupKey);
    this.stats.totalGroups = this.groups.size;
    this.stats.operations++;
    return true;
  }

  /**
   * Add a shape to a group
   * @param {string} groupKey - Group identifier
   * @param {string} shapeKey - Shape key
   * @returns {boolean} - Success
   */
  addToGroup(groupKey, shapeKey) {
    if (!this.groups.has(groupKey)) {
      logger.warn(`Registry: Group "${groupKey}" not found`);
      return false;
    }

    if (!this.map.has(shapeKey)) {
      logger.warn(`Registry: Shape "${shapeKey}" not found`);
      return false;
    }

    const members = this.groups.get(groupKey);
    if (!members.includes(shapeKey)) {
      members.push(shapeKey);
      this.stats.operations++;
      logger.debug(`Registry: Added "${shapeKey}" to group "${groupKey}"`);
    }
    return true;
  }

  /**
   * Remove a shape from a group
   * @param {string} groupKey - Group identifier
   * @param {string} shapeKey - Shape key
   * @returns {boolean} - Success
   */
  removeFromGroup(groupKey, shapeKey) {
    if (!this.groups.has(groupKey)) {
      logger.warn(`Registry: Group "${groupKey}" not found`);
      return false;
    }

    const members = this.groups.get(groupKey);
    const index = members.indexOf(shapeKey);
    if (index !== -1) {
      members.splice(index, 1);
      if (members.length === 0) {
        this.groups.delete(groupKey);
        this.stats.totalGroups = this.groups.size;
      }
      this.stats.operations++;
      logger.debug(`Registry: Removed "${shapeKey}" from group "${groupKey}"`);
      return true;
    }
    return false;
  }

  /**
   * Apply a transform to all shapes in a group
   * @param {string} groupKey - Group identifier
   * @param {Function} transformFn - Transform function
   * @returns {boolean} - Success
   */
  transformGroup(groupKey, transformFn) {
    const members = this.getGroup(groupKey);
    if (!members) return false;

    for (const key of members) {
      const polygon = this.get(key);
      if (polygon) {
        transformFn(polygon);
        this.dirtyKeys.add(key);
      }
    }
    return true;
  }

  /**
   * Clear the registry
   */
  clear() {
    this.map.clear();
    this.groups.clear();
    this.dirtyKeys.clear();
    this.stats.totalShapes = 0;
    this.stats.totalGroups = 0;
    this.stats.operations = 0;
    logger.debug('Registry: Cleared');
  }

  /**
   * Get registry statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      dirtyShapes: this.dirtyKeys.size,
    };
  }

  /**
   * Dump registry info (debug)
   * @returns {Object}
   */
  dump() {
    return {
      shapes: this.keys(),
      groups: Array.from(this.groups.keys()),
      stats: this.getStats(),
    };
  }
}

module.exports = Registry;