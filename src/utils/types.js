// src/utils/types.js
// Type checking utilities

/**
 * Checks if value is a Float32Array
 * @param {any} value
 * @returns {boolean}
 */
function isFloat32Array(value) {
  return value instanceof Float32Array;
}

/**
 * Checks if value is a polygon instance
 * @param {any} value
 * @returns {boolean}
 */
function isPolygon(value) {
  return (
    value &&
    typeof value === 'object' &&
    'buffer' in value &&
    isFloat32Array(value.buffer) &&
    'style' in value
  );
}

/**
 * Checks if value is a valid ref key (string)
 * @param {any} value
 * @returns {boolean}
 */
function isValidRefKey(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Checks if value is a color string/hex
 * @param {any} value
 * @returns {boolean}
 */
function isColor(value) {
  if (typeof value !== 'string') return false;
  // Hex: #fff, #ffffff
  if (/^#[0-9a-f]{3,6}$/i.test(value)) return true;
  // Named colors (basic check)
  const named = ['black', 'white', 'red', 'green', 'blue', 'transparent'];
  if (named.includes(value.toLowerCase())) return true;
  // rgb/rgba
  if (/^rgba?\(/.test(value)) return true;
  return false;
}

module.exports = {
  isFloat32Array,
  isPolygon,
  isValidRefKey,
  isColor,
};