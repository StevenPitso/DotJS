// src/events/KeyboardBridge.js
// Keyboard event bridging - sends keyboard events to worker

const { KEYBOARD_EVENTS, normalizeKeyboardEvent } = require('./events');
const { COMMANDS } = require('../bridge/commands');
const { defaultLogger: logger } = require('../utils/logger');

class KeyboardBridge {
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
      [KEYBOARD_EVENTS.DOWN]: this.handleDown.bind(this),
      [KEYBOARD_EVENTS.UP]: this.handleUp.bind(this),
      [KEYBOARD_EVENTS.PRESS]: this.handlePress.bind(this),
    };

    // Bind flush
    this._flushIntervalId = null;
  }

  /**
   * Start listening for keyboard events
   */
  start() {
    if (this.isListening) {
      logger.warn('KeyboardBridge: Already listening');
      return;
    }

    // Attach event listeners to window
    for (const [eventType, handler] of Object.entries(this.handlers)) {
      window.addEventListener(eventType, handler);
      this.listeners.set(eventType, handler);
    }

    this.isListening = true;
    this._flushIntervalId = setInterval(() => this.flush(), this.flushInterval);

    logger.debug('KeyboardBridge: Started listening');
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

    logger.debug('KeyboardBridge: Stopped listening');
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
        type: COMMANDS.KEYBOARD_EVENT,
        payload: {
          events,
          count: events.length,
        },
      });
    } catch (err) {
      logger.error('KeyboardBridge: Failed to send events:', err);
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
    const data = normalizeKeyboardEvent(event);
    this.queueEvent(data);
  }

  /**
   * Handle key up event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleUp(event) {
    const data = normalizeKeyboardEvent(event);
    this.queueEvent(data);
  }

  /**
   * Handle key press event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handlePress(event) {
    const data = normalizeKeyboardEvent(event);
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
    logger.debug('KeyboardBridge: Destroyed');
  }
}

module.exports = KeyboardBridge;