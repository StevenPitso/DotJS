// src/styles/fill.js
// Fill utilities

const { getStyleManager } = require('./StyleManager');
const { defaultLogger: logger } = require('../utils/logger');

/**
 * Apply fill to a shape
 * @param {Object} shape - Shape to fill
 * @param {string|number|Array|Object} color - Fill color
 * @param {Object} options - Fill options
 * @param {string} options.type - 'solid', 'gradient', 'pattern'
 * @param {string} options.gradientType - 'linear', 'radial'
 * @param {Array} options.stops - Gradient stops [{offset, color}]
 * @param {Object} options.pattern - Pattern options
 * @returns {Object} - Shape with fill applied
 */
function fill(shape, color, options = {}) {
  if (!shape) {
    throw new Error('fill() requires a shape');
  }

  const styleManager = getStyleManager();
  const normalizedColor = styleManager.normalizeColor(color);

  // Handle gradient fill
  if (options.type === 'gradient') {
    return fillGradient(shape, options);
  }

  // Handle pattern fill
  if (options.type === 'pattern') {
    return fillPattern(shape, options);
  }

  // Solid fill
  if (normalizedColor) {
    shape.style = shape.style || {};
    shape.style.fill = normalizedColor;
    shape._pendingCommands = shape._pendingCommands || [];
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'fill', 
      value: normalizedColor 
    });
  } else if (color === null || color === undefined) {
    // Remove fill
    shape.style = shape.style || {};
    shape.style.fill = null;
    shape._pendingCommands = shape._pendingCommands || [];
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'fill', 
      value: null 
    });
  }

  return shape;
}

/**
 * Apply gradient fill to a shape
 * @param {Object} shape - Shape to fill
 * @param {Object} options - Gradient options
 * @param {string} options.gradientType - 'linear' or 'radial'
 * @param {number} options.x1 - Start X for linear gradient
 * @param {number} options.y1 - Start Y for linear gradient
 * @param {number} options.x2 - End X for linear gradient
 * @param {number} options.y2 - End Y for linear gradient
 * @param {number} options.cx - Center X for radial gradient
 * @param {number} options.cy - Center Y for radial gradient
 * @param {number} options.radius - Radius for radial gradient
 * @param {Array<{offset: number, color: string}>} options.stops - Gradient stops
 * @returns {Object} - Shape with gradient fill
 */
function fillGradient(shape, options = {}) {
  if (!shape) {
    throw new Error('fillGradient() requires a shape');
  }

  const {
    gradientType = 'linear',
    x1 = 0, y1 = 0,
    x2 = 1, y2 = 1,
    cx = 0.5, cy = 0.5,
    radius = 0.5,
    stops = [],
  } = options;

  if (stops.length < 2) {
    throw new Error('fillGradient() requires at least 2 gradient stops');
  }

  // Store gradient data on the shape
  shape.style = shape.style || {};
  shape.style.fill = {
    type: 'gradient',
    gradientType,
    x1, y1, x2, y2,
    cx, cy, radius,
    stops,
  };

  shape._pendingCommands = shape._pendingCommands || [];
  shape._pendingCommands.push({
    cmd: 'SET_STYLE',
    prop: 'fill',
    value: shape.style.fill,
  });

  logger.debug(`fillGradient: Applied ${gradientType} gradient to shape`);

  return shape;
}

/**
 * Apply pattern fill to a shape
 * @param {Object} shape - Shape to fill
 * @param {Object} options - Pattern options
 * @param {string} options.type - 'image', 'canvas', 'repeating'
 * @param {string} options.src - Image source for image pattern
 * @param {Object} options.canvas - Canvas for canvas pattern
 * @param {number} options.width - Pattern width
 * @param {number} options.height - Pattern height
 * @param {string} options.repeat - 'repeat', 'repeat-x', 'repeat-y', 'no-repeat'
 * @returns {Object} - Shape with pattern fill
 */
function fillPattern(shape, options = {}) {
  if (!shape) {
    throw new Error('fillPattern() requires a shape');
  }

  const {
    type = 'repeating',
    src = null,
    canvas = null,
    width = 0,
    height = 0,
    repeat = 'repeat',
  } = options;

  // Store pattern data on the shape
  shape.style = shape.style || {};
  shape.style.fill = {
    type: 'pattern',
    patternType: type,
    src,
    canvas,
    width,
    height,
    repeat,
  };

  shape._pendingCommands = shape._pendingCommands || [];
  shape._pendingCommands.push({
    cmd: 'SET_STYLE',
    prop: 'fill',
    value: shape.style.fill,
  });

  logger.debug(`fillPattern: Applied pattern fill to shape`);

  return shape;
}

/**
 * Remove fill from a shape
 * @param {Object} shape - Shape to remove fill from
 * @returns {Object} - Shape without fill
 */
function noFill(shape) {
  return fill(shape, null);
}

/**
 * Check if a shape has fill
 * @param {Object} shape - Shape to check
 * @returns {boolean} - Has fill
 */
function hasFill(shape) {
  if (!shape || !shape.style) return false;
  const fill = shape.style.fill;
  return fill !== null && fill !== undefined && fill !== 'none';
}

/**
 * Get fill color of a shape
 * @param {Object} shape - Shape to get fill from
 * @returns {string|Object|null} - Fill color or null
 */
function getFill(shape) {
  if (!shape || !shape.style) return null;
  return shape.style.fill || null;
}

module.exports = {
  fill,
  fillGradient,
  fillPattern,
  noFill,
  hasFill,
  getFill,
};