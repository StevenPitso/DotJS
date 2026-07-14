// src/shapes/circle.js
// Circle factory function

const { SHAPE_TYPES } = require('../bridge/commands');
const { defaultLogger: logger } = require('../utils/logger');

/**
 * Creates a circle shape
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} radius - Radius of the circle
 * @param {Object} options - Additional options
 * @param {number} options.segments - Number of segments (default: 32)
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function circle(x, y, radius, options = {}) {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof radius !== 'number') {
    throw new Error('circle() requires x, y, and radius as numbers');
  }

  if (radius <= 0) {
    throw new Error('circle() radius must be greater than 0');
  }

  const segments = options.segments || 32;
  const points = [];
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES.CIRCLE,
    params: { x, y, radius, segments },
    points: points,
    buffer: null, // Will be set when sent to worker
    style: {
      fill: options.fill || null,
      stroke: options.stroke || null,
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    /**
     * Set a reference key for this shape
     * @param {string} key - Unique identifier
     * @returns {Object} - Returns self for chaining
     */
    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    /**
     * Set fill color
     * @param {string} color - Fill color (hex, rgb, or named)
     * @returns {Object} - Returns self for chaining
     */
    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    /**
     * Set stroke color and width
     * @param {string} color - Stroke color
     * @param {number} width - Stroke width
     * @returns {Object} - Returns self for chaining
     */
    stroke(color, width) {
      this.style.stroke = color || '#000000';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#000000' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    /**
     * Set opacity
     * @param {number} opacity - Opacity (0-1)
     * @returns {Object} - Returns self for chaining
     */
    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    /**
     * Apply wavy deformation
     * @param {number} amplitude - Wave amplitude
     * @param {number} frequency - Wave frequency
     * @param {string} axis - 'x', 'y', or 'both'
     * @returns {Object} - Returns self for chaining
     */
    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ 
        cmd: 'WAVY', 
        amplitude, 
        frequency, 
        axis 
      });
      return this;
    },

    /**
     * Double the resolution
     * @param {number} iterations - Number of times to double
     * @returns {Object} - Returns self for chaining
     */
    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    /**
     * Translate the shape
     * @param {number} dx - X translation
     * @param {number} dy - Y translation
     * @returns {Object} - Returns self for chaining
     */
    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this.params.x += dx;
      this.params.y += dy;
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    /**
     * Rotate the shape
     * @param {number} angle - Rotation angle in radians
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      const originX = typeof cx === 'number' ? cx : this.params.x;
      const originY = typeof cy === 'number' ? cy : this.params.y;
      this.points = this.points.map(point => {
        const dx = point.x - originX;
        const dy = point.y - originY;
        return {
          x: originX + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: originY + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      });
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    /**
     * Scale the shape
     * @param {number} sx - X scale
     * @param {number} sy - Y scale
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      const originX = typeof cx === 'number' ? cx : this.params.x;
      const originY = typeof cy === 'number' ? cy : this.params.y;
      this.points = this.points.map(point => ({
        x: originX + (point.x - originX) * sx,
        y: originY + (point.y - originY) * sy,
      }));
      this.params.radius *= Math.max(sx, sy);
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    /**
     * Get the shape's data for sending to worker
     * @returns {Object} - Shape data
     */
    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
      };
    },

    /**
     * Mark as registered (internal)
     * @private
     */
    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    /**
     * Check if shape is registered
     * @returns {boolean}
     */
    isRegistered() {
      return this._isRegistered;
    },

    /**
     * Get the reference key
     * @returns {string|null}
     */
    getRef() {
      return this.refKey;
    },

    /**
     * Clone the shape
     * @returns {Object} - New shape instance
     */
    clone() {
      const newCircle = circle(this.params.x, this.params.y, this.params.radius, {
        segments: this.params.segments,
        fill: this.style.fill,
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newCircle.setRef(this.refKey + '_clone');
      }
      return newCircle;
    }
  };

  // Store original params for potential updates
  shape._originalParams = { x, y, radius };

  return shape;
}

/**
 * Update circle parameters (internal use)
 * @param {Object} shape - Circle shape
 * @param {Object} params - New parameters
 * @returns {Object} - Updated shape
 */
function updateCircle(shape, params) {
  const { x, y, radius } = params;
  const segments = shape.params.segments || 32;
  const points = [];
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  shape.points = points;
  shape.params = { x, y, radius, segments };
  shape._originalParams = { x, y, radius };
  return shape;
}

module.exports = {
  circle,
  updateCircle,
};