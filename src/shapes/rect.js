// src/shapes/rect.js
// Rectangle factory function

const { SHAPE_TYPES } = require('../bridge/commands');

/**
 * Creates a rectangle shape
 * @param {number} x - Top-left X position
 * @param {number} y - Top-left Y position
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @param {Object} options - Additional options
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {number} options.cornerRadius - Corner radius (for rounded rect)
 * @returns {Object} - Shape object with chainable methods
 */
function rect(x, y, width, height, options = {}) {
  if (typeof x !== 'number' || typeof y !== 'number' || 
      typeof width !== 'number' || typeof height !== 'number') {
    throw new Error('rect() requires x, y, width, and height as numbers');
  }

  if (width <= 0 || height <= 0) {
    throw new Error('rect() width and height must be greater than 0');
  }

  let points = [];
  const cornerRadius = options.cornerRadius || 0;

  if (cornerRadius > 0) {
    // Rounded rectangle
    const r = Math.min(cornerRadius, Math.min(width, height) / 2);
    const segments = 8; // Segments per corner
    
    // Helper to add arc points
    function addArc(cx, cy, radius, startAngle, endAngle) {
      const steps = segments;
      const angleStep = (endAngle - startAngle) / steps;
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + i * angleStep;
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }
    }

    // Top-left corner
    addArc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    // Top-right corner
    addArc(x + width - r, y + r, r, Math.PI * 1.5, Math.PI * 2);
    // Bottom-right corner
    addArc(x + width - r, y + height - r, r, 0, Math.PI / 2);
    // Bottom-left corner
    addArc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
  } else {
    // Regular rectangle
    points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES.RECT,
    params: { x, y, width, height, cornerRadius },
    points: points,
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
      this.params.x += dx;
      this.params.y += dy;
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

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
      this.params.width *= sx;
      this.params.height *= sy;
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
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
      const newRect = rect(this.params.x, this.params.y, this.params.width, this.params.height, {
        cornerRadius: this.params.cornerRadius,
        fill: this.style.fill,
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newRect.setRef(this.refKey + '_clone');
      }
      return newRect;
    }
  };

  return shape;
}

module.exports = {
  rect,
};