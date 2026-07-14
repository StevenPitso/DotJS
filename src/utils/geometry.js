// src/utils/geometry.js
// Geometry utilities - distance, angle, midpoint, etc.

/**
 * Calculate the distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} - Distance
 */
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the squared distance between two points (faster than distance)
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} - Squared distance
 */
function distanceSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Calculate the angle between two points in radians
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} - Angle in radians
 */
function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Calculate the angle between two points in degrees
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} - Angle in degrees
 */
function angleDeg(x1, y1, x2, y2) {
  return angle(x1, y1, x2, y2) * 180 / Math.PI;
}

/**
 * Calculate the midpoint between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {{x: number, y: number}} - Midpoint
 */
function midpoint(x1, y1, x2, y2) {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

/**
 * Calculate the centroid of a polygon
 * @param {Array<{x: number, y: number}>} points - Polygon points
 * @returns {{x: number, y: number}} - Centroid
 */
function centroid(points) {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }

  let cx = 0;
  let cy = 0;
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }

  area /= 2;
  if (area === 0) {
    // Fallback to average
    let avgX = 0, avgY = 0;
    for (const p of points) {
      avgX += p.x;
      avgY += p.y;
    }
    return {
      x: avgX / points.length,
      y: avgY / points.length,
    };
  }

  return {
    x: cx / (6 * area),
    y: cy / (6 * area),
  };
}

/**
 * Calculate the area of a polygon
 * @param {Array<{x: number, y: number}>} points - Polygon points
 * @returns {number} - Area
 */
function polygonArea(points) {
  if (!points || points.length < 3) {
    return 0;
  }

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calculate the perimeter of a polygon
 * @param {Array<{x: number, y: number}>} points - Polygon points
 * @param {boolean} closed - Whether polygon is closed
 * @returns {number} - Perimeter
 */
function polygonPerimeter(points, closed = true) {
  if (!points || points.length < 2) {
    return 0;
  }

  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += distance(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }

  if (closed && points.length > 2) {
    const last = points.length - 1;
    perimeter += distance(points[last].x, points[last].y, points[0].x, points[0].y);
  }

  return perimeter;
}

/**
 * Interpolate between two points (lerp)
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @param {number} t - Interpolation factor (0-1)
 * @returns {{x: number, y: number}} - Interpolated point
 */
function lerp(x1, y1, x2, y2, t) {
  return {
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t,
  };
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} - Mapped value
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMin === inMax) {
    return outMin;
  }
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

/**
 * Constrain a value between min and max
 * @param {number} value - Value to constrain
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Constrained value
 */
function constrain(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {Array<{x: number, y: number}>} polygon - Polygon points
 * @returns {boolean} - Point is inside polygon
 */
function pointInPolygon(x, y, polygon) {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point is inside a circle
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} - Point is inside circle
 */
function pointInCircle(x, y, cx, cy, radius) {
  return distanceSq(x, y, cx, cy) <= radius * radius;
}

/**
 * Check if a point is inside a rectangle
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} rx - Rectangle X
 * @param {number} ry - Rectangle Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} - Point is inside rectangle
 */
function pointInRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

/**
 * Check if two circles intersect
 * @param {number} x1 - First circle center X
 * @param {number} y1 - First circle center Y
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle center X
 * @param {number} y2 - Second circle center Y
 * @param {number} r2 - Second circle radius
 * @returns {boolean} - Circles intersect
 */
function circlesIntersect(x1, y1, r1, x2, y2, r2) {
  const d = distance(x1, y1, x2, y2);
  return d <= r1 + r2 && d >= Math.abs(r1 - r2);
}

/**
 * Check if two rectangles intersect
 * @param {number} x1 - First rectangle X
 * @param {number} y1 - First rectangle Y
 * @param {number} w1 - First rectangle width
 * @param {number} h1 - First rectangle height
 * @param {number} x2 - Second rectangle X
 * @param {number} y2 - Second rectangle Y
 * @param {number} w2 - Second rectangle width
 * @param {number} h2 - Second rectangle height
 * @returns {boolean} - Rectangles intersect
 */
function rectsIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 &&
         y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Get the intersection point of two lines
 * @param {number} x1 - First line start X
 * @param {number} y1 - First line start Y
 * @param {number} x2 - First line end X
 * @param {number} y2 - First line end Y
 * @param {number} x3 - Second line start X
 * @param {number} y3 - Second line start Y
 * @param {number} x4 - Second line end X
 * @param {number} y4 - Second line end Y
 * @returns {{x: number, y: number} | null} - Intersection point or null
 */
function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d2 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  const d3 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d4 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);

  if ((d1 === 0 && d2 === 0) || (d3 === 0 && d4 === 0)) {
    return null; // Lines are collinear
  }

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) {
    return null; // Lines are parallel
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null; // Intersection is outside line segments
  }

  return {
    x: x1 + ua * (x2 - x1),
    y: y1 + ua * (y2 - y1),
  };
}

