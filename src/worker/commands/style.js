// src/worker/commands/style.js
// Style command handlers for the worker

const { DEFAULT_STYLES } = require('../../bridge/commands');
const { defaultLogger: logger } = require('../../utils/logger');

/**
 * Handle SET_STYLE command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Result
 */
function handleSetStyle(payload, context) {
  const { registry } = context;
  const { key, prop, value, groupKey } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  // Handle group styling
  if (groupKey) {
    return handleSetGroupStyle(payload, context);
  }

  // Handle single shape styling
  if (!key || typeof key !== 'string') {
    throw new Error('key must be a non-empty string');
  }

  const polygon = registry.get(key);

  if (!polygon) {
    throw new Error(`Shape "${key}" not found`);
  }

  // Set the style
  if (prop && value !== undefined) {
    polygon.setStyle(prop, value);
  } else if (prop && typeof prop === 'object') {
    // Batch style update
    for (const [p, v] of Object.entries(prop)) {
      polygon.setStyle(p, v);
    }
  } else {
    throw new Error('Invalid style update: need prop+value or style object');
  }

  polygon.isDirty = true;
  registry.markDirty(key);

  return {
    success: true,
    key,
    style: polygon.style,
  };
}

/**
 * Handle GET_STYLE command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object|null} - Style or null
 */
function handleGetStyle(payload, context) {
  const { registry } = context;
  const { key, prop } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!key || typeof key !== 'string') {
    throw new Error('key must be a non-empty string');
  }

  const polygon = registry.get(key);

  if (!polygon) {
    return null;
  }

  if (prop) {
    return { [prop]: polygon.getStyle(prop) };
  }

  return polygon.getStyle();
}

/**
 * Handle setting style on a group
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Result
 */
function handleSetGroupStyle(payload, context) {
  const { registry } = context;
  const { groupKey, prop, value } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey must be a non-empty string');
  }

  const members = registry.getGroup(groupKey);

  if (!members) {
    throw new Error(`Group "${groupKey}" not found`);
  }

  let updated = 0;

  for (const key of members) {
    const polygon = registry.get(key);
    if (polygon) {
      if (prop && value !== undefined) {
        polygon.setStyle(prop, value);
      } else if (prop && typeof prop === 'object') {
        for (const [p, v] of Object.entries(prop)) {
          polygon.setStyle(p, v);
        }
      }
      polygon.isDirty = true;
      registry.markDirty(key);
      updated++;
    }
  }

  logger.debug(`Worker: Updated style for ${updated} shapes in group "${groupKey}"`);

  return {
    success: true,
    groupKey,
    updated,
  };
}

/**
 * Get default style
 * @param {string} prop - Style property (optional)
 * @returns {Object|any} - Default style
 */
function getDefaultStyle(prop) {
  if (prop) {
    return DEFAULT_STYLES[prop];
  }
  return { ...DEFAULT_STYLES };
}

/**
 * Validate a style object
 * @param {Object} style - Style to validate
 * @returns {Object} - Validated style
 */
function validateStyle(style) {
  const result = {};
  const validProps = ['fill', 'stroke', 'strokeWidth', 'opacity', 'blendMode'];

  for (const [prop, value] of Object.entries(style)) {
    if (!validProps.includes(prop)) {
      logger.warn(`Unknown style property "${prop}"`);
      continue;
    }

    switch (prop) {
      case 'fill':
      case 'stroke':
        if (value !== null && value !== undefined) {
          result[prop] = value;
        }
        break;
      case 'strokeWidth':
        if (typeof value === 'number' && value >= 0) {
          result[prop] = value;
        }
        break;
      case 'opacity':
        if (typeof value === 'number' && value >= 0 && value <= 1) {
          result[prop] = value;
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
        }
        break;
    }
  }

  return result;
}

module.exports = {
  handleSetStyle,
  handleGetStyle,
  handleSetGroupStyle,
  getDefaultStyle,
  validateStyle,
};