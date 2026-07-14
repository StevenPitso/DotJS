// src/bridge/WorkerBridge.js
// Manages communication between main thread and worker

const { COMMANDS } = require('./commands');
const { defaultLogger: logger } = require('../utils/logger');

class WorkerBridge {
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

    logger.debug('WorkerBridge initialized');
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
        logger.debug(`[Bridge] Sent: ${message.type} (id: ${id})`);
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
      logger.debug(`[Bridge] Sent async: ${message.type}`);
    } catch (err) {
      logger.error('Failed to send async message:', err);
    }
  }

  /**
   * Handle incoming messages from worker
   * @private
   */
  handleMessage(event) {
    const { data } = event;
    const { id, type, payload, error } = data;

    logger.debug(`[Bridge] Received: ${type} (id: ${id})`);

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
            type: COMMANDS.RESPONSE,
            payload: result,
          });
        }
      } catch (err) {
        logger.error(`Error handling ${type}:`, err);
        this.send({
          type: COMMANDS.ERROR,
          error: err.message,
        });
      }
      return;
    }

    // Unhandled message
    logger.warn(`[Bridge] Unhandled message type: ${type}`);
  }

  /**
   * Handle worker errors
   * @private
   */
  handleError(event) {
    logger.error('Worker error:', event);
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
    logger.debug(`[Bridge] Registered handler for: ${type}`);
  }

  /**
   * Remove a handler
   * @param {string} type - Message type
   */
  off(type) {
    this.handlers.delete(type);
    logger.debug(`[Bridge] Removed handler for: ${type}`);
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
    logger.debug('WorkerBridge destroyed');
  }
}

module.exports = WorkerBridge;