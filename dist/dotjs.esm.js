function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

// src/utils/logger.js
// Debug logging utility - tree-shaken in production

const DEBUG = typeof globalThis !== 'undefined' && typeof globalThis.process !== 'undefined'
  ? globalThis.process.env.NODE_ENV !== 'production'
  : true;

class Logger {
  constructor(prefix = 'dotjs') {
    this.prefix = prefix;
    this.enabled = DEBUG;
  }

  log(...args) {
    if (this.enabled) {
      console.log(`[${this.prefix}]`, ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(`[${this.prefix}]`, ...args);
    }
  }

  error(...args) {
    if (this.enabled) {
      console.error(`[${this.prefix}]`, ...args);
    }
  }

  debug(...args) {
    if (this.enabled && DEBUG) {
      console.debug(`[${this.prefix}]`, ...args);
    }
  }

  time(label) {
    if (this.enabled) {
      console.time(`[${this.prefix}] ${label}`);
    }
  }

  timeEnd(label) {
    if (this.enabled) {
      console.timeEnd(`[${this.prefix}] ${label}`);
    }
  }
}

// Singleton instance
const defaultLogger = new Logger();

var logger$f = {
  Logger,
  defaultLogger,
  log: defaultLogger.log.bind(defaultLogger),
  warn: defaultLogger.warn.bind(defaultLogger),
  error: defaultLogger.error.bind(defaultLogger),
  debug: defaultLogger.debug.bind(defaultLogger),
  time: defaultLogger.time.bind(defaultLogger),
  timeEnd: defaultLogger.timeEnd.bind(defaultLogger),
};

// src/core/DotApp.js
// The app instance returned by createCanvas()

const { defaultLogger: logger$e } = logger$f;

let DotApp$3 = class DotApp {
  constructor(options) {
    this.worker = options.worker;
    this.bridge = options.bridge;
    this.canvas = options.canvas;
    this.config = options.config;
    this.isRunning = false;
    this.rafId = null;
    this.drawCallback = null;
    this.frameCount = 0;
    this.startTime = Date.now();
    this.shapes = [];
    this.refs = new Map();
    this.fps = this.config && this.config.fps ? this.config.fps : 60;
    this.frameDuration = 1000 / this.fps;
    this.lastFrameTime = 0;
    this.context = this.canvas ? this.getCanvasContext(this.canvas) : null;

    // Bind methods
    this.draw = this.draw.bind(this);
    this.stop = this.stop.bind(this);
    this.start = this.start.bind(this);
    this.loop = this.loop.bind(this);
    this.tick = this.tick.bind(this);
  }

  /**
   * Sets the draw callback function
   * @param {Function} callback - Draw function to run each frame
   * @returns {DotApp} - Returns self for chaining
   */
  draw(callback) {
    if (typeof callback !== 'function') {
      throw new Error('draw() callback must be a function');
    }

    this.drawCallback = callback;
    this.start();
    return this;
  }

  /**
   * Starts the animation loop
   * @returns {DotApp} - Returns self for chaining
   */
  start() {
    if (this.isRunning) {
      logger$e.warn('App is already running');
      return this;
    }

    logger$e.log('Starting animation loop');
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastFrameTime = performance.now();
    this.tick();
    this.rafId = window.setInterval(() => {
      this.tick(performance.now());
    }, this.frameDuration);
    return this;
  }

  /**
   * Stops the animation loop
   * @returns {DotApp} - Returns self for chaining
   */
  stop() {
    if (!this.isRunning) {
      logger$e.warn('App is not running');
      return this;
    }

    logger$e.log('Stopping animation loop');
    this.isRunning = false;

    if (this.rafId) {
      clearInterval(this.rafId);
      this.rafId = null;
    }

    return this;
  }

  /**
   * The main animation loop
   * @private
   */
  loop(timestamp = performance.now()) {
    if (!this.isRunning) return;
    this.tick(timestamp);
  }

  tick(timestamp = performance.now()) {
    if (!this.isRunning) return;

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed >= this.frameDuration) {
      // Run the draw callback
      if (this.drawCallback) {
        try {
          this.drawCallback();
        } catch (err) {
          logger$e.error('Error in draw callback:', err);
          this.stop();
          return;
        }
      }

      if (this.context) {
        this.renderFrame();
      }

      this.frameCount++;
      this.lastFrameTime = timestamp;
    }

    // Interval scheduling is handled by start()
  }

  getCanvasContext(canvas) {
    if (!canvas) return null;
    try {
      return canvas.getContext('2d');
    } catch (err) {
      logger$e.warn('Unable to get 2D context from canvas, retrying with a fresh canvas.', err);
      return null;
    }
  }

  renderFrame() {
    if (!this.canvas) return;
    if (!this.context) {
      this.context = this.getCanvasContext(this.canvas);
    }
    if (!this.context) return;

    const ctx = this.context;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);

    if (this.config && this.config.background) {
      ctx.fillStyle = this.config.background;
      ctx.fillRect(0, 0, width, height);
    }

    for (const shape of this.shapes) {
      this.drawShape(ctx, shape);
    }
  }

  addShape(shape) {
    if (!shape) return this;
    this.shapes.push(shape);
    if (shape && shape.refKey) {
      this.refs.set(shape.refKey, shape);
    }
    return this;
  }

  registerRef(key, shape) {
    if (!key || !shape) return;
    this.refs.set(key, shape);
  }

  getRef(key) {
    if (!key) return null;
    if (this.refs.has(key)) {
      return this.refs.get(key);
    }

    for (const shape of this.shapes) {
      if (shape && shape.refKey === key) {
        this.refs.set(key, shape);
        return shape;
      }
    }

    return null;
  }

  drawShape(ctx, shape) {
    if (!shape) return;

    if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.params.x, shape.params.y, shape.params.radius, 0, Math.PI * 2);
      if (shape.style && shape.style.fill) {
        ctx.fillStyle = shape.style.fill;
        ctx.fill();
      }
      if (shape.style && shape.style.stroke) {
        ctx.strokeStyle = shape.style.stroke;
        ctx.lineWidth = shape.style.strokeWidth || 1;
        ctx.stroke();
      }
      return;
    }

    if (shape.type === 'rect') {
      if (shape.params.cornerRadius > 0) {
        this.drawRoundedRect(ctx, shape);
      } else {
        ctx.beginPath();
        ctx.rect(shape.params.x, shape.params.y, shape.params.width, shape.params.height);
      }
      if (shape.style && shape.style.fill) {
        ctx.fillStyle = shape.style.fill;
        ctx.fill();
      }
      if (shape.style && shape.style.stroke) {
        ctx.strokeStyle = shape.style.stroke;
        ctx.lineWidth = shape.style.strokeWidth || 1;
        ctx.stroke();
      }
      return;
    }

    if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      ctx.lineTo(shape.points[1].x, shape.points[1].y);
      ctx.strokeStyle = shape.style.stroke || '#ffffff';
      ctx.lineWidth = shape.style.strokeWidth || 1;
      ctx.stroke();
      return;
    }

    if (shape.type === 'polygon') {
      if (!shape.points || shape.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      ctx.closePath();
      if (shape.style && shape.style.fill) {
        ctx.fillStyle = shape.style.fill;
        ctx.fill();
      }
      if (shape.style && shape.style.stroke) {
        ctx.strokeStyle = shape.style.stroke;
        ctx.lineWidth = shape.style.strokeWidth || 1;
        ctx.stroke();
      }
    }
  }

  drawRoundedRect(ctx, shape) {
    const { x, y, width, height, cornerRadius } = shape.params;
    const r = Math.min(cornerRadius, Math.min(width, height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  /**
   * Gets the current canvas element
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Gets the worker instance
   * @returns {Worker}
   */
  getWorker() {
    return this.worker;
  }

  /**
   * Gets the config
   * @returns {Object}
   */
  getConfig() {
    return this.config;
  }

  /**
   * Gets the current FPS
   * @returns {number}
   */
  getFPS() {
    if (this.frameCount === 0) return 0;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return this.frameCount / elapsed;
  }

  /**
   * Resizes the canvas
   * @param {number} width - New width
   * @param {number} height - New height
   * @returns {DotApp} - Returns self for chaining
   */
  resize(width, height) {
    if (typeof width !== 'number' || width <= 0) {
      throw new Error('width must be a positive number');
    }
    if (typeof height !== 'number' || height <= 0) {
      throw new Error('height must be a positive number');
    }

    this.config.width = width;
    this.config.height = height;

    const pixelRatio = this.config.pixelRatio || 1;
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Send resize to worker
    this.bridge.send({
      type: 'RESIZE_CANVAS',
      width,
      height,
      pixelRatio,
    });

    return this;
  }

  /**
   * Destroys the app and cleans up resources
   */
  destroy() {
    this.stop();

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
    }

    // Remove canvas if we created it
    if (this.canvas && this.canvas.parentNode) {
      // Only remove if we created it (check if it has dotjs attribute)
      if (this.canvas.dataset && this.canvas.dataset.dotjs === 'true') {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }

    this.isRunning = false;
    this.drawCallback = null;
    logger$e.log('App destroyed');
  }
};

var DotApp_1 = DotApp$3;

// src/core/config.js
// Configuration validation and defaults

const DEFAULT_CONFIG$2 = {
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
function validateConfig$3(userConfig = {}) {
  const config = { ...DEFAULT_CONFIG$2, ...userConfig };

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
    config.pixelRatio = DEFAULT_CONFIG$2.pixelRatio;
  }

  // Validate fps
  if (typeof config.fps !== 'number' || config.fps <= 0) {
    config.fps = DEFAULT_CONFIG$2.fps;
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
function prepareCanvas$1(config) {
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

var config = {
  DEFAULT_CONFIG: DEFAULT_CONFIG$2,
  validateConfig: validateConfig$3,
  prepareCanvas: prepareCanvas$1,
};

// src/core/createCanvas.js
// Factory function that creates the app

const DotApp$2 = DotApp_1;
const { validateConfig: validateConfig$2, prepareCanvas } = config;
const { defaultLogger: logger$d } = logger$f;

function setActiveAppForRuntime(app) {
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
function createCanvas$2(width, height, config = {}) {
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
  const validatedConfig = validateConfig$2(userConfig);
  logger$d.log('Creating canvas with config:', validatedConfig);

  // Prepare canvas
  const { canvas } = prepareCanvas(validatedConfig);
  canvas.dataset.dotjs = 'true';

  // Create app instance with a simple main-thread fallback
  const app = new DotApp$2({
    worker: null,
    bridge: null,
    canvas,
    config: validatedConfig,
  });

  logger$d.log('Canvas created successfully');

  setActiveAppForRuntime(app);

  // Store reference for debugging
  if (typeof window !== 'undefined') {
    window.__dotjs_app = app;
  }

  return app;
}

var createCanvas_1 = createCanvas$2;

// src/core/index.js
// Export core functionality

const createCanvas$1 = createCanvas_1;
const DotApp$1 = DotApp_1;
const { DEFAULT_CONFIG: DEFAULT_CONFIG$1, validateConfig: validateConfig$1 } = config;

var core = {
  createCanvas: createCanvas$1,
  DotApp: DotApp$1,
  DEFAULT_CONFIG: DEFAULT_CONFIG$1,
  validateConfig: validateConfig$1,
};

// src/bridge/commands.js
// Command constants shared between main and worker

// Command types
const COMMANDS$6 = {
  // Initialization
  INIT: 'INIT',
  
  // Shape operations
  ADD_SHAPE: 'ADD_SHAPE',
  REMOVE_SHAPE: 'REMOVE_SHAPE',
  UPDATE_SHAPE: 'UPDATE_SHAPE',
  GET_SHAPE: 'GET_SHAPE',
  
  // Style operations
  SET_STYLE: 'SET_STYLE',
  GET_STYLE: 'GET_STYLE',
  
  // Join & Group operations
  JOIN_SHAPES: 'JOIN_SHAPES',
  GROUP_SHAPES: 'GROUP_SHAPES',
  UNGROUP_SHAPES: 'UNGROUP_SHAPES',
  
  // Transform operations
  TRANSFORM_SHAPE: 'TRANSFORM_SHAPE',
  TRANSFORM_GROUP: 'TRANSFORM_GROUP',
  
  // Rendering
  RENDER_FRAME: 'RENDER_FRAME',
  RESIZE_CANVAS: 'RESIZE_CANVAS',
  
  // Events
  MOUSE_EVENT: 'MOUSE_EVENT',
  KEYBOARD_EVENT: 'KEYBOARD_EVENT',
  
  // Registry operations
  REGISTRY_GET: 'REGISTRY_GET',
  REGISTRY_SET: 'REGISTRY_SET',
  REGISTRY_HAS: 'REGISTRY_HAS',
  REGISTRY_DELETE: 'REGISTRY_DELETE',
  
  // Response types
  RESPONSE: 'RESPONSE',
  ERROR: 'ERROR',
};

// Shape types
const SHAPE_TYPES$8 = {
  CIRCLE: 'circle',
  RECT: 'rect',
  LINE: 'line',
  POLYGON: 'polygon',
  TEXT: 'text',
  BEZIER: 'bezier',
  JOIN: 'join',
};

// Style properties
const STYLE_PROPS$2 = {
  FILL: 'fill',
  STROKE: 'stroke',
  STROKE_WIDTH: 'strokeWidth',
  OPACITY: 'opacity',
  BLEND_MODE: 'blendMode',
};

// Event types
const EVENT_TYPES$3 = {
  MOUSE_MOVE: 'mousemove',
  MOUSE_DOWN: 'mousedown',
  MOUSE_UP: 'mouseup',
  MOUSE_CLICK: 'click',
  MOUSE_ENTER: 'mouseenter',
  MOUSE_LEAVE: 'mouseleave',
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  KEY_PRESS: 'keypress',
};

// Default styles
const DEFAULT_STYLES$3 = {
  fill: '#000000',
  stroke: null,
  strokeWidth: 1,
  opacity: 1,
  blendMode: 'source-over',
};

var commands = {
  COMMANDS: COMMANDS$6,
  SHAPE_TYPES: SHAPE_TYPES$8,
  STYLE_PROPS: STYLE_PROPS$2,
  EVENT_TYPES: EVENT_TYPES$3,
  DEFAULT_STYLES: DEFAULT_STYLES$3,
};

// src/shapes/circle.js
// Circle factory function

const { SHAPE_TYPES: SHAPE_TYPES$7 } = commands;
const { defaultLogger: logger$c } = logger$f;

/**
 * Creates a circle shape
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} radius - Radius of the circle
 * @param {Object} options - Additional options
 * @param {number} options.segments - Number of segments (default: 32)
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function circle$2(x, y, radius, options = {}) {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof radius !== 'number') {
    throw new Error('circle() requires x, y, and radius as numbers');
  }

  if (radius <= 0) {
    throw new Error('circle() radius must be greater than 0');
  }

  const segments = options.segments || 32;
  const points = [];
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES$7.CIRCLE,
    params: { x, y, radius, segments },
    points: points,
    buffer: null, // Will be set when sent to worker
    style: {
      fill: options.fill || null,
      stroke: options.stroke || null,
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    /**
     * Set a reference key for this shape
     * @param {string} key - Unique identifier
     * @returns {Object} - Returns self for chaining
     */
    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    /**
     * Set fill color
     * @param {string} color - Fill color (hex, rgb, or named)
     * @returns {Object} - Returns self for chaining
     */
    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    /**
     * Set stroke color and width
     * @param {string} color - Stroke color
     * @param {number} width - Stroke width
     * @returns {Object} - Returns self for chaining
     */
    stroke(color, width) {
      this.style.stroke = color || '#000000';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#000000' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    /**
     * Set opacity
     * @param {number} opacity - Opacity (0-1)
     * @returns {Object} - Returns self for chaining
     */
    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    /**
     * Apply wavy deformation
     * @param {number} amplitude - Wave amplitude
     * @param {number} frequency - Wave frequency
     * @param {string} axis - 'x', 'y', or 'both'
     * @returns {Object} - Returns self for chaining
     */
    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ 
        cmd: 'WAVY', 
        amplitude, 
        frequency, 
        axis 
      });
      return this;
    },

    /**
     * Double the resolution
     * @param {number} iterations - Number of times to double
     * @returns {Object} - Returns self for chaining
     */
    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    /**
     * Translate the shape
     * @param {number} dx - X translation
     * @param {number} dy - Y translation
     * @returns {Object} - Returns self for chaining
     */
    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this.params.x += dx;
      this.params.y += dy;
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    /**
     * Rotate the shape
     * @param {number} angle - Rotation angle in radians
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      const originX = typeof cx === 'number' ? cx : this.params.x;
      const originY = typeof cy === 'number' ? cy : this.params.y;
      this.points = this.points.map(point => {
        const dx = point.x - originX;
        const dy = point.y - originY;
        return {
          x: originX + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: originY + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      });
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    /**
     * Scale the shape
     * @param {number} sx - X scale
     * @param {number} sy - Y scale
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      const originX = typeof cx === 'number' ? cx : this.params.x;
      const originY = typeof cy === 'number' ? cy : this.params.y;
      this.points = this.points.map(point => ({
        x: originX + (point.x - originX) * sx,
        y: originY + (point.y - originY) * sy,
      }));
      this.params.radius *= Math.max(sx, sy);
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    /**
     * Get the shape's data for sending to worker
     * @returns {Object} - Shape data
     */
    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
      };
    },

    /**
     * Mark as registered (internal)
     * @private
     */
    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    /**
     * Check if shape is registered
     * @returns {boolean}
     */
    isRegistered() {
      return this._isRegistered;
    },

    /**
     * Get the reference key
     * @returns {string|null}
     */
    getRef() {
      return this.refKey;
    },

    /**
     * Clone the shape
     * @returns {Object} - New shape instance
     */
    clone() {
      const newCircle = circle$2(this.params.x, this.params.y, this.params.radius, {
        segments: this.params.segments,
        fill: this.style.fill,
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newCircle.setRef(this.refKey + '_clone');
      }
      return newCircle;
    }
  };

  // Store original params for potential updates
  shape._originalParams = { x, y, radius };

  return shape;
}

/**
 * Update circle parameters (internal use)
 * @param {Object} shape - Circle shape
 * @param {Object} params - New parameters
 * @returns {Object} - Updated shape
 */
function updateCircle$1(shape, params) {
  const { x, y, radius } = params;
  const segments = shape.params.segments || 32;
  const points = [];
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  shape.points = points;
  shape.params = { x, y, radius, segments };
  shape._originalParams = { x, y, radius };
  return shape;
}

var circle_1 = {
  circle: circle$2,
  updateCircle: updateCircle$1,
};

// src/shapes/rect.js
// Rectangle factory function

const { SHAPE_TYPES: SHAPE_TYPES$6 } = commands;

/**
 * Creates a rectangle shape
 * @param {number} x - Top-left X position
 * @param {number} y - Top-left Y position
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @param {Object} options - Additional options
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {number} options.cornerRadius - Corner radius (for rounded rect)
 * @returns {Object} - Shape object with chainable methods
 */
function rect$2(x, y, width, height, options = {}) {
  if (typeof x !== 'number' || typeof y !== 'number' || 
      typeof width !== 'number' || typeof height !== 'number') {
    throw new Error('rect() requires x, y, width, and height as numbers');
  }

  if (width <= 0 || height <= 0) {
    throw new Error('rect() width and height must be greater than 0');
  }

  let points = [];
  const cornerRadius = options.cornerRadius || 0;

  if (cornerRadius > 0) {
    // Rounded rectangle
    const r = Math.min(cornerRadius, Math.min(width, height) / 2);
    const segments = 8; // Segments per corner
    
    // Helper to add arc points
    function addArc(cx, cy, radius, startAngle, endAngle) {
      const steps = segments;
      const angleStep = (endAngle - startAngle) / steps;
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + i * angleStep;
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }
    }

    // Top-left corner
    addArc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    // Top-right corner
    addArc(x + width - r, y + r, r, Math.PI * 1.5, Math.PI * 2);
    // Bottom-right corner
    addArc(x + width - r, y + height - r, r, 0, Math.PI / 2);
    // Bottom-left corner
    addArc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
  } else {
    // Regular rectangle
    points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES$6.RECT,
    params: { x, y, width, height, cornerRadius },
    points: points,
    buffer: null,
    style: {
      fill: options.fill || null,
      stroke: options.stroke || null,
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    stroke(color, width) {
      this.style.stroke = color || '#000000';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#000000' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
      return this;
    },

    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this.params.x += dx;
      this.params.y += dy;
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      const originX = typeof cx === 'number' ? cx : this.params.x;
      const originY = typeof cy === 'number' ? cy : this.params.y;
      this.points = this.points.map(point => {
        const dx = point.x - originX;
        const dy = point.y - originY;
        return {
          x: originX + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: originY + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      });
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      const originX = typeof cx === 'number' ? cx : this.params.x;
      const originY = typeof cy === 'number' ? cy : this.params.y;
      this.points = this.points.map(point => ({
        x: originX + (point.x - originX) * sx,
        y: originY + (point.y - originY) * sy,
      }));
      this.params.width *= sx;
      this.params.height *= sy;
      this.params.x = this.points[0] ? this.points[0].x : this.params.x;
      this.params.y = this.points[0] ? this.points[0].y : this.params.y;
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
      };
    },

    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    isRegistered() {
      return this._isRegistered;
    },

    getRef() {
      return this.refKey;
    },

    clone() {
      const newRect = rect$2(this.params.x, this.params.y, this.params.width, this.params.height, {
        cornerRadius: this.params.cornerRadius,
        fill: this.style.fill,
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newRect.setRef(this.refKey + '_clone');
      }
      return newRect;
    }
  };

  return shape;
}

var rect_1 = {
  rect: rect$2,
};

// src/shapes/line.js
// Line factory function

const { SHAPE_TYPES: SHAPE_TYPES$5 } = commands;

/**
 * Creates a line shape
 * @param {number} x1 - Start X position
 * @param {number} y1 - Start Y position
 * @param {number} x2 - End X position
 * @param {number} y2 - End Y position
 * @param {Object} options - Additional options
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function line$2(x1, y1, x2, y2, options = {}) {
  if (typeof x1 !== 'number' || typeof y1 !== 'number' || 
      typeof x2 !== 'number' || typeof y2 !== 'number') {
    throw new Error('line() requires x1, y1, x2, and y2 as numbers');
  }

  const points = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ];

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES$5.LINE,
    params: { x1, y1, x2, y2 },
    points: points,
    buffer: null,
    style: {
      fill: null, // Lines don't have fill
      stroke: options.stroke || '#ffffff',
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    stroke(color, width) {
      this.style.stroke = color || '#ffffff';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#ffffff' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    /**
     * Convert line to bezier curve
     * @param {Array} controlPoints - Control points for bezier
     * @returns {Object} - Returns self for chaining
     */
    bezier(...controlPoints) {
      if (controlPoints.length === 0) {
        throw new Error('bezier() requires at least one control point');
      }
      this._pendingCommands.push({ cmd: 'BEZIER', points: controlPoints });
      return this;
    },

    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
      return this;
    },

    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      const originX = typeof cx === 'number' ? cx : this.points[0].x;
      const originY = typeof cy === 'number' ? cy : this.points[0].y;
      this.points = this.points.map(point => {
        const dx = point.x - originX;
        const dy = point.y - originY;
        return {
          x: originX + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: originY + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      });
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      const originX = typeof cx === 'number' ? cx : this.points[0].x;
      const originY = typeof cy === 'number' ? cy : this.points[0].y;
      this.points = this.points.map(point => ({
        x: originX + (point.x - originX) * sx,
        y: originY + (point.y - originY) * sy,
      }));
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
      };
    },

    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    isRegistered() {
      return this._isRegistered;
    },

    getRef() {
      return this.refKey;
    },

    clone() {
      const newLine = line$2(this.params.x1, this.params.y1, this.params.x2, this.params.y2, {
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newLine.setRef(this.refKey + '_clone');
      }
      return newLine;
    }
  };

  return shape;
}

