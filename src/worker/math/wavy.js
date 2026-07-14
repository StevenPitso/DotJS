// src/worker/math/wavy.js
// Wavy deformation utilities

/**
 * Apply wavy deformation to points
 * @param {Array<{x: number, y: number}>} points - Points to deform
 * @param {Object} options - Wavy options
 * @param {number} options.amplitude - Wave amplitude
 * @param {number} options.frequency - Wave frequency
 * @param {string} options.axis - 'x', 'y', or 'both'
 * @param {number} options.time - Time for animation
 * @param {string} options.waveType - 'sin', 'cos', 'triangle', 'sawtooth'
 * @param {number} options.phase - Phase offset
 * @returns {Array<{x: number, y: number}>} - Deformed points
 */
function applyWavy(points, options = {}) {
  const {
    amplitude = 0,
    frequency = 1,
    axis = 'both',
    time = 0,
    waveType = 'sin',
    phase = 0,
  } = options;

  if (amplitude === 0 || !points || points.length === 0) {
    return points.slice();
  }

  const result = points.map((p, i) => {
    const angle = i * frequency + time + phase;
    let wave = 0;

    switch (waveType) {
      case 'sin':
        wave = Math.sin(angle);
        break;
      case 'cos':
        wave = Math.cos(angle);
        break;
      case 'triangle':
        wave = 2 * Math.abs(angle / Math.PI - Math.floor(angle / Math.PI + 0.5)) - 1;
        break;
      case 'sawtooth':
        wave = 2 * (angle / Math.PI - Math.floor(angle / Math.PI + 0.5));
        break;
      default:
        wave = Math.sin(angle);
    }

    wave *= amplitude;

    return {
      x: axis === 'x' || axis === 'both' ? p.x + wave : p.x,
      y: axis === 'y' || axis === 'both' ? p.y + wave : p.y,
    };
  });

  return result;
}

/**
 * Apply wavy deformation with multiple frequencies (complex wave)
 * @param {Array<{x: number, y: number}>} points - Points to deform
 * @param {Object} options - Wavy options
 * @param {Array<{amplitude: number, frequency: number}>} waves - Wave components
 * @param {string} axis - 'x', 'y', or 'both'
 * @param {number} time - Time for animation
 * @returns {Array<{x: number, y: number}>} - Deformed points
 */
function applyComplexWavy(points, waves, axis = 'both', time = 0) {
  if (!waves || waves.length === 0 || !points || points.length === 0) {
    return points.slice();
  }

  const result = points.map((p, i) => {
    let dx = 0;
    let dy = 0;

    for (const wave of waves) {
      const angle = i * wave.frequency + time;
      const w = Math.sin(angle) * wave.amplitude;

      if (axis === 'x' || axis === 'both') dx += w;
      if (axis === 'y' || axis === 'both') dy += w;
    }

    return {
      x: p.x + dx,
      y: p.y + dy,
    };
  });

  return result;
}

/**
 * Apply circular wavy deformation (ripple effect)
 * @param {Array<{x: number, y: number}>} points - Points to deform
 * @param {Object} options - Ripple options
 * @param {number} options.centerX - Center X for ripple
 * @param {number} options.centerY - Center Y for ripple
 * @param {number} options.amplitude - Ripple amplitude
 * @param {number} options.frequency - Ripple frequency
 * @param {number} options.time - Time for animation
 * @returns {Array<{x: number, y: number}>} - Deformed points
 */
function applyRippleWavy(points, options = {}) {
  const {
    centerX = 0,
    centerY = 0,
    amplitude = 0,
    frequency = 1,
    time = 0,
  } = options;

  if (amplitude === 0 || !points || points.length === 0) {
    return points.slice();
  }

  const result = points.map((p) => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = dist * frequency - time;
    const wave = Math.sin(angle) * amplitude;

    if (dist === 0) {
      return { ...p };
    }

    const ratio = wave / dist;
    return {
      x: p.x + dx * ratio,
      y: p.y + dy * ratio,
    };
  });

  return result;
}

/**
 * Apply spiral wavy deformation
 * @param {Array<{x: number, y: number}>} points - Points to deform
 * @param {Object} options - Spiral options
 * @param {number} options.centerX - Center X
 * @param {number} options.centerY - Center Y
 * @param {number} options.amplitude - Spiral amplitude
 * @param {number} options.spiralTurns - Number of turns
 * @param {number} options.time - Time for animation
 * @returns {Array<{x: number, y: number}>} - Deformed points
 */
function applySpiralWavy(points, options = {}) {
  const {
    centerX = 0,
    centerY = 0,
    amplitude = 0,
    spiralTurns = 1,
    time = 0,
  } = options;

  if (amplitude === 0 || !points || points.length === 0) {
    return points.slice();
  }

  const result = points.map((p, i) => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const spiralAngle = angle + dist * spiralTurns * 0.1 + time;
    const wave = Math.sin(spiralAngle) * amplitude;

    if (dist === 0) {
      return { ...p };
    }

    const ratio = wave / dist;
    return {
      x: p.x + dx * ratio,
      y: p.y + dy * ratio,
    };
  });

  return result;
}

module.exports = {
  applyWavy,
  applyComplexWavy,
  applyRippleWavy,
  applySpiralWavy,
};