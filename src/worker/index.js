// src/worker/index.js
// Worker entry point - the "Brain"

const Registry = require('./Registry');
const Polygon = require('./Polygon');
const Renderer = require('./Renderer');
const Lifecycle = require('./Lifecycle');
const { COMMANDS, SHAPE_TYPES, DEFAULT_STYLES } = require('../bridge/commands');
const { defaultLogger: logger } = require('../utils/logger');

// Worker state
let registry = null;
let renderer = null;
let lifecycle = null;
let isInitialized = false;

/**
 * Initialize the worker
 * @param {Object} config - Configuration
 * @param {OffscreenCanvas} canvas - Offscreen canvas
 */
function init(config, canvas) {
  logger.log('Worker: Initializing...');
  
  // Create registry
  registry = new Registry();
  
  // Create renderer
  renderer = new Renderer(canvas);
  renderer.setBackground(config.background || '#000000');
  renderer.setRenderMode(config.render || 'canvas2d');
  
  if (config.width && config.height) {
    renderer.resize(config.width, config.height, config.pixelRatio || 1);
  }
  
  // Create lifecycle
  lifecycle = new Lifecycle(registry, renderer);
  if (config.fps) {
    lifecycle.setFPS(config.fps);
  }
  
  isInitialized = true;
  logger.log('Worker: Initialized successfully');
}

/**
 * Handle shape creation
 * @param {Object} payload - Shape data
 * @returns {Object} - Created shape info
 */
function handleAddShape(payload) {
  if (!registry || !isInitialized) {
    throw new Error('Worker not initialized');
  }
  
  const { type, key, params, style } = payload;
  
  // Create polygon based on type
  let polygon;
  
  switch (type) {
    case SHAPE_TYPES.CIRCLE:
      polygon = createCircle(params);
      break;
    case SHAPE_TYPES.RECT:
      polygon = createRect(params);
      break;
    case SHAPE_TYPES.LINE:
      polygon = createLine(params);
      break;
    case SHAPE_TYPES.POLYGON:
      polygon = createPolygon(params);
      break;
    default:
      throw new Error(`Unknown shape type: ${type}`);
  }
  
  // Apply style
  if (style) {
    Object.assign(polygon.style, style);
  }
  
  // Register
  if (key) {
    registry.set(key, polygon);
  }
  
  return {
    key: key || null,
    type: polygon.type,
    vertexCount: polygon.vertexCount,
  };
}

/**
 * Create a circle
 * @param {Object} params - Circle parameters
 * @returns {Polygon}
 */
function createCircle(params) {
  const { x, y, radius, segments = 32 } = params;
  const points = [];
  const step = (Math.PI * 2) / segments;
  
  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }
  
  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.CIRCLE,
    isClosed: true,
  });
}

/**
 * Create a rectangle
 * @param {Object} params - Rectangle parameters
 * @returns {Polygon}
 */
function createRect(params) {
  const { x, y, width, height } = params;
  const points = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  
  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.RECT,
    isClosed: true,
  });
}

/**
 * Create a line
 * @param {Object} params - Line parameters
 * @returns {Polygon}
 */
function createLine(params) {
  const { x1, y1, x2, y2 } = params;
  const points = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ];
  
  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.LINE,
    isClosed: false,
  });
}

/**
 * Create a custom polygon
 * @param {Object} params - Polygon parameters
 * @returns {Polygon}
 */
function createPolygon(params) {
  const { points, isClosed = true } = params;
  return new Polygon({
    buffer: pointsToBuffer(points),
    type: SHAPE_TYPES.POLYGON,
    isClosed,
  });
}

/**
 * Handle shape updates
 * @param {Object} payload - Update data
 */
function handleUpdateShape(payload) {
  if (!registry || !isInitialized) {
    throw new Error('Worker not initialized');
  }
  
  const { key, updates } = payload;
  const polygon = registry.get(key);
  
  if (!polygon) {
    throw new Error(`Shape "${key}" not found`);
  }
  
  for (const update of updates) {
    const { prop, value } = update;
    
    // Special handling for methods
    if (prop === '_wavy') {
      polygon.wavy(value.amplitude, value.frequency);
    } else if (prop === '_bezier') {
      // Handle bezier conversion
      // Not implemented yet
    } else if (prop === 'fill') {
      polygon.fill(value);
    } else if (prop === 'stroke') {
      polygon.stroke(value);
    } else if (prop === 'strokeWidth') {
      polygon.setStyle('strokeWidth', value);
    } else {
      // Direct property access (x, y, etc.)
      // For now, we don't support direct property updates
      // Users should use translate() or other methods
      logger.warn(`Worker: Unknown update prop "${prop}"`);
    }
  }
  
  polygon.isDirty = true;
  registry.markDirty(key);
}

/**
 * Handle join operation
 * @param {Object} payload - Join data
 * @returns {Object} - Joined shape info
 */
