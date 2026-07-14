// src/operations/group.js
// Group shapes for batch operations

const { defaultLogger: logger } = require('../utils/logger');

/**
 * Create a group of shapes for batch operations
 * @param {Object} shapeMap - Object mapping keys to shapes
 * @returns {Object} - Group object with chainable methods
 * 
 * @example
 * const myGroup = group({
 *   shape1: circle(100, 100, 50),
 *   shape2: rect(200, 100, 50, 50)
 * }).setRef('myGroup');
 * 
 * myGroup.fill('#ff0000').translate(10, 10);
 */
function group(shapeMap) {
  if (typeof shapeMap !== 'object' || Array.isArray(shapeMap)) {
    throw new Error('group() requires an object mapping keys to shapes');
  }

  const keys = Object.keys(shapeMap);
  if (keys.length === 0) {
    throw new Error('group() requires at least one shape');
  }

  // Validate all values are shapes
  for (const [key, shape] of Object.entries(shapeMap)) {
    if (!shape || !shape.points || !Array.isArray(shape.points)) {
      throw new Error(`Value for key "${key}" is not a valid shape`);
    }
  }

  // Store shape references
  const shapes = { ...shapeMap };
  const shapeKeys = keys;

  // Create the group object
  const groupObj = {
    type: 'group',
    shapes: shapes,
    shapeKeys: shapeKeys,
    refKey: null,
    _isGroup: true,
    _pendingCommands: [],
    _isRegistered: false,

    /**
     * Set a reference key for this group
     * @param {string} key - Unique identifier
     * @returns {Object} - Returns self for chaining
     */
    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      
      // Register each shape in the group with prefixed keys
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.setRef) {
          const fullKey = `${key}_${shapeKey}`;
          shape.setRef(fullKey);
        }
      }
      
      this._pendingCommands.push({ 
        cmd: 'GROUP', 
        groupKey: key,
        shapeKeys: this.shapeKeys.map(k => `${key}_${k}`)
      });
      return this;
    },

    /**
     * Apply fill to all shapes in group
     * @param {string} color - Fill color
     * @returns {Object} - Returns self for chaining
     */
    fill(color) {
      const fillColor = color || '#000000';
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.fill) {
          shape.fill(fillColor);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_FILL', color: fillColor });
      return this;
    },

    /**
     * Apply stroke to all shapes in group
     * @param {string} color - Stroke color
     * @param {number} width - Stroke width
     * @returns {Object} - Returns self for chaining
     */
    stroke(color, width) {
      const strokeColor = color || '#000000';
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.stroke) {
          shape.stroke(strokeColor, width);
        }
      }
      this._pendingCommands.push({ 
        cmd: 'GROUP_STROKE', 
        color: strokeColor, 
        width: width || 1 
      });
      return this;
    },

    /**
     * Apply opacity to all shapes in group
     * @param {number} opacity - Opacity (0-1)
     * @returns {Object} - Returns self for chaining
     */
    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.opacity) {
          shape.opacity(opacity);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_OPACITY', opacity });
      return this;
    },

    /**
     * Apply wavy deformation to all shapes in group
     * @param {number} amplitude - Wave amplitude
     * @param {number} frequency - Wave frequency
     * @param {string} axis - 'x', 'y', or 'both'
     * @returns {Object} - Returns self for chaining
     */
    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.wavy) {
          shape.wavy(amplitude, frequency, axis);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_WAVY', amplitude, frequency, axis });
      return this;
    },

    /**
     * Translate all shapes in group
     * @param {number} dx - X translation
     * @param {number} dy - Y translation
     * @returns {Object} - Returns self for chaining
     */
    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.translate) {
          shape.translate(dx, dy);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_TRANSLATE', dx, dy });
      return this;
    },

    /**
     * Rotate all shapes in group around a common center
     * @param {number} angle - Rotation angle in radians
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      
      // Calculate center if not provided
      if (cx === undefined || cy === undefined) {
        const center = this.getCenter();
        cx = center.x;
        cy = center.y;
      }
      
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.rotate) {
          shape.rotate(angle, cx, cy);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_ROTATE', angle, cx, cy });
      return this;
    },

    /**
     * Scale all shapes in group
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
      
      // Calculate center if not provided
      if (cx === undefined || cy === undefined) {
        const center = this.getCenter();
        cx = center.x;
        cy = center.y;
      }
      
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.scale) {
          shape.scale(sx, sy, cx, cy);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_SCALE', sx, sy, cx, cy });
      return this;
    },

    /**
     * Get the center of all shapes in the group
     * @returns {{x: number, y: number}} - Center point
     */
    getCenter() {
      let totalX = 0;
      let totalY = 0;
      let count = 0;

      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.points && Array.isArray(shape.points)) {
          for (const p of shape.points) {
            totalX += p.x;
            totalY += p.y;
            count++;
          }
        }
      }

      if (count === 0) {
        return { x: 0, y: 0 };
      }

      return {
        x: totalX / count,
        y: totalY / count,
      };
    },

    /**
     * Get a specific shape from the group
     * @param {string} key - Shape key
     * @returns {Object|null} - Shape or null if not found
     */
    getShape(key) {
      return this.shapes[key] || null;
    },

    /**
     * Get all shape keys in the group
     * @returns {string[]} - Array of shape keys
     */
    getShapeKeys() {
      return [...this.shapeKeys];
    },

    /**
     * Get all shapes in the group
     * @returns {Object} - Object mapping keys to shapes
     */
    getShapes() {
      return { ...this.shapes };
    },

    /**
     * Add a shape to the group
     * @param {string} key - Key for the shape
     * @param {Object} shape - Shape to add
     * @returns {Object} - Returns self for chaining
     */
    addShape(key, shape) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('addShape() requires a non-empty string key');
      }
      if (!shape || !shape.points) {
        throw new Error('addShape() requires a valid shape');
      }
      
      this.shapes[key] = shape;
      this.shapeKeys.push(key);
      
      // If group has a ref, register the new shape
      if (this.refKey) {
        const fullKey = `${this.refKey}_${key}`;
        if (shape.setRef) {
          shape.setRef(fullKey);
        }
      }
      
      this._pendingCommands.push({ cmd: 'GROUP_ADD_SHAPE', key });
      return this;
    },

    /**
     * Remove a shape from the group
     * @param {string} key - Key of shape to remove
     * @returns {Object} - Returns self for chaining
     */
    removeShape(key) {
      if (!this.shapes[key]) {
        logger.warn(`Shape "${key}" not found in group`);
        return this;
      }
      
      delete this.shapes[key];
      const index = this.shapeKeys.indexOf(key);
      if (index !== -1) {
        this.shapeKeys.splice(index, 1);
      }
      
      this._pendingCommands.push({ cmd: 'GROUP_REMOVE_SHAPE', key });
      return this;
    },

    /**
     * Get the group's data for sending to worker
     * @returns {Object} - Group data
     */
    _getData() {
      return {
        type: 'group',
        refKey: this.refKey,
        shapeKeys: this.shapeKeys.map(k => this.refKey ? `${this.refKey}_${k}` : k),
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
     * Check if group is registered
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
     * Clone the entire group
     * @returns {Object} - New group instance
     */
    clone() {
      const newShapes = {};
      for (const [key, shape] of Object.entries(this.shapes)) {
        if (shape.clone && typeof shape.clone === 'function') {
          newShapes[key] = shape.clone();
        } else {
          newShapes[key] = { ...shape };
        }
      }
      
      const newGroup = group(newShapes);
      if (this.refKey) {
        newGroup.setRef(this.refKey + '_clone');
      }
      return newGroup;
    }
  };

  return groupObj;
}

/**
 * Check if an object is a group
 * @param {Object} obj - Object to check
 * @returns {boolean}
 */
function isGroup(obj) {
  return obj && obj._isGroup === true;
}

/**
 * Get all shapes from a group as an array
 * @param {Object} groupObj - Group object
 * @returns {Array} - Array of shapes
 */
function getGroupShapes(groupObj) {
  if (!isGroup(groupObj)) {
    throw new Error('getGroupShapes() requires a group object');
  }
  return Object.values(groupObj.shapes);
}

module.exports = {
  group,
  isGroup,
  getGroupShapes,
};