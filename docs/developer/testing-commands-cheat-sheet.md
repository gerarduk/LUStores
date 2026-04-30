# LUStores Testing Commands Cheat Sheet

## Quick Start Commands

### Essential Daily Commands
```bash
npm test                    # Run all tests quickly
npm run test:watch         # Development with auto-reload
npm run test:coverage      # Check test coverage
npm run test:sales         # Test sales functionality only
```

### Before Committing
```bash
npm run test:ci            # CI-ready tests with coverage
npm run test:all           # Comprehensive test suite
npm run lint               # Fix code style issues
```

### Docker Testing
```bash
npm run test:docker        # Run tests in container
npm run test:clean         # Clean up containers
```

## Complete Command Reference

### Local Testing Commands

| Command | Description | Duration | Output |
|---------|-------------|----------|---------|
| `npm test` | Basic test run | ~30s | Console |
| `npm run test:watch` | Watch mode for development | Continuous | Console |
| `npm run test:coverage` | Generate coverage report | ~45s | HTML + Console |
| `npm run test:sales` | Sales feature tests only | ~10s | Console |
| `npm run test:ci` | CI-optimized with coverage | ~60s | XML + HTML |
| `npm run test:integration` | Integration tests | ~45s | Console |
| `npm run test:all` | All tests comprehensive | ~90s | Multiple |

### Docker Testing Commands

| Command | Description | Environment | Duration |
|---------|-------------|-------------|----------|
| `npm run test:docker` | Basic Docker tests | Container | ~2min |
| `npm run test:docker-sales` | Sales tests in Docker | Container | ~1min |
| `npm run test:docker-coverage` | Coverage in Docker | Container | ~3min |
| `npm run test:docker-watch` | Docker watch mode | Container | Continuous |
| `npm run test:docker-integration` | Docker integration tests | Container | ~2min |
| `npm run test:clean` | Clean Docker containers | Host | ~30s |

### Production Testing Commands

| Command | Description | Environment | Duration |
|---------|-------------|-------------|----------|
| `npm run test:prod` | Pre-deployment validation | Prod-like | ~3min |
| `npm run test:e2e` | End-to-end testing | Prod-like | ~5min |
| `npm run test:reports` | Generate test reports | Host | ~1min |
| `npm run test:full-pipeline` | Complete pipeline | Mixed | ~10min |

### Utility Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run test:clean` | Clean test containers | After Docker testing |
| `npm run clean:test` | Clean production test env | After prod testing |
| `npm run lint` | Fix code style | Before committing |
| `npm run lint:check` | Check code style | In CI |
| `npm run check` | TypeScript check | Before testing |

## Docker Compose Commands

### Development Testing
```bash
# Basic test suite
docker-compose --profile testing up test --abort-on-container-exit

# Integration tests
docker-compose --profile integration up test-integration --abort-on-container-exit

# Watch mode
docker-compose --profile testing up test-watch

# Clean up
docker-compose --profile testing down -v
```

### Production Testing
```bash
# Pre-deployment tests
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile pre-deploy up test-suite --abort-on-container-exit

# Integration tests
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile integration-prod up integration-tests --abort-on-container-exit

# Generate reports
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile post-test up test-reporter --abort-on-container-exit

# Clean up
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml down -v
```

## Jest Direct Commands

### Test Execution
```bash
# Run all tests
jest

# Run specific test file
jest sales.test.ts

# Run tests matching pattern
jest --testNamePattern="create sale"

# Run tests for specific file pattern
jest --testPathPattern=sales

# Run with coverage
jest --coverage

# Run in watch mode
jest --watch

# Run with verbose output
jest --verbose
```

### Debugging Options
```bash
# Debug hanging handles
jest --detectOpenHandles

# Force exit
jest --forceExit

# Clear cache
jest --clearCache

# Update snapshots
jest --updateSnapshot

# Run specific test suite
jest --testPathPattern=integration.test.ts

# Run with increased timeout
jest --testTimeout=60000
```

## Environment Setup

### Required Environment Variables
```bash
export NODE_ENV=test
export DATABASE_URL=postgresql://postgres:password@localhost:5432/test_inventory
export SESSION_SECRET=test-secret-key
export CI=true                    # For CI environments
export TEST_TYPE=integration      # For integration tests
```

