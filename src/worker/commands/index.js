// src/worker/commands/index.js
// Command router - routes messages to appropriate handlers

const { COMMANDS } = require('../../bridge/commands');
const { defaultLogger: logger } = require('../../utils/logger');


// Import command handlers
const shapeCommands = require('./shape');
const joinCommands = require('./join');
const groupCommands = require('./group');
const styleCommands = require('./style');

/**
 * Command router - routes messages to appropriate handlers
 */
class CommandRouter {
  constructor(registry, renderer, lifecycle) {
    this.registry = registry;
    this.renderer = renderer;
    this.lifecycle = lifecycle;
    this.handlers = new Map();
    
    // Register all command handlers
    this.registerHandlers();
  }

  /**
   * Register all command handlers
   * @private
   */
  registerHandlers() {
    // Shape commands
    this.handlers.set(COMMANDS.ADD_SHAPE, shapeCommands.handleAddShape);
    this.handlers.set(COMMANDS.REMOVE_SHAPE, shapeCommands.handleRemoveShape);
    this.handlers.set(COMMANDS.UPDATE_SHAPE, shapeCommands.handleUpdateShape);
    this.handlers.set(COMMANDS.GET_SHAPE, shapeCommands.handleGetShape);
    
    // Join commands
    this.handlers.set(COMMANDS.JOIN_SHAPES, joinCommands.handleJoinShapes);
    
    // Group commands
    this.handlers.set(COMMANDS.GROUP_SHAPES, groupCommands.handleGroupShapes);
    this.handlers.set(COMMANDS.UNGROUP_SHAPES, groupCommands.handleUngroupShapes);
    
    // Style commands
    this.handlers.set(COMMANDS.SET_STYLE, styleCommands.handleSetStyle);
    this.handlers.set(COMMANDS.GET_STYLE, styleCommands.handleGetStyle);
    
    // Registry commands
    this.handlers.set(COMMANDS.REGISTRY_GET, this.handleRegistryGet.bind(this));
    this.handlers.set(COMMANDS.REGISTRY_HAS, this.handleRegistryHas.bind(this));
    this.handlers.set(COMMANDS.REGISTRY_DELETE, this.handleRegistryDelete.bind(this));
    
    // Render commands
    this.handlers.set(COMMANDS.RENDER_FRAME, this.handleRenderFrame.bind(this));
    this.handlers.set(COMMANDS.RESIZE_CANVAS, this.handleResizeCanvas.bind(this));
    
    // Init command
    this.handlers.set(COMMANDS.INIT, this.handleInit.bind(this));
    
    logger.debug(`CommandRouter: Registered ${this.handlers.size} handlers`);
  }

  /**
   * Route a command to its handler
   * @param {string} type - Command type
   * @param {Object} payload - Command payload
   * @param {Object} context - Additional context
   * @returns {any} - Command result
   */
  route(type, payload, context = {}) {
    if (!this.handlers.has(type)) {
      throw new Error(`Unknown command type: ${type}`);
    }

    const handler = this.handlers.get(type);
    
    // Bind the handler to the command module context
    const handlerContext = {
      registry: this.registry,
      renderer: this.renderer,
      lifecycle: this.lifecycle,
      ...context,
    };

    try {
      return handler(payload, handlerContext);
    } catch (err) {
      logger.error(`CommandRouter: Error in ${type}:`, err);
      throw err;
    }
  }

  /**
   * Check if a command type is supported
   * @param {string} type - Command type
   * @returns {boolean}
   */
  supports(type) {
    return this.handlers.has(type);
  }

  /**
   * Get all supported command types
   * @returns {string[]}
   */
  getSupportedCommands() {
    return Array.from(this.handlers.keys());
  }

  // ============ Built-in Handlers ============

  /**
   * Handle registry get
   * @private
   */
  handleRegistryGet(payload, context) {
    const { key } = payload;
    const polygon = context.registry.get(key);
    
    if (!polygon) {
      return null;
    }

    return {
      key,
      type: polygon.type,
      vertexCount: polygon.vertexCount,
      style: polygon.style,
      isClosed: polygon.isClosed,
      isDynamic: polygon.isDynamic,
    };
  }

  /**
   * Handle registry has
   * @private
   */
  handleRegistryHas(payload, context) {
    const { key } = payload;
    return context.registry.has(key);
  }

  /**
   * Handle registry delete
   * @private
   */
  handleRegistryDelete(payload, context) {
    const { key } = payload;
    return context.registry.delete(key);
  }

  /**
   * Handle render frame
   * @private
   */
  handleRenderFrame(payload, context) {
    const { frame, timestamp } = payload;
    
    if (!context.renderer || !context.lifecycle) {
      return { success: false, error: 'Renderer or lifecycle not initialized' };
    }

    // Process lifecycle
    if (context.lifecycle.isRunning) {
      context.lifecycle.frame(timestamp || Date.now());
    } else {
      // Just render without updates
      context.renderer.clear();
      const entries = context.registry.entries();
      for (const [key, polygon] of entries) {
        if (polygon.isDirty) {
          context.renderer.renderPolygon(polygon);
          polygon.isDirty = false;
        }
      }
      context.registry.clearDirty();
    }

    return { success: true, frame };
  }

  /**
   * Handle resize canvas
   * @private
   */
  handleResizeCanvas(payload, context) {
    const { width, height, pixelRatio } = payload;
    
    if (!context.renderer) {
      return { success: false, error: 'Renderer not initialized' };
    }

    context.renderer.resize(width, height, pixelRatio);
    return { success: true };
  }

  /**
   * Handle init
   * @private
   */
  handleInit(payload, context) {
    const { config, canvas } = payload;
    
    // Initialize renderer
    if (context.renderer && canvas) {
      context.renderer.canvas = canvas;
      context.renderer.initContext();
      context.renderer.setBackground(config.background || '#000000');
      context.renderer.setRenderMode(config.render || 'canvas2d');
      
      if (config.width && config.height) {
        context.renderer.resize(config.width, config.height, config.pixelRatio || 1);
      }
    }

    // Initialize lifecycle
    if (context.lifecycle) {
      if (config.fps) {
        context.lifecycle.setFPS(config.fps);
      }
      if (config.autoStart !== false) {
        context.lifecycle.start();
      }
    }

    return { success: true };
  }
}

// Factory function to create command router
function createCommandRouter(registry, renderer, lifecycle) {
  return new CommandRouter(registry, renderer, lifecycle);
}

module.exports = {
  CommandRouter,
  createCommandRouter,
};