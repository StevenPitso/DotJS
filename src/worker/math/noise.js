// src/worker/math/noise.js
// Perlin/Simplex noise implementation

/**
 * Simple Perlin noise implementation
 * Based on the classic Perlin noise algorithm
 */
class PerlinNoise {
  constructor() {
    this.grad3 = [
      [1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
      [1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
      [0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
    ];
    
    this.p = [];
    this.perm = [];
    this.gradP = [];
    
    // Initialize with seed
    this.seed(0);
  }

  /**
   * Seed the noise generator
   * @param {number} seed - Seed value
   */
  seed(seed) {
    if (seed > 0 && seed < 1) {
      seed = Math.floor(seed * 65536);
    }
    
    seed = Math.floor(seed);
    if (seed < 256) {
      seed |= seed << 8;
    }
    
    this.p = new Array(512);
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    
    // Shuffle using seed
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this._random(i + seed) * 256) % 256;
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }
    
    // Extend to 512
    for (let i = 0; i < 256; i++) {
      this.p[i + 256] = this.p[i];
    }
    
    this.perm = this.p;
    this.gradP = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.gradP[i] = this.grad3[this.perm[i] % 12];
    }
  }

  /**
   * Simple pseudo-random number generator
   * @private
   */
  _random(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Fade function
   * @private
   */
  _fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Lerp function
   * @private
   */
  _lerp(a, b, t) {
    return a + t * (b - a);
  }

  /**
   * Dot product for gradient
   * @private
   */
  _dot(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  /**
   * 2D Perlin noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} - Noise value between -1 and 1
   */
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    const u = this._fade(xf);
    const v = this._fade(yf);
    
    const gradP = this.gradP;
    const perm = this.perm;
    
    const n00 = this._dot(gradP[perm[X] + perm[Y]], xf, yf, 0);
    const n10 = this._dot(gradP[perm[X + 1] + perm[Y]], xf - 1, yf, 0);
    const n01 = this._dot(gradP[perm[X] + perm[Y + 1]], xf, yf - 1, 0);
    const n11 = this._dot(gradP[perm[X + 1] + perm[Y + 1]], xf - 1, yf - 1, 0);
    
    const nx0 = this._lerp(n00, n10, u);
    const nx1 = this._lerp(n01, n11, u);
    
    return this._lerp(nx0, nx1, v);
  }

  /**
   * 3D Perlin noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} - Noise value between -1 and 1
   */
  noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    
    const u = this._fade(xf);
    const v = this._fade(yf);
    const w = this._fade(zf);
    
    const gradP = this.gradP;
    const perm = this.perm;
    
    const n000 = this._dot(gradP[perm[X] + perm[Y] + perm[Z]], xf, yf, zf);
    const n100 = this._dot(gradP[perm[X + 1] + perm[Y] + perm[Z]], xf - 1, yf, zf);
    const n010 = this._dot(gradP[perm[X] + perm[Y + 1] + perm[Z]], xf, yf - 1, zf);
    const n110 = this._dot(gradP[perm[X + 1] + perm[Y + 1] + perm[Z]], xf - 1, yf - 1, zf);
    const n001 = this._dot(gradP[perm[X] + perm[Y] + perm[Z + 1]], xf, yf, zf - 1);
    const n101 = this._dot(gradP[perm[X + 1] + perm[Y] + perm[Z + 1]], xf - 1, yf, zf - 1);
    const n011 = this._dot(gradP[perm[X] + perm[Y + 1] + perm[Z + 1]], xf, yf - 1, zf - 1);
    const n111 = this._dot(gradP[perm[X + 1] + perm[Y + 1] + perm[Z + 1]], xf - 1, yf - 1, zf - 1);
    
    const nx00 = this._lerp(n000, n100, u);
    const nx10 = this._lerp(n010, n110, u);
    const nx01 = this._lerp(n001, n101, u);
    const nx11 = this._lerp(n011, n111, u);
    
    const nxy0 = this._lerp(nx00, nx10, v);
    const nxy1 = this._lerp(nx01, nx11, v);
    
    return this._lerp(nxy0, nxy1, w);
  }

  /**
   * FBM (Fractal Brownian Motion) noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} octaves - Number of octaves
   * @param {number} lacunarity - Lacunarity (default: 2)
   * @param {number} gain - Gain (default: 0.5)
   * @returns {number} - FBM noise value
   */
  fbm(x, y, octaves = 3, lacunarity = 2, gain = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    
    return value / maxValue;
  }

  /**
   * Turbulence noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} octaves - Number of octaves
   * @returns {number} - Turbulence value
   */
  turbulence(x, y, octaves = 3) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * Math.abs(this.noise2D(x * frequency, y * frequency));
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }
}

// Singleton instance
let noiseInstance = null;

/**
 * Get the noise instance (singleton)
 * @param {number} seed - Seed value
 * @returns {PerlinNoise}
 */
function getNoise(seed = 0) {
  if (!noiseInstance) {
    noiseInstance = new PerlinNoise();
    noiseInstance.seed(seed);
  }
  return noiseInstance;
}

/**
 * 2D noise convenience function
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} seed - Seed value
 * @returns {number} - Noise value
 */
function noise2D(x, y, seed = 0) {
  const noise = getNoise(seed);
  return noise.noise2D(x, y);
}

/**
 * FBM noise convenience function
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} octaves - Number of octaves
 * @param {number} seed - Seed value
 * @returns {number} - FBM noise value
 */
function fbm(x, y, octaves = 3, seed = 0) {
  const noise = getNoise(seed);
  return noise.fbm(x, y, octaves);
}

/**
 * Turbulence convenience function
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} octaves - Number of octaves
 * @param {number} seed - Seed value
 * @returns {number} - Turbulence value
 */
function turbulence(x, y, octaves = 3, seed = 0) {
  const noise = getNoise(seed);
  return noise.turbulence(x, y, octaves);
}

module.exports = {
  PerlinNoise,
  getNoise,
  noise2D,
  fbm,
  turbulence,
};