### Database Setup
```bash
# Start test database
docker-compose --profile testing up test-db -d

# Check database status
docker-compose --profile testing exec test-db pg_isready -U postgres

# Access test database
docker-compose --profile testing exec test-db psql -U postgres -d test_inventory

# Stop test database
docker-compose --profile testing stop test-db
```

## Common Workflows

### Development Workflow
```bash
# 1. Start development
npm run test:watch

# 2. Run specific tests
npm run test:sales

# 3. Check coverage
npm run test:coverage

# 4. Before commit
npm run test:ci
```

### CI/CD Workflow
```bash
# 1. Install dependencies
npm ci

# 2. Type checking
npm run check

# 3. Linting
npm run lint:check

# 4. Run tests
npm run test:ci

# 5. Integration tests
npm run test:docker-integration

# 6. Generate reports
npm run test:reports
```

### Pre-Deployment Workflow
```bash
# 1. Run production tests
npm run test:prod

# 2. Run E2E tests
npm run test:e2e

# 3. Generate reports
npm run test:reports

# 4. Full pipeline
npm run test:full-pipeline

# 5. Deploy if all pass
npm run deploy:staging
```

## Debugging Commands

### Local Debugging
```bash
# Debug specific test
npm test -- --testNamePattern="should create sale" --verbose

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug hanging tests
npm test -- --detectOpenHandles --forceExit

# Clear Jest cache
npm test -- --clearCache
```

### Container Debugging
```bash
# Access test container
docker-compose --profile testing run --rm test /bin/bash

# View container logs
docker-compose --profile testing logs --follow test

# Run single test in container
docker-compose --profile testing run --rm test npm test -- sales.test.ts

# Check container status
docker-compose --profile testing ps
```

## File Locations

### Test Files
- **Unit Tests**: `server/__tests__/*.test.ts`
- **Integration Tests**: `server/__tests__/integration.working.test.ts`
- **Sales Tests**: `server/__tests__/sales.working.test.ts`
- **Mock Setup**: `server/__tests__/mockStorage.ts`

### Configuration Files
- **Jest Config**: `jest.config.js`
- **Test Environment**: `server/__tests__/setup.ts`
- **Docker Compose**: `docker-compose.test-prod.yml`
- **TypeScript Config**: `tsconfig.test.json`

### Reports and Coverage
- **Test Reports**: `reports/junit/js-test-results.xml`
- **Coverage HTML**: `coverage/index.html`
- **Coverage Data**: `coverage/lcov.info`
- **Test Dashboard**: `docs/_build/html/test-reports/index.html`

## Error Resolution

### Common Fixes
```bash
# Port already in use
npx kill-port 3000

# Module resolution issues
rm -rf node_modules package-lock.json && npm install

# Docker permission issues
sudo chmod +x scripts/*.sh

# Test database connection issues
docker-compose --profile testing restart test-db

# Jest cache issues
jest --clearCache && npm test
```

### Container Issues
```bash
# Rebuild containers
docker-compose --profile testing build --no-cache

# Remove orphaned containers
docker-compose --profile testing down --remove-orphans

# Clean Docker system
docker system prune -f

# Reset test environment
npm run test:clean && npm run test:docker
```

## Performance Tips

### Faster Testing
```bash
# Run tests in parallel
jest --maxWorkers=4

# Run only changed files (in Git repo)
jest --onlyChanged

# Skip coverage for speed
jest --passWithNoTests

# Use minimal config for speed
jest --config=jest.config.minimal.js
```

### Resource Management
```bash
# Limit memory usage
node --max-old-space-size=4096 node_modules/.bin/jest

# Monitor resource usage
docker stats $(docker ps --format "{{.Names}}" | grep test)

# Clean up resources
npm run test:clean && docker system prune -f
```

## Integration with IDEs

### VS Code Integration
- Install Jest extension for VS Code
- Use integrated terminal for `npm run test:watch`
- Configure test debugging in launch.json
- Use test coverage extensions

### Command Line Integration
```bash
# Generate VS Code launch config
echo '{"type": "node", "request": "launch", "program": "${workspaceFolder}/node_modules/.bin/jest", "args": ["--runInBand"]}' > .vscode/launch.json
```

For detailed information, see the [Complete Testing Guide](testing-guide.md).
