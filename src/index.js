// src/index.js
// Main entry point - exports everything

//  Core 
const { createCanvas, DotApp, DEFAULT_CONFIG, validateConfig } = require('./core');

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
} = require('./shapes');

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
} = require('./operations');

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
} = require('./styles');

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
} = require('./bridge');

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
} = require('./events');

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
} = require('./utils');

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

function attachShape(shape) {
  const app = activeApp || (typeof window !== 'undefined' ? window.__dotjs_app : null);
  if (app && shape) {
    app.addShape(shape);
  }
  return shape;
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

module.exports = {
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