var line_1 = {
  line: line$2,
};

// src/shapes/polygon.js
// Custom polygon factory function

const { SHAPE_TYPES: SHAPE_TYPES$4 } = commands;

/**
 * Creates a custom polygon shape from points
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {Object} options - Additional options
 * @param {boolean} options.isClosed - Whether polygon is closed (default: true)
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function createPolygon$2(points, options = {}) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('createPolygon() requires an array of at least 3 points');
  }

  // Validate points
  for (const p of points) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') {
      throw new Error('Each point must have x and y properties as numbers');
    }
  }

  const isClosed = options.isClosed !== undefined ? options.isClosed : true;

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES$4.POLYGON,
    params: { points: points.slice(), isClosed },
    points: points.slice(),
    buffer: null,
    style: {
      fill: options.fill || null,
      stroke: options.stroke || null,
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    stroke(color, width) {
      this.style.stroke = color || '#000000';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#000000' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    /**
     * Add a point to the polygon
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} - Returns self for chaining
     */
    addPoint(x, y) {
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('addPoint() requires x and y as numbers');
      }
      this.points.push({ x, y });
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'ADD_POINT', x, y });
      return this;
    },

    /**
     * Remove a point from the polygon
     * @param {number} index - Index of point to remove
     * @returns {Object} - Returns self for chaining
     */
    removePoint(index) {
      if (typeof index !== 'number' || index < 0 || index >= this.points.length) {
        throw new Error('removePoint() requires a valid index');
      }
      this.points.splice(index, 1);
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'REMOVE_POINT', index });
      return this;
    },

    /**
     * Insert a point at a specific index
     * @param {number} index - Index to insert at
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} - Returns self for chaining
     */
    insertPoint(index, x, y) {
      if (typeof index !== 'number' || index < 0 || index > this.points.length) {
        throw new Error('insertPoint() requires a valid index');
      }
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('insertPoint() requires x and y as numbers');
      }
      this.points.splice(index, 0, { x, y });
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'INSERT_POINT', index, x, y });
      return this;
    },

    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
      return this;
    },

    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this.points = this.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      const originX = typeof cx === 'number' ? cx : this.points[0].x;
      const originY = typeof cy === 'number' ? cy : this.points[0].y;
      this.points = this.points.map(point => {
        const dx = point.x - originX;
        const dy = point.y - originY;
        return {
          x: originX + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: originY + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      });
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      const originX = typeof cx === 'number' ? cx : this.points[0].x;
      const originY = typeof cy === 'number' ? cy : this.points[0].y;
      this.points = this.points.map(point => ({
        x: originX + (point.x - originX) * sx,
        y: originY + (point.y - originY) * sy,
      }));
      this.params.points = this.points.slice();
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
      };
    },

    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    isRegistered() {
      return this._isRegistered;
    },

    getRef() {
      return this.refKey;
    },

    clone() {
      const newPolygon = createPolygon$2(this.points.slice(), {
        isClosed: this.params.isClosed,
        fill: this.style.fill,
        stroke: this.style.stroke,
        strokeWidth: this.style.strokeWidth,
        opacity: this.style.opacity,
      });
      if (this.refKey) {
        newPolygon.setRef(this.refKey + '_clone');
      }
      return newPolygon;
    }
  };

  return shape;
}

// Export with clear names
var polygon$2 = {
  createPolygon: createPolygon$2,
  // Alias for backward compatibility
  polygon: createPolygon$2,
};

// src/shapes/bezier.js
// Bezier curve shape factory

const { SHAPE_TYPES: SHAPE_TYPES$3 } = commands;

/**
 * Calculate a point on a cubic bezier curve
 * @param {number} t - Parameter (0-1)
 * @param {number} p0 - Start point
 * @param {number} p1 - Control point 1
 * @param {number} p2 - Control point 2
 * @param {number} p3 - End point
 * @returns {number} - Point on curve
 */
function cubicBezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 
         3 * u * u * t * p1 + 
         3 * u * t * t * p2 + 
         t * t * t * p3;
}

/**
 * Calculate a point on a quadratic bezier curve
 * @param {number} t - Parameter (0-1)
 * @param {number} p0 - Start point
 * @param {number} p1 - Control point
 * @param {number} p2 - End point
 * @returns {number} - Point on curve
 */
function quadraticBezier(t, p0, p1, p2) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * Creates a bezier curve shape
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} cx1 - Control point 1 X
 * @param {number} cy1 - Control point 1 Y
 * @param {number} cx2 - Control point 2 X (optional for cubic)
 * @param {number} cy2 - Control point 2 Y (optional for cubic)
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {Object} options - Additional options
 * @param {number} options.segments - Number of segments (default: 20)
 * @param {boolean} options.isClosed - Whether curve is closed (default: false)
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @returns {Object} - Shape object with chainable methods
 */
function bezier$2(x1, y1, cx1, cy1, cx2, cy2, x2, y2, options = {}) {
  // Determine if it's cubic or quadratic
  const isCubic = arguments.length >= 8;
  
  // Validate arguments
  if (typeof x1 !== 'number' || typeof y1 !== 'number' ||
      typeof cx1 !== 'number' || typeof cy1 !== 'number' ||
      typeof x2 !== 'number' || typeof y2 !== 'number') {
    throw new Error('bezier() requires x1, y1, cx1, cy1, x2, y2 as numbers');
  }

  const segments = options.segments || 20;
  const isClosed = options.isClosed || false;
  const points = [];

  if (isCubic) {
    // Cubic bezier
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push({
        x: cubicBezier(t, x1, cx1, cx2, x2),
        y: cubicBezier(t, y1, cy1, cy2, y2),
      });
    }
  } else {
    // Quadratic bezier (cx2, cy2 are the control point)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push({
        x: quadraticBezier(t, x1, cx1, cx2),
        y: quadraticBezier(t, y1, cy1, cy2),
      });
    }
  }

  // Create the shape object with chainable methods
  const shape = {
    type: SHAPE_TYPES$3.BEZIER,
    params: { 
      x1, y1, cx1, cy1, cx2, cy2, x2, y2, 
      segments, isClosed, 
      isCubic 
    },
    points: points,
    buffer: null,
    style: {
      fill: options.fill || null,
      stroke: options.stroke || '#ffffff',
      strokeWidth: options.strokeWidth || 1,
      opacity: options.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,

    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      return this;
    },

    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    stroke(color, width) {
      this.style.stroke = color || '#ffffff';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#ffffff' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
      return this;
    },

    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
      };
    },

    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    isRegistered() {
      return this._isRegistered;
    },

    getRef() {
      return this.refKey;
    },

    clone() {
      const params = this.params;
      let newBezier;
      if (params.isCubic) {
        newBezier = bezier$2(
          params.x1, params.y1,
          params.cx1, params.cy1,
          params.cx2, params.cy2,
          params.x2, params.y2,
          {
            segments: params.segments,
            isClosed: params.isClosed,
            fill: this.style.fill,
            stroke: this.style.stroke,
            strokeWidth: this.style.strokeWidth,
            opacity: this.style.opacity,
          }
        );
      } else {
        newBezier = bezier$2(
          params.x1, params.y1,
          params.cx1, params.cy1,
          params.x2, params.y2,
          {
            segments: params.segments,
            isClosed: params.isClosed,
            fill: this.style.fill,
            stroke: this.style.stroke,
            strokeWidth: this.style.strokeWidth,
            opacity: this.style.opacity,
          }
        );
      }
      if (this.refKey) {
        newBezier.setRef(this.refKey + '_clone');
      }
      return newBezier;
    }
  };

  return shape;
}

