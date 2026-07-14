// src/utils/buffers.js
// Float32Array helpers

/**
 * Creates a new Float32Array from coordinates
 * @param {number[]} coords - Flat array of x,y coordinates
 * @returns {Float32Array}
 */
function createBuffer(coords) {
  return new Float32Array(coords);
}

/**
 * Concatenates two Float32Arrays into one
 * @param {Float32Array} a - First buffer
 * @param {Float32Array} b - Second buffer
 * @returns {Float32Array} - New concatenated buffer
 */
function concatBuffers(a, b) {
  const result = new Float32Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

/**
 * Copies a buffer (deep copy)
 * @param {Float32Array} buffer - Buffer to copy
 * @returns {Float32Array} - New copy
 */
function copyBuffer(buffer) {
  return new Float32Array(buffer);
}

/**
 * Gets vertex count from buffer (2 floats per vertex)
 * @param {Float32Array} buffer
 * @returns {number}
 */
function getVertexCount(buffer) {
  return buffer.length / 2;
}

/**
 * Gets vertex at index
 * @param {Float32Array} buffer
 * @param {number} index - Vertex index (0-based)
 * @returns {{x: number, y: number}}
 */
function getVertex(buffer, index) {
  const i = index * 2;
  return { x: buffer[i], y: buffer[i + 1] };
}

/**
 * Sets vertex at index
 * @param {Float32Array} buffer
 * @param {number} index - Vertex index (0-based)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function setVertex(buffer, index, x, y) {
  const i = index * 2;
  buffer[i] = x;
  buffer[i + 1] = y;
}

/**
 * Extracts coordinates as array of {x, y} objects
 * @param {Float32Array} buffer
 * @returns {Array<{x: number, y: number}>}
 */
function bufferToPoints(buffer) {
  const points = [];
  for (let i = 0; i < buffer.length; i += 2) {
    points.push({ x: buffer[i], y: buffer[i + 1] });
  }
  return points;
}

/**
 * Creates buffer from array of {x, y} points
 * @param {Array<{x: number, y: number}>} points
 * @returns {Float32Array}
 */
function pointsToBuffer(points) {
  const buffer = new Float32Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    buffer[i * 2] = points[i].x;
    buffer[i * 2 + 1] = points[i].y;
  }
  return buffer;
}

module.exports = {
  createBuffer,
  concatBuffers,
  copyBuffer,
  getVertexCount,
  getVertex,
  setVertex,
  bufferToPoints,
  pointsToBuffer,
};