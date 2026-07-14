// src/worker/Polygon.js
// Polygon class - view into Float32Array with methods

const { DEFAULT_STYLES } = require('../bridge/commands');
const { 
  getVertexCount, 
  getVertex, 
  setVertex,
  bufferToPoints,
  pointsToBuffer 
} = require('../utils/buffers');

class Polygon {
  constructor(options = {}) {
    // Buffer data
    this.buffer = options.buffer || new Float32Array(0);
    // Store the base (original) state
    this.baseBuffer = new Float32Array(this.buffer);
    this.type = options.type || 'polygon';
    this.id = options.id || null;
    
    // Transform tracking
    this.transform = {
      tx: 0,
      ty: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      cx: 0,
      cy: 0,
    };
    this.isTransformDirty = true;
    
    // Style
    this.style = {
      fill: options.fill || DEFAULT_STYLES.fill,
      stroke: options.stroke || DEFAULT_STYLES.stroke,
      strokeWidth: options.strokeWidth || DEFAULT_STYLES.strokeWidth,
      opacity: options.opacity || DEFAULT_STYLES.opacity,
      blendMode: options.blendMode || DEFAULT_STYLES.blendMode,
    };
    
    // Metadata
    this.isDirty = true;
    this.isClosed = options.isClosed !== undefined ? options.isClosed : true;
    this.vertexCount = getVertexCount(this.buffer);
    this.bounds = null;
    
    // For dynamic shapes (blobs)
    this.isDynamic = options.isDynamic || false;
    this.maxVertices = options.maxVertices || this.vertexCount;
  }

  /**
   * Reset to base state (undo all transforms)
   * @returns {Polygon} - Returns self for chaining
   */
  resetToBase() {
    this.buffer = new Float32Array(this.baseBuffer);
    this.transform.tx = 0;
    this.transform.ty = 0;
    this.transform.scaleX = 1;
    this.transform.scaleY = 1;
    this.transform.rotation = 0;
    this.isDirty = true;
    this.bounds = null;
    return this;
  }

  /**
   * Apply all transforms to the buffer
   * @returns {Polygon} - Returns self for chaining
   */
  applyTransforms() {
    // If no transforms are dirty and we're not forcing, skip
    if (!this.isTransformDirty && !this.isDirty) return this;
    
    // Start with base points
    const basePoints = bufferToPoints(this.baseBuffer);
    const { tx, ty, scaleX, scaleY, rotation, cx, cy } = this.transform;
    
    // Apply transforms
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const transformed = basePoints.map(p => {
      // Step 1: Scale from center
      let x = (p.x - cx) * scaleX + cx;
      let y = (p.y - cy) * scaleY + cy;
      
      // Step 2: Rotate around center
      const rx = cx + (x - cx) * cos - (y - cy) * sin;
      const ry = cy + (x - cx) * sin + (y - cy) * cos;
      
      // Step 3: Translate
      return {
        x: rx + tx,
        y: ry + ty,
      };
    });
    
    // Update buffer
    this.buffer = pointsToBuffer(transformed);
    this.isDirty = true;
    this.bounds = null;
    this.isTransformDirty = false;
    
    return this;
  }

  /**
   * Get a vertex
   * @param {number} index - Vertex index
   * @returns {{x: number, y: number}}
   */
  getVertex(index) {
    // Ensure transforms are applied
    this.applyTransforms();
    return getVertex(this.buffer, index);
  }

  /**
   * Set a vertex
   * @param {number} index - Vertex index
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setVertex(index, x, y) {
    // Apply current transforms first
    this.applyTransforms();
    setVertex(this.buffer, index, x, y);
    // Also update base buffer if this is a permanent change
    this.baseBuffer = new Float32Array(this.buffer);
    this.isDirty = true;
    this.bounds = null;
  }

  /**
   * Get all vertices as points
   * @returns {Array<{x: number, y: number}>}
   */
  getPoints() {
    this.applyTransforms();
    return bufferToPoints(this.buffer);
  }