/**
 * Create a cubic bezier curve (convenience function)
 */
function cubicBezierCurve$2(x1, y1, cx1, cy1, cx2, cy2, x2, y2, options = {}) {
  return bezier$2(x1, y1, cx1, cy1, cx2, cy2, x2, y2, options);
}

/**
 * Create a quadratic bezier curve (convenience function)
 */
function quadraticBezierCurve$2(x1, y1, cx1, cy1, x2, y2, options = {}) {
  return bezier$2(x1, y1, cx1, cy1, x2, y2, options);
}

var bezier_1 = {
  bezier: bezier$2,
  cubicBezierCurve: cubicBezierCurve$2,
  quadraticBezierCurve: quadraticBezierCurve$2};

// src/shapes/index.js
// Export all shape factories

const { circle: circle$1, updateCircle } = circle_1;
const { rect: rect$1 } = rect_1;
const { line: line$1 } = line_1;
const { createPolygon: createPolygon$1, polygon: polygon$1 } = polygon$2; 
const { bezier: bezier$1, cubicBezierCurve: cubicBezierCurve$1, quadraticBezierCurve: quadraticBezierCurve$1 } = bezier_1;

var shapes = {
  circle: circle$1,
  rect: rect$1,
  line: line$1,
  polygon: polygon$1,
  createPolygon: createPolygon$1,
  bezier: bezier$1,
  cubicBezierCurve: cubicBezierCurve$1,
  quadraticBezierCurve: quadraticBezierCurve$1,
};

// src/utils/buffers.js
// Float32Array helpers

/**
 * Creates a new Float32Array from coordinates
 * @param {number[]} coords - Flat array of x,y coordinates
 * @returns {Float32Array}
 */
function createBuffer$1(coords) {
  return new Float32Array(coords);
}

/**
 * Concatenates two Float32Arrays into one
 * @param {Float32Array} a - First buffer
 * @param {Float32Array} b - Second buffer
 * @returns {Float32Array} - New concatenated buffer
 */
function concatBuffers$1(a, b) {
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
function copyBuffer$1(buffer) {
  return new Float32Array(buffer);
}

/**
 * Gets vertex count from buffer (2 floats per vertex)
 * @param {Float32Array} buffer
 * @returns {number}
 */
function getVertexCount$1(buffer) {
  return buffer.length / 2;
}

/**
 * Gets vertex at index
 * @param {Float32Array} buffer
 * @param {number} index - Vertex index (0-based)
 * @returns {{x: number, y: number}}
 */
function getVertex$1(buffer, index) {
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
function setVertex$1(buffer, index, x, y) {
  const i = index * 2;
  buffer[i] = x;
  buffer[i + 1] = y;
}

/**
 * Extracts coordinates as array of {x, y} objects
 * @param {Float32Array} buffer
 * @returns {Array<{x: number, y: number}>}
 */
function bufferToPoints$1(buffer) {
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
function pointsToBuffer$2(points) {
  const buffer = new Float32Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    buffer[i * 2] = points[i].x;
    buffer[i * 2 + 1] = points[i].y;
  }
  return buffer;
}

var buffers$1 = {
  createBuffer: createBuffer$1,
  concatBuffers: concatBuffers$1,
  copyBuffer: copyBuffer$1,
  getVertexCount: getVertexCount$1,
  getVertex: getVertex$1,
  setVertex: setVertex$1,
  bufferToPoints: bufferToPoints$1,
  pointsToBuffer: pointsToBuffer$2,
};

// src/operations/join.js
// Join multiple shapes into a single path

const { SHAPE_TYPES: SHAPE_TYPES$2 } = commands;
const { defaultLogger: logger$b } = logger$f;
const { pointsToBuffer: pointsToBuffer$1 } = buffers$1;

/**
 * Join multiple shapes into a single polygon
 * @param {...Object} shapes - Shapes to join
 * @returns {Object} - Joined shape with chainable methods
 * 
 * @example
 * const shape1 = circle(100, 100, 50);
 * const shape2 = rect(200, 100, 50, 50);
 * const joined = join(shape1, shape2).setRef('combined');
 */
function join$2(...shapes) {
  if (shapes.length < 2) {
    throw new Error('join() requires at least 2 shapes');
  }

  // Collect all points from all shapes
  let allPoints = [];
  shapes[shapes.length - 1];
  let combinedStyle = {
    fill: null,
    stroke: null,
    strokeWidth: 1,
    opacity: 1,
  };

  // Process each shape
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    
    // Validate shape
    if (!shape || !shape.points || !Array.isArray(shape.points)) {
      throw new Error(`Shape at index ${i} is invalid or missing points`);
    }

    // Get points from the shape
    let points = shape.points;
    
    // If shape has pending commands, we need to process them
    // For now, just use the current points
    if (shape._pendingCommands && shape._pendingCommands.length > 0) {
      logger$b.warn(`Shape ${i} has pending commands - they will be ignored in join. Register the shape first.`);
    }

    // Add points to collection
    allPoints = allPoints.concat(points);

    // Merge style (use style from last shape that has it)
    if (shape.style) {
      if (shape.style.fill !== null && shape.style.fill !== undefined) {
        combinedStyle.fill = shape.style.fill;
      }
      if (shape.style.stroke !== null && shape.style.stroke !== undefined) {
        combinedStyle.stroke = shape.style.stroke;
      }
      if (shape.style.strokeWidth !== undefined) {
        combinedStyle.strokeWidth = shape.style.strokeWidth;
      }
      if (shape.style.opacity !== undefined) {
        combinedStyle.opacity = shape.style.opacity;
      }
    }
  }

  // Create the joined shape object
  const joinedShape = {
    type: SHAPE_TYPES$2.JOIN,
    params: { 
      originalShapes: shapes.map(s => s.type || 'unknown'),
      totalPoints: allPoints.length,
    },
    points: allPoints,
    buffer: null,
    style: {
      fill: combinedStyle.fill || '#000000',
      stroke: combinedStyle.stroke || null,
      strokeWidth: combinedStyle.strokeWidth || 1,
      opacity: combinedStyle.opacity || 1,
    },
    refKey: null,
    _pendingCommands: [],
    _isRegistered: false,
    _isJoined: true,
    _originalShapes: shapes,

    /**
     * Set a reference key for this joined shape
     * @param {string} key - Unique identifier
     * @returns {Object} - Returns self for chaining
     */
    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      this._pendingCommands.push({ cmd: 'SET_REF', key });
      
      // Also register the join operation
      this._pendingCommands.push({ 
        cmd: 'JOIN', 
        shapeKeys: shapes.map(s => s.refKey).filter(k => k !== null)
      });
      return this;
    },

    /**
     * Set fill color
     * @param {string} color - Fill color
     * @returns {Object} - Returns self for chaining
     */
    fill(color) {
      this.style.fill = color || '#000000';
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'fill', value: color || '#000000' });
      return this;
    },

    /**
     * Set stroke color and width
     * @param {string} color - Stroke color
     * @param {number} width - Stroke width
     * @returns {Object} - Returns self for chaining
     */
    stroke(color, width) {
      this.style.stroke = color || '#000000';
      if (width !== undefined) {
        this.style.strokeWidth = width;
      }
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'stroke', value: color || '#000000' });
      if (width !== undefined) {
        this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'strokeWidth', value: width });
      }
      return this;
    },

    /**
     * Set opacity
     * @param {number} opacity - Opacity (0-1)
     * @returns {Object} - Returns self for chaining
     */
    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      this.style.opacity = opacity;
      this._pendingCommands.push({ cmd: 'SET_STYLE', prop: 'opacity', value: opacity });
      return this;
    },

    /**
     * Apply wavy deformation
     * @param {number} amplitude - Wave amplitude
     * @param {number} frequency - Wave frequency
     * @param {string} axis - 'x', 'y', or 'both'
     * @returns {Object} - Returns self for chaining
     */
    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      this._pendingCommands.push({ cmd: 'WAVY', amplitude, frequency, axis });
      return this;
    },

    /**
     * Double the resolution
     * @param {number} iterations - Number of times to double
     * @returns {Object} - Returns self for chaining
     */
    double(iterations = 1) {
      if (typeof iterations !== 'number' || iterations < 1) {
        throw new Error('double() requires iterations >= 1');
      }
      this._pendingCommands.push({ cmd: 'DOUBLE', iterations });
      return this;
    },

    /**
     * Translate the joined shape
     * @param {number} dx - X translation
     * @param {number} dy - Y translation
     * @returns {Object} - Returns self for chaining
     */
    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      this._pendingCommands.push({ cmd: 'TRANSLATE', dx, dy });
      return this;
    },

    /**
     * Rotate the joined shape
     * @param {number} angle - Rotation angle in radians
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      this._pendingCommands.push({ cmd: 'ROTATE', angle, cx, cy });
      return this;
    },

    /**
     * Scale the joined shape
     * @param {number} sx - X scale
     * @param {number} sy - Y scale
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      this._pendingCommands.push({ cmd: 'SCALE', sx, sy, cx, cy });
      return this;
    },

    /**
     * Get the shape's data for sending to worker
     * @returns {Object} - Shape data
     */
    _getData() {
      return {
        type: this.type,
        params: this.params,
        points: this.points,
        style: this.style,
        refKey: this.refKey,
        commands: this._pendingCommands,
        isJoined: true,
        originalKeys: this._originalShapes.map(s => s.refKey).filter(k => k !== null),
      };
    },

    /**
     * Mark as registered (internal)
     * @private
     */
    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    /**
     * Check if shape is registered
     * @returns {boolean}
     */
    isRegistered() {
      return this._isRegistered;
    },

    /**
     * Get the reference key
     * @returns {string|null}
     */
    getRef() {
      return this.refKey;
    },

    /**
     * Clone the joined shape
     * @returns {Object} - New shape instance
     */
    clone() {
      const clonedShapes = this._originalShapes.map(s => {
        if (s.clone && typeof s.clone === 'function') {
          return s.clone();
        }
        return s;
      });
      
      const newJoined = join$2(...clonedShapes);
      newJoined.style = { ...this.style };
      if (this.refKey) {
        newJoined.setRef(this.refKey + '_clone');
      }
      return newJoined;
    },

    /**
     * Get the original shapes that were joined
     * @returns {Array} - Original shapes
     */
    getOriginalShapes() {
      return this._originalShapes;
    },

    /**
     * Get the total number of points in the joined shape
     * @returns {number}
     */
    getPointCount() {
      return this.points.length;
    }
  };

  return joinedShape;
}

/**
 * Check if a shape is a joined shape
 * @param {Object} shape - Shape to check
 * @returns {boolean}
 */
function isJoined$2(shape) {
  return shape && shape._isJoined === true;
}

/**
 * Explode a joined shape back into its components
 * @param {Object} joinedShape - Joined shape to explode
 * @returns {Array} - Array of original shapes
 */
function explode$2(joinedShape) {
  if (!isJoined$2(joinedShape)) {
    throw new Error('explode() requires a joined shape');
  }
  
  // Return clones of the original shapes
  return joinedShape._originalShapes.map(s => {
    if (s.clone && typeof s.clone === 'function') {
      return s.clone();
    }
    return { ...s };
  });
}

var join_1 = {
  join: join$2,
  isJoined: isJoined$2,
  explode: explode$2,
};

// src/operations/group.js
// Group shapes for batch operations

const { defaultLogger: logger$a } = logger$f;

/**
 * Create a group of shapes for batch operations
 * @param {Object} shapeMap - Object mapping keys to shapes
 * @returns {Object} - Group object with chainable methods
 * 
 * @example
 * const myGroup = group({
 *   shape1: circle(100, 100, 50),
 *   shape2: rect(200, 100, 50, 50)
 * }).setRef('myGroup');
 * 
 * myGroup.fill('#ff0000').translate(10, 10);
 */
