/**
 * Browser globals setup for scenerystack in Node.js environment.
 * This must be loaded BEFORE any scenerystack modules.
 *
 * Usage: node --import ./tests/browser-globals.js ...
 */

// Core browser globals
globalThis.self = globalThis;
globalThis.window = globalThis;

// Location mock (required for scenerystack query parameters)
globalThis.location = {
  href: "http://localhost",
  search: "",
  hash: "",
  pathname: "/",
  host: "localhost",
  hostname: "localhost",
  port: "",
  protocol: "http:",
  origin: "http://localhost",
};

// Navigator mock (use Object.defineProperty because navigator may be read-only)
try {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      userAgent: "node",
      platform: "node",
      language: "en-US",
    },
    writable: true,
    configurable: true,
  });
} catch {
  // Navigator already exists and is read-only, that's fine
}

// Document mock
globalThis.document = {
  createElement: () => ({
    getContext: () => null,
    style: {},
    setAttribute: () => undefined,
    appendChild: () => undefined,
  }),
  body: { appendChild: () => undefined },
  documentElement: { style: {} },
  createElementNS: () => ({ setAttribute: () => undefined }),
  createTextNode: () => ({}),
  querySelector: () => null,
  querySelectorAll: () => [],
};

// Phet globals
globalThis.phet = globalThis.phet || {};
globalThis.phet.chipper = globalThis.phet.chipper || {};
globalThis.phet.joist = globalThis.phet.joist || {};
globalThis.phet.chipper.packageObject = { name: "scenerystack" };
globalThis.phet.chipper.queryParameters = {};

// Animation frame polyfills
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// Scenerystack Range mock for tests
globalThis.Range = class Range {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }
};

// matchMedia mock (used by QPPWPreferences for reduced motion detection)
globalThis.matchMedia =
  globalThis.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  }));
