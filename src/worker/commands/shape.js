// src/worker/commands/shape.js
// Shape command handlers

const Polygon = require('../Polygon');
const { SHAPE_TYPES } = require('../../bridge/commands');
const { pointsToBuffer } = require('../../utils/buffers');
const { defaultLogger: logger } = require('../../utils/logger');

/**
 * Create a circle polygon
 * @param {Object} params - Circle parameters
 * @returns {Polygon}
 */
function createCircle(params) {
  const { x, y, radius, segments = 32 } = params;
  const points = [];
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.CIRCLE,
    isClosed: true,
  });
}

/**
 * Create a rectangle polygon
 * @param {Object} params - Rectangle parameters
 * @returns {Polygon}
 */
function createRect(params) {
  const { x, y, width, height } = params;
  const points = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.RECT,
    isClosed: true,
  });
}

/**
 * Create a line polygon
 * @param {Object} params - Line parameters
 * @returns {Polygon}
 */
function createLine(params) {
  const { x1, y1, x2, y2 } = params;
  const points = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ];

  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.LINE,
    isClosed: false,
  });
}

/**
 * Create a custom polygon
 * @param {Object} params - Polygon parameters
 * @returns {Polygon}
 */
function createPolygon(params) {
  const { points, isClosed = true } = params;
  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.POLYGON,
    isClosed,
  });
}

/**
 * Handle ADD_SHAPE command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Created shape info
 */
function handleAddShape(payload, context) {
  const { registry } = context;
  const { type, key, params, style } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  // Create polygon based on type
  let polygon;

  switch (type) {
    case SHAPE_TYPES.CIRCLE:
      polygon = createCircle(params);
      break;
    case SHAPE_TYPES.RECT:
      polygon = createRect(params);
      break;
    case SHAPE_TYPES.LINE:
      polygon = createLine(params);
      break;
    case SHAPE_TYPES.POLYGON:
      polygon = createPolygon(params);
      break;
    default:
      throw new Error(`Unknown shape type: ${type}`);
  }

  // Apply style
  if (style) {
    Object.assign(polygon.style, style);
  }

  // Register
  if (key) {
    registry.set(key, polygon);
  }

  return {
    key: key || null,
    type: polygon.type,
    vertexCount: polygon.vertexCount,
  };
}

/**
 * Handle REMOVE_SHAPE command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {boolean} - Success
 */
function handleRemoveShape(payload, context) {
  const { registry } = context;
  const { key } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  return registry.delete(key);
}

/**
 * Handle UPDATE_SHAPE command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Update result
 */
function handleUpdateShape(payload, context) {
  const { registry } = context;
  const { key, updates } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  const polygon = registry.get(key);

  if (!polygon) {
    throw new Error(`Shape "${key}" not found`);
  }

  let updateCount = 0;

  for (const update of updates) {
    const { prop, value } = update;

    // Special handling for methods
    switch (prop) {
      case '_wavy':
        polygon.wavy(value.amplitude, value.frequency, value.axis || 'both');
        updateCount++;
        break;
        
      case '_bezier':
        // Handle bezier conversion
        // Not fully implemented yet
        logger.warn('Worker: Bezier conversion not yet implemented');
        break;
        
      case 'fill':
        polygon.fill(value);
        updateCount++;
        break;
        
      case 'stroke':
        polygon.stroke(value);
        updateCount++;
        break;
        
      case 'strokeWidth':
        polygon.setStyle('strokeWidth', value);
        updateCount++;
        break;
        
      case 'opacity':
        polygon.setStyle('opacity', value);
        updateCount++;
        break;
        
      case 'translate':
        polygon.translate(value.dx || 0, value.dy || 0);
        updateCount++;
        break;
        
      case 'rotate':
        polygon.rotate(value.angle || 0, value.cx, value.cy);
        updateCount++;
        break;
        
      case 'scale':
        polygon.scale(value.sx || 1, value.sy || 1, value.cx, value.cy);
        updateCount++;
        break;
        
      case 'double':
        polygon.double(value.iterations || 1);
        updateCount++;
        break;
        
      default:
        // Direct property access (x, y, etc.)
        // For now, we don't support direct property updates
        // Users should use translate() or other methods
        logger.warn(`Worker: Unknown update prop "${prop}"`);
        break;
    }
  }

  // Mark as dirty if anything was updated
  if (updateCount > 0) {
    polygon.isDirty = true;
    registry.markDirty(key);
  }

  return {
    success: true,
    updated: updateCount,
  };
}

/**
 * Handle GET_SHAPE command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object|null} - Shape data or null
 */
function handleGetShape(payload, context) {
  const { registry } = context;
  const { key } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  const polygon = registry.get(key);

  if (!polygon) {
    return null;
  }

  return {
    key,
    type: polygon.type,
    vertexCount: polygon.vertexCount,
    style: polygon.style,
    isClosed: polygon.isClosed,
    isDirty: polygon.isDirty,
    isDynamic: polygon.isDynamic,
    bounds: polygon.getBounds(),
  };
}

// Export command handlers
module.exports = {
  handleAddShape,
  handleRemoveShape,
  handleUpdateShape,
  handleGetShape,
  // Helpers (exposed for testing)
  createCircle,
  createRect,
  createLine,
  createPolygon,
};