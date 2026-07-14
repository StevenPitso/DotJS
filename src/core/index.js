// src/core/index.js
// Export core functionality

const createCanvas = require('./createCanvas');
const DotApp = require('./DotApp');
const { DEFAULT_CONFIG, validateConfig } = require('./config');

module.exports = {
  createCanvas,
  DotApp,
  DEFAULT_CONFIG,
  validateConfig,
};