// src/events/events.js
// Event type constants and utilities

// Mouse event types
const MOUSE_EVENTS = {
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
const KEYBOARD_EVENTS = {
  DOWN: 'keydown',
  UP: 'keyup',
  PRESS: 'keypress',
};

// Touch event types
const TOUCH_EVENTS = {
  START: 'touchstart',
  MOVE: 'touchmove',
  END: 'touchend',
  CANCEL: 'touchcancel',
};

// Pointer event types (unified mouse + touch)
const POINTER_EVENTS = {
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
const EVENT_TYPES = {
  ...MOUSE_EVENTS,
  ...KEYBOARD_EVENTS,
  ...TOUCH_EVENTS,
  ...POINTER_EVENTS,
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
function normalizeMouseEvent(event, target) {
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
function normalizeKeyboardEvent(event) {
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
function normalizeTouchEvent(event, target) {
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

module.exports = {
  MOUSE_EVENTS,
  KEYBOARD_EVENTS,
  TOUCH_EVENTS,
  POINTER_EVENTS,
  EVENT_TYPES,
  EVENT_MODIFIERS,
  MOUSE_BUTTONS,
  KEY_CODES,
  EVENT_PRIORITY,
  normalizeMouseEvent,
  normalizeKeyboardEvent,
  normalizeTouchEvent,
};