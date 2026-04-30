# Multi-stage build for production
FROM node:25-alpine AS deps

# Install build dependencies only in deps stage
RUN apk add --no-cache \
    python3 \
    make \
    g++


WORKDIR /app

# Copy only package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm list decimal.js

# Production build stage - compile TypeScript and bundle
FROM deps AS build


# Install build-only tools
RUN apk add --no-cache python3 py-pip

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from deps FIRST (better caching)
COPY --from=deps /app/node_modules ./node_modules

# Verify node_modules was copied
RUN echo "Node modules after copy from deps:" && \
    du -sh ./node_modules && \
    ls -la node_modules/ | head -20 && \
    ls node_modules/ | grep -i decimal || echo "WARNING: decimal not found in initial copy"

# Copy source files AFTER node_modules
COPY . .

# Reinstall to ensure all dependencies are present
RUN echo "Ensuring dependencies present during build..." && \
    npm ci --no-progress && \
    echo "After npm ci:" && \
    npm list decimal.js || (echo "FAILED: decimal.js missing!" && exit 1) && \
    ls -la node_modules/ | grep decimal || (echo "CRITICAL ERROR: decimal.js folder missing!" && exit 1)

# Remove any .jsx files that might have been copied (they shouldn't be in source)
RUN find . -name "*.jsx" -type f -delete

# Build with optimizations
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Build documentation (optional - set SKIP_DOCS=1 to skip)
ARG SKIP_DOCS=0
RUN if [ "$SKIP_DOCS" = "0" ]; then \
      cd docs && \
      python3 -m pip install --no-cache-dir --break-system-packages \
        sphinx sphinx-rtd-theme sphinxcontrib-openapi myst-parser sphinxcontrib-mermaid && \
      python3 -m sphinx -b html . _build/html; \
    else \
      mkdir -p docs/_build/html && echo "Documentation build skipped" > docs/_build/html/index.html; \
    fi

# Development stage
FROM deps AS development

# Install development runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Reinstall to ensure dev dependencies are available and verify critical packages
RUN npm ci && \
    npm list decimal.js

EXPOSE 5000 5173
CMD ["npm", "run", "dev"]

# Test stage
FROM deps AS test

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Reinstall to ensure dev dependencies are available and verify critical packages
RUN npm ci && \
    npm list decimal.js

ENV NODE_ENV=test
EXPOSE 5000
CMD ["npm", "run", "test"]

# E2E Test stage with Playwright
FROM mcr.microsoft.com/playwright:v1.48.2-focal AS e2e-test

WORKDIR /app

# Install Node.js on top of Playwright image
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs

COPY package*.json ./
RUN npm ci && \
    npm list decimal.js

COPY . .

ENV NODE_ENV=test
ENV CI=true

EXPOSE 5000
CMD ["npm", "run", "test:e2e-comprehensive"]

# Production stage - minimal runtime image
FROM node:25-alpine AS production

# Install only runtime dependencies (no build tools)
RUN apk add --no-cache \
    postgresql-client \
    wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from build stage (already has all dependencies installed)
COPY --from=build /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/docs/_build/html ./docs/_build/html
COPY --from=build /app/shared ./shared

# Verify critical dependencies exist
RUN echo "Node modules contents:" && \
    du -sh /app/node_modules && \
    ls -la node_modules/ | head -20 && \
    ls -la node_modules/ | grep -E "decimal" && \
    npm list decimal.js || \
    (echo "ERROR: decimal.js missing from node_modules!" && exit 1)

# Change ownership
RUN chown -R appuser:nodejs /app
USER appuser

# Set production environment
ENV NODE_ENV=production

EXPOSE 5000

# Health check with longer timeout to allow for database connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -nv --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]
