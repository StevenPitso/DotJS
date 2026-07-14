// src/bridge/proxy/NullRef.js
// Null object pattern for missing refs

const { defaultLogger: logger } = require('../../utils/logger');

class NullRef {
  constructor(key) {
    this.key = key;
    this._isNull = true;
  }

  // All property access returns the NullRef itself
  get() {
    return this;
  }

  set() {
    return this;
  }

  // Methods that do nothing
  fill() {
    logger.warn(`[NullRef] Cannot fill() - ref "${this.key}" not found`);
    return this;
  }

  stroke() {
    logger.warn(`[NullRef] Cannot stroke() - ref "${this.key}" not found`);
    return this;
  }

  wavy() {
    logger.warn(`[NullRef] Cannot wavy() - ref "${this.key}" not found`);
    return this;
  }

  bezier() {
    logger.warn(`[NullRef] Cannot bezier() - ref "${this.key}" not found`);
    return this;
  }

  setRef() {
    logger.warn(`[NullRef] Cannot setRef() - ref "${this.key}" not found`);
    return this;
  }

  // Proxy trap for any other property access
  getProperty(target, prop) {
    if (prop in this) {
      return this[prop];
    }
    logger.warn(`[NullRef] Cannot access "${String(prop)}" - ref "${this.key}" not found`);
    return undefined;
  }

  // Proxy trap for property setting
  setProperty(target, prop, value) {
    logger.warn(`[NullRef] Cannot set "${String(prop)}" - ref "${this.key}" not found`);
    return false;
  }

  // Check if this is a null ref
  isNull() {
    return true;
  }

  // Check if this is a valid ref
  isValid() {
    return false;
  }
}

// Create a proxy handler for NullRef
function createNullRefProxy(key) {
  const nullRef = new NullRef(key);
  
  return new Proxy(nullRef, {
    get(target, prop) {
      if (prop === 'isNull') return () => true;
      if (prop === 'isValid') return () => false;
      if (prop === 'key') return key;
      if (prop === '_isNull') return true;
      if (prop in target) return target[prop];
      
      logger.warn(`[NullRef] Cannot access "${String(prop)}" - ref "${key}" not found`);
      return undefined;
    },
    set(target, prop, value) {
      logger.warn(`[NullRef] Cannot set "${String(prop)}" - ref "${key}" not found`);
      return false;
    },
  });
}

module.exports = {
  NullRef,
  createNullRefProxy,
};