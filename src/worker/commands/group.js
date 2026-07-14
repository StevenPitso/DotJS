// src/worker/commands/group.js
// Group command handlers

const { defaultLogger: logger } = require('../../utils/logger');

/**
 * Handle GROUP_SHAPES command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Group info
 */
function handleGroupShapes(payload, context) {
  const { registry } = context;
  const { groupKey, shapeKeys } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey must be a non-empty string');
  }

  if (!shapeKeys || !Array.isArray(shapeKeys) || shapeKeys.length === 0) {
    throw new Error('shapeKeys must be a non-empty array');
  }

  // Create the group
  const success = registry.createGroup(groupKey, shapeKeys);

  if (!success) {
    throw new Error(`Failed to create group "${groupKey}"`);
  }

  // Mark all shapes in group as dirty
  const members = registry.getGroup(groupKey);
  if (members) {
    for (const key of members) {
      registry.markDirty(key);
    }
  }

  logger.debug(`Worker: Created group "${groupKey}" with ${members?.length || 0} shapes`);

  return {
    key: groupKey,
    count: members?.length || 0,
  };
}

/**
 * Handle UNGROUP_SHAPES command
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {boolean} - Success
 */
function handleUngroupShapes(payload, context) {
  const { registry } = context;
  const { groupKey } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey must be a non-empty string');
  }

  return registry.deleteGroup(groupKey);
}

/**
 * Handle adding a shape to a group
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Result
 */
function handleAddToGroup(payload, context) {
  const { registry } = context;
  const { groupKey, shapeKey } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey must be a non-empty string');
  }

  if (!shapeKey || typeof shapeKey !== 'string') {
    throw new Error('shapeKey must be a non-empty string');
  }

  const success = registry.addToGroup(groupKey, shapeKey);

  if (success) {
    registry.markDirty(shapeKey);
  }

  return {
    success,
    groupKey,
    shapeKey,
  };
}

/**
 * Handle removing a shape from a group
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Result
 */
function handleRemoveFromGroup(payload, context) {
  const { registry } = context;
  const { groupKey, shapeKey } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey must be a non-empty string');
  }

  if (!shapeKey || typeof shapeKey !== 'string') {
    throw new Error('shapeKey must be a non-empty string');
  }

  const success = registry.removeFromGroup(groupKey, shapeKey);

  return {
    success,
    groupKey,
    shapeKey,
  };
}

/**
 * Handle getting group members
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object|null} - Group members or null
 */
function handleGetGroup(payload, context) {
  const { registry } = context;
  const { groupKey } = payload;

  if (!registry) {
    throw new Error('Registry not initialized');
  }

  if (!groupKey || typeof groupKey !== 'string') {
    throw new Error('groupKey must be a non-empty string');
  }

  const members = registry.getGroup(groupKey);

  if (!members) {
    return null;
  }

  return {
    key: groupKey,
    members,
    count: members.length,
  };
}

/**
 * Handle transforming a group
 * @param {Object} payload - Command payload
 * @param {Object} context - Command context
 * @returns {Object} - Result
 */
function handleTransformGroup(payload, context) {
  const { registry } = context;
  const { groupKey, transformType, params } = payload;

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

  let transformed = 0;

  for (const key of members) {
    const polygon = registry.get(key);
    if (polygon) {
      switch (transformType) {
        case 'translate':
          polygon.translate(params.dx || 0, params.dy || 0);
          break;
        case 'rotate':
          polygon.rotate(params.angle || 0, params.cx, params.cy);
          break;
        case 'scale':
          polygon.scale(params.sx || 1, params.sy || 1, params.cx, params.cy);
          break;
        case 'wavy':
          polygon.wavy(params.amplitude || 0, params.frequency || 1, params.axis || 'both');
          break;
        default:
          throw new Error(`Unknown transform type: ${transformType}`);
      }
      polygon.isDirty = true;
      registry.markDirty(key);
      transformed++;
    }
  }

  logger.debug(`Worker: Transformed ${transformed} shapes in group "${groupKey}"`);

  return {
    success: true,
    transformed,
    groupKey,
  };
}

module.exports = {
  handleGroupShapes,
  handleUngroupShapes,
  handleAddToGroup,
  handleRemoveFromGroup,
  handleGetGroup,
  handleTransformGroup,
};