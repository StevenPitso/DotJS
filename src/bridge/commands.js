// src/bridge/commands.js
// Command constants shared between main and worker

// Command types
const COMMANDS = {
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
const SHAPE_TYPES = {
  CIRCLE: 'circle',
  RECT: 'rect',
  LINE: 'line',
  POLYGON: 'polygon',
  TEXT: 'text',
  BEZIER: 'bezier',
  JOIN: 'join',
};

// Style properties
const STYLE_PROPS = {
  FILL: 'fill',
  STROKE: 'stroke',
  STROKE_WIDTH: 'strokeWidth',
  OPACITY: 'opacity',
  BLEND_MODE: 'blendMode',
};

// Event types
const EVENT_TYPES = {
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
const DEFAULT_STYLES = {
  fill: '#000000',
  stroke: null,
  strokeWidth: 1,
  opacity: 1,
  blendMode: 'source-over',
};

module.exports = {
  COMMANDS,
  SHAPE_TYPES,
  STYLE_PROPS,
  EVENT_TYPES,
  DEFAULT_STYLES,
};