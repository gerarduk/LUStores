const path = require('path');

module.exports = (request, options) => {
  // Handle @shared path mapping
  if (request.startsWith('@shared/')) {
    const modulePath = request.replace('@shared/', '');
    const resolvedPath = path.resolve(options.rootDir, 'shared', modulePath);
    
    // Try with .ts extension first
    try {
      return options.defaultResolver(resolvedPath + '.ts', options);
    } catch (e) {
      // Try with .js extension
      try {
        return options.defaultResolver(resolvedPath + '.js', options);
      } catch (e2) {
        // Try without extension (let Node.js resolve)
        try {
          return options.defaultResolver(resolvedPath, options);
        } catch (e3) {
          // Try as index file
          try {
            return options.defaultResolver(path.join(resolvedPath, 'index.ts'), options);
          } catch (e4) {
            try {
              return options.defaultResolver(path.join(resolvedPath, 'index.js'), options);
            } catch (e5) {
              // If all fails, throw the original error
              throw e;
            }
          }
        }
      }
    }
  }
  
  // Fall back to default resolver
  return options.defaultResolver(request, options);
};
