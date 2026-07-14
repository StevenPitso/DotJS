// src/operations/transform.js
// Batch transform operations

const { defaultLogger: logger } = require('../utils/logger');

/**
 * Apply a transform to a shape or group
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {Function} transformFn - Transform function to apply
 * @returns {Object|Array} - Transformed target
 */
function transform(target, transformFn) {
  if (typeof transformFn !== 'function') {
    throw new Error('transform() requires a transform function');
  }

  // Handle group
  if (target._isGroup) {
    const shapes = Object.values(target.shapes);
    for (const shape of shapes) {
      transformFn(shape);
    }
    return target;
  }

  // Handle array of shapes
  if (Array.isArray(target)) {
    for (const shape of target) {
      if (shape && shape.points) {
        transformFn(shape);
      }
    }
    return target;
  }

  // Handle single shape
  if (target && target.points) {
    transformFn(target);
    return target;
  }

  throw new Error('transform() target must be a shape, group, or array of shapes');
}

/**
 * Batch translate multiple shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {number} dx - X translation
 * @param {number} dy - Y translation
 * @returns {Object|Array} - Transformed target
 */
function batchTranslate(target, dx, dy) {
  return transform(target, (shape) => {
    if (shape.translate && typeof shape.translate === 'function') {
      shape.translate(dx, dy);
    } else {
      // Direct point manipulation
      if (shape.points && Array.isArray(shape.points)) {
        shape.points = shape.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
      }
    }
  });
}

/**
 * Batch rotate multiple shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {number} angle - Rotation angle in radians
 * @param {number} cx - Center X (optional)
 * @param {number} cy - Center Y (optional)
 * @returns {Object|Array} - Transformed target
 */
function batchRotate(target, angle, cx, cy) {
  // Calculate common center if not provided
  if (cx === undefined || cy === undefined) {
    const center = getBoundingCenter(target);
    cx = center.x;
    cy = center.y;
  }

  return transform(target, (shape) => {
    if (shape.rotate && typeof shape.rotate === 'function') {
      shape.rotate(angle, cx, cy);
    } else {
      // Direct point manipulation
      if (shape.points && Array.isArray(shape.points)) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        shape.points = shape.points.map(p => ({
          x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
          y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
        }));
      }
    }
  });
}

/**
 * Batch scale multiple shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {number} sx - X scale
 * @param {number} sy - Y scale
 * @param {number} cx - Center X (optional)
 * @param {number} cy - Center Y (optional)
 * @returns {Object|Array} - Transformed target
 */
function batchScale(target, sx, sy, cx, cy) {
  // Calculate common center if not provided
  if (cx === undefined || cy === undefined) {
    const center = getBoundingCenter(target);
    cx = center.x;
    cy = center.y;
  }

  return transform(target, (shape) => {
    if (shape.scale && typeof shape.scale === 'function') {
      shape.scale(sx, sy, cx, cy);
    } else {
      // Direct point manipulation
      if (shape.points && Array.isArray(shape.points)) {
        shape.points = shape.points.map(p => ({
          x: cx + (p.x - cx) * sx,
          y: cy + (p.y - cy) * sy,
        }));
      }
    }
  });
}

/**
 * Get the bounding center of a shape, group, or array of shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @returns {{x: number, y: number}} - Center point
 */
function getBoundingCenter(target) {
  let allPoints = [];

  // Collect all points
  if (target._isGroup) {
    // Group
    const shapes = Object.values(target.shapes);
    for (const shape of shapes) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else if (Array.isArray(target)) {
    // Array of shapes
    for (const shape of target) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else if (target.points && Array.isArray(target.points)) {
    // Single shape
    allPoints = target.points;
  } else {
    throw new Error('getBoundingCenter() target must be a shape, group, or array of shapes');
  }

  if (allPoints.length === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

/**
 * Align shapes in a group or array
 * @param {Object|Array} target - Group or array of shapes
 * @param {string} align - 'left', 'right', 'top', 'bottom', 'center', 'middle'
 * @param {number} offset - Offset distance (optional)
 * @returns {Object|Array} - Aligned target
 */
function align(target, align, offset = 0) {
  let shapes = [];
  let allPoints = [];

  // Collect shapes and points
  if (target._isGroup) {
    shapes = Object.values(target.shapes);
    for (const shape of shapes) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else if (Array.isArray(target)) {
    shapes = target;
    for (const shape of shapes) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else {
    throw new Error('align() target must be a group or array of shapes');
  }

  if (shapes.length === 0 || allPoints.length === 0) {
    return target;
  }

  // Calculate bounds
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;

  // Calculate alignment offsets
  let dx = 0, dy = 0;

  switch (align) {
    case 'left':
      dx = minX - offset;
      break;
    case 'right':
      dx = maxX - offset;
      break;
    case 'top':
      dy = minY - offset;
      break;
    case 'bottom':
      dy = maxY - offset;
      break;
    case 'center':
      dx = centerX - offset;
      break;
    case 'middle':
      dy = centerY - offset;
      break;
    default:
      throw new Error(`Unknown align option: ${align}`);
  }

  // Apply alignment to each shape
  for (const shape of shapes) {
    if (shape.translate && typeof shape.translate === 'function') {
      shape.translate(dx, dy);
    } else if (shape.points && Array.isArray(shape.points)) {
      shape.points = shape.points.map(p => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
    }
  }

  return target;
}

module.exports = {
  transform,
  batchTranslate,
  batchRotate,
  batchScale,
  getBoundingCenter,
  align,
};