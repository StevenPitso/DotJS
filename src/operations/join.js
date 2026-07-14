// src/operations/join.js
// Join multiple shapes into a single path

const { SHAPE_TYPES } = require('../bridge/commands');
const { defaultLogger: logger } = require('../utils/logger');
const { pointsToBuffer } = require('../utils/buffers');

/**
 * Join multiple shapes into a single polygon
 * @param {...Object} shapes - Shapes to join
 * @returns {Object} - Joined shape with chainable methods
 * 
 * @example
 * const shape1 = circle(100, 100, 50);
 * const shape2 = rect(200, 100, 50, 50);
 * const joined = join(shape1, shape2).setRef('combined');
 */
function join(...shapes) {
  if (shapes.length < 2) {
    throw new Error('join() requires at least 2 shapes');
  }

  // Collect all points from all shapes
  let allPoints = [];
  let lastShape = shapes[shapes.length - 1];
  let combinedStyle = {
    fill: null,
    stroke: null,
    strokeWidth: 1,
    opacity: 1,
  };

  // Process each shape
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    
    // Validate shape
    if (!shape || !shape.points || !Array.isArray(shape.points)) {
      throw new Error(`Shape at index ${i} is invalid or missing points`);
    }

    // Get points from the shape
    let points = shape.points;
    
    // If shape has pending commands, we need to process them
    // For now, just use the current points
    if (shape._pendingCommands && shape._pendingCommands.length > 0) {
      logger.warn(`Shape ${i} has pending commands - they will be ignored in join. Register the shape first.`);
    }

    // Add points to collection
    allPoints = allPoints.concat(points);

    // Merge style (use style from last shape that has it)
    if (shape.style) {
      if (shape.style.fill !== null && shape.style.fill !== undefined) {
        combinedStyle.fill = shape.style.fill;
      }
      if (shape.style.stroke !== null && shape.style.stroke !== undefined) {
        combinedStyle.stroke = shape.style.stroke;
      }
      if (shape.style.strokeWidth !== undefined) {
        combinedStyle.strokeWidth = shape.style.strokeWidth;
      }
      if (shape.style.opacity !== undefined) {
        combinedStyle.opacity = shape.style.opacity;
      }
    }
  }

  // Create the joined shape object
  const joinedShape = {
    type: SHAPE_TYPES.JOIN,
    params: { 
      originalShapes: shapes.map(s => s.type || 'unknown'),
      totalPoints: allPoints.length,
    },
    points: allPoints,
    buffer: null,
    style: {
      fill: combinedStyle.fill || '#000000',
      stroke: combinedStyle.stroke || null,
      strokeWidth: combinedStyle.strokeWidth || 1,
      opacity: combinedStyle.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,
    _isJoined: true,
    _originalShapes: shapes,

    /**
     * Set a reference key for this joined shape
     * @param {string} key - Unique identifier
     * @returns {Object} - Returns self for chaining
     */
    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      
      // Also register the join operation
      this._pendingCommands.push({ 
        cmd: 'JOIN', 
        shapeKeys: shapes.map(s => s.refKey).filter(k => k !== null)
      });
      return this;
    },

    /**
     * Set fill color
     * @param {string} color - Fill color
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
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
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
     * Translate the joined shape
     * @param {number} dx - X translation
     * @param {number} dy - Y translation
     * @returns {Object} - Returns self for chaining
     */
    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    /**
     * Rotate the joined shape
     * @param {number} angle - Rotation angle in radians
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    /**
     * Scale the joined shape
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
        isJoined: true,
        originalKeys: this._originalShapes.map(s => s.refKey).filter(k => k !== null),
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
     * Clone the joined shape
     * @returns {Object} - New shape instance
     */
    clone() {
      const clonedShapes = this._originalShapes.map(s => {
        if (s.clone && typeof s.clone === 'function') {
          return s.clone();
        }
        return s;
      });
      
      const newJoined = join(...clonedShapes);
      newJoined.style = { ...this.style };
      if (this.refKey) {
        newJoined.setRef(this.refKey + '_clone');
      }
      return newJoined;
    },

    /**
     * Get the original shapes that were joined
     * @returns {Array} - Original shapes
     */
    getOriginalShapes() {
      return this._originalShapes;
    },

    /**
     * Get the total number of points in the joined shape
     * @returns {number}
     */
    getPointCount() {
      return this.points.length;
    }
  };

  return joinedShape;
}

/**
 * Check if a shape is a joined shape
 * @param {Object} shape - Shape to check
 * @returns {boolean}
 */
function isJoined(shape) {
  return shape && shape._isJoined === true;
}

/**
 * Explode a joined shape back into its components
 * @param {Object} joinedShape - Joined shape to explode
 * @returns {Array} - Array of original shapes
 */
function explode(joinedShape) {
  if (!isJoined(joinedShape)) {
    throw new Error('explode() requires a joined shape');
  }
  
  // Return clones of the original shapes
  return joinedShape._originalShapes.map(s => {
    if (s.clone && typeof s.clone === 'function') {
      return s.clone();
    }
    return { ...s };
  });
}

module.exports = {
  join,
  isJoined,
  explode,
};