// src/worker/commands/join.js
// Join command handlers

const Polygon = require('../Polygon');
const { SHAPE_TYPES, DEFAULT_STYLES } = require('../../bridge/commands');
const { concatBuffers } = require('../../utils/buffers');
const { defaultLogger: logger } = require('../../utils/logger');

/**
 * Handle JOIN_SHAPES command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Joined shape info
 */
function handleJoinShapes(payload, context) {
  const { registry } = context;
  const { keys, newKey, style } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!keys || !Array.isArray(keys) || keys.length < 2) {
    throw new Error('join() requires at least 2 shape keys');
  }

  // Get all polygons
  const polygons = [];
  for (const key of keys) {
    const polygon = registry.get(key);
    if (!polygon) {
      throw new Error(`Shape "${key}" not found`);
    }
    polygons.push(polygon);
  }

  // Concatenate buffers
  let totalLength = 0;
  for (const p of polygons) {
    totalLength += p.buffer.length;
  }

  const newBuffer = new Float32Array(totalLength);
  let offset = 0;

  for (const p of polygons) {
    newBuffer.set(p.buffer, offset);
    offset += p.buffer.length;
  }

  // Determine if joined shape should be closed
  // If any shape is open, the joined shape is open
  const isClosed = polygons.every(p => p.isClosed);

  // Get style from first polygon or use provided style
  const fillStyle = style?.fill || polygons[0]?.style?.fill || DEFAULT_STYLES.fill;
  const strokeStyle = style?.stroke || polygons[0]?.style?.stroke || DEFAULT_STYLES.stroke;
  const strokeWidth = style?.strokeWidth || polygons[0]?.style?.strokeWidth || DEFAULT_STYLES.strokeWidth;
  const opacity = style?.opacity || polygons[0]?.style?.opacity || DEFAULT_STYLES.opacity;

  // Create joined polygon
  const joined = new Polygon({
    buffer: newBuffer,
    type: SHAPE_TYPES.JOIN,
    isClosed,
    fill: fillStyle,
    stroke: strokeStyle,
    strokeWidth,
    opacity,
  });

  // Register
  if (newKey) {
    registry.set(newKey, joined);
  }

  // Keep track of original shapes for potential explosion
  joined._originalKeys = keys;
  joined._isJoined = true;

  logger.debug(`Worker: Joined ${keys.length} shapes into "${newKey}"`);

  return {
    key: newKey || null,
    vertexCount: joined.vertexCount,
    originalCount: keys.length,
    isClosed,
  };
}

/**
 * Explode a joined shape back into its components
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Exploded shapes info
 */
function handleExplodeJoin(payload, context) {
  const { registry } = context;
  const { key } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  const joined = registry.get(key);

  if (!joined) {
    throw new Error(`Shape "${key}" not found`);
  }

  if (!joined._isJoined || !joined._originalKeys) {
    throw new Error(`Shape "${key}" is not a joined shape`);
  }

  // Return the original keys
  return {
    keys: joined._originalKeys,
    count: joined._originalKeys.length,
  };
}

/**
 * Check if a shape is joined
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {boolean} - Is joined
 */
function handleIsJoined(payload, context) {
  const { registry } = context;
  const { key } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  const polygon = registry.get(key);

  if (!polygon) {
    return false;
  }

  return polygon._isJoined === true;
}

module.exports = {
  handleJoinShapes,
  handleExplodeJoin,
  handleIsJoined,
};