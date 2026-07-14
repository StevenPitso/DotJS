// src/worker/Lifecycle.js
// Update → Dirty → Render pipeline

const { defaultLogger: logger } = require('../utils/logger');

class Lifecycle {
  constructor(registry, renderer) {
    this.registry = registry;
    this.renderer = renderer;
    this.isRunning = false;
    this.frameCount = 0;
    this.startTime = 0;
    this.fps = 60;
    this.frameTime = 1000 / 60;
    this.lastFrameTime = 0;
    this.updateCallbacks = [];
    this.renderCallbacks = [];
  }

  /**
   * Start the lifecycle loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    logger.debug('Lifecycle: Started');
  }

  /**
   * Stop the lifecycle loop
   */
  stop() {
    this.isRunning = false;
    logger.debug('Lifecycle: Stopped');
  }

  /**
   * Process a single frame
   * @param {number} timestamp - Current timestamp
   * @returns {boolean} - Whether a frame was rendered
   */
  frame(timestamp) {
    if (!this.isRunning) return false;
    
    // Calculate delta time
    const delta = this.lastFrameTime ? (timestamp - this.lastFrameTime) : 0;
    this.lastFrameTime = timestamp;
    
    // FPS limiting
    if (delta < this.frameTime) {
      return false;
    }
    
    // 1. Run updates
    this.runUpdates(timestamp);
    
    // 2. Mark dirty shapes
    this.markDirty();
    
    // 3. Render
    this.runRender();
    
    this.frameCount++;
    return true;
  }

  /**
   * Run update callbacks
   * @param {number} timestamp - Current timestamp
   */
  runUpdates(timestamp) {
    for (const callback of this.updateCallbacks) {
      try {
        callback(timestamp, this.frameCount);
      } catch (err) {
        logger.error('Lifecycle: Update callback error:', err);
      }
    }
  }

  /**
   * Mark dirty shapes
   */
  markDirty() {
    // In worker, shapes are marked dirty during updates
    // This just ensures we track them
    const dirtyKeys = this.registry.getDirtyKeys();
    if (dirtyKeys.length > 0) {
      logger.debug(`Lifecycle: ${dirtyKeys.length} shapes marked dirty`);
    }
  }

  /**
   * Run render pass
   */
  runRender() {
    // Clear canvas
    this.renderer.clear();
    
    // Get all shapes
    const entries = this.registry.entries();
    
    // Render dirty shapes
    for (const [key, polygon] of entries) {
      if (polygon.isDirty) {
        this.renderer.renderPolygon(polygon);
        polygon.isDirty = false;
      }
    }
    
    // Run render callbacks
    for (const callback of this.renderCallbacks) {
      try {
        callback(this.renderer);
      } catch (err) {
        logger.error('Lifecycle: Render callback error:', err);
      }
    }
    
    // Clear dirty flags
    this.registry.clearDirty();
  }

  /**
   * Add an update callback
   * @param {Function} callback - Update function
   */
  onUpdate(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Update callback must be a function');
    }
    this.updateCallbacks.push(callback);
  }

  /**
   * Add a render callback
   * @param {Function} callback - Render function
   */
  onRender(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Render callback must be a function');
    }
    this.renderCallbacks.push(callback);
  }

  /**
   * Remove an update callback
   * @param {Function} callback - Update function to remove
   */
  offUpdate(callback) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove a render callback
   * @param {Function} callback - Render function to remove
   */
  offRender(callback) {
    const index = this.renderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  /**
   * Set FPS limit
   * @param {number} fps - FPS limit
   */
  setFPS(fps) {
    if (fps > 0) {
      this.fps = fps;
      this.frameTime = 1000 / fps;
    }
  }

  /**
   * Get lifecycle statistics
   * @returns {Object}
   */
  getStats() {
    return {
      frameCount: this.frameCount,
      isRunning: this.isRunning,
      fps: this.fps,
      updateCallbacks: this.updateCallbacks.length,
      renderCallbacks: this.renderCallbacks.length,
    };
  }

  /**
   * Reset the lifecycle
   */
  reset() {
    this.frameCount = 0;
    this.startTime = 0;
    this.lastFrameTime = 0;
    this.updateCallbacks = [];
    this.renderCallbacks = [];
    logger.debug('Lifecycle: Reset');
  }
}

module.exports = Lifecycle;