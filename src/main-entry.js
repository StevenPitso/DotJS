// src/main-entry.js
// Entry point for main bundle - sets up global exports

// Import the main module
const dotjs = require('./index');


if (typeof window !== 'undefined') {
  // Expose to global scope for easy access
  window.dotjs = dotjs;
  
  // Also expose individual functions for convenience
  const exposed = [
    'createCanvas',
    'circle',
    'rect',
    'line',
    'polygon',        // User-friendly name
    'createPolygon',  // Explicit name
    'bezier',
    'cubicBezierCurve',
    'quadraticBezierCurve',
    'join',
    'group',
    'useRef',
    'fill',
    'stroke',
    'noFill',
    'noStroke',
    'dashed',
    'dotted',
    'distance',
    'angle',
    'midpoint',
    'lerp',
    'mapRange',
    'constrain',
  ];
  
  for (const fn of exposed) {
    if (dotjs[fn]) {
      window[fn] = dotjs[fn];
    }
  }
  
  // Also expose a global dot variable
  window.dot = dotjs;
  
  // Log initialization
  console.log('-> dot.js loaded!');
  console.log('-> Available functions:', Object.keys(dotjs).join(', '));
  console.log('-> Try: createCanvas(800, 600)');
  console.log('-> Try: polygon([{x:0,y:0}, {x:100,y:0}, {x:50,y:100}])');
}

module.exports = dotjs;