function group$2(shapeMap) {
  if (typeof shapeMap !== 'object' || Array.isArray(shapeMap)) {
    throw new Error('group() requires an object mapping keys to shapes');
  }

  const keys = Object.keys(shapeMap);
  if (keys.length === 0) {
    throw new Error('group() requires at least one shape');
  }

  // Validate all values are shapes
  for (const [key, shape] of Object.entries(shapeMap)) {
    if (!shape || !shape.points || !Array.isArray(shape.points)) {
      throw new Error(`Value for key "${key}" is not a valid shape`);
    }
  }

  // Store shape references
  const shapes = { ...shapeMap };
  const shapeKeys = keys;

  // Create the group object
  const groupObj = {
    type: 'group',
    shapes: shapes,
    shapeKeys: shapeKeys,
    refKey: null,
    _isGroup: true,
    _pendingCommands: [],
    _isRegistered: false,

    /**
     * Set a reference key for this group
     * @param {string} key - Unique identifier
     * @returns {Object} - Returns self for chaining
     */
    setRef(key) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('setRef() requires a non-empty string key');
      }
      this.refKey = key;
      
      // Register each shape in the group with prefixed keys
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.setRef) {
          const fullKey = `${key}_${shapeKey}`;
          shape.setRef(fullKey);
        }
      }
      
      this._pendingCommands.push({ 
        cmd: 'GROUP', 
        groupKey: key,
        shapeKeys: this.shapeKeys.map(k => `${key}_${k}`)
      });
      return this;
    },

    /**
     * Apply fill to all shapes in group
     * @param {string} color - Fill color
     * @returns {Object} - Returns self for chaining
     */
    fill(color) {
      const fillColor = color || '#000000';
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.fill) {
          shape.fill(fillColor);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_FILL', color: fillColor });
      return this;
    },

    /**
     * Apply stroke to all shapes in group
     * @param {string} color - Stroke color
     * @param {number} width - Stroke width
     * @returns {Object} - Returns self for chaining
     */
    stroke(color, width) {
      const strokeColor = color || '#000000';
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.stroke) {
          shape.stroke(strokeColor, width);
        }
      }
      this._pendingCommands.push({ 
        cmd: 'GROUP_STROKE', 
        color: strokeColor, 
        width: width || 1 
      });
      return this;
    },

    /**
     * Apply opacity to all shapes in group
     * @param {number} opacity - Opacity (0-1)
     * @returns {Object} - Returns self for chaining
     */
    opacity(opacity) {
      if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
        throw new Error('opacity() requires a number between 0 and 1');
      }
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.opacity) {
          shape.opacity(opacity);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_OPACITY', opacity });
      return this;
    },

    /**
     * Apply wavy deformation to all shapes in group
     * @param {number} amplitude - Wave amplitude
     * @param {number} frequency - Wave frequency
     * @param {string} axis - 'x', 'y', or 'both'
     * @returns {Object} - Returns self for chaining
     */
    wavy(amplitude, frequency = 1, axis = 'both') {
      if (typeof amplitude !== 'number') {
        throw new Error('wavy() requires amplitude as a number');
      }
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.wavy) {
          shape.wavy(amplitude, frequency, axis);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_WAVY', amplitude, frequency, axis });
      return this;
    },

    /**
     * Translate all shapes in group
     * @param {number} dx - X translation
     * @param {number} dy - Y translation
     * @returns {Object} - Returns self for chaining
     */
    translate(dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') {
        throw new Error('translate() requires dx and dy as numbers');
      }
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.translate) {
          shape.translate(dx, dy);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_TRANSLATE', dx, dy });
      return this;
    },

    /**
     * Rotate all shapes in group around a common center
     * @param {number} angle - Rotation angle in radians
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    rotate(angle, cx, cy) {
      if (typeof angle !== 'number') {
        throw new Error('rotate() requires angle as a number');
      }
      
      // Calculate center if not provided
      if (cx === undefined || cy === undefined) {
        const center = this.getCenter();
        cx = center.x;
        cy = center.y;
      }
      
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.rotate) {
          shape.rotate(angle, cx, cy);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_ROTATE', angle, cx, cy });
      return this;
    },

    /**
     * Scale all shapes in group
     * @param {number} sx - X scale
     * @param {number} sy - Y scale
     * @param {number} cx - Center X (optional)
     * @param {number} cy - Center Y (optional)
     * @returns {Object} - Returns self for chaining
     */
    scale(sx, sy, cx, cy) {
      if (typeof sx !== 'number' || typeof sy !== 'number') {
        throw new Error('scale() requires sx and sy as numbers');
      }
      
      // Calculate center if not provided
      if (cx === undefined || cy === undefined) {
        const center = this.getCenter();
        cx = center.x;
        cy = center.y;
      }
      
      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.scale) {
          shape.scale(sx, sy, cx, cy);
        }
      }
      this._pendingCommands.push({ cmd: 'GROUP_SCALE', sx, sy, cx, cy });
      return this;
    },

    /**
     * Get the center of all shapes in the group
     * @returns {{x: number, y: number}} - Center point
     */
    getCenter() {
      let totalX = 0;
      let totalY = 0;
      let count = 0;

      for (const shapeKey of this.shapeKeys) {
        const shape = this.shapes[shapeKey];
        if (shape && shape.points && Array.isArray(shape.points)) {
          for (const p of shape.points) {
            totalX += p.x;
            totalY += p.y;
            count++;
          }
        }
      }

      if (count === 0) {
        return { x: 0, y: 0 };
      }

      return {
        x: totalX / count,
        y: totalY / count,
      };
    },

    /**
     * Get a specific shape from the group
     * @param {string} key - Shape key
     * @returns {Object|null} - Shape or null if not found
     */
    getShape(key) {
      return this.shapes[key] || null;
    },

    /**
     * Get all shape keys in the group
     * @returns {string[]} - Array of shape keys
     */
    getShapeKeys() {
      return [...this.shapeKeys];
    },

    /**
     * Get all shapes in the group
     * @returns {Object} - Object mapping keys to shapes
     */
    getShapes() {
      return { ...this.shapes };
    },

    /**
     * Add a shape to the group
     * @param {string} key - Key for the shape
     * @param {Object} shape - Shape to add
     * @returns {Object} - Returns self for chaining
     */
    addShape(key, shape) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('addShape() requires a non-empty string key');
      }
      if (!shape || !shape.points) {
        throw new Error('addShape() requires a valid shape');
      }
      
      this.shapes[key] = shape;
      this.shapeKeys.push(key);
      
      // If group has a ref, register the new shape
      if (this.refKey) {
        const fullKey = `${this.refKey}_${key}`;
        if (shape.setRef) {
          shape.setRef(fullKey);
        }
      }
      
      this._pendingCommands.push({ cmd: 'GROUP_ADD_SHAPE', key });
      return this;
    },

    /**
     * Remove a shape from the group
     * @param {string} key - Key of shape to remove
     * @returns {Object} - Returns self for chaining
     */
    removeShape(key) {
      if (!this.shapes[key]) {
        logger$a.warn(`Shape "${key}" not found in group`);
        return this;
      }
      
      delete this.shapes[key];
      const index = this.shapeKeys.indexOf(key);
      if (index !== -1) {
        this.shapeKeys.splice(index, 1);
      }
      
      this._pendingCommands.push({ cmd: 'GROUP_REMOVE_SHAPE', key });
      return this;
    },

    /**
     * Get the group's data for sending to worker
     * @returns {Object} - Group data
     */
    _getData() {
      return {
        type: 'group',
        refKey: this.refKey,
        shapeKeys: this.shapeKeys.map(k => this.refKey ? `${this.refKey}_${k}` : k),
        commands: this._pendingCommands,
      };
    },

    /**
     * Mark as registered (internal)
     * @private
     */
    _markRegistered() {
      this._isRegistered = true;
      this._pendingCommands = [];
    },

    /**
     * Check if group is registered
     * @returns {boolean}
     */
    isRegistered() {
      return this._isRegistered;
    },

    /**
     * Get the reference key
     * @returns {string|null}
     */
    getRef() {
      return this.refKey;
    },

    /**
     * Clone the entire group
     * @returns {Object} - New group instance
     */
    clone() {
      const newShapes = {};
      for (const [key, shape] of Object.entries(this.shapes)) {
        if (shape.clone && typeof shape.clone === 'function') {
          newShapes[key] = shape.clone();
        } else {
          newShapes[key] = { ...shape };
        }
      }
      
      const newGroup = group$2(newShapes);
      if (this.refKey) {
        newGroup.setRef(this.refKey + '_clone');
      }
      return newGroup;
    }
  };

  return groupObj;
}

/**
 * Check if an object is a group
 * @param {Object} obj - Object to check
 * @returns {boolean}
 */
function isGroup$2(obj) {
  return obj && obj._isGroup === true;
}

/**
 * Get all shapes from a group as an array
 * @param {Object} groupObj - Group object
 * @returns {Array} - Array of shapes
 */
function getGroupShapes$2(groupObj) {
  if (!isGroup$2(groupObj)) {
    throw new Error('getGroupShapes() requires a group object');
  }
  return Object.values(groupObj.shapes);
}

var group_1 = {
  group: group$2,
  isGroup: isGroup$2,
  getGroupShapes: getGroupShapes$2,
};

// src/operations/transform.js
// Batch transform operations

const { defaultLogger: logger$9 } = logger$f;

/**
 * Apply a transform to a shape or group
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {Function} transformFn - Transform function to apply
 * @returns {Object|Array} - Transformed target
 */
function transform$2(target, transformFn) {
  if (typeof transformFn !== 'function') {
    throw new Error('transform() requires a transform function');
  }

  // Handle group
  if (target._isGroup) {
    const shapes = Object.values(target.shapes);
    for (const shape of shapes) {
      transformFn(shape);
    }
    return target;
  }

  // Handle array of shapes
  if (Array.isArray(target)) {
    for (const shape of target) {
      if (shape && shape.points) {
        transformFn(shape);
      }
    }
    return target;
  }

  // Handle single shape
  if (target && target.points) {
    transformFn(target);
    return target;
  }

  throw new Error('transform() target must be a shape, group, or array of shapes');
}

/**
 * Batch translate multiple shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {number} dx - X translation
 * @param {number} dy - Y translation
 * @returns {Object|Array} - Transformed target
 */
function batchTranslate$2(target, dx, dy) {
  return transform$2(target, (shape) => {
    if (shape.translate && typeof shape.translate === 'function') {
      shape.translate(dx, dy);
    } else {
      // Direct point manipulation
      if (shape.points && Array.isArray(shape.points)) {
        shape.points = shape.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
      }
    }
  });
}

/**
 * Batch rotate multiple shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {number} angle - Rotation angle in radians
 * @param {number} cx - Center X (optional)
 * @param {number} cy - Center Y (optional)
 * @returns {Object|Array} - Transformed target
 */
function batchRotate$2(target, angle, cx, cy) {
  // Calculate common center if not provided
  if (cx === undefined || cy === undefined) {
    const center = getBoundingCenter$2(target);
    cx = center.x;
    cy = center.y;
  }

  return transform$2(target, (shape) => {
    if (shape.rotate && typeof shape.rotate === 'function') {
      shape.rotate(angle, cx, cy);
    } else {
      // Direct point manipulation
      if (shape.points && Array.isArray(shape.points)) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        shape.points = shape.points.map(p => ({
          x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
          y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
        }));
      }
    }
  });
}

/**
 * Batch scale multiple shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @param {number} sx - X scale
 * @param {number} sy - Y scale
 * @param {number} cx - Center X (optional)
 * @param {number} cy - Center Y (optional)
 * @returns {Object|Array} - Transformed target
 */
function batchScale$2(target, sx, sy, cx, cy) {
  // Calculate common center if not provided
  if (cx === undefined || cy === undefined) {
    const center = getBoundingCenter$2(target);
    cx = center.x;
    cy = center.y;
  }

  return transform$2(target, (shape) => {
    if (shape.scale && typeof shape.scale === 'function') {
      shape.scale(sx, sy, cx, cy);
    } else {
      // Direct point manipulation
      if (shape.points && Array.isArray(shape.points)) {
        shape.points = shape.points.map(p => ({
          x: cx + (p.x - cx) * sx,
          y: cy + (p.y - cy) * sy,
        }));
      }
    }
  });
}

/**
 * Get the bounding center of a shape, group, or array of shapes
 * @param {Object|Array} target - Shape, group, or array of shapes
 * @returns {{x: number, y: number}} - Center point
 */