function handleJoinShapes(payload) {
  if (!registry || !isInitialized) {
    throw new Error('Worker not initialized');
  }
  
  const { keys, newKey } = payload;
  const polygons = [];
  
  for (const key of keys) {
    const polygon = registry.get(key);
    if (!polygon) {
      throw new Error(`Shape "${key}" not found`);
    }
    polygons.push(polygon);
  }
  
  // Concatenate buffers
  let totalLength = 0;
  for (const p of polygons) {
    totalLength += p.buffer.length;
  }
  
  const newBuffer = new Float32Array(totalLength);
  let offset = 0;
  
  for (const p of polygons) {
    newBuffer.set(p.buffer, offset);
    offset += p.buffer.length;
  }
  
  // Create joined polygon
  const joined = new Polygon({
    buffer: newBuffer,
    type: SHAPE_TYPES.JOIN,
    isClosed: true,
    fill: polygons[0]?.style.fill || DEFAULT_STYLES.fill,
    stroke: polygons[0]?.style.stroke || DEFAULT_STYLES.stroke,
  });
  
  // Register
  if (newKey) {
    registry.set(newKey, joined);
  }
  
  return {
    key: newKey || null,
    vertexCount: joined.vertexCount,
  };
}

/**
 * Handle group operation
 * @param {Object} payload - Group data
 * @returns {Object} - Group info
 */
function handleGroupShapes(payload) {
  if (!registry || !isInitialized) {
    throw new Error('Worker not initialized');
  }
  
  const { groupKey, shapeKeys } = payload;
  const success = registry.createGroup(groupKey, shapeKeys);
  
  if (!success) {
    throw new Error(`Failed to create group "${groupKey}"`);
  }
  
  return {
    key: groupKey,
    count: registry.getGroup(groupKey)?.length || 0,
  };
}

/**
 * Handle render frame
 * @param {Object} payload - Frame data
 */
function handleRenderFrame(payload) {
  if (!registry || !renderer || !lifecycle || !isInitialized) {
    return;
  }
  
  const { frame, timestamp } = payload;
  
  // Process lifecycle
  if (lifecycle.isRunning) {
    lifecycle.frame(timestamp || Date.now());
  } else {
    // Just render without updates
    renderer.clear();
    const entries = registry.entries();
    for (const [key, polygon] of entries) {
      if (polygon.isDirty) {
        renderer.renderPolygon(polygon);
        polygon.isDirty = false;
      }
    }
    registry.clearDirty();
  }
}

/**
 * Handle resize
 * @param {Object} payload - Resize data
 */
function handleResizeCanvas(payload) {
  if (!renderer || !isInitialized) return;
  
  const { width, height, pixelRatio } = payload;
  renderer.resize(width, height, pixelRatio);
}

// Message handler
self.onmessage = function(event) {
  const { data } = event;
  const { id, type, payload } = data;
  
  try {
    let result = null;
    
    switch (type) {
      case COMMANDS.INIT:
        const { config, canvas } = payload;
        init(config, canvas);
        result = { success: true };
        break;
        
      case COMMANDS.ADD_SHAPE:
        result = handleAddShape(payload);
        break;
        
      case COMMANDS.UPDATE_SHAPE:
        handleUpdateShape(payload);
        result = { success: true };
        break;
        
      case COMMANDS.JOIN_SHAPES:
        result = handleJoinShapes(payload);
        break;
        
      case COMMANDS.GROUP_SHAPES:
        result = handleGroupShapes(payload);
        break;
        
      case COMMANDS.RENDER_FRAME:
        handleRenderFrame(payload);
        result = { success: true };
        break;
        
      case COMMANDS.RESIZE_CANVAS:
        handleResizeCanvas(payload);
        result = { success: true };
        break;
        
      case COMMANDS.REGISTRY_GET:
        const polygon = registry?.get(payload.key);
        result = polygon ? {
          key: payload.key,
          type: polygon.type,
          vertexCount: polygon.vertexCount,
          style: polygon.style,
        } : null;
        break;
        
      case COMMANDS.REGISTRY_HAS:
        result = registry?.has(payload.key) || false;
        break;
        
      case COMMANDS.REGISTRY_DELETE:
        result = registry?.delete(payload.key) || false;
        break;
        
      case COMMANDS.REMOVE_SHAPE:
        result = registry?.delete(payload.key) || false;
        break;
        
      case COMMANDS.SET_STYLE:
        const poly = registry?.get(payload.key);
        if (poly) {
          poly.setStyle(payload.prop, payload.value);
          result = { success: true };
        } else {
          result = { success: false, error: 'Shape not found' };
        }
        break;
        
      case 'PING':
        result = 'PONG';
        break;
        
      default:
        throw new Error(`Unknown command: ${type}`);
    }
    
    // Send response
    self.postMessage({
      id,
      type: COMMANDS.RESPONSE,
      payload: result,
    });
    
  } catch (err) {
    logger.error('Worker error:', err);
    self.postMessage({
      id,
      type: COMMANDS.ERROR,
      error: err.message,
    });
  }
};

// Initialize on load
logger.log('Worker: Loaded');

// Export for worker
module.exports = {
  init,
  registry,
  renderer,
  lifecycle,
};