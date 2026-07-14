// src/worker/math/subdivision.js
// Geometric subdivision utilities

const { getVertex, setVertex } = require('../../utils/buffers');

/**
 * Calculate midpoint between two points
 * @param {{x: number, y: number}} p1 - First point
 * @param {{x: number, y: number}} p2 - Second point
 * @returns {{x: number, y: number}} - Midpoint
 */
function midpoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Double the resolution of points by adding midpoints
 * @param {Array<{x: number, y: number}>} points - Points to subdivide
 * @param {boolean} closed - Whether the shape is closed
 * @returns {Array<{x: number, y: number}>} - Subdivided points
 */
function doublePoints(points, closed = true) {
  if (!points || points.length < 2) {
    return points.slice();
  }

  const result = [];
  const len = points.length;

  for (let i = 0; i < len; i++) {
    const current = points[i];
    const next = points[(i + 1) % len];

    // Add current point
    result.push({ ...current });

    // Add midpoint
    result.push(midpoint(current, next));
  }

  // If not closed, remove the last midpoint (it connects back to start)
  if (!closed && len > 1) {
    // For open shapes, we don't need the midpoint between last and first
    // But we keep it for smooth curves
  }

  return result;
}

/**
 * Subdivide points with Catmull-Rom spline
 * @param {Array<{x: number, y: number}>} points - Points to subdivide
 * @param {number} segments - Number of segments between points
 * @param {boolean} closed - Whether the shape is closed
 * @param {number} tension - Spline tension (0-1)
 * @returns {Array<{x: number, y: number}>} - Subdivided points
 */
function catmullRomSubdivision(points, segments = 2, closed = true, tension = 0.5) {
  if (!points || points.length < 3) {
    return points.slice();
  }

  const result = [];
  const len = points.length;

  // Helper to get point with wrapping for closed shapes
  function getPoint(i) {
    if (closed) {
      return points[((i % len) + len) % len];
    } else {
      if (i < 0) return points[0];
      if (i >= len) return points[len - 1];
      return points[i];
    }
  }

  // Catmull-Rom interpolation
  function interpolate(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    
    return { x, y };
  }

  const count = closed ? len : len - 1;

  for (let i = 0; i < count; i++) {
    const p0 = getPoint(i - 1);
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const p3 = getPoint(i + 2);

    // Add the start point
    result.push({ ...p1 });

    // Add interpolated points
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      result.push(interpolate(p0, p1, p2, p3, t));
    }
  }

  // If not closed, add the last point
  if (!closed) {
    result.push({ ...points[len - 1] });
  }

  return result;
}

/**
 * Subdivide points with Chaikin's algorithm (smoothing)
 * @param {Array<{x: number, y: number}>} points - Points to subdivide
 * @param {number} iterations - Number of iterations
 * @param {boolean} closed - Whether the shape is closed
 * @param {number} ratio - Subdivision ratio (0-1)
 * @returns {Array<{x: number, y: number}>} - Subdivided points
 */
function chaikinSubdivision(points, iterations = 1, closed = true, ratio = 0.25) {
  if (!points || points.length < 3) {
    return points.slice();
  }

  let result = points.slice();

  for (let iter = 0; iter < iterations; iter++) {
    const newPoints = [];
    const len = result.length;

    for (let i = 0; i < len; i++) {
      const p0 = result[i];
      const p1 = result[(i + 1) % len];

      // Chaikin's algorithm creates two points along each edge
      const q = {
        x: (1 - ratio) * p0.x + ratio * p1.x,
        y: (1 - ratio) * p0.y + ratio * p1.y,
      };
      const r = {
        x: ratio * p0.x + (1 - ratio) * p1.x,
        y: ratio * p0.y + (1 - ratio) * p1.y,
      };

      newPoints.push(q);
      newPoints.push(r);
    }

    // If not closed, remove the last point (it connects back to start)
    if (!closed) {
      newPoints.pop();
    }

    result = newPoints;
  }

  return result;
}

/**
 * Subdivide a buffer in-place
 * @param {Float32Array} buffer - Buffer to subdivide
 * @param {string} method - Subdivision method: 'midpoint', 'catmullRom', 'chaikin'
 * @param {Object} options - Subdivision options
 * @returns {Float32Array} - New subdivided buffer
 */
function subdivideBuffer(buffer, method = 'midpoint', options = {}) {
  if (!buffer || buffer.length < 4) {
    return buffer;
  }

  // Convert buffer to points
  const points = [];
  for (let i = 0; i < buffer.length; i += 2) {
    points.push({ x: buffer[i], y: buffer[i + 1] });
  }

  const closed = options.closed !== undefined ? options.closed : true;
  let result;

  switch (method) {
    case 'midpoint':
      result = doublePoints(points, closed);
      break;
    case 'catmullRom':
      const segments = options.segments || 2;
      const tension = options.tension || 0.5;
      result = catmullRomSubdivision(points, segments, closed, tension);
      break;
    case 'chaikin':
      const iterations = options.iterations || 1;
      const ratio = options.ratio || 0.25;
      result = chaikinSubdivision(points, iterations, closed, ratio);
      break;
    default:
      result = points;
  }

  // Convert back to buffer
  const newBuffer = new Float32Array(result.length * 2);
  for (let i = 0; i < result.length; i++) {
    newBuffer[i * 2] = result[i].x;
    newBuffer[i * 2 + 1] = result[i].y;
  }

  return newBuffer;
}

module.exports = {
  midpoint,
  doublePoints,
  catmullRomSubdivision,
  chaikinSubdivision,
  subdivideBuffer,
};