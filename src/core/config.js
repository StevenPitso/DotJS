// src/core/config.js
// Configuration validation and defaults

const DEFAULT_CONFIG = {
  background: '#000000',
  render: 'canvas2d', // 'canvas2d' | 'webgl' | 'webgpu'
  use: null, // Element ID or HTMLCanvasElement
  width: 800,
  height: 600,
  pixelRatio: window ? window.devicePixelRatio || 1 : 1,
  autoStart: true,
  fps: 60,
};

/**
 * Validates and merges user config with defaults
 * @param {Object} userConfig - User provided config
 * @returns {Object} - Validated config
 * @throws {Error} - If config is invalid
 */
function validateConfig(userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Validate width
  if (typeof config.width !== 'number' || config.width <= 0) {
    throw new Error('config.width must be a positive number');
  }

  // Validate height
  if (typeof config.height !== 'number' || config.height <= 0) {
    throw new Error('config.height must be a positive number');
  }

  // Validate render mode
  const validRenderModes = ['canvas2d', 'webgl', 'webgpu'];
  if (!validRenderModes.includes(config.render)) {
    throw new Error(
      `config.render must be one of: ${validRenderModes.join(', ')}`
    );
  }

  // Validate background color (simple check)
  if (typeof config.background !== 'string') {
    throw new Error('config.background must be a string');
  }

  // Validate use (canvas element)
  if (config.use !== null) {
    const isString = typeof config.use === 'string';
    const isElement = config.use instanceof HTMLCanvasElement;

    if (!isString && !isElement) {
      throw new Error(
        'config.use must be a canvas element ID (string) or HTMLCanvasElement'
      );
    }
  }

  // Validate pixelRatio
  if (typeof config.pixelRatio !== 'number' || config.pixelRatio <= 0) {
    config.pixelRatio = DEFAULT_CONFIG.pixelRatio;
  }

  // Validate fps
  if (typeof config.fps !== 'number' || config.fps <= 0) {
    config.fps = DEFAULT_CONFIG.fps;
  }

  return config;
}

/**
 * Gets the canvas element from config
 * @param {Object} config - Validated config
 * @returns {HTMLCanvasElement|null} - Canvas element or null
 */
function getCanvasElement(config) {
  if (!config.use) return null;

  if (config.use instanceof HTMLCanvasElement) {
    return config.use;
  }

  if (typeof config.use === 'string') {
    const el = document.getElementById(config.use);
    if (!el) {
      console.warn(`[dotjs] Canvas element with id "${config.use}" not found`);
      return null;
    }
    if (!(el instanceof HTMLCanvasElement)) {
      console.warn(
        `[dotjs] Element with id "${config.use}" is not a canvas element`
      );
      return null;
    }
    return el;
  }

  return null;
}

/**
 * Creates a canvas element if none provided
 * @param {Object} config - Validated config
 * @returns {HTMLCanvasElement} - Canvas element
 */
function createCanvasElement(config) {
  const canvas = document.createElement('canvas');
  canvas.width = config.width * config.pixelRatio;
  canvas.height = config.height * config.pixelRatio;
  canvas.style.width = `${config.width}px`;
  canvas.style.height = `${config.height}px`;
  canvas.style.display = 'block';
  return canvas;
}

/**
 * Prepares canvas for OffscreenCanvas transfer
 * @param {Object} config - Validated config
 * @returns {Object} - { canvas, offscreen, transfer }
 */
function prepareCanvas(config) {
  let canvas = getCanvasElement(config);

  if (!canvas) {
    canvas = createCanvasElement(config);
    document.body.appendChild(canvas);
  }

  let offscreen = null;
  let transfer = [];

  try {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No 2D context available');
    }
  } catch (err) {
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = createCanvasElement(config);
    document.body.appendChild(canvas);
  }

  return {
    canvas,
    offscreen,
    transfer,
  };
}

module.exports = {
  DEFAULT_CONFIG,
  validateConfig,
  getCanvasElement,
  createCanvasElement,
  prepareCanvas,
};