  /**
   * Set all vertices from points (permanent change)
   * @param {Array<{x: number, y: number}>} points
   */
  setPoints(points) {
    this.buffer = pointsToBuffer(points);
    this.baseBuffer = new Float32Array(this.buffer);
    this.vertexCount = getVertexCount(this.buffer);
    // Reset transforms since we're setting new base
    this.transform.tx = 0;
    this.transform.ty = 0;
    this.transform.scaleX = 1;
    this.transform.scaleY = 1;
    this.transform.rotation = 0;
    this.isDirty = true;
    this.bounds = null;
  }

  /**
   * Apply wavy deformation to polygon (permanent modification)
   * @param {number} amplitude - Wave amplitude
   * @param {number} frequency - Wave frequency
   * @param {string} axis - 'x', 'y', or 'both'
   * @param {number} time - Time for animation
   * @returns {Polygon} - Returns self for chaining
   */
  wavy(amplitude, frequency = 1, axis = 'both', time = 0) {
    if (!amplitude) return this;
    
    // Apply transforms first
    this.applyTransforms();
    
    const points = this.getPoints();
    const result = points.map((p, i) => {
      const angle = i * frequency + time;
      const wave = Math.sin(angle) * amplitude;
      
      return {
        x: axis === 'x' || axis === 'both' ? p.x + wave : p.x,
        y: axis === 'y' || axis === 'both' ? p.y + wave : p.y,
      };
    });
    
    this.setPoints(result);
    this.isDirty = true;
    return this;
  }

  /**
   * Translate the polygon (relative to current position)
   * @param {number} dx - X translation
   * @param {number} dy - Y translation
   * @returns {Polygon} - Returns self for chaining
   */
    translate(dx, dy) {
    this.transform.tx += dx;
    this.transform.ty += dy;
    this.isTransformDirty = true;
    this.isDirty = true;
    // Apply immediately
    this.applyTransforms();
    return this;
    }

  /**
   * Set absolute translation
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} baseX - Original X position
   * @param {number} baseY - Original Y position
   * @returns {Polygon} - Returns self for chaining
   */
  setPosition(x, y, baseX = 0, baseY = 0) {
    // Get bounds to find center if not provided
    const bounds = this.getBounds();
    const cx = baseX || (bounds.minX + bounds.maxX) / 2;
    const cy = baseY || (bounds.minY + bounds.maxY) / 2;
    
    this.transform.tx = x - cx;
    this.transform.ty = y - cy;
    this.isTransformDirty = true;
    this.isDirty = true;
    return this;
  }

  /**
   * Rotate the polygon around a point
   * @param {number} angle - Rotation angle in radians (relative)
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {Polygon} - Returns self for chaining
   */
  rotate(angle, cx = 0, cy = 0) {
    this.transform.rotation += angle;
    this.transform.cx = cx || this.transform.cx;
    this.transform.cy = cy || this.transform.cy;
    this.isTransformDirty = true;
    this.isDirty = true;
    return this;
  }

  /**
   * Set absolute rotation
   * @param {number} angle - Rotation angle in radians
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {Polygon} - Returns self for chaining
   */
  setRotation(angle, cx = 0, cy = 0) {
    this.transform.rotation = angle;
    this.transform.cx = cx || this.transform.cx;
    this.transform.cy = cy || this.transform.cy;
    this.isTransformDirty = true;
    this.isDirty = true;
    return this;
  }

  /**
   * Scale the polygon (relative)
   * @param {number} sx - X scale multiplier
   * @param {number} sy - Y scale multiplier
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {Polygon} - Returns self for chaining
   */
  scale(sx, sy, cx = 0, cy = 0) {
    this.transform.scaleX *= sx;
    this.transform.scaleY *= sy || sx;
    this.transform.cx = cx || this.transform.cx;
    this.transform.cy = cy || this.transform.cy;
    this.isTransformDirty = true;
    this.isDirty = true;
    return this;
  }

