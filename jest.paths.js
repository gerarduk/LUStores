// Jest path mapping setup (NO jest-dom, safe for globalSetup)
const path = require('path');

// Set up module aliases by monkey-patching Node.js module resolution
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain) {
  if (request.startsWith('@shared/')) {
    const modulePath = request.replace('@shared/', '');
    const resolvedPath = path.resolve(__dirname, 'shared', modulePath);

    // Try with .ts extension first
    try {
      const result = originalResolveFilename.call(this, resolvedPath + '.ts', parent, isMain);
      return result;
    } catch (e) {
      // Try with .js extension
      try {
        const result = originalResolveFilename.call(this, resolvedPath + '.js', parent, isMain);
        return result;
      } catch (e2) {
        // Try without extension
        try {
          const result = originalResolveFilename.call(this, resolvedPath, parent, isMain);
          return result;
        } catch (e3) {
          console.log(`⚠️  @shared/schema not found, trying relative path...`);
          // Fall back to original request
          return originalResolveFilename.call(this, request, parent, isMain);
        }
      }
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain);
};
