// src/shapes/bezier.js
// Bezier curve shape factory

const { SHAPE_TYPES } = require('../bridge/commands');

/**
 * Calculate a point on a cubic bezier curve
 * @param {number} t - Parameter (0-1)
 * @param {number} p0 - Start point
 * @param {number} p1 - Control point 1
 * @param {number} p2 - Control point 2
 * @param {number} p3 - End point
 * @returns {number} - Point on curve
 */
function cubicBezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 
         3 * u * u * t * p1 + 
         3 * u * t * t * p2 + 
         t * t * t * p3;
}

/**
 * Calculate a point on a quadratic bezier curve
 * @param {number} t - Parameter (0-1)
 * @param {number} p0 - Start point
 * @param {number} p1 - Control point
 * @param {number} p2 - End point
 * @returns {number} - Point on curve
 */
function quadraticBezier(t, p0, p1, p2) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * Creates a bezier curve shape
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} cx1 - Control point 1 X
 * @param {number} cy1 - Control point 1 Y
 * @param {number} cx2 - Control point 2 X (optional for cubic)
 * @param {number} cy2 - Control point 2 Y (optional for cubic)
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {Object} options - Additional options
 * @param {number} options.segments - Number of segments (default: 20)
 * @param {boolean} options.isClosed - Whether curve is closed (default: false)
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, options = {}) {
  // Determine if it's cubic or quadratic
  const isCubic = arguments.length >= 8;
  
  // Validate arguments
  if (typeof x1 !== 'number' || typeof y1 !== 'number' ||
      typeof cx1 !== 'number' || typeof cy1 !== 'number' ||
      typeof x2 !== 'number' || typeof y2 !== 'number') {
    throw new Error('bezier() requires x1, y1, cx1, cy1, x2, y2 as numbers');
  }

  const segments = options.segments || 20;
  const isClosed = options.isClosed || false;
  const points = [];

  if (isCubic) {
    // Cubic bezier
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push({
        x: cubicBezier(t, x1, cx1, cx2, x2),
        y: cubicBezier(t, y1, cy1, cy2, y2),
      });
    }
  } else {
    // Quadratic bezier (cx2, cy2 are the control point)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push({
        x: quadraticBezier(t, x1, cx1, cx2),
        y: quadraticBezier(t, y1, cy1, cy2),
      });
    }
  }

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES.BEZIER,
    params: { 
      x1, y1, cx1, cy1, cx2, cy2, x2, y2, 
      segments, isClosed, 
      isCubic 
    },
    points: points,
    buffer: null,
    style: {
      fill: options.fill || null,
      stroke: options.stroke || '#ffffff',
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    stroke(color, width) {
      this.style.stroke = color || '#ffffff';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#ffffff' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
      return this;
    },

    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

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

    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    isRegistered() {
      return this._isRegistered;
    },

    getRef() {
      return this.refKey;
    },

    clone() {
      const params = this.params;
      let newBezier;
      if (params.isCubic) {
        newBezier = bezier(
          params.x1, params.y1,
          params.cx1, params.cy1,
          params.cx2, params.cy2,
          params.x2, params.y2,
          {
            segments: params.segments,
            isClosed: params.isClosed,
            fill: this.style.fill,
            stroke: this.style.stroke,
            strokeWidth: this.style.strokeWidth,
            opacity: this.style.opacity,
          }
        );
      } else {
        newBezier = bezier(
          params.x1, params.y1,
          params.cx1, params.cy1,
          params.x2, params.y2,
          {
            segments: params.segments,
            isClosed: params.isClosed,
            fill: this.style.fill,
            stroke: this.style.stroke,
            strokeWidth: this.style.strokeWidth,
            opacity: this.style.opacity,
          }
        );
      }
      if (this.refKey) {
        newBezier.setRef(this.refKey + '_clone');
      }
      return newBezier;
    }
  };

  return shape;
}

/**
 * Create a cubic bezier curve (convenience function)
 */
function cubicBezierCurve(x1, y1, cx1, cy1, cx2, cy2, x2, y2, options = {}) {
  return bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, options);
}

/**
 * Create a quadratic bezier curve (convenience function)
 */
function quadraticBezierCurve(x1, y1, cx1, cy1, x2, y2, options = {}) {
  return bezier(x1, y1, cx1, cy1, x2, y2, options);
}

module.exports = {
  bezier,
  cubicBezierCurve,
  quadraticBezierCurve,
  cubicBezier,
  quadraticBezier,
};