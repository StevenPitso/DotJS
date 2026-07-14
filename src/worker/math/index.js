// src/worker/math/index.js
// Export all math utilities

const noise = require('./noise');
const wavy = require('./wavy');
const subdivision = require('./subdivision');
const transform = require('./transform');

module.exports = {
  // Noise
  PerlinNoise: noise.PerlinNoise,
  getNoise: noise.getNoise,
  noise2D: noise.noise2D,
  fbm: noise.fbm,
  turbulence: noise.turbulence,

  // Wavy
  applyWavy: wavy.applyWavy,
  applyComplexWavy: wavy.applyComplexWavy,
  applyRippleWavy: wavy.applyRippleWavy,
  applySpiralWavy: wavy.applySpiralWavy,

  // Subdivision
  midpoint: subdivision.midpoint,
  doublePoints: subdivision.doublePoints,
  catmullRomSubdivision: subdivision.catmullRomSubdivision,
  chaikinSubdivision: subdivision.chaikinSubdivision,
  subdivideBuffer: subdivision.subdivideBuffer,

  // Transform
  TransformMatrix: transform.TransformMatrix,
  translatePoints: transform.translatePoints,
  rotatePoints: transform.rotatePoints,
  scalePoints: transform.scalePoints,
  shearPoints: transform.shearPoints,
  composeTransforms: transform.composeTransforms,
  getBounds: transform.getBounds,
  getCenter: transform.getCenter,
};