function getBoundingCenter$2(target) {
  let allPoints = [];

  // Collect all points
  if (target._isGroup) {
    // Group
    const shapes = Object.values(target.shapes);
    for (const shape of shapes) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else if (Array.isArray(target)) {
    // Array of shapes
    for (const shape of target) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else if (target.points && Array.isArray(target.points)) {
    // Single shape
    allPoints = target.points;
  } else {
    throw new Error('getBoundingCenter() target must be a shape, group, or array of shapes');
  }

  if (allPoints.length === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

/**
 * Align shapes in a group or array
 * @param {Object|Array} target - Group or array of shapes
 * @param {string} align - 'left', 'right', 'top', 'bottom', 'center', 'middle'
 * @param {number} offset - Offset distance (optional)
 * @returns {Object|Array} - Aligned target
 */
function align$2(target, align, offset = 0) {
  let shapes = [];
  let allPoints = [];

  // Collect shapes and points
  if (target._isGroup) {
    shapes = Object.values(target.shapes);
    for (const shape of shapes) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else if (Array.isArray(target)) {
    shapes = target;
    for (const shape of shapes) {
      if (shape.points && Array.isArray(shape.points)) {
        allPoints = allPoints.concat(shape.points);
      }
    }
  } else {
    throw new Error('align() target must be a group or array of shapes');
  }

  if (shapes.length === 0 || allPoints.length === 0) {
    return target;
  }

  // Calculate bounds
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Calculate alignment offsets
  let dx = 0, dy = 0;

  switch (align) {
    case 'left':
      dx = minX - offset;
      break;
    case 'right':
      dx = maxX - offset;
      break;
    case 'top':
      dy = minY - offset;
      break;
    case 'bottom':
      dy = maxY - offset;
      break;
    case 'center':
      dx = centerX - offset;
      break;
    case 'middle':
      dy = centerY - offset;
      break;
    default:
      throw new Error(`Unknown align option: ${align}`);
  }

  // Apply alignment to each shape
  for (const shape of shapes) {
    if (shape.translate && typeof shape.translate === 'function') {
      shape.translate(dx, dy);
    } else if (shape.points && Array.isArray(shape.points)) {
      shape.points = shape.points.map(p => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
    }
  }

  return target;
}

var transform_1 = {
  transform: transform$2,
  batchTranslate: batchTranslate$2,
  batchRotate: batchRotate$2,
  batchScale: batchScale$2,
  getBoundingCenter: getBoundingCenter$2,
  align: align$2,
};

// src/operations/index.js
// Export all operations

const { join: join$1, isJoined: isJoined$1, explode: explode$1 } = join_1;
const { group: group$1, isGroup: isGroup$1, getGroupShapes: getGroupShapes$1 } = group_1;
const {
  transform: transform$1,
  batchTranslate: batchTranslate$1,
  batchRotate: batchRotate$1,
  batchScale: batchScale$1,
  getBoundingCenter: getBoundingCenter$1,
  align: align$1,
} = transform_1;

var operations = {
  // Join operations
  join: join$1,
  isJoined: isJoined$1,
  explode: explode$1,
  
  // Group operations
  group: group$1,
  isGroup: isGroup$1,
  getGroupShapes: getGroupShapes$1,
  
  // Transform operations
  transform: transform$1,
  batchTranslate: batchTranslate$1,
  batchRotate: batchRotate$1,
  batchScale: batchScale$1,
  getBoundingCenter: getBoundingCenter$1,
  align: align$1,
};

// src/styles/StyleManager.js
// Style management system

const { DEFAULT_STYLES: DEFAULT_STYLES$2 } = commands;
const { defaultLogger: logger$8 } = logger$f;

/**
 * StyleManager - Manages styles for shapes with inheritance
 */
let StyleManager$1 = class StyleManager {
  constructor() {
    this.defaults = { ...DEFAULT_STYLES$2 };
    this.globalStyles = { ...DEFAULT_STYLES$2 };
    this.styleCache = new Map();
    this.styleHierarchy = new Map();
  }

  /**
   * Get a style value with inheritance
   * @param {string} key - Shape key
   * @param {string} prop - Style property
   * @param {Object} shapeStyle - Shape's local style
   * @returns {any} - Style value
   */
  getStyle(key, prop, shapeStyle = {}) {
    // Check shape's local style first
    if (shapeStyle && prop in shapeStyle && shapeStyle[prop] !== null && shapeStyle[prop] !== undefined) {
      return shapeStyle[prop];
    }

    // Check global styles
    if (prop in this.globalStyles && this.globalStyles[prop] !== null) {
      return this.globalStyles[prop];
    }

    // Check defaults
    return this.defaults[prop];
  }

  /**
   * Get all styles for a shape with inheritance
   * @param {string} key - Shape key
   * @param {Object} shapeStyle - Shape's local style
   * @returns {Object} - Complete style object
   */
  getStyles(key, shapeStyle = {}) {
    const result = { ...this.defaults };

    // Apply global styles
    for (const [prop, value] of Object.entries(this.globalStyles)) {
      if (value !== null && value !== undefined) {
        result[prop] = value;
      }
    }

    // Apply shape styles
    if (shapeStyle) {
      for (const [prop, value] of Object.entries(shapeStyle)) {
        if (value !== null && value !== undefined) {
          result[prop] = value;
        }
      }
    }

    return result;
  }

  /**
   * Set a global style
   * @param {string} prop - Style property
   * @param {any} value - Style value
   */
  setGlobalStyle(prop, value) {
    this.globalStyles[prop] = value;
    logger$8.debug(`StyleManager: Set global style ${prop} = ${value}`);
  }

  /**
   * Get a global style
   * @param {string} prop - Style property
   * @returns {any} - Style value
   */
  getGlobalStyle(prop) {
    return this.globalStyles[prop];
  }

  /**
   * Reset global styles to defaults
   */
  resetGlobalStyles() {
    this.globalStyles = { ...this.defaults };
    logger$8.debug('StyleManager: Reset global styles');
  }

  /**
   * Merge styles (with priority: first > second)
   * @param {Object} style1 - First style (higher priority)
   * @param {Object} style2 - Second style (lower priority)
   * @returns {Object} - Merged style
   */
  mergeStyles(style1, style2) {
    const result = { ...style2 };
    for (const [prop, value] of Object.entries(style1)) {
      if (value !== null && value !== undefined) {
        result[prop] = value;
      }
    }
    return result;
  }

  /**
   * Normalize a color value
   * @param {string|number} color - Color to normalize
   * @returns {string} - Normalized color string
   */
  normalizeColor(color) {
    if (!color) return null;
    
    // If it's already a string, return it
    if (typeof color === 'string') {
      return color;
    }
    
    // If it's a number, convert to hex
    if (typeof color === 'number') {
      return `#${color.toString(16).padStart(6, '0')}`;
    }
    
    // If it's an array [r, g, b] or [r, g, b, a]
    if (Array.isArray(color)) {
      if (color.length === 3) {
        return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      }
      if (color.length === 4) {
        return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
      }
    }
    
    // If it's an object {r, g, b} or {r, g, b, a}
    if (typeof color === 'object') {
      if ('r' in color && 'g' in color && 'b' in color) {
        if ('a' in color) {
          return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        }
        return `rgb(${color.r}, ${color.g}, ${color.b})`;
      }
    }
    
    logger$8.warn(`StyleManager: Unknown color format: ${color}`);
    return null;
  }

  /**
   * Validate a style object
   * @param {Object} style - Style to validate
   * @returns {Object} - Validated style
   */
  validateStyle(style) {
    const result = {};
    const validProps = ['fill', 'stroke', 'strokeWidth', 'opacity', 'blendMode'];

    for (const [prop, value] of Object.entries(style)) {
      if (!validProps.includes(prop)) {
        logger$8.warn(`StyleManager: Unknown style property "${prop}"`);
        continue;
      }

      switch (prop) {
        case 'fill':
        case 'stroke':
          if (value !== null && value !== undefined) {
            result[prop] = this.normalizeColor(value);
          }
          break;
        case 'strokeWidth':
          if (typeof value === 'number' && value >= 0) {
            result[prop] = value;
          } else {
            logger$8.warn(`StyleManager: Invalid strokeWidth "${value}"`);
          }
          break;
        case 'opacity':
          if (typeof value === 'number' && value >= 0 && value <= 1) {
            result[prop] = value;
          } else {
            logger$8.warn(`StyleManager: Invalid opacity "${value}"`);
          }
          break;
        case 'blendMode':
          const validModes = ['source-over', 'source-in', 'source-out', 'source-atop', 
                             'destination-over', 'destination-in', 'destination-out', 'destination-atop',
                             'lighter', 'copy', 'xor', 'multiply', 'screen', 'overlay', 
                             'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 
                             'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 
                             'color', 'luminosity'];
          if (validModes.includes(value)) {
            result[prop] = value;
          } else {
            logger$8.warn(`StyleManager: Invalid blendMode "${value}"`);
          }
          break;
      }
    }

    return result;
  }

  /**
   * Get default style
   * @param {string} prop - Style property (optional)
   * @returns {any|Object} - Default style
   */
  getDefault(prop) {
    if (prop) {
      return this.defaults[prop];
    }
    return { ...this.defaults };
  }

  /**
   * Set a default style
   * @param {string} prop - Style property
   * @param {any} value - Style value
   */
  setDefault(prop, value) {
    this.defaults[prop] = value;
    logger$8.debug(`StyleManager: Set default ${prop} = ${value}`);
  }
};

// Singleton instance
let styleManagerInstance = null;

/**
 * Get the style manager instance (singleton)
 * @returns {StyleManager}
 */
function getStyleManager$4() {
  if (!styleManagerInstance) {
    styleManagerInstance = new StyleManager$1();
  }
  return styleManagerInstance;
}

var StyleManager_1 = {
  StyleManager: StyleManager$1,
  getStyleManager: getStyleManager$4,
};

// src/styles/fill.js
// Fill utilities

const { getStyleManager: getStyleManager$3 } = StyleManager_1;
const { defaultLogger: logger$7 } = logger$f;

/**
 * Apply fill to a shape
 * @param {Object} shape - Shape to fill
 * @param {string|number|Array|Object} color - Fill color
 * @param {Object} options - Fill options
 * @param {string} options.type - 'solid', 'gradient', 'pattern'
 * @param {string} options.gradientType - 'linear', 'radial'
 * @param {Array} options.stops - Gradient stops [{offset, color}]
 * @param {Object} options.pattern - Pattern options
 * @returns {Object} - Shape with fill applied
 */
function fill$2(shape, color, options = {}) {
  if (!shape) {
    throw new Error('fill() requires a shape');
  }

  const styleManager = getStyleManager$3();
  const normalizedColor = styleManager.normalizeColor(color);

  // Handle gradient fill
  if (options.type === 'gradient') {
    return fillGradient$2(shape, options);
  }

  // Handle pattern fill
  if (options.type === 'pattern') {
    return fillPattern$2(shape, options);
  }

  // Solid fill
  if (normalizedColor) {
    shape.style = shape.style || {};
    shape.style.fill = normalizedColor;
    shape._pendingCommands = shape._pendingCommands || [];
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'fill', 
      value: normalizedColor 
    });
  } else if (color === null || color === undefined) {
    // Remove fill
    shape.style = shape.style || {};
    shape.style.fill = null;
    shape._pendingCommands = shape._pendingCommands || [];
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'fill', 
      value: null 
    });
  }

  return shape;
}

/**
 * Apply gradient fill to a shape
 * @param {Object} shape - Shape to fill
 * @param {Object} options - Gradient options
 * @param {string} options.gradientType - 'linear' or 'radial'
 * @param {number} options.x1 - Start X for linear gradient
 * @param {number} options.y1 - Start Y for linear gradient
 * @param {number} options.x2 - End X for linear gradient
 * @param {number} options.y2 - End Y for linear gradient
 * @param {number} options.cx - Center X for radial gradient
 * @param {number} options.cy - Center Y for radial gradient
 * @param {number} options.radius - Radius for radial gradient
 * @param {Array<{offset: number, color: string}>} options.stops - Gradient stops
 * @returns {Object} - Shape with gradient fill
 */
function fillGradient$2(shape, options = {}) {
  if (!shape) {
    throw new Error('fillGradient() requires a shape');
  }

  const {
    gradientType = 'linear',
    x1 = 0, y1 = 0,
    x2 = 1, y2 = 1,
    cx = 0.5, cy = 0.5,
    radius = 0.5,
    stops = [],
  } = options;

  if (stops.length < 2) {
    throw new Error('fillGradient() requires at least 2 gradient stops');
  }

  // Store gradient data on the shape
  shape.style = shape.style || {};
  shape.style.fill = {
    type: 'gradient',
    gradientType,
    x1, y1, x2, y2,
    cx, cy, radius,
    stops,
  };

  shape._pendingCommands = shape._pendingCommands || [];
  shape._pendingCommands.push({
    cmd: 'SET_STYLE',
    prop: 'fill',
    value: shape.style.fill,
  });

  logger$7.debug(`fillGradient: Applied ${gradientType} gradient to shape`);

  return shape;
}

/**
 * Apply pattern fill to a shape
 * @param {Object} shape - Shape to fill
 * @param {Object} options - Pattern options
 * @param {string} options.type - 'image', 'canvas', 'repeating'
 * @param {string} options.src - Image source for image pattern
 * @param {Object} options.canvas - Canvas for canvas pattern
 * @param {number} options.width - Pattern width
 * @param {number} options.height - Pattern height
 * @param {string} options.repeat - 'repeat', 'repeat-x', 'repeat-y', 'no-repeat'
 * @returns {Object} - Shape with pattern fill
 */
function fillPattern$2(shape, options = {}) {
  if (!shape) {
    throw new Error('fillPattern() requires a shape');
  }

  const {
    type = 'repeating',
    src = null,
    canvas = null,
    width = 0,
    height = 0,
    repeat = 'repeat',
  } = options;

  // Store pattern data on the shape
  shape.style = shape.style || {};
  shape.style.fill = {
    type: 'pattern',
    patternType: type,
    src,
    canvas,
    width,
    height,
    repeat,
  };

  shape._pendingCommands = shape._pendingCommands || [];
  shape._pendingCommands.push({
    cmd: 'SET_STYLE',
    prop: 'fill',
    value: shape.style.fill,
  });

  logger$7.debug(`fillPattern: Applied pattern fill to shape`);

  return shape;
}

/**
 * Remove fill from a shape
 * @param {Object} shape - Shape to remove fill from
 * @returns {Object} - Shape without fill
 */
function noFill$2(shape) {
  return fill$2(shape, null);
}

/**
 * Check if a shape has fill
 * @param {Object} shape - Shape to check
 * @returns {boolean} - Has fill
 */
function hasFill$2(shape) {
  if (!shape || !shape.style) return false;
  const fill = shape.style.fill;
  return fill !== null && fill !== undefined && fill !== 'none';
}

/**
 * Get fill color of a shape
 * @param {Object} shape - Shape to get fill from
 * @returns {string|Object|null} - Fill color or null
 */
function getFill$2(shape) {
  if (!shape || !shape.style) return null;
  return shape.style.fill || null;
}

var fill_1 = {
  fill: fill$2,
  fillGradient: fillGradient$2,
  fillPattern: fillPattern$2,
  noFill: noFill$2,
  hasFill: hasFill$2,
  getFill: getFill$2,
};

// src/styles/stroke.js
// Stroke utilities

const { getStyleManager: getStyleManager$2 } = StyleManager_1;
const { defaultLogger: logger$6 } = logger$f;

/**
 * Apply stroke to a shape
 * @param {Object} shape - Shape to stroke
 * @param {string|number|Array|Object} color - Stroke color
 * @param {number} width - Stroke width
 * @param {Object} options - Stroke options
 * @param {string} options.style - 'solid', 'dashed', 'dotted'
 * @param {Array} options.dashPattern - Dash pattern [dash, gap, ...]
 * @param {string} options.cap - 'butt', 'round', 'square'
 * @param {string} options.join - 'miter', 'round', 'bevel'
 * @param {number} options.miterLimit - Miter limit
 * @returns {Object} - Shape with stroke applied
 */
function stroke$2(shape, color, width = 1, options = {}) {
  if (!shape) {
    throw new Error('stroke() requires a shape');
  }

  const styleManager = getStyleManager$2();
  const normalizedColor = styleManager.normalizeColor(color);

  shape.style = shape.style || {};
  shape._pendingCommands = shape._pendingCommands || [];

  // Apply stroke color
  if (normalizedColor) {
    shape.style.stroke = normalizedColor;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'stroke', 
      value: normalizedColor 
    });
  } else if (color === null || color === undefined) {
    shape.style.stroke = null;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'stroke', 
      value: null 
    });
  }

  // Apply stroke width
  if (width !== undefined && width !== null) {
    if (typeof width !== 'number' || width < 0) {
      throw new Error('stroke() width must be a positive number');
    }
    shape.style.strokeWidth = width;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'strokeWidth', 
      value: width 
    });
  }

  // Apply stroke style
  if (options.style) {
    const validStyles = ['solid', 'dashed', 'dotted'];
    if (!validStyles.includes(options.style)) {
      throw new Error(`stroke() style must be one of: ${validStyles.join(', ')}`);
    }
    shape.style.strokeStyle = options.style;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'strokeStyle', 
      value: options.style 
    });
  }

  // Apply dash pattern
  if (options.dashPattern) {
    if (!Array.isArray(options.dashPattern) || options.dashPattern.length === 0) {
      throw new Error('stroke() dashPattern must be a non-empty array');
    }
    shape.style.dashPattern = options.dashPattern;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'dashPattern', 
      value: options.dashPattern 
    });
  }

  // Apply line cap
  if (options.cap) {
    const validCaps = ['butt', 'round', 'square'];
    if (!validCaps.includes(options.cap)) {
      throw new Error(`stroke() cap must be one of: ${validCaps.join(', ')}`);
    }
    shape.style.lineCap = options.cap;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'lineCap', 
      value: options.cap 
    });
  }

  // Apply line join
  if (options.join) {
    const validJoins = ['miter', 'round', 'bevel'];
    if (!validJoins.includes(options.join)) {
      throw new Error(`stroke() join must be one of: ${validJoins.join(', ')}`);
    }
    shape.style.lineJoin = options.join;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'lineJoin', 
      value: options.join 
    });
  }

  // Apply miter limit
  if (options.miterLimit) {
    if (typeof options.miterLimit !== 'number' || options.miterLimit < 1) {
      throw new Error('stroke() miterLimit must be a number >= 1');
    }
    shape.style.miterLimit = options.miterLimit;
    shape._pendingCommands.push({ 
      cmd: 'SET_STYLE', 
      prop: 'miterLimit', 
      value: options.miterLimit 
    });
  }

  logger$6.debug(`stroke: Applied stroke to shape`);

  return shape;
}

/**
 * Remove stroke from a shape
 * @param {Object} shape - Shape to remove stroke from
 * @returns {Object} - Shape without stroke
 */
function noStroke$2(shape) {
  return stroke$2(shape, null);
}

/**
 * Apply dashed stroke to a shape
 * @param {Object} shape - Shape to stroke
 * @param {string|number|Array|Object} color - Stroke color
 * @param {number} width - Stroke width
 * @param {Array} dashPattern - Dash pattern [dash, gap, ...]
 * @param {Object} options - Additional stroke options
 * @returns {Object} - Shape with dashed stroke
 */
function dashed$2(shape, color, width = 1, dashPattern = [5, 5], options = {}) {
  return stroke$2(shape, color, width, {
    ...options,
    style: 'dashed',
    dashPattern,
  });
}

/**
 * Apply dotted stroke to a shape
 * @param {Object} shape - Shape to stroke
 * @param {string|number|Array|Object} color - Stroke color
 * @param {number} width - Stroke width
 * @param {Object} options - Additional stroke options
 * @returns {Object} - Shape with dotted stroke
 */
function dotted$2(shape, color, width = 1, options = {}) {
  return stroke$2(shape, color, width, {
    ...options,
    style: 'dotted',
    dashPattern: [1, 3],
  });
}

/**
 * Check if a shape has stroke
 * @param {Object} shape - Shape to check
 * @returns {boolean} - Has stroke
 */
function hasStroke$2(shape) {
  if (!shape || !shape.style) return false;
  const stroke = shape.style.stroke;
  return stroke !== null && stroke !== undefined && stroke !== 'none';
}

/**
 * Get stroke of a shape
 * @param {Object} shape - Shape to get stroke from
 * @returns {Object|null} - Stroke info or null
 */
function getStroke$2(shape) {
  if (!shape || !shape.style) return null;
  return {
    color: shape.style.stroke || null,
    width: shape.style.strokeWidth || 1,
    style: shape.style.strokeStyle || 'solid',
    dashPattern: shape.style.dashPattern || null,
    cap: shape.style.lineCap || 'butt',
    join: shape.style.lineJoin || 'miter',
    miterLimit: shape.style.miterLimit || 10,
  };
}

var stroke_1 = {
  stroke: stroke$2,
  noStroke: noStroke$2,
  dashed: dashed$2,
  dotted: dotted$2,
  hasStroke: hasStroke$2,
  getStroke: getStroke$2,
};

// src/styles/index.js
// Export all style utilities

const { StyleManager, getStyleManager: getStyleManager$1 } = StyleManager_1;
const {
  fill: fill$1,
  fillGradient: fillGradient$1,
  fillPattern: fillPattern$1,
  noFill: noFill$1,
  hasFill: hasFill$1,
  getFill: getFill$1,
} = fill_1;
const {
  stroke: stroke$1,
  noStroke: noStroke$1,
  dashed: dashed$1,
  dotted: dotted$1,
  hasStroke: hasStroke$1,
  getStroke: getStroke$1,
} = stroke_1;

var styles = {
  getStyleManager: getStyleManager$1,

  // Fill
  fill: fill$1,
  fillGradient: fillGradient$1,
  fillPattern: fillPattern$1,
  noFill: noFill$1,
  hasFill: hasFill$1,
  getFill: getFill$1,

  // Stroke
  stroke: stroke$1,
  noStroke: noStroke$1,
  dashed: dashed$1,
  dotted: dotted$1,
  hasStroke: hasStroke$1,
  getStroke: getStroke$1,
};

