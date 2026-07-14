// src/styles/stroke.js
// Stroke utilities

const { getStyleManager } = require('./StyleManager');
const { defaultLogger: logger } = require('../utils/logger');

/**
 * Apply stroke to a shape
 * @param {Object} shape - Shape to stroke
 * @param {string|number|Array|Object} color - Stroke color
 * @param {number} width - Stroke width
 * @param {Object} options - Stroke options
 * @param {string} options.style - 'solid', 'dashed', 'dotted'
 * @param {Array} options.dashPattern - Dash pattern [dash, gap, ...]
 * @param {string} options.cap - 'butt', 'round', 'square'
 * @param {string} options.join - 'miter', 'round', 'bevel'
 * @param {number} options.miterLimit - Miter limit
 * @returns {Object} - Shape with stroke applied
 */
function stroke(shape, color, width = 1, options = {}) {
  if (!shape) {
    throw new Error('stroke() requires a shape');
  }

  const styleManager = getStyleManager();
  const normalizedColor = styleManager.normalizeColor(color);

  shape.style = shape.style || {};
  shape._pendingCommands = shape._pendingCommands || [];

  // Apply stroke color
  if (normalizedColor) {
    shape.style.stroke = normalizedColor;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'stroke', 
      value: normalizedColor 
    });
  } else if (color === null || color === undefined) {
    shape.style.stroke = null;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'stroke', 
      value: null 
    });
  }

  // Apply stroke width
  if (width !== undefined && width !== null) {
    if (typeof width !== 'number' || width < 0) {
      throw new Error('stroke() width must be a positive number');
    }
    shape.style.strokeWidth = width;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'strokeWidth', 
      value: width 
    });
  }

  // Apply stroke style
  if (options.style) {
    const validStyles = ['solid', 'dashed', 'dotted'];
    if (!validStyles.includes(options.style)) {
      throw new Error(`stroke() style must be one of: ${validStyles.join(', ')}`);
    }
    shape.style.strokeStyle = options.style;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'strokeStyle', 
      value: options.style 
    });
  }

  // Apply dash pattern
  if (options.dashPattern) {
    if (!Array.isArray(options.dashPattern) || options.dashPattern.length === 0) {
      throw new Error('stroke() dashPattern must be a non-empty array');
    }
    shape.style.dashPattern = options.dashPattern;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'dashPattern', 
      value: options.dashPattern 
    });
  }

  // Apply line cap
  if (options.cap) {
    const validCaps = ['butt', 'round', 'square'];
    if (!validCaps.includes(options.cap)) {
      throw new Error(`stroke() cap must be one of: ${validCaps.join(', ')}`);
    }
    shape.style.lineCap = options.cap;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'lineCap', 
      value: options.cap 
    });
  }

  // Apply line join
  if (options.join) {
    const validJoins = ['miter', 'round', 'bevel'];
    if (!validJoins.includes(options.join)) {
      throw new Error(`stroke() join must be one of: ${validJoins.join(', ')}`);
    }
    shape.style.lineJoin = options.join;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'lineJoin', 
      value: options.join 
    });
  }

  // Apply miter limit
  if (options.miterLimit) {
    if (typeof options.miterLimit !== 'number' || options.miterLimit < 1) {
      throw new Error('stroke() miterLimit must be a number >= 1');
    }
    shape.style.miterLimit = options.miterLimit;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'miterLimit', 
      value: options.miterLimit 
    });
  }

  logger.debug(`stroke: Applied stroke to shape`);

  return shape;
}

/**
 * Remove stroke from a shape
 * @param {Object} shape - Shape to remove stroke from
 * @returns {Object} - Shape without stroke
 */
function noStroke(shape) {
  return stroke(shape, null);
}

/**
 * Apply dashed stroke to a shape
 * @param {Object} shape - Shape to stroke
 * @param {string|number|Array|Object} color - Stroke color
 * @param {number} width - Stroke width
 * @param {Array} dashPattern - Dash pattern [dash, gap, ...]
 * @param {Object} options - Additional stroke options
 * @returns {Object} - Shape with dashed stroke
 */
function dashed(shape, color, width = 1, dashPattern = [5, 5], options = {}) {
  return stroke(shape, color, width, {
    ...options,
    style: 'dashed',
    dashPattern,
  });
}

/**
 * Apply dotted stroke to a shape
 * @param {Object} shape - Shape to stroke
 * @param {string|number|Array|Object} color - Stroke color
 * @param {number} width - Stroke width
 * @param {Object} options - Additional stroke options
 * @returns {Object} - Shape with dotted stroke
 */
function dotted(shape, color, width = 1, options = {}) {
  return stroke(shape, color, width, {
    ...options,
    style: 'dotted',
    dashPattern: [1, 3],
  });
}

/**
 * Check if a shape has stroke
 * @param {Object} shape - Shape to check
 * @returns {boolean} - Has stroke
 */
function hasStroke(shape) {
  if (!shape || !shape.style) return false;
  const stroke = shape.style.stroke;
  return stroke !== null && stroke !== undefined && stroke !== 'none';
}

/**
 * Get stroke of a shape
 * @param {Object} shape - Shape to get stroke from
 * @returns {Object|null} - Stroke info or null
 */
function getStroke(shape) {
  if (!shape || !shape.style) return null;
  return {
    color: shape.style.stroke || null,
    width: shape.style.strokeWidth || 1,
    style: shape.style.strokeStyle || 'solid',
    dashPattern: shape.style.dashPattern || null,
    cap: shape.style.lineCap || 'butt',
    join: shape.style.lineJoin || 'miter',
    miterLimit: shape.style.miterLimit || 10,
  };
}

module.exports = {
  stroke,
  noStroke,
  dashed,
  dotted,
  hasStroke,
  getStroke,
};