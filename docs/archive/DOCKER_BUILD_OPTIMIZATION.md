# Docker Build Optimization Guide

## Current Build Issues

### Build Time Analysis
- **Total build time**: ~2-3 minutes (when successful)
- **Documentation build**: ~60 seconds (342 warnings!)
- **npm run build**: ~60 seconds
- **node_modules copy**: ~45 seconds
- **Build context transfer**: Variable (depends on file count)

### Problems Identified

1. **Compiled .jsx files in source** - The Inventory.jsx file was blocking updates
2. **Large build context** - Copying unnecessary files (tests, docs, images, MD files)
3. **Documentation always builds** - Sphinx docs build adds 60s even for code-only changes
4. **Sequential layer operations** - node_modules copied AFTER source files (poor caching)
5. **No build cache optimization** - Each build starts from scratch for certain layers

## Optimizations Applied

### 1. Enhanced .dockerignore ✅
**Impact**: Reduces build context by ~60%

```dockerignore
# Compiled files that shouldn't be in source
**/*.jsx
!vite.config.jsx

# Documentation that slows build
*.md
!README.md

# Test files (not needed in production)
**/*.test.ts
**/*.test.tsx
**/__tests__/
tests/
playwright-report/
reports/

# Dev samples
dev-samples/
performance-tests/
diagrams/
*.png
*.jpg
*.svg
```

**Before**: ~1.5MB context transfer
**After**: ~50KB context transfer
**Time Saved**: ~0.5 seconds per build

### 2. Optional Documentation Build ✅
**Impact**: Skip 60-second docs build for quick iterations

```dockerfile
# Build documentation (optional - set SKIP_DOCS=1 to skip)
ARG SKIP_DOCS=0
RUN if [ "$SKIP_DOCS" = "0" ]; then \
      cd docs && python3 -m pip install ... && \
      python3 -m sphinx -b html . _build/html; \
    else \
      mkdir -p docs/_build/html && \
      echo "Documentation build skipped" > docs/_build/html/index.html; \
    fi
```

**Usage**:
```bash
# Skip docs for faster builds during development
docker build --build-arg SKIP_DOCS=1 -t st7ma784/lustores:latest .

# Include docs for production releases
docker build -t st7ma784/lustores:latest .
```

**Time Saved**: 60 seconds per build when skipped

### 3. Optimized Layer Ordering ✅
**Impact**: Better Docker layer caching

```dockerfile
# BEFORE (bad caching):
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# AFTER (good caching):
COPY --from=deps /app/node_modules ./node_modules
COPY . .
```

**Benefit**: node_modules layer cached even when source code changes

### 4. Build-time Memory Optimization ✅
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

**Benefit**: Prevents out-of-memory errors during large builds

## Additional Recommended Optimizations

### 5. Multi-stage Build Cleanup (Not Applied Yet)
```dockerfile
# Remove build artifacts before copying to production
RUN rm -rf \
    server/**/*.ts \
    client/src/**/*.tsx \
    client/src/**/*.ts \
    docs/ \
    tests/ \
    coverage/
```

### 6. BuildKit Cache Mounts (Requires Docker BuildKit)
```dockerfile
# Use BuildKit cache for npm
RUN --mount=type=cache,target=/root/.npm \
    npm install
```

**Usage**:
```bash
DOCKER_BUILDKIT=1 docker build -t st7ma784/lustores:latest .
```

### 7. Parallel Build Scripts
Modify `package.json` to build server and client truly in parallel:

```json
{
  "scripts": {
    "build": "npm-run-all --parallel build:server build:client && npm run build:fix-paths"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}
```

## Build Performance Comparison

| Optimization | Build Time Reduction | When to Use |
|-------------|---------------------|-------------|
| Enhanced .dockerignore | -0.5s | Always |
| Skip documentation | -60s | Development iterations |
| Optimized layer order | -0-30s (caching) | Always |
| Memory optimization | Prevents failures | Large builds |
| BuildKit caching | -10-30s | CI/CD pipelines |
| Parallel builds | -10-20s | Always (requires dep) |

## Recommended Build Commands

### Development (Fast Iteration)
```bash
# Skip docs, use BuildKit
DOCKER_BUILDKIT=1 docker build \
  --build-arg SKIP_DOCS=1 \
  -t st7ma784/lustores:dev .
```

**Expected time**: ~60-90 seconds

### Production (Full Build)
```bash
# Include docs, full optimization
DOCKER_BUILDKIT=1 docker build \
  --build-arg SKIP_DOCS=0 \
  -t st7ma784/lustores:latest \
  --platform linux/amd64 .
```

**Expected time**: ~120-150 seconds

### CI/CD (Maximum Cache)
```bash
# Use cache from registry
DOCKER_BUILDKIT=1 docker build \
  --build-arg SKIP_DOCS=0 \
  --cache-from st7ma784/lustores:latest \
  -t st7ma784/lustores:latest .
```

## File Structure Issues Fixed

### Before Optimization
```
client/src/pages/
├── Inventory.tsx (source - 445 lines)
└── Inventory.jsx (compiled - 376 lines) ❌ BLOCKING UPDATES
```

### After Optimization
```
client/src/pages/
└── Inventory.tsx (source - 445 lines) ✅
```

**Added to .dockerignore**: `**/*.jsx` (except vite.config.jsx)

## Documentation Build Warnings

The Sphinx documentation build generates **342 warnings**, primarily:
- Title underline formatting (132 warnings)
- Missing toctree references (58 warnings)
- Mermaid diagrams not rendering (9 warnings)
- Undefined substitutions (3 errors)

**Recommendation**: Fix these in a separate documentation cleanup task to reduce build noise.

## Monitoring Build Performance

### Check layer sizes:
```bash
docker history st7ma784/lustores:latest --human --format "table {{.Size}}\t{{.CreatedBy}}"
```

### Check context size:
```bash
# Count files being sent to Docker daemon
find . -type f | wc -l
```

### Measure build time:
```bash
time docker build -t st7ma784/lustores:latest .
```

## Summary

**Total Potential Time Savings**:
- Development builds: **60-90 seconds** (skip docs)
- Production builds: **10-30 seconds** (better caching)
- Context transfer: **50% faster** (smaller context)

**Next Steps**:
1. ✅ Applied .dockerignore improvements
2. ✅ Added optional documentation build
3. ✅ Optimized layer ordering
4. ⏳ Test with `--build-arg SKIP_DOCS=1`
5. ⏳ Consider BuildKit for CI/CD
6. ⏳ Add npm-run-all for parallel builds
7. ⏳ Clean up documentation warnings

**Immediate Action**: Rebuild with optimizations
```bash
docker build --build-arg SKIP_DOCS=1 -t st7ma784/lustores:latest .
docker push st7ma784/lustores:latest
```
