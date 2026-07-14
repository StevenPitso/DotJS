// src/bridge/index.js
// Export all bridge components

const WorkerBridge = require('./WorkerBrigde');
const { COMMANDS, SHAPE_TYPES, STYLE_PROPS, EVENT_TYPES, DEFAULT_STYLES } = require('./commands');
const { createRefProxy, getRefCache, RefProxy } = require('./proxy/RefProxy');
const { createNullRefProxy, NullRef } = require('./proxy/NullRef');
const RefCache = require('./proxy/RefCache');

module.exports = {
  // Core bridge
  WorkerBridge,
  
  // Commands
  COMMANDS,
  SHAPE_TYPES,
  STYLE_PROPS,
  EVENT_TYPES,
  DEFAULT_STYLES,
  
  // Proxy system
  createRefProxy,
  getRefCache,
  RefProxy,
  createNullRefProxy,
  NullRef,
  RefCache,
};