  /**
   * Set absolute scale
   * @param {number} sx - X scale
   * @param {number} sy - Y scale
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {Polygon} - Returns self for chaining
   */
  setScale(sx, sy, cx = 0, cy = 0) {
    this.transform.scaleX = sx;
    this.transform.scaleY = sy || sx;
    this.transform.cx = cx || this.transform.cx;
    this.transform.cy = cy || this.transform.cy;
    this.isTransformDirty = true;
    this.isDirty = true;
    return this;
  }

  /**
   * Reset all transforms (translation, rotation, scale)
   * @returns {Polygon} - Returns self for chaining
   */
  resetTransforms() {
    this.transform.tx = 0;
    this.transform.ty = 0;
    this.transform.scaleX = 1;
    this.transform.scaleY = 1;
    this.transform.rotation = 0;
    this.isTransformDirty = true;
    this.isDirty = true;
    return this;
  }

  /**
   * Get the current transform state
   * @returns {Object}
   */
  getTransform() {
    return { ...this.transform };
  }

  /**
   * Get bounding box
   * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
   */
  getBounds() {
    if (this.bounds) return this.bounds;
    
    this.applyTransforms();
    const points = this.getPoints();
    if (points.length === 0) {
      this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      return this.bounds;
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    this.bounds = { minX, minY, maxX, maxY };
    return this.bounds;
  }

  /**
   * Clone the polygon
   * @returns {Polygon} - New polygon instance
   */
  clone() {
    const clone = new Polygon({
      buffer: new Float32Array(this.baseBuffer),
      type: this.type,
      id: this.id,
      fill: this.style.fill,
      stroke: this.style.stroke,
      strokeWidth: this.style.strokeWidth,
      opacity: this.style.opacity,
      blendMode: this.style.blendMode,
      isClosed: this.isClosed,
      isDynamic: this.isDynamic,
      maxVertices: this.maxVertices,
    });
    // Copy transform state
    clone.transform = { ...this.transform };
    clone.isTransformDirty = true;
    clone.applyTransforms();
    return clone;
  }

  /**
   * Get style
   * @param {string} prop - Style property
   * @returns {any} - Style value
   */
  getStyle(prop) {
    return prop ? this.style[prop] : this.style;
  }

  /**
   * Set style
   * @param {string} prop - Style property
   * @param {any} value - Style value
   * @returns {Polygon} - Returns self for chaining
   */
  setStyle(prop, value) {
    if (typeof prop === 'object') {
      Object.assign(this.style, prop);
    } else {
      this.style[prop] = value;
    }
    this.isDirty = true;
    return this;
  }

  /**
   * Set fill color
   * @param {string} color - Fill color
   * @returns {Polygon} - Returns self for chaining
   */
  fill(color) {
    this.style.fill = color || DEFAULT_STYLES.fill;
    this.isDirty = true;
    return this;
  }

  /**
   * Set stroke
   * @param {string} color - Stroke color
   * @param {number} width - Stroke width
   * @returns {Polygon} - Returns self for chaining
   */
  stroke(color, width) {
    this.style.stroke = color || DEFAULT_STYLES.stroke;
    if (width !== undefined) {
      this.style.strokeWidth = width;
    }
    this.isDirty = true;
    return this;
  }

  /**
   * Get the raw buffer
   * @returns {Float32Array}
   */
  getBuffer() {
    this.applyTransforms();
    return this.buffer;
  }

  /**
   * Get the base buffer (without transforms)
   * @returns {Float32Array}
   */
  getBaseBuffer() {
    return this.baseBuffer;
  }

  /**
   * Update the buffer (for dynamic shapes)
   * @param {Float32Array} newBuffer - New buffer data
   */
  updateBuffer(newBuffer) {
    this.buffer = newBuffer;
    this.baseBuffer = new Float32Array(newBuffer);
    this.vertexCount = getVertexCount(this.buffer);
    this.isDirty = true;
    this.bounds = null;
    this.isTransformDirty = true;
  }

  /**
   * Check if polygon is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.buffer.length === 0;
  }

  /**
   * Get the center of the polygon
   * @returns {{x: number, y: number}}
   */
  getCenter() {
    const bounds = this.getBounds();
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }
}

module.exports = Polygon;