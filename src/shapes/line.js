// src/shapes/line.js
// Line factory function

const { SHAPE_TYPES } = require('../bridge/commands');

/**
 * Creates a line shape
 * @param {number} x1 - Start X position
 * @param {number} y1 - Start Y position
 * @param {number} x2 - End X position
 * @param {number} y2 - End Y position
 * @param {Object} options - Additional options
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function line(x1, y1, x2, y2, options = {}) {
  if (typeof x1 !== 'number' || typeof y1 !== 'number' || 
      typeof x2 !== 'number' || typeof y2 !== 'number') {
    throw new Error('line() requires x1, y1, x2, and y2 as numbers');
  }

  const points = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ];

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES.LINE,
    params: { x1, y1, x2, y2 },
    points: points,
    buffer: null,
    style: {
      fill: null, // Lines don't have fill
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

    /**
     * Convert line to bezier curve
     * @param {Array} controlPoints - Control points for bezier
     * @returns {Object} - Returns self for chaining
     */
    bezier(...controlPoints) {
      if (controlPoints.length === 0) {
        throw new Error('bezier() requires at least one control point');
      }
      this._pendingCommands.push({ cmd: 'BEZIER', points: controlPoints });
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
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      const originX = typeof cx === 'number' ? cx : this.points[0].x;
      const originY = typeof cy === 'number' ? cy : this.points[0].y;
      this.points = this.points.map(point => {
        const dx = point.x - originX;
        const dy = point.y - originY;
        return {
          x: originX + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: originY + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      });
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      const originX = typeof cx === 'number' ? cx : this.points[0].x;
      const originY = typeof cy === 'number' ? cy : this.points[0].y;
      this.points = this.points.map(point => ({
        x: originX + (point.x - originX) * sx,
        y: originY + (point.y - originY) * sy,
      }));
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
      const newLine = line(this.params.x1, this.params.y1, this.params.x2, this.params.y2, {
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newLine.setRef(this.refKey + '_clone');
      }
      return newLine;
    }
  };

  return shape;
}

module.exports = {
  line,
};