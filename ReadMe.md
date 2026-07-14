

```markdown
# 🎯 dot.js

**High-performance creative coding library with Web Worker offloading**

> *"Everything starts with a Dot"*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Workers](https://img.shields.io/badge/Web-Workers-green.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
[![npm version](https://img.shields.io/npm/v/dotjs.svg)](https://www.npmjs.com/package/dotjs)

---

## 📖 Table of Contents

- [Introduction](#introduction)
- [Philosophy](#philosophy)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

**dot.js** is a creative coding library built for performance and simplicity. Inspired by p5.js but designed for modern, high-performance web applications, dot.js leverages Web Workers and `OffscreenCanvas` to deliver buttery-smooth animations without blocking the UI thread.

Whether you're building interactive art, complex data visualizations, or generative designs, dot.js provides a clean, intuitive API with the power of multi-threaded rendering.

```javascript
// Create a canvas
const app = createCanvas(800, 600);

// Draw a circle
circle(400, 300, 100)
  .fill('#ff6b6b')
  .stroke('#ffffff', 3)
  .setRef('hero');

// Animate it!
app.draw(() => {
  const hero = useRef('hero');
  hero.translate(Math.sin(Date.now() / 1000) * 2, 0);
});

```

---

## Philosophy

### 1. Math-First & Buffer-First

Shapes are views into raw memory (`Float32Array`), not heavy objects. This means zero garbage collection overhead, maximum performance, and direct memory access.

### 2. No Scene Graph

Traditional libraries use nested object trees. dot.js uses a **Flat Registry**:

* Simple `Map` for $O(1)$ lookups.
* No parent-child traversal overhead.
* Direct shape access.

### 3. Multi-threaded by Default

All rendering and heavy computation runs in a Web Worker, ensuring your main UI thread stays locked at 60fps.

---

## Installation

### NPM

```bash
npm install dotjs

```

### CDN

```html
<script src="[https://cdn.jsdelivr.net/npm/dotjs/dist/dotjs.min.js](https://cdn.jsdelivr.net/npm/dotjs/dist/dotjs.min.js)"></script>

```

---

## Quick Start

### Basic Setup

```html
<canvas id="canvas"></canvas>
<script>
  const app = createCanvas({
    use: '#canvas',
    background: '#1a1a2e'
  });

  circle(400, 300, 100)
    .fill('#ff6b6b')
    .setRef('myCircle');

  app.draw(() => {
    const c = useRef('myCircle');
    if (c) c.rotate(0.01);
  });
</script>

```

---

## Architecture

The dot.js architecture separates the API (Main Thread) from the Engine (Worker Thread). This ensures that heavy calculations (noise, wavy deformation, joins) never impact your UI interactivity.

### The Pipeline

1. **Update Cycle:** API modifies buffers via the bridge.
2. **Dirty Flagging:** The Engine marks changed shapes.
3. **Render Pass:** Only dirty shapes are redrawn by the `OffscreenCanvas`.
4. **Loop:** `requestAnimationFrame` maintains consistency.

---

## API Reference

### Core Functions

* `createCanvas(width, height, config)`: Initializes the application.
* `app.draw(callback)`: Registers the animation loop.

### Shape Factories

* `circle(x, y, radius)`: Creates a circular buffer.
* `rect(x, y, w, h)`: Creates a rectangular buffer.
* `line(x1, y1, x2, y2)`: Creates a line segment.
* `polygon(points)`: Custom geometry.

### Chainable Methods

* `.fill(color)`: Sets fill.
* `.stroke(color, width)`: Sets stroke.
* `.setRef(key)`: Registers the shape in the Global Map.
* `.wavy(amplitude, frequency)`: Applies procedural deformation.
* `.translate(dx, dy)`: Moves the shape.

### Operations

* `join(shapeA, shapeB)`: Performs a boolean-like merge of paths into one buffer.
* `group({ shapeA, shapeB })`: Creates a virtual set for batch transformations.

---

## Performance

| Operation | Performance |
| --- | --- |
| Registry Lookup | $O(1)$ |
| Memory usage | ~100MB for 10k shapes |
| Frame Rate | Locked 60FPS |

---

## Contributing



```bash
git clone [https://github.com/StevenPitso/dotjs.git](https://github.com/StevenPitso/dotjs.git)
npm install
npm run build

```

---

## License

MIT License - see [LICENSE](https://www.google.com/search?q=LICENSE) for details.

```

