// src/events/index.js
// Export all event utilities

const events = require('./events');
const KeyboardBridge = require('./KeyBoardBridge');
const PointerBridge = require('./PointerBridge');

module.exports = {
  // Event constants
  ...events,

  // Bridges
  MouseBridge: undefined,
  KeyboardBridge,
  PointerBridge,
};