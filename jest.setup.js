// Jest setup for path mapping and database cleanup
const path = require('path');

// Import jest-dom for additional matchers
require('@testing-library/jest-dom');

// Set up module aliases by monkey-patching Node.js module resolution
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain) {
  if (request.startsWith('@shared/')) {
    const modulePath = request.replace('@shared/', '');
    const resolvedPath = path.resolve(__dirname, 'shared', modulePath);
    
    // console.log(`🔍 Resolving @shared module: ${request} -> ${resolvedPath}`);
    
    // Try with .ts extension first
    try {
      const result = originalResolveFilename.call(this, resolvedPath + '.ts', parent, isMain);
      console.log(`✅ Resolved ${request} to: ${result}`);
      return result;
    } catch (e) {
      // Try with .js extension
      try {
        const result = originalResolveFilename.call(this, resolvedPath + '.js', parent, isMain);
        // console.log(`✅ Resolved ${request} to: ${result}`);
        return result;
      } catch (e2) {
        // Try without extension
        try {
          const result = originalResolveFilename.call(this, resolvedPath, parent, isMain);
          // console.log(`✅ Resolved ${request} to: ${result}`);
          return result;
        } catch (e3) {
          console.log(`❌ Failed to resolve ${request}, falling back to original resolution`);
          // Fall back to original request
          return originalResolveFilename.call(this, request, parent, isMain);
        }
      }
    }
  }
  
  return originalResolveFilename.call(this, request, parent, isMain);
};

// Global test setup and teardown
let globalTestCleanupTasks = [];

// Add global cleanup function
global.addTestCleanup = function(cleanupFn) {
  globalTestCleanupTasks.push(cleanupFn);
};

// Global teardown to ensure all tests clean up properly
global.afterAll = function(fn) {
  const originalAfterAll = global.afterAll;
  return originalAfterAll(() => {
    // Run user-provided cleanup
    if (fn) fn();
    
    // Run global cleanup tasks
    // console.log(`🧹 Running ${globalTestCleanupTasks.length} global cleanup tasks...`);
    return Promise.all(globalTestCleanupTasks.map(task => {
      try {
        return Promise.resolve(task());
      } catch (error) {
        console.warn('⚠️ Cleanup task failed:', error);
        return Promise.resolve();
      }
    })).then(() => {
      globalTestCleanupTasks = [];
      // console.log('✅ Global cleanup completed');
    });
  });
};

// console.log('🔧 Jest path mapping and cleanup setup loaded');
