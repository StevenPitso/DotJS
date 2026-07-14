// src/events/PointerBridge.js
// Unified pointer events (mouse + touch) bridging

const { POINTER_EVENTS, normalizeMouseEvent, normalizeTouchEvent } = require('./events');
const { COMMANDS } = require('../bridge/commands');
const { defaultLogger: logger } = require('../utils/logger');

class PointerBridge {
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
      [POINTER_EVENTS.DOWN]: this.handleDown.bind(this),
      [POINTER_EVENTS.UP]: this.handleUp.bind(this),
      [POINTER_EVENTS.MOVE]: this.handleMove.bind(this),
      [POINTER_EVENTS.CANCEL]: this.handleCancel.bind(this),
      [POINTER_EVENTS.ENTER]: this.handleEnter.bind(this),
      [POINTER_EVENTS.LEAVE]: this.handleLeave.bind(this),
    };

    this._flushIntervalId = null;
  }

  /**
   * Start listening for pointer events
   */
  start() {
    if (this.isListening) {
      logger.warn('PointerBridge: Already listening');
      return;
    }

    if (!this.canvas) {
      logger.error('PointerBridge: No canvas provided');
      return;
    }

    // Attach event listeners
    for (const [eventType, handler] of Object.entries(this.handlers)) {
      this.canvas.addEventListener(eventType, handler);
      this.listeners.set(eventType, handler);
    }

    this.isListening = true;
    this._flushIntervalId = setInterval(() => this.flush(), this.flushInterval);

    logger.debug('PointerBridge: Started listening');
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

    logger.debug('PointerBridge: Stopped listening');
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
        type: COMMANDS.POINTER_EVENT,
        payload: {
          events,
          count: events.length,
          state: this.pointerState,
        },
      });
    } catch (err) {
      logger.error('PointerBridge: Failed to send events:', err);
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
    logger.debug('PointerBridge: Destroyed');
  }
}

module.exports = PointerBridge;