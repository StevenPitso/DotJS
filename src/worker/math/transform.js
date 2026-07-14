// src/worker/math/transform.js
// Matrix transformation utilities

/**
 * 2D Transformation matrix
 * [a, c, tx]
 * [b, d, ty]
 * [0, 0, 1 ]
 */
class TransformMatrix {
  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }

  /**
   * Multiply two matrices
   * @param {TransformMatrix} m1 - First matrix
   * @param {TransformMatrix} m2 - Second matrix
   * @returns {TransformMatrix} - Result matrix
   */
  static multiply(m1, m2) {
    return new TransformMatrix(
      m1.a * m2.a + m1.c * m2.b,
      m1.b * m2.a + m1.d * m2.b,
      m1.a * m2.c + m1.c * m2.d,
      m1.b * m2.c + m1.d * m2.d,
      m1.a * m2.tx + m1.c * m2.ty + m1.tx,
      m1.b * m2.tx + m1.d * m2.ty + m1.ty
    );
  }

  /**
   * Apply matrix to a point
   * @param {{x: number, y: number}} point - Point to transform
   * @returns {{x: number, y: number}} - Transformed point
   */
  applyToPoint(point) {
    return {
      x: this.a * point.x + this.c * point.y + this.tx,
      y: this.b * point.x + this.d * point.y + this.ty,
    };
  }

  /**
   * Apply matrix to multiple points
   * @param {Array<{x: number, y: number}>} points - Points to transform
   * @returns {Array<{x: number, y: number}>} - Transformed points
   */
  applyToPoints(points) {
    return points.map(p => this.applyToPoint(p));
  }

  /**
   * Apply matrix to a buffer
   * @param {Float32Array} buffer - Buffer to transform
   * @returns {Float32Array} - Transformed buffer
   */
  applyToBuffer(buffer) {
    const result = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i += 2) {
      const x = buffer[i];
      const y = buffer[i + 1];
      result[i] = this.a * x + this.c * y + this.tx;
      result[i + 1] = this.b * x + this.d * y + this.ty;
    }
    return result;
  }

  /**
   * Create translation matrix
   * @param {number} tx - X translation
   * @param {number} ty - Y translation
   * @returns {TransformMatrix}
   */
  static translation(tx, ty) {
    return new TransformMatrix(1, 0, 0, 1, tx, ty);
  }

  /**
   * Create rotation matrix
   * @param {number} angle - Rotation angle in radians
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {TransformMatrix}
   */
  static rotation(angle, cx = 0, cy = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new TransformMatrix(
      cos, sin, -sin, cos,
      cx * (1 - cos) + cy * sin,
      cy * (1 - cos) - cx * sin
    );
  }

  /**
   * Create scale matrix
   * @param {number} sx - X scale
   * @param {number} sy - Y scale
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {TransformMatrix}
   */
  static scale(sx, sy, cx = 0, cy = 0) {
    return new TransformMatrix(
      sx, 0, 0, sy,
      cx * (1 - sx),
      cy * (1 - sy)
    );
  }

  /**
   * Create shear matrix
   * @param {number} shx - X shear
   * @param {number} shy - Y shear
   * @returns {TransformMatrix}
   */
  static shear(shx, shy) {
    return new TransformMatrix(1, shy, shx, 1, 0, 0);
  }

  /**
   * Create identity matrix
   * @returns {TransformMatrix}
   */
  static identity() {
    return new TransformMatrix(1, 0, 0, 1, 0, 0);
  }
}

/**
 * Translate points
 * @param {Array<{x: number, y: number}>} points - Points to translate
 * @param {number} dx - X translation
 * @param {number} dy - Y translation
 * @returns {Array<{x: number, y: number}>} - Translated points
 */
function translatePoints(points, dx, dy) {
  const matrix = TransformMatrix.translation(dx, dy);
  return matrix.applyToPoints(points);
}

/**
 * Rotate points
 * @param {Array<{x: number, y: number}>} points - Points to rotate
 * @param {number} angle - Rotation angle in radians
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @returns {Array<{x: number, y: number}>} - Rotated points
 */
function rotatePoints(points, angle, cx = 0, cy = 0) {
  const matrix = TransformMatrix.rotation(angle, cx, cy);
  return matrix.applyToPoints(points);
}

/**
 * Scale points
 * @param {Array<{x: number, y: number}>} points - Points to scale
 * @param {number} sx - X scale
 * @param {number} sy - Y scale
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @returns {Array<{x: number, y: number}>} - Scaled points
 */
function scalePoints(points, sx, sy, cx = 0, cy = 0) {
  const matrix = TransformMatrix.scale(sx, sy, cx, cy);
  return matrix.applyToPoints(points);
}

/**
 * Shear points
 * @param {Array<{x: number, y: number}>} points - Points to shear
 * @param {number} shx - X shear
 * @param {number} shy - Y shear
 * @returns {Array<{x: number, y: number}>} - Sheared points
 */
function shearPoints(points, shx, shy) {
  const matrix = TransformMatrix.shear(shx, shy);
  return matrix.applyToPoints(points);
}

/**
 * Apply multiple transforms to points
 * @param {Array<{x: number, y: number}>} points - Points to transform
 * @param {Array<Function>} transforms - Transform functions
 * @returns {Array<{x: number, y: number}>} - Transformed points
 */
function composeTransforms(points, transforms) {
  let result = points;
  for (const transform of transforms) {
    result = transform(result);
  }
  return result;
}

/**
 * Calculate the bounding box of points
 * @param {Array<{x: number, y: number}>} points - Points
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
 */
function getBounds(points) {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Calculate the center of points
 * @param {Array<{x: number, y: number}>} points - Points
 * @returns {{x: number, y: number}}
 */
function getCenter(points) {
  const bounds = getBounds(points);
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

module.exports = {
  TransformMatrix,
  translatePoints,
  rotatePoints,
  scalePoints,
  shearPoints,
  composeTransforms,
  getBounds,
  getCenter,
};