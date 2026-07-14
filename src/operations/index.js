// src/operations/index.js
// Export all operations

const { join, isJoined, explode } = require('./join');
const { group, isGroup, getGroupShapes } = require('./group');
const {
  transform,
  batchTranslate,
  batchRotate,
  batchScale,
  getBoundingCenter,
  align,
} = require('./transform');

module.exports = {
  // Join operations
  join,
  isJoined,
  explode,
  
  // Group operations
  group,
  isGroup,
  getGroupShapes,
  
  // Transform operations
  transform,
  batchTranslate,
  batchRotate,
  batchScale,
  getBoundingCenter,
  align,
};