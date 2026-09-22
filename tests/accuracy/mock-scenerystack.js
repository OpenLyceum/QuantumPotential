/**
 * Mock implementation of scenerystack for Node.js testing
 * This allows tests to run in Node.js without the full scenerystack library
 */

export class Namespace {
  constructor(name) {
    this.name = name;
  }

  register(name, obj) {
    // Simply return the object for registration purposes
    return obj;
  }
}

export class Range {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }
}

// Mock Property classes from axon
export class Property {
  constructor(value, options) {
    this.value = value;
    this.options = options;
  }

  get() {
    return this.value;
  }

  set(value) {
    this.value = value;
  }
}

export class BooleanProperty extends Property {}
export class NumberProperty extends Property {}

// Mock Tandem classes
export class Tandem {
  static PREFERENCES = {
    createTandem(name) {
      return new Tandem(name);
    },
  };

  constructor(name) {
    this.name = name;
  }

  createTandem(name) {
    return new Tandem(name);
  }
}

export const StringIO = {};

// Export as default to match the real scenerystack module structure
export default {
  Namespace,
  Range,
  Property,
  BooleanProperty,
  NumberProperty,
  Tandem,
  StringIO,
};
