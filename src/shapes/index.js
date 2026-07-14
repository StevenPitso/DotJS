// src/shapes/index.js
// Export all shape factories

const { circle, updateCircle } = require('./circle');
const { rect } = require('./rect');
const { line } = require('./line');
const { createPolygon, polygon } = require('./polygon'); 
const { bezier, cubicBezierCurve, quadraticBezierCurve } = require('./bezier');

module.exports = {
  circle,
  updateCircle,
  rect,
  line,
  polygon,
  createPolygon,
  bezier,
  cubicBezierCurve,
  quadraticBezierCurve,
};