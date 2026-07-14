// src/styles/index.js
// Export all style utilities

const { StyleManager, getStyleManager } = require('./StyleManager');
const {
  fill,
  fillGradient,
  fillPattern,
  noFill,
  hasFill,
  getFill,
} = require('./fill');
const {
  stroke,
  noStroke,
  dashed,
  dotted,
  hasStroke,
  getStroke,
} = require('./stroke');

module.exports = {
  // Style Manager
  StyleManager,
  getStyleManager,

  // Fill
  fill,
  fillGradient,
  fillPattern,
  noFill,
  hasFill,
  getFill,

  // Stroke
  stroke,
  noStroke,
  dashed,
  dotted,
  hasStroke,
  getStroke,
};