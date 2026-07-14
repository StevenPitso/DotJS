// src/styles/StyleManager.js
// Style management system

const { DEFAULT_STYLES } = require('../bridge/commands');
const { defaultLogger: logger } = require('../utils/logger');

/**
 * StyleManager - Manages styles for shapes with inheritance
 */
class StyleManager {
  constructor() {
    this.defaults = { ...DEFAULT_STYLES };
    this.globalStyles = { ...DEFAULT_STYLES };
    this.styleCache = new Map();
    this.styleHierarchy = new Map();
  }

  /**
   * Get a style value with inheritance
   * @param {string} key - Shape key
   * @param {string} prop - Style property
   * @param {Object} shapeStyle - Shape's local style
   * @returns {any} - Style value
   */
  getStyle(key, prop, shapeStyle = {}) {
    // Check shape's local style first
    if (shapeStyle && prop in shapeStyle && shapeStyle[prop] !== null && shapeStyle[prop] !== undefined) {
      return shapeStyle[prop];
    }

    // Check global styles
    if (prop in this.globalStyles && this.globalStyles[prop] !== null) {
      return this.globalStyles[prop];
    }

    // Check defaults
    return this.defaults[prop];
  }

  /**
   * Get all styles for a shape with inheritance
   * @param {string} key - Shape key
   * @param {Object} shapeStyle - Shape's local style
   * @returns {Object} - Complete style object
   */
  getStyles(key, shapeStyle = {}) {
    const result = { ...this.defaults };

    // Apply global styles
    for (const [prop, value] of Object.entries(this.globalStyles)) {
      if (value !== null && value !== undefined) {
        result[prop] = value;
      }
    }

    // Apply shape styles
    if (shapeStyle) {
      for (const [prop, value] of Object.entries(shapeStyle)) {
        if (value !== null && value !== undefined) {
          result[prop] = value;
        }
      }
    }

    return result;
  }

  /**
   * Set a global style
   * @param {string} prop - Style property
   * @param {any} value - Style value
   */
  setGlobalStyle(prop, value) {
    this.globalStyles[prop] = value;
    logger.debug(`StyleManager: Set global style ${prop} = ${value}`);
  }

  /**
   * Get a global style
   * @param {string} prop - Style property
   * @returns {any} - Style value
   */
  getGlobalStyle(prop) {
    return this.globalStyles[prop];
  }

  /**
   * Reset global styles to defaults
   */
  resetGlobalStyles() {
    this.globalStyles = { ...this.defaults };
    logger.debug('StyleManager: Reset global styles');
  }

  /**
   * Merge styles (with priority: first > second)
   * @param {Object} style1 - First style (higher priority)
   * @param {Object} style2 - Second style (lower priority)
   * @returns {Object} - Merged style
   */
  mergeStyles(style1, style2) {
    const result = { ...style2 };
    for (const [prop, value] of Object.entries(style1)) {
      if (value !== null && value !== undefined) {
        result[prop] = value;
      }
    }
    return result;
  }

  /**
   * Normalize a color value
   * @param {string|number} color - Color to normalize
   * @returns {string} - Normalized color string
   */
  normalizeColor(color) {
    if (!color) return null;
    
    // If it's already a string, return it
    if (typeof color === 'string') {
      return color;
    }
    
    // If it's a number, convert to hex
    if (typeof color === 'number') {
      return `#${color.toString(16).padStart(6, '0')}`;
    }
    
    // If it's an array [r, g, b] or [r, g, b, a]
    if (Array.isArray(color)) {
      if (color.length === 3) {
        return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      }
      if (color.length === 4) {
        return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
      }
    }
    
    // If it's an object {r, g, b} or {r, g, b, a}
    if (typeof color === 'object') {
      if ('r' in color && 'g' in color && 'b' in color) {
        if ('a' in color) {
          return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        }
        return `rgb(${color.r}, ${color.g}, ${color.b})`;
      }
    }
    
    logger.warn(`StyleManager: Unknown color format: ${color}`);
    return null;
  }

  /**
   * Validate a style object
   * @param {Object} style - Style to validate
   * @returns {Object} - Validated style
   */
  validateStyle(style) {
    const result = {};
    const validProps = ['fill', 'stroke', 'strokeWidth', 'opacity', 'blendMode'];

    for (const [prop, value] of Object.entries(style)) {
      if (!validProps.includes(prop)) {
        logger.warn(`StyleManager: Unknown style property "${prop}"`);
        continue;
      }

      switch (prop) {
        case 'fill':
        case 'stroke':
          if (value !== null && value !== undefined) {
            result[prop] = this.normalizeColor(value);
          }
          break;
        case 'strokeWidth':
          if (typeof value === 'number' && value >= 0) {
            result[prop] = value;
          } else {
            logger.warn(`StyleManager: Invalid strokeWidth "${value}"`);
          }
          break;
        case 'opacity':
          if (typeof value === 'number' && value >= 0 && value <= 1) {
            result[prop] = value;
          } else {
            logger.warn(`StyleManager: Invalid opacity "${value}"`);
          }
          break;
        case 'blendMode':
          const validModes = ['source-over', 'source-in', 'source-out', 'source-atop', 
                             'destination-over', 'destination-in', 'destination-out', 'destination-atop',
                             'lighter', 'copy', 'xor', 'multiply', 'screen', 'overlay', 
                             'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 
                             'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 
                             'color', 'luminosity'];
          if (validModes.includes(value)) {
            result[prop] = value;
          } else {
            logger.warn(`StyleManager: Invalid blendMode "${value}"`);
          }
          break;
      }
    }

    return result;
  }

  /**
   * Get default style
   * @param {string} prop - Style property (optional)
   * @returns {any|Object} - Default style
   */
  getDefault(prop) {
    if (prop) {
      return this.defaults[prop];
    }
    return { ...this.defaults };
  }

  /**
   * Set a default style
   * @param {string} prop - Style property
   * @param {any} value - Style value
   */
  setDefault(prop, value) {
    this.defaults[prop] = value;
    logger.debug(`StyleManager: Set default ${prop} = ${value}`);
  }
}

// Singleton instance
let styleManagerInstance = null;

/**
 * Get the style manager instance (singleton)
 * @returns {StyleManager}
 */
function getStyleManager() {
  if (!styleManagerInstance) {
    styleManagerInstance = new StyleManager();
  }
  return styleManagerInstance;
}

module.exports = {
  StyleManager,
  getStyleManager,
};