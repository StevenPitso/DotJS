// src/worker/Renderer.js
// Renders polygons to OffscreenCanvas

const { defaultLogger: logger } = require('../utils/logger');

class Renderer {
  constructor(offscreenCanvas) {
    this.canvas = offscreenCanvas;
    this.ctx = null;
    this.renderMode = 'canvas2d'; // canvas2d | webgl | webgpu
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.background = '#000000';
    
    // Initialize context
    this.initContext();
  }

  /**
   * Initialize rendering context
   */
  initContext() {
    if (!this.canvas) {
      logger.error('Renderer: No canvas provided');
      return;
    }

    // Get 2D context (default)
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      logger.error('Renderer: Failed to get 2D context');
      return;
    }

    this.ctx = ctx;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.pixelRatio = this.canvas.width / this.canvas.clientWidth || 1;
    
    logger.debug(`Renderer: Initialized (${this.width}x${this.height})`);
  }

  /**
   * Set render mode
   * @param {string} mode - 'canvas2d' | 'webgl' | 'webgpu'
   */
  setRenderMode(mode) {
    if (mode === this.renderMode) return;
    
    // For now, only canvas2d is supported
    if (mode !== 'canvas2d') {
      logger.warn(`Renderer: ${mode} not yet supported, using canvas2d`);
      return;
    }
    
    this.renderMode = mode;
    this.initContext();
  }

  /**
   * Resize canvas
   * @param {number} width - New width
   * @param {number} height - New height
   * @param {number} pixelRatio - Pixel ratio
   */
  resize(width, height, pixelRatio = 1) {
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.pixelRatio = pixelRatio;
    
    // Update canvas style via main thread (will be handled separately)
    logger.debug(`Renderer: Resized to ${this.width}x${this.height}`);
  }

  /**
   * Set background color
   * @param {string} color - Background color
   */
  setBackground(color) {
    this.background = color || '#000000';
  }

  /**
   * Clear the canvas
   */
  clear() {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = this.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Render a single polygon
   * @param {Polygon} polygon - Polygon to render
   */
  renderPolygon(polygon) {
    if (!this.ctx || !polygon || polygon.isEmpty()) return;
    
    const points = polygon.getPoints();
    if (points.length < 2) return;
    
    const { fill, stroke, strokeWidth, opacity, blendMode } = polygon.style;
    
    // Save context
    this.ctx.save();
    
    // Set blend mode
    if (blendMode) {
      this.ctx.globalCompositeOperation = blendMode;
    }
    
    // Set opacity
    if (opacity !== undefined && opacity !== 1) {
      this.ctx.globalAlpha = opacity;
    }
    
    // Begin path
    this.ctx.beginPath();
    
    // Move to first point
    this.ctx.moveTo(points[0].x, points[0].y);
    
    // Draw lines
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    // Close path if closed
    if (polygon.isClosed && points.length > 2) {
      this.ctx.closePath();
    }
    
    // Fill
    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }
    
    // Stroke
    if (stroke) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = strokeWidth || 1;
      this.ctx.stroke();
    }
    
    // Restore context
    this.ctx.restore();
  }

  /**
   * Render multiple polygons
   * @param {Array<Polygon>} polygons - Polygons to render
   */
  renderPolygons(polygons) {
    if (!Array.isArray(polygons)) return;
    
    for (const polygon of polygons) {
      if (polygon && polygon.isDirty) {
        this.renderPolygon(polygon);
        polygon.isDirty = false;
      }
    }
  }

  /**
   * Render all polygons with dirty flag
   * @param {Array<{key: string, polygon: Polygon}>} entries
   */
  renderDirty(entries) {
    if (!Array.isArray(entries)) return;
    
    let rendered = 0;
    for (const { key, polygon } of entries) {
      if (polygon && polygon.isDirty) {
        this.renderPolygon(polygon);
        polygon.isDirty = false;
        rendered++;
      }
    }
    
    if (rendered > 0) {
      logger.debug(`Renderer: Rendered ${rendered} dirty shapes`);
    }
  }

  /**
   * Render a group of polygons
   * @param {string} groupKey - Group key
   * @param {Registry} registry - Registry instance
   */
  renderGroup(groupKey, registry) {
    const members = registry.getGroup(groupKey);
    if (!members) return;
    
    for (const key of members) {
      const polygon = registry.get(key);
      if (polygon) {
        this.renderPolygon(polygon);
      }
    }
  }

  /**
   * Draw a single dot (pixel)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} color - Color
   * @param {number} size - Size
   */
  drawDot(x, y, color = '#ffffff', size = 1) {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - size/2, y - size/2, size, size);
  }

  /**
   * Draw text as dots
   * @param {string} text - Text to render
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} options - Text options
   * @returns {Array<{x: number, y: number}>} - Dot positions
   */
  textToDots(text, x, y, options = {}) {
    // This will be implemented with canvas text rendering
    // For now, return empty array
    logger.warn('Renderer: textToDots not yet implemented');
    return [];
  }

  /**
   * Create an image data snapshot
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {ImageData} - Image data
   */
  getImageData(x, y, width, height) {
    if (!this.ctx) return null;
    return this.ctx.getImageData(x, y, width, height);
  }

  /**
   * Put image data
   * @param {ImageData} imageData - Image data
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  putImageData(imageData, x, y) {
    if (!this.ctx) return;
    this.ctx.putImageData(imageData, x, y);
  }

  /**
   * Get canvas dimensions
   * @returns {{width: number, height: number}}
   */
  getSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Destroy renderer
   */
  destroy() {
    // Clean up
    this.ctx = null;
    this.canvas = null;
    logger.debug('Renderer: Destroyed');
  }
}

module.exports = Renderer;