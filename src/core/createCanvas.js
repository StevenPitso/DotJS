// src/core/createCanvas.js
// Factory function that creates the app

const DotApp = require('./DotApp');
const { validateConfig, prepareCanvas } = require('./config');
const { defaultLogger: logger } = require('../utils/logger');

let activeAppRef = null;

function setActiveAppForRuntime(app) {
  activeAppRef = app;
  if (typeof globalThis !== 'undefined') {
    globalThis.__dotjs_app = app;
  }
}

/**
 * Creates the main application with worker
 * @param {number|Object} width - Canvas width or config object
 * @param {number} [height] - Canvas height (if width is number)
 * @param {Object} [config] - Additional config (if width is number)
 * @returns {DotApp} - The app instance
 */
function createCanvas(width, height, config = {}) {
  let userConfig;

  // Handle different call signatures
  if (typeof width === 'object') {
    // createCanvas({ width: 800, height: 600, ... })
    userConfig = width;
  } else {
    // createCanvas(800, 600, { background: '#000' })
    userConfig = { width, height, ...config };
  }

  // Validate config
  const validatedConfig = validateConfig(userConfig);
  logger.log('Creating canvas with config:', validatedConfig);

  // Prepare canvas
  const { canvas } = prepareCanvas(validatedConfig);
  canvas.dataset.dotjs = 'true';

  // Create app instance with a simple main-thread fallback
  const app = new DotApp({
    worker: null,
    bridge: null,
    canvas,
    config: validatedConfig,
  });

  logger.log('Canvas created successfully');

  setActiveAppForRuntime(app);

  // Store reference for debugging
  if (typeof window !== 'undefined') {
    window.__dotjs_app = app;
  }

  return app;
}

module.exports = createCanvas;