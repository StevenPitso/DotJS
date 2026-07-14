// src/core/DotApp.js
// The app instance returned by createCanvas()

const { defaultLogger: logger } = require('../utils/logger');

class DotApp {
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
      logger.warn('App is already running');
      return this;
    }

    logger.log('Starting animation loop');
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
      logger.warn('App is not running');
      return this;
    }

    logger.log('Stopping animation loop');
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
          logger.error('Error in draw callback:', err);
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
      logger.warn('Unable to get 2D context from canvas, retrying with a fresh canvas.', err);
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
    logger.log('App destroyed');
  }
}

module.exports = DotApp;