/**
 * Calculate the closest point on a line segment to a point
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @returns {{x: number, y: number, distance: number}} - Closest point and distance
 */
function closestPointOnLine(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { x: x1, y: y1, distance: distance(px, py, x1, y1) };
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = constrain(t, 0, 1);

  const x = x1 + t * dx;
  const y = y1 + t * dy;

  return {
    x,
    y,
    distance: distance(px, py, x, y),
  };
}

/**
 * Calculate the closest point on a polygon to a point
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {Array<{x: number, y: number}>} polygon - Polygon points
 * @returns {{x: number, y: number, distance: number}} - Closest point and distance
 */
function closestPointOnPolygon(px, py, polygon) {
  if (!polygon || polygon.length === 0) {
    return { x: px, y: py, distance: 0 };
  }

  let closest = null;
  let minDist = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const result = closestPointOnLine(px, py, polygon[i].x, polygon[i].y, polygon[j].x, polygon[j].y);

    if (result.distance < minDist) {
      minDist = result.distance;
      closest = result;
    }
  }

  return closest;
}

/**
 * Rotate a point around a center
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} angle - Rotation angle in radians
 * @returns {{x: number, y: number}} - Rotated point
 */
function rotatePoint(x, y, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/**
 * Scale a point around a center
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} sx - X scale
 * @param {number} sy - Y scale
 * @returns {{x: number, y: number}} - Scaled point
 */
function scalePoint(x, y, cx, cy, sx, sy) {
  return {
    x: cx + (x - cx) * sx,
    y: cy + (y - cy) * sy,
  };
}

/**
 * Check if a point is on the left side of a line
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @returns {number} - >0 if left, <0 if right, 0 if on line
 */
function pointSide(px, py, x1, y1, x2, y2) {
  return (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
}

/**
 * Get the angle between three points (at point p1)
 * @param {number} x1 - Vertex X
 * @param {number} y1 - Vertex Y
 * @param {number} x2 - Point 1 X
 * @param {number} y2 - Point 1 Y
 * @param {number} x3 - Point 2 X
 * @param {number} y3 - Point 2 Y
 * @returns {number} - Angle in radians
 */
function angleBetween(x1, y1, x2, y2, x3, y3) {
  const a = distance(x1, y1, x2, y2);
  const b = distance(x1, y1, x3, y3);
  const c = distance(x2, y2, x3, y3);

  if (a === 0 || b === 0) {
    return 0;
  }

  const cos = (a * a + b * b - c * c) / (2 * a * b);
  return Math.acos(constrain(cos, -1, 1));
}

/**
 * Calculate the signed angle from v1 to v2
 * @param {{x: number, y: number}} v1 - First vector
 * @param {{x: number, y: number}} v2 - Second vector
 * @returns {number} - Signed angle in radians
 */
function signedAngle(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.atan2(cross, dot);
}

module.exports = {
  // Basic measurements
  distance,
  distanceSq,
  angle,
  angleDeg,
  midpoint,

  // Polygon calculations
  centroid,
  polygonArea,
  polygonPerimeter,

  // Interpolation and mapping
  lerp,
  mapRange,
  constrain,

  // Point in shape
  pointInPolygon,
  pointInCircle,
  pointInRect,

  // Shape intersection
  circlesIntersect,
  rectsIntersect,
  lineIntersection,

  // Closest point
  closestPointOnLine,
  closestPointOnPolygon,

  // Transformations
  rotatePoint,
  scalePoint,

  // Geometry utilities
  pointSide,
  angleBetween,
  signedAngle,
};