// src/bridge/WorkerBridge.js
// Manages communication between main thread and worker

const { COMMANDS: COMMANDS$5 } = commands;
const { defaultLogger: logger$5 } = logger$f;

let WorkerBridge$2 = class WorkerBridge {
  constructor(worker) {
    this.worker = worker;
    this.messageId = 0;
    this.pendingPromises = new Map();
    this.messageQueue = [];
    this.isProcessing = false;
    this.handlers = new Map();

    // Setup message listener
    this.worker.addEventListener('message', this.handleMessage.bind(this));
    this.worker.addEventListener('error', this.handleError.bind(this));

    logger$5.debug('WorkerBridge initialized');
  }

  /**
   * Send a message to the worker
   * @param {Object} message - Message to send
   * @param {Array} [transfer] - Transferable objects
   * @returns {Promise} - Resolves with response
   */
  send(message, transfer = []) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const payload = {
        id,
        ...message,
      };

      // Store promise callbacks
      this.pendingPromises.set(id, { resolve, reject });

      try {
        this.worker.postMessage(payload, transfer);
        logger$5.debug(`[Bridge] Sent: ${message.type} (id: ${id})`);
      } catch (err) {
        this.pendingPromises.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Send a message without waiting for response (fire and forget)
   * @param {Object} message - Message to send
   * @param {Array} [transfer] - Transferable objects
   */
  sendAsync(message, transfer = []) {
    try {
      this.worker.postMessage({ id: 0, ...message }, transfer);
      logger$5.debug(`[Bridge] Sent async: ${message.type}`);
    } catch (err) {
      logger$5.error('Failed to send async message:', err);
    }
  }

  /**
   * Handle incoming messages from worker
   * @private
   */
  handleMessage(event) {
    const { data } = event;
    const { id, type, payload, error } = data;

    logger$5.debug(`[Bridge] Received: ${type} (id: ${id})`);

    // Check if it's a response to a pending promise
    if (id > 0 && this.pendingPromises.has(id)) {
      const { resolve, reject } = this.pendingPromises.get(id);
      this.pendingPromises.delete(id);

      if (error) {
        reject(new Error(error));
      } else {
        resolve(payload);
      }
      return;
    }

    // Check if it's a command from worker
    if (this.handlers.has(type)) {
      const handler = this.handlers.get(type);
      try {
        const result = handler(payload);
        // Send response back if needed
        if (result !== undefined) {
          this.send({
            type: COMMANDS$5.RESPONSE,
            payload: result,
          });
        }
      } catch (err) {
        logger$5.error(`Error handling ${type}:`, err);
        this.send({
          type: COMMANDS$5.ERROR,
          error: err.message,
        });
      }
      return;
    }

    // Unhandled message
    logger$5.warn(`[Bridge] Unhandled message type: ${type}`);
  }

  /**
   * Handle worker errors
   * @private
   */
  handleError(event) {
    logger$5.error('Worker error:', event);
    // Reject all pending promises
    for (const [id, { reject }] of this.pendingPromises) {
      reject(new Error('Worker error: ' + event.message));
      this.pendingPromises.delete(id);
    }
  }

  /**
   * Register a handler for worker messages
   * @param {string} type - Message type to handle
   * @param {Function} handler - Handler function
   */
  on(type, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.handlers.set(type, handler);
    logger$5.debug(`[Bridge] Registered handler for: ${type}`);
  }

  /**
   * Remove a handler
   * @param {string} type - Message type
   */
  off(type) {
    this.handlers.delete(type);
    logger$5.debug(`[Bridge] Removed handler for: ${type}`);
  }

  /**
   * Check if worker is ready
   * @returns {Promise<boolean>}
   */
  async isReady() {
    try {
      const response = await this.send({ type: 'PING' });
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Flush any pending messages
   */
  flush() {
    // Process any queued messages
    while (this.messageQueue.length > 0) {
      const { message, transfer, resolve, reject } = this.messageQueue.shift();
      this.send(message, transfer).then(resolve).catch(reject);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    
    // Reject all pending promises
    for (const [id, { reject }] of this.pendingPromises) {
      reject(new Error('Bridge destroyed'));
      this.pendingPromises.delete(id);
    }
    
    this.handlers.clear();
    this.messageQueue = [];
    logger$5.debug('WorkerBridge destroyed');
  }
};

var WorkerBrigde = WorkerBridge$2;

// src/bridge/proxy/RefCache.js
// Local cache for ref reads to avoid roundtrips

let RefCache$1 = class RefCache {
  constructor() {
    this.cache = new Map();
    this.dirtyKeys = new Set();
    this.maxSize = 1000;
  }

  /**
   * Get a value from cache
   * @param {string} key - Ref key
   * @param {string} prop - Property name
   * @returns {any} - Cached value or undefined
   */
  get(key, prop) {
    if (!this.cache.has(key)) return undefined;
    const ref = this.cache.get(key);
    return ref[prop];
  }

  /**
   * Get entire cached ref
   * @param {string} key - Ref key
   * @returns {Object|null} - Cached ref or null
   */
  getRef(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Set a value in cache
   * @param {string} key - Ref key
   * @param {string} prop - Property name
   * @param {any} value - Value to cache
   */
  set(key, prop, value) {
    if (!this.cache.has(key)) {
      this.cache.set(key, {});
    }
    const ref = this.cache.get(key);
    ref[prop] = value;
    this.dirtyKeys.add(key);
    
    // Enforce max size
    if (this.cache.size > this.maxSize) {
      this.prune();
    }
  }

  /**
   * Set entire ref in cache
   * @param {string} key - Ref key
   * @param {Object} data - Ref data
   */
  setRef(key, data) {
    this.cache.set(key, { ...data });
    this.dirtyKeys.add(key);
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Ref key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete a ref from cache
   * @param {string} key - Ref key
   */
  delete(key) {
    this.cache.delete(key);
    this.dirtyKeys.delete(key);
  }

  /**
   * Get all dirty keys (keys that have been modified)
   * @returns {string[]} - Array of dirty keys
   */
  getDirtyKeys() {
    return Array.from(this.dirtyKeys);
  }

  /**
   * Clear dirty flags
   */
  clearDirty() {
    this.dirtyKeys.clear();
  }

  /**
   * Mark a key as dirty (needs sync)
   * @param {string} key - Ref key
   */
  markDirty(key) {
    this.dirtyKeys.add(key);
  }

  /**
   * Prune cache to max size (LRU-like)
   * @private
   */
  prune() {
    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, entries.length - this.maxSize / 2);
    for (const [key] of toRemove) {
      this.cache.delete(key);
      this.dirtyKeys.delete(key);
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.dirtyKeys.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      dirtyCount: this.dirtyKeys.size,
      maxSize: this.maxSize,
    };
  }
};

var RefCache_1 = RefCache$1;

// src/bridge/proxy/NullRef.js
// Null object pattern for missing refs

const { defaultLogger: logger$4 } = logger$f;

let NullRef$1 = class NullRef {
  constructor(key) {
    this.key = key;
    this._isNull = true;
  }

  // All property access returns the NullRef itself
  get() {
    return this;
  }

  set() {
    return this;
  }

  // Methods that do nothing
  fill() {
    logger$4.warn(`[NullRef] Cannot fill() - ref "${this.key}" not found`);
    return this;
  }

  stroke() {
    logger$4.warn(`[NullRef] Cannot stroke() - ref "${this.key}" not found`);
    return this;
  }

  wavy() {
    logger$4.warn(`[NullRef] Cannot wavy() - ref "${this.key}" not found`);
    return this;
  }

  bezier() {
    logger$4.warn(`[NullRef] Cannot bezier() - ref "${this.key}" not found`);
    return this;
  }

  setRef() {
    logger$4.warn(`[NullRef] Cannot setRef() - ref "${this.key}" not found`);
    return this;
  }

  // Proxy trap for any other property access
  getProperty(target, prop) {
    if (prop in this) {
      return this[prop];
    }
    logger$4.warn(`[NullRef] Cannot access "${String(prop)}" - ref "${this.key}" not found`);
    return undefined;
  }

  // Proxy trap for property setting
  setProperty(target, prop, value) {
    logger$4.warn(`[NullRef] Cannot set "${String(prop)}" - ref "${this.key}" not found`);
    return false;
  }

  // Check if this is a null ref
  isNull() {
    return true;
  }

  // Check if this is a valid ref
  isValid() {
    return false;
  }
};

// Create a proxy handler for NullRef
function createNullRefProxy$2(key) {
  const nullRef = new NullRef$1(key);
  
  return new Proxy(nullRef, {
    get(target, prop) {
      if (prop === 'isNull') return () => true;
      if (prop === 'isValid') return () => false;
      if (prop === 'key') return key;
      if (prop === '_isNull') return true;
      if (prop in target) return target[prop];
      
      logger$4.warn(`[NullRef] Cannot access "${String(prop)}" - ref "${key}" not found`);
      return undefined;
    },
    set(target, prop, value) {
      logger$4.warn(`[NullRef] Cannot set "${String(prop)}" - ref "${key}" not found`);
      return false;
    },
  });
}

var NullRef_1 = {
  NullRef: NullRef$1,
  createNullRefProxy: createNullRefProxy$2,
};

// src/bridge/proxy/RefProxy.js
// Proxy that syncs writes to worker

const RefCache = RefCache_1;
const { createNullRefProxy: createNullRefProxy$1 } = NullRef_1;
const { COMMANDS: COMMANDS$4 } = commands;
const { defaultLogger: logger$3 } = logger$f;

// Shared cache across all refs
const globalCache = new RefCache();

let RefProxy$1 = class RefProxy {
  constructor(key, bridge, initialData = {}) {
    this.key = key;
    this.bridge = bridge;
    this._pendingWrites = [];
    this._syncTimeout = null;
    this._isDisposed = false;

    // Initialize cache
    if (initialData && Object.keys(initialData).length > 0) {
      globalCache.setRef(key, initialData);
    }

    // Create the proxy
    return this.createProxy();
  }

  /**
   * Create the proxy handler
   * @private
   */
  createProxy() {
    const handler = {
      get: (target, prop) => {
        // Special properties
        if (prop === 'isNull') return () => false;
        if (prop === 'isValid') return () => true;
        if (prop === 'key') return this.key;
        if (prop === '_isProxy') return true;
        if (prop === 'toString') return () => `RefProxy(${this.key})`;
        if (prop === 'toJSON') return () => ({ key: this.key });

        // Method calls
        if (typeof prop === 'string' && prop in target) {
          const method = target[prop];
          if (typeof method === 'function') {
            return method.bind(target);
          }
        }

        // Property access - check cache first
        const cached = globalCache.get(this.key, prop);
        if (cached !== undefined) {
          return cached;
        }

        // If not in cache, try to fetch from worker
        // For now, return undefined (we'll sync later)
        logger$3.debug(`[RefProxy] Cache miss for ${this.key}.${String(prop)}`);
        return undefined;
      },

      set: (target, prop, value) => {
        // Don't allow setting internal properties
        if (prop === 'isNull' || prop === 'isValid' || prop === 'key' || prop === '_isProxy') {
          return false;
        }

        // Update cache
        globalCache.set(this.key, prop, value);

        // Queue write to worker
        this.queueWrite(prop, value);

        // Also update the target if it has the property
        if (prop in target) {
          target[prop] = value;
        }

        return true;
      },

      has: (target, prop) => {
        const cached = globalCache.get(this.key, prop);
        return cached !== undefined || prop in target;
      },

      ownKeys: (target) => {
        const ref = globalCache.getRef(this.key);
        if (ref) {
          return Object.keys(ref);
        }
        return Object.keys(target);
      },

      getOwnPropertyDescriptor: (target, prop) => {
        const cached = globalCache.get(this.key, prop);
        if (cached !== undefined) {
          return {
            value: cached,
            enumerable: true,
            configurable: true,
          };
        }
        return Object.getOwnPropertyDescriptor(target, prop);
      },

      deleteProperty: (target, prop) => {
        // Can't delete ref properties this way
        logger$3.warn(`[RefProxy] Cannot delete property ${String(prop)} from ref ${this.key}`);
        return false;
      },
    };

    // Create the target object
    const target = {};

    // Add common methods
    target.fill = (color) => {
      this.queueWrite('fill', color || '#000000');
      return this.proxy;
    };

    target.stroke = (color, width) => {
      this.queueWrite('stroke', color || '#000000');
      if (width !== undefined) {
        this.queueWrite('strokeWidth', width);
      }
      return this.proxy;
    };

    target.wavy = (amplitude, frequency) => {
      // This will be handled in the worker
      this.queueWrite('_wavy', { amplitude, frequency });
      return this.proxy;
    };

    target.bezier = (...points) => {
      this.queueWrite('_bezier', points);
      return this.proxy;
    };

    target.setRef = (newKey) => {
      // This is a no-op on proxy (handled elsewhere)
      logger$3.warn('[RefProxy] setRef() called on proxy, use the returned shape instead');
      return this.proxy;
    };

    // Create the proxy
    this.proxy = new Proxy(target, handler);

    return this.proxy;
  }

  /**
   * Queue a write to be sent to worker
   * @private
   */
  queueWrite(prop, value) {
    if (this._isDisposed) return;

    this._pendingWrites.push({ prop, value });

    // Debounce writes
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
    }

    this._syncTimeout = setTimeout(() => {
      this.flushWrites();
    }, 16); // ~1 frame
  }

  /**
   * Flush all pending writes to worker
   * @private
   */
  async flushWrites() {
    if (this._pendingWrites.length === 0 || this._isDisposed) return;

    const writes = this._pendingWrites.slice();
    this._pendingWrites = [];
    this._syncTimeout = null;

    try {
      // Send batch update to worker
      await this.bridge.send({
        type: COMMANDS$4.UPDATE_SHAPE,
        payload: {
          key: this.key,
          updates: writes,
        },
      });

      // Clear dirty flags
      globalCache.clearDirty();
    } catch (err) {
      logger$3.error(`[RefProxy] Failed to sync writes for ${this.key}:`, err);
      // Re-queue writes
      this._pendingWrites = [...writes, ...this._pendingWrites];
    }
  }

  /**
   * Manually sync all pending writes
   */
  async sync() {
    await this.flushWrites();
  }

  /**
   * Dispose the proxy
   */
  dispose() {
    this._isDisposed = true;
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = null;
    }
    this._pendingWrites = [];
    // Remove from cache
    globalCache.delete(this.key);
  }
};

// Factory function to create a ref proxy
function createRefProxy$2(key, bridge, initialData = {}) {
  // Check if key is valid
  if (!key || typeof key !== 'string') {
    throw new Error('Ref key must be a non-empty string');
  }

  // Check if ref exists in worker (we'll do this async)
  // For now, create the proxy and let it handle missing data
  
  // If initialData is provided, cache it
  if (initialData && Object.keys(initialData).length > 0) {
    globalCache.setRef(key, initialData);
  }

  const proxy = new RefProxy$1(key, bridge, initialData);
  return proxy.proxy;
}

// Get the global cache for inspection
function getRefCache$2() {
  return globalCache;
}

var RefProxy_1 = {
  RefProxy: RefProxy$1,
  createRefProxy: createRefProxy$2,
  getRefCache: getRefCache$2};

// src/bridge/index.js
// Export all bridge components

const WorkerBridge$1 = WorkerBrigde;
const { COMMANDS: COMMANDS$3, SHAPE_TYPES: SHAPE_TYPES$1, STYLE_PROPS: STYLE_PROPS$1, EVENT_TYPES: EVENT_TYPES$2, DEFAULT_STYLES: DEFAULT_STYLES$1 } = commands;
const { createRefProxy: createRefProxy$1, getRefCache: getRefCache$1, RefProxy } = RefProxy_1;
const { createNullRefProxy, NullRef } = NullRef_1;

var bridge = {
  // Core bridge
  WorkerBridge: WorkerBridge$1,
  
  // Commands
  COMMANDS: COMMANDS$3,
  SHAPE_TYPES: SHAPE_TYPES$1,
  STYLE_PROPS: STYLE_PROPS$1,
  EVENT_TYPES: EVENT_TYPES$2,
  DEFAULT_STYLES: DEFAULT_STYLES$1,
  
  // Proxy system
  createRefProxy: createRefProxy$1,
  getRefCache: getRefCache$1};

// src/events/events.js
// Event type constants and utilities

// Mouse event types
const MOUSE_EVENTS$1 = {
  MOVE: 'mousemove',
  DOWN: 'mousedown',
  UP: 'mouseup',
  CLICK: 'click',
  DBL_CLICK: 'dblclick',
  ENTER: 'mouseenter',
  LEAVE: 'mouseleave',
  OVER: 'mouseover',
  OUT: 'mouseout',
  WHEEL: 'wheel',
  CONTEXT_MENU: 'contextmenu',
};

// Keyboard event types
const KEYBOARD_EVENTS$2 = {
  DOWN: 'keydown',
  UP: 'keyup',
  PRESS: 'keypress',
};

// Touch event types
const TOUCH_EVENTS$1 = {
  START: 'touchstart',
  MOVE: 'touchmove',
  END: 'touchend',
  CANCEL: 'touchcancel',
};

// Pointer event types (unified mouse + touch)
const POINTER_EVENTS$2 = {
  DOWN: 'pointerdown',
  UP: 'pointerup',
  MOVE: 'pointermove',
  CANCEL: 'pointercancel',
  ENTER: 'pointerenter',
  LEAVE: 'pointerleave',
  OVER: 'pointerover',
  OUT: 'pointerout',
};

// All event types
const EVENT_TYPES$1 = {
  ...MOUSE_EVENTS$1,
  ...KEYBOARD_EVENTS$2,
  ...TOUCH_EVENTS$1,
  ...POINTER_EVENTS$2,
};

// Event modifiers
const EVENT_MODIFIERS = {
  SHIFT: 'shiftKey',
  CTRL: 'ctrlKey',
  ALT: 'altKey',
  META: 'metaKey',
};

// Mouse button mapping
const MOUSE_BUTTONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
  BACK: 3,
  FORWARD: 4,
};

// Key codes (common ones)
const KEY_CODES = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  ESCAPE: 27,
  SPACE: 32,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  DELETE: 46,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
};

// Event priority levels
const EVENT_PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/**
 * Normalize mouse event data
 * @param {MouseEvent} event - Mouse event
 * @param {HTMLElement} target - Target element
 * @returns {Object} - Normalized event data
 */
function normalizeMouseEvent$2(event, target) {
  const rect = target.getBoundingClientRect();
  const scaleX = target.width / rect.width || 1;
  const scaleY = target.height / rect.height || 1;

  return {
    type: event.type,
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
    clientX: event.clientX,
    clientY: event.clientY,
    pageX: event.pageX,
    pageY: event.pageY,
    button: event.button,
    buttons: event.buttons,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    deltaX: event.deltaX || 0,
    deltaY: event.deltaY || 0,
    deltaZ: event.deltaZ || 0,
    target: event.target ? event.target.tagName : null,
    timestamp: Date.now(),
  };
}

/**
 * Normalize keyboard event data
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {Object} - Normalized event data
 */
function normalizeKeyboardEvent$2(event) {
  return {
    type: event.type,
    key: event.key,
    code: event.code,
    keyCode: event.keyCode,
    charCode: event.charCode,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    repeat: event.repeat,
    location: event.location,
    target: event.target ? event.target.tagName : null,
    timestamp: Date.now(),
  };
}

/**
 * Normalize touch event data
 * @param {TouchEvent} event - Touch event
 * @param {HTMLElement} target - Target element
 * @returns {Object} - Normalized event data
 */
function normalizeTouchEvent$2(event, target) {
  const rect = target.getBoundingClientRect();
  const scaleX = target.width / rect.width || 1;
  const scaleY = target.height / rect.height || 1;

  const touches = Array.from(event.touches).map(touch => ({
    identifier: touch.identifier,
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.pageX,
    pageY: touch.pageY,
    radiusX: touch.radiusX || 0,
    radiusY: touch.radiusY || 0,
    rotationAngle: touch.rotationAngle || 0,
    force: touch.force || 0,
  }));

  const changedTouches = Array.from(event.changedTouches).map(touch => ({
    identifier: touch.identifier,
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.pageX,
    pageY: touch.pageY,
    radiusX: touch.radiusX || 0,
    radiusY: touch.radiusY || 0,
    rotationAngle: touch.rotationAngle || 0,
    force: touch.force || 0,
  }));

  return {
    type: event.type,
    touches,
    changedTouches,
    target: event.target ? event.target.tagName : null,
    timestamp: Date.now(),
  };
}

var events$1 = {
  MOUSE_EVENTS: MOUSE_EVENTS$1,
  KEYBOARD_EVENTS: KEYBOARD_EVENTS$2,
  TOUCH_EVENTS: TOUCH_EVENTS$1,
  POINTER_EVENTS: POINTER_EVENTS$2,
  EVENT_TYPES: EVENT_TYPES$1,
  EVENT_MODIFIERS,
  MOUSE_BUTTONS,
  KEY_CODES,
  EVENT_PRIORITY,
  normalizeMouseEvent: normalizeMouseEvent$2,
  normalizeKeyboardEvent: normalizeKeyboardEvent$2,
  normalizeTouchEvent: normalizeTouchEvent$2,
};

// src/events/KeyboardBridge.js
// Keyboard event bridging - sends keyboard events to worker

const { KEYBOARD_EVENTS: KEYBOARD_EVENTS$1, normalizeKeyboardEvent: normalizeKeyboardEvent$1 } = events$1;
const { COMMANDS: COMMANDS$2 } = commands;
const { defaultLogger: logger$2 } = logger$f;

let KeyboardBridge$2 = class KeyboardBridge {
  constructor(bridge) {
    this.bridge = bridge;
    this.listeners = new Map();
    this.isListening = false;
    this.eventQueue = [];
    this.isProcessing = false;
    this.batchSize = 20;
    this.flushInterval = 16; // ~1 frame

    // Event handlers
    this.handlers = {
      [KEYBOARD_EVENTS$1.DOWN]: this.handleDown.bind(this),
      [KEYBOARD_EVENTS$1.UP]: this.handleUp.bind(this),
      [KEYBOARD_EVENTS$1.PRESS]: this.handlePress.bind(this),
    };

    // Bind flush
    this._flushIntervalId = null;
  }

  /**
   * Start listening for keyboard events
   */
  start() {
    if (this.isListening) {
      logger$2.warn('KeyboardBridge: Already listening');
      return;
    }

    // Attach event listeners to window
    for (const [eventType, handler] of Object.entries(this.handlers)) {
      window.addEventListener(eventType, handler);
      this.listeners.set(eventType, handler);
    }

    this.isListening = true;
    this._flushIntervalId = setInterval(() => this.flush(), this.flushInterval);

    logger$2.debug('KeyboardBridge: Started listening');
  }

  /**
   * Stop listening for keyboard events
   */
  stop() {
    if (!this.isListening) {
      return;
    }

    // Remove event listeners
    for (const [eventType, handler] of this.listeners) {
      window.removeEventListener(eventType, handler);
    }
    this.listeners.clear();

    if (this._flushIntervalId) {
      clearInterval(this._flushIntervalId);
      this._flushIntervalId = null;
    }

    this.isListening = false;
    this.eventQueue = [];

    logger$2.debug('KeyboardBridge: Stopped listening');
  }

  /**
   * Queue an event to send to worker
   * @param {Object} eventData - Event data
   */
  queueEvent(eventData) {
    this.eventQueue.push(eventData);

    // If queue is getting large, flush it
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued events to worker
   */
  flush() {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const events = this.eventQueue.splice(0, this.batchSize);

    try {
      this.bridge.sendAsync({
        type: COMMANDS$2.KEYBOARD_EVENT,
        payload: {
          events,
          count: events.length,
        },
      });
    } catch (err) {
      logger$2.error('KeyboardBridge: Failed to send events:', err);
      // Re-queue events
      this.eventQueue.unshift(...events);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle key down event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleDown(event) {
    const data = normalizeKeyboardEvent$1(event);
    this.queueEvent(data);
  }

  /**
   * Handle key up event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleUp(event) {
    const data = normalizeKeyboardEvent$1(event);
    this.queueEvent(data);
  }

  /**
   * Handle key press event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handlePress(event) {
    const data = normalizeKeyboardEvent$1(event);
    this.queueEvent(data);
  }

  /**
   * Check if a key is pressed
   * @param {string} key - Key to check
   * @returns {boolean} - Is key pressed
   */
  isKeyPressed(key) {
    // This would need to track state
    // For now, return false
    return false;
  }

  /**
   * Get the current key state
   * @returns {Object} - Key state
   */
  getKeyState() {
    // This would need to track state
    // For now, return empty object
    return {};
  }

  /**
   * Destroy the keyboard bridge
   */
  destroy() {
    this.stop();
    this.bridge = null;
    logger$2.debug('KeyboardBridge: Destroyed');
  }
};

var KeyBoardBridge = KeyboardBridge$2;

// src/events/PointerBridge.js
// Unified pointer events (mouse + touch) bridging

const { POINTER_EVENTS: POINTER_EVENTS$1, normalizeMouseEvent: normalizeMouseEvent$1, normalizeTouchEvent: normalizeTouchEvent$1 } = events$1;
const { COMMANDS: COMMANDS$1 } = commands;
const { defaultLogger: logger$1 } = logger$f;

let PointerBridge$2 = class PointerBridge {
  constructor(canvas, bridge) {
    this.canvas = canvas;
    this.bridge = bridge;
    this.listeners = new Map();
    this.isListening = false;
    this.eventQueue = [];
    this.isProcessing = false;
    this.batchSize = 10;
    this.flushInterval = 16;
    this.pointerState = {
      x: 0,
      y: 0,
      isDown: false,
      isOver: false,
      buttons: 0,
      touches: [],
    };

    // Event handlers
    this.handlers = {
      [POINTER_EVENTS$1.DOWN]: this.handleDown.bind(this),
      [POINTER_EVENTS$1.UP]: this.handleUp.bind(this),
      [POINTER_EVENTS$1.MOVE]: this.handleMove.bind(this),
      [POINTER_EVENTS$1.CANCEL]: this.handleCancel.bind(this),
      [POINTER_EVENTS$1.ENTER]: this.handleEnter.bind(this),
      [POINTER_EVENTS$1.LEAVE]: this.handleLeave.bind(this),
    };

    this._flushIntervalId = null;
  }

  /**
   * Start listening for pointer events
   */
  start() {
    if (this.isListening) {
      logger$1.warn('PointerBridge: Already listening');
      return;
    }

    if (!this.canvas) {
      logger$1.error('PointerBridge: No canvas provided');
      return;
    }

    // Attach event listeners
    for (const [eventType, handler] of Object.entries(this.handlers)) {
      this.canvas.addEventListener(eventType, handler);
      this.listeners.set(eventType, handler);
    }

    this.isListening = true;
    this._flushIntervalId = setInterval(() => this.flush(), this.flushInterval);

    logger$1.debug('PointerBridge: Started listening');
  }

  /**
   * Stop listening for pointer events
   */
  stop() {
    if (!this.isListening) {
      return;
    }

    // Remove event listeners
    for (const [eventType, handler] of this.listeners) {
      this.canvas.removeEventListener(eventType, handler);
    }
    this.listeners.clear();

    if (this._flushIntervalId) {
      clearInterval(this._flushIntervalId);
      this._flushIntervalId = null;
    }

    this.isListening = false;
    this.eventQueue = [];

    logger$1.debug('PointerBridge: Stopped listening');
  }

  /**
   * Queue an event to send to worker
   * @param {Object} eventData - Event data
   */
  queueEvent(eventData) {
    this.eventQueue.push(eventData);

    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued events to worker
   */
  flush() {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const events = this.eventQueue.splice(0, this.batchSize);

    try {
      this.bridge.sendAsync({
        type: COMMANDS$1.POINTER_EVENT,
        payload: {
          events,
          count: events.length,
          state: this.pointerState,
        },
      });
    } catch (err) {
      logger$1.error('PointerBridge: Failed to send events:', err);
      this.eventQueue.unshift(...events);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get position from pointer event
   * @param {PointerEvent} event - Pointer event
   * @returns {{x: number, y: number}} - Position
   */
  getPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width || 1;
    const scaleY = this.canvas.height / rect.height || 1;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  /**
   * Handle pointer down event
   * @param {PointerEvent} event - Pointer event
   */
  handleDown(event) {
    const pos = this.getPosition(event);
    this.pointerState.isDown = true;
    this.pointerState.buttons = event.buttons;
    this.pointerState.x = pos.x;
    this.pointerState.y = pos.y;

    this.queueEvent({
      type: event.type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      ...pos,
      button: event.button,
      buttons: event.buttons,
      pressure: event.pressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      width: event.width,
      height: event.height,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pointer up event
   * @param {PointerEvent} event - Pointer event
   */
  handleUp(event) {
    const pos = this.getPosition(event);
    this.pointerState.isDown = false;
    this.pointerState.buttons = event.buttons;
    this.pointerState.x = pos.x;
    this.pointerState.y = pos.y;

    this.queueEvent({
      type: event.type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      ...pos,
      button: event.button,
      buttons: event.buttons,
      pressure: event.pressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      width: event.width,
      height: event.height,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pointer move event
   * @param {PointerEvent} event - Pointer event
   */
  handleMove(event) {
    const pos = this.getPosition(event);
    this.pointerState.x = pos.x;
    this.pointerState.y = pos.y;

    this.queueEvent({
      type: event.type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      ...pos,
      button: event.button,
      buttons: event.buttons,
      pressure: event.pressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      width: event.width,
      height: event.height,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pointer cancel event
   * @param {PointerEvent} event - Pointer event
   */
  handleCancel(event) {
    this.pointerState.isDown = false;
    this.pointerState.buttons = 0;

    this.queueEvent({
      type: event.type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pointer enter event
   * @param {PointerEvent} event - Pointer event
   */
  handleEnter(event) {
    this.pointerState.isOver = true;
    const pos = this.getPosition(event);

    this.queueEvent({
      type: event.type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      ...pos,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pointer leave event
   * @param {PointerEvent} event - Pointer event
   */
  handleLeave(event) {
    this.pointerState.isOver = false;

    this.queueEvent({
      type: event.type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      timestamp: Date.now(),
    });
  }

  /**
   * Get pointer state
   * @returns {Object} - Pointer state
   */
  getState() {
    return { ...this.pointerState };
  }

  /**
   * Destroy the pointer bridge
   */
  destroy() {
    this.stop();
    this.canvas = null;
    this.bridge = null;
    logger$1.debug('PointerBridge: Destroyed');
  }
};

var PointerBridge_1 = PointerBridge$2;

// src/events/index.js
// Export all event utilities

const events = events$1;
const KeyboardBridge$1 = KeyBoardBridge;
const PointerBridge$1 = PointerBridge_1;

var events_1 = {
  // Event constants
  ...events,

  // Bridges
  MouseBridge: undefined,
  KeyboardBridge: KeyboardBridge$1,
  PointerBridge: PointerBridge$1,
};

// src/utils/types.js
// Type checking utilities

/**
 * Checks if value is a Float32Array
 * @param {any} value
 * @returns {boolean}
 */
function isFloat32Array$1(value) {
  return value instanceof Float32Array;
}

/**
 * Checks if value is a polygon instance
 * @param {any} value
 * @returns {boolean}
 */
function isPolygon$1(value) {
  return (
    value &&
    typeof value === 'object' &&
    'buffer' in value &&
    isFloat32Array$1(value.buffer) &&
    'style' in value
  );
}

/**
 * Checks if value is a valid ref key (string)
 * @param {any} value
 * @returns {boolean}
 */
function isValidRefKey$1(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Checks if value is a color string/hex
 * @param {any} value
 * @returns {boolean}
 */
function isColor$1(value) {
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

var types$1 = {
  isFloat32Array: isFloat32Array$1,
  isPolygon: isPolygon$1,
  isValidRefKey: isValidRefKey$1,
  isColor: isColor$1,
};

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
function distance$1(x1, y1, x2, y2) {
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
function distanceSq$1(x1, y1, x2, y2) {
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
function angle$1(x1, y1, x2, y2) {
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
function angleDeg$1(x1, y1, x2, y2) {
  return angle$1(x1, y1, x2, y2) * 180 / Math.PI;
}

/**
 * Calculate the midpoint between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {{x: number, y: number}} - Midpoint
 */
function midpoint$1(x1, y1, x2, y2) {
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
function centroid$1(points) {
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
function polygonArea$1(points) {
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
function polygonPerimeter$1(points, closed = true) {
  if (!points || points.length < 2) {
    return 0;
  }

  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += distance$1(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }

  if (closed && points.length > 2) {
    const last = points.length - 1;
    perimeter += distance$1(points[last].x, points[last].y, points[0].x, points[0].y);
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
function lerp$1(x1, y1, x2, y2, t) {
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
function mapRange$1(value, inMin, inMax, outMin, outMax) {
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
function constrain$1(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {Array<{x: number, y: number}>} polygon - Polygon points
 * @returns {boolean} - Point is inside polygon
 */
function pointInPolygon$1(x, y, polygon) {
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
function pointInCircle$1(x, y, cx, cy, radius) {
  return distanceSq$1(x, y, cx, cy) <= radius * radius;
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
function pointInRect$1(x, y, rx, ry, rw, rh) {
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
function circlesIntersect$1(x1, y1, r1, x2, y2, r2) {
  const d = distance$1(x1, y1, x2, y2);
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
function rectsIntersect$1(x1, y1, w1, h1, x2, y2, w2, h2) {
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
function lineIntersection$1(x1, y1, x2, y2, x3, y3, x4, y4) {
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
function closestPointOnLine$1(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { x: x1, y: y1, distance: distance$1(px, py, x1, y1) };
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = constrain$1(t, 0, 1);

  const x = x1 + t * dx;
  const y = y1 + t * dy;

  return {
    x,
    y,
    distance: distance$1(px, py, x, y),
  };
}

/**
 * Calculate the closest point on a polygon to a point
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {Array<{x: number, y: number}>} polygon - Polygon points
 * @returns {{x: number, y: number, distance: number}} - Closest point and distance
 */
function closestPointOnPolygon$1(px, py, polygon) {
  if (!polygon || polygon.length === 0) {
    return { x: px, y: py, distance: 0 };
  }

  let closest = null;
  let minDist = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const result = closestPointOnLine$1(px, py, polygon[i].x, polygon[i].y, polygon[j].x, polygon[j].y);

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
function rotatePoint$1(x, y, cx, cy, angle) {
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
function scalePoint$1(x, y, cx, cy, sx, sy) {
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
function pointSide$1(px, py, x1, y1, x2, y2) {
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
function angleBetween$1(x1, y1, x2, y2, x3, y3) {
  const a = distance$1(x1, y1, x2, y2);
  const b = distance$1(x1, y1, x3, y3);
  const c = distance$1(x2, y2, x3, y3);

  if (a === 0 || b === 0) {
    return 0;
  }

  const cos = (a * a + b * b - c * c) / (2 * a * b);
  return Math.acos(constrain$1(cos, -1, 1));
}

/**
 * Calculate the signed angle from v1 to v2
 * @param {{x: number, y: number}} v1 - First vector
 * @param {{x: number, y: number}} v2 - Second vector
 * @returns {number} - Signed angle in radians
 */
function signedAngle$1(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.atan2(cross, dot);
}

var geometry$1 = {
  // Basic measurements
  distance: distance$1,
  distanceSq: distanceSq$1,
  angle: angle$1,
  angleDeg: angleDeg$1,
  midpoint: midpoint$1,

  // Polygon calculations
  centroid: centroid$1,
  polygonArea: polygonArea$1,
  polygonPerimeter: polygonPerimeter$1,

  // Interpolation and mapping
  lerp: lerp$1,
  mapRange: mapRange$1,
  constrain: constrain$1,

  // Point in shape
  pointInPolygon: pointInPolygon$1,
  pointInCircle: pointInCircle$1,
  pointInRect: pointInRect$1,

  // Shape intersection
  circlesIntersect: circlesIntersect$1,
  rectsIntersect: rectsIntersect$1,
  lineIntersection: lineIntersection$1,

  // Closest point
  closestPointOnLine: closestPointOnLine$1,
  closestPointOnPolygon: closestPointOnPolygon$1,

  // Transformations
  rotatePoint: rotatePoint$1,
  scalePoint: scalePoint$1,

  // Geometry utilities
  pointSide: pointSide$1,
  angleBetween: angleBetween$1,
  signedAngle: signedAngle$1,
};

// src/utils/index.js
// Export all utilities

const logger = logger$f;
const buffers = buffers$1;
const types = types$1;
const geometry = geometry$1;

var utils = {
  ...logger,
  ...buffers,
  ...types,
  ...geometry,
};

// src/index.js
// Main entry point - exports everything

//  Core 
const { createCanvas, DotApp, DEFAULT_CONFIG, validateConfig } = core;

//  Shapes  
const { 
  circle, 
  rect, 
  line, 
  polygon, 
  createPolygon,
  bezier, 
  cubicBezierCurve, 
  quadraticBezierCurve 
} = shapes;

//                                                Operations                                               
const { 
  join, 
  isJoined, 
  explode,
  group, 
  isGroup, 
  getGroupShapes,
  transform,
  batchTranslate,
  batchRotate,
  batchScale,
  getBoundingCenter,
  align,
} = operations;

//                                                Styles                                               
const {
  getStyleManager,
  fill,
  fillGradient,
  fillPattern,
  noFill,
  hasFill,
  getFill,
  stroke,
  noStroke,
  dashed,
  dotted,
  hasStroke,
  getStroke,
} = styles;

//                                                Bridge                                               
const {
  WorkerBridge,
  COMMANDS,
  SHAPE_TYPES,
  STYLE_PROPS,
  EVENT_TYPES,
  DEFAULT_STYLES,
  createRefProxy,
  getRefCache,
} = bridge;

//                            Events                                               
const {
  MouseBridge,
  KeyboardBridge,
  PointerBridge,
  MOUSE_EVENTS,
  KEYBOARD_EVENTS,
  TOUCH_EVENTS,
  POINTER_EVENTS,
  normalizeMouseEvent,
  normalizeKeyboardEvent,
  normalizeTouchEvent,
} = events_1;

//                                                Utils                                               
const {
  // Logger
  log,
  warn,
  error,
  debug,
  time,
  timeEnd,
  // Buffers
  createBuffer,
  concatBuffers,
  copyBuffer,
  getVertexCount,
  getVertex,
  setVertex,
  bufferToPoints,
  pointsToBuffer,
  // Types
  isFloat32Array,
  isPolygon,
  isValidRefKey,
  isColor,
  // Geometry
  distance,
  distanceSq,
  angle,
  angleDeg,
  midpoint,
  centroid,
  polygonArea,
  polygonPerimeter,
  lerp,
  mapRange,
  constrain,
  pointInPolygon,
  pointInCircle,
  pointInRect,
  circlesIntersect,
  rectsIntersect,
  lineIntersection,
  closestPointOnLine,
  closestPointOnPolygon,
  rotatePoint,
  scalePoint,
  pointSide,
  angleBetween,
  signedAngle,
} = utils;

//                                                Global State                                               
let activeApp = null;

/**
 * Get the active app instance
 * @returns {DotApp|null} - Active app or null
 */
function getActiveApp() {
  return activeApp;
}

/**
 * Set the active app instance (internal)
 * @param {DotApp} app - App instance
 * @private
 */
function setActiveApp(app) {
  activeApp = app;
}

//                                                useRef Implementation                                               
/**
 * Get a reference to a shape by key
 * @param {string} key - Shape reference key
 * @returns {Object} - Proxy to the shape
 */
function useRef(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('useRef() requires a non-empty string key');
  }

  // If no active app, try to get from window
  const app = activeApp || (typeof window !== 'undefined' ? window.__dotjs_app : null);
  
  if (!app) {
    throw new Error('No active app found. Did you call createCanvas() first?');
  }

  if (typeof app.getRef === 'function') {
    const directRef = app.getRef(key);
    if (directRef) {
      return directRef;
    }
  }

  if (typeof app.registerRef === 'function' && typeof app.getRef === 'function') {
    const registered = app.getRef(key);
    if (registered) {
      return registered;
    }
  }

  // Get the bridge from app
  const bridge = app.bridge;
  if (!bridge) {
    return null;
  }

  // Create a ref proxy
  return createRefProxy(key, bridge);
}

/**
 * Check if a ref exists
 * @param {string} key - Shape reference key
 * @returns {Promise<boolean>} - Ref exists
 */
async function hasRef(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const app = activeApp || (typeof window !== 'undefined' ? window.__dotjs_app : null);
  if (!app) {
    return false;
  }

  try {
    const result = await app.bridge.send({
      type: COMMANDS.REGISTRY_HAS,
      payload: { key },
    });
    return result === true;
  } catch (err) {
    return false;
  }
}

/**
 * Delete a ref
 * @param {string} key - Shape reference key
 * @returns {Promise<boolean>} - Success
 */
async function deleteRef(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const app = activeApp || (typeof window !== 'undefined' ? window.__dotjs_app : null);
  if (!app) {
    return false;
  }

  try {
    const result = await app.bridge.send({
      type: COMMANDS.REGISTRY_DELETE,
      payload: { key },
    });
    return result === true;
  } catch (err) {
    return false;
  }
}

/**
 * Get all refs
 * @returns {Promise<string[]>} - Array of keys
 */
async function getRefs() {
  const app = activeApp || (typeof window !== 'undefined' ? window.__dotjs_app : null);
  if (!app) {
    return [];
  }

  try {
    // This would need a GET_ALL command
    // For now, return empty array
    return [];
  } catch (err) {
    return [];
  }
}

//                                                Exports                                               
function registerShape(shape) {
  if (!shape) return shape;
  const app = activeApp || (typeof window !== 'undefined' ? window.__dotjs_app : null);
  if (app && typeof app.addShape === 'function') {
    app.addShape(shape);
    if (shape && shape.refKey && typeof app.registerRef === 'function') {
      app.registerRef(shape.refKey, shape);
    }
  }
  return shape;
}

const exportedCircle = (...args) => registerShape(circle(...args));
const exportedRect = (...args) => registerShape(rect(...args));
const exportedLine = (...args) => registerShape(line(...args));
const exportedPolygon = (...args) => registerShape(polygon(...args));
const exportedCreatePolygon = (...args) => registerShape(createPolygon(...args));

var src = {
  // Core
  createCanvas,
  DotApp,
  DEFAULT_CONFIG,
  validateConfig,
  getActiveApp,
  setActiveApp,
  
  // Shapes
  circle: exportedCircle,
  rect: exportedRect,
  line: exportedLine,
  polygon: exportedPolygon,
  createPolygon: exportedCreatePolygon,
  bezier,
  cubicBezierCurve,
  quadraticBezierCurve,
  
  // Operations
  join,
  isJoined,
  explode,
  group,
  isGroup,
  getGroupShapes,
  transform,
  batchTranslate,
  batchRotate,
  batchScale,
  getBoundingCenter,
  align,
  
  // Styles
  getStyleManager,
  fill,
  fillGradient,
  fillPattern,
  noFill,
  hasFill,
  getFill,
  stroke,
  noStroke,
  dashed,
  dotted,
  hasStroke,
  getStroke,
  
  // Ref System
  useRef,
  hasRef,
  deleteRef,
  getRefs,
  
  // Bridge
  WorkerBridge,
  COMMANDS,
  SHAPE_TYPES,
  STYLE_PROPS,
  EVENT_TYPES,
  DEFAULT_STYLES,
  createRefProxy,
  getRefCache,
  
  // Events
  MouseBridge,
  KeyboardBridge,
  PointerBridge,
  MOUSE_EVENTS,
  KEYBOARD_EVENTS,
  TOUCH_EVENTS,
  POINTER_EVENTS,
  normalizeMouseEvent,
  normalizeKeyboardEvent,
  normalizeTouchEvent,
  
  // Utils - Logger
  log,
  warn,
  error,
  debug,
  time,
  timeEnd,
  
  // Utils - Buffers
  createBuffer,
  concatBuffers,
  copyBuffer,
  getVertexCount,
  getVertex,
  setVertex,
  bufferToPoints,
  pointsToBuffer,
  
  // Utils - Types
  isFloat32Array,
  isPolygon,
  isValidRefKey,
  isColor,
  
  // Utils - Geometry
  distance,
  distanceSq,
  angle,
  angleDeg,
  midpoint,
  centroid,
  polygonArea,
  polygonPerimeter,
  lerp,
  mapRange,
  constrain,
  pointInPolygon,
  pointInCircle,
  pointInRect,
  circlesIntersect,
  rectsIntersect,
  lineIntersection,
  closestPointOnLine,
  closestPointOnPolygon,
  rotatePoint,
  scalePoint,
  pointSide,
  angleBetween,
  signedAngle,
};

// src/main-entry.js
// Entry point for main bundle - sets up global exports

// Import the main module
const dotjs = src;


if (typeof window !== 'undefined') {
  // Expose to global scope for easy access
  window.dotjs = dotjs;
  
  // Also expose individual functions for convenience
  const exposed = [
    'createCanvas',
    'circle',
    'rect',
    'line',
    'polygon',        // User-friendly name
    'createPolygon',  // Explicit name
    'bezier',
    'cubicBezierCurve',
    'quadraticBezierCurve',
    'join',
    'group',
    'useRef',
    'fill',
    'stroke',
    'noFill',
    'noStroke',
    'dashed',
    'dotted',
    'distance',
    'angle',
    'midpoint',
    'lerp',
    'mapRange',
    'constrain',
  ];
  
  for (const fn of exposed) {
    if (dotjs[fn]) {
      window[fn] = dotjs[fn];
    }
  }
  
  // Also expose a global dot variable
  window.dot = dotjs;
  
  // Log initialization
  console.log('-> dot.js loaded!');
  console.log('-> Available functions:', Object.keys(dotjs).join(', '));
  console.log('-> Try: createCanvas(800, 600)');
  console.log('-> Try: polygon([{x:0,y:0}, {x:100,y:0}, {x:50,y:100}])');
}

var mainEntry = dotjs;

var mainEntry_default = /*@__PURE__*/getDefaultExportFromCjs(mainEntry);

export { mainEntry_default as default };
//# sourceMappingURL=dotjs.esm.js.map
