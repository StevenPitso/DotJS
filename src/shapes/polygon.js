// src/shapes/polygon.js
// Custom polygon factory function

const { SHAPE_TYPES } = require('../bridge/commands');

/**
 * Creates a custom polygon shape from points
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {Object} options - Additional options
 * @param {boolean} options.isClosed - Whether polygon is closed (default: true)
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function createPolygon(points, options = {}) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('createPolygon() requires an array of at least 3 points');
  }

  // Validate points
  for (const p of points) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') {
      throw new Error('Each point must have x and y properties as numbers');
    }
  }

  const isClosed = options.isClosed !== undefined ? options.isClosed : true;

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES.POLYGON,
    params: { points: points.slice(), isClosed },
    points: points.slice(),
    buffer: null,
    style: {
      fill: options.fill || null,
      stroke: options.stroke || null,
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

    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    /**
     * Add a point to the polygon
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} - Returns self for chaining
     */
    addPoint(x, y) {
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('addPoint() requires x and y as numbers');
      }
      this.points.push({ x, y });
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'ADD_POINT', x, y });
      return this;
    },

    /**
     * Remove a point from the polygon
     * @param {number} index - Index of point to remove
     * @returns {Object} - Returns self for chaining
     */
    removePoint(index) {
      if (typeof index !== 'number' || index < 0 || index >= this.points.length) {
        throw new Error('removePoint() requires a valid index');
      }
      this.points.splice(index, 1);
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'REMOVE_POINT', index });
      return this;
    },

    /**
     * Insert a point at a specific index
     * @param {number} index - Index to insert at
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} - Returns self for chaining
     */
    insertPoint(index, x, y) {
      if (typeof index !== 'number' || index < 0 || index > this.points.length) {
        throw new Error('insertPoint() requires a valid index');
      }
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('insertPoint() requires x and y as numbers');
      }
      this.points.splice(index, 0, { x, y });
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'INSERT_POINT', index, x, y });
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
      this.params.points = this.points.slice();
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
      this.params.points = this.points.slice();
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
      this.params.points = this.points.slice();
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
      const newPolygon = createPolygon(this.points.slice(), {
        isClosed: this.params.isClosed,
        fill: this.style.fill,
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newPolygon.setRef(this.refKey + '_clone');
      }
      return newPolygon;
    }
  };

  return shape;
}

// Export with clear names
module.exports = {
  createPolygon,
  // Alias for backward compatibility
  polygon: createPolygon,
};