#!/usr/bin/env node

// For local development: import from dist
// For JSR published packages: JSR compiles src/index.ts to src/index.js
// Try dist first (local dev), then fallback to src/index.js (JSR compiled)
import('./dist/index.mjs').catch(() => import('./src/index.js'))
