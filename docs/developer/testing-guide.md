# LUStores Testing Guide

## Overview

This document provides comprehensive documentation for the testing infrastructure of the LUStores application. Our testing strategy includes unit tests, integration tests, Docker-based testing, CI/CD integration, and automated reporting.

### Current Test Status

✅ **66/66 tests passing** (100% success rate)  
✅ **8/8 test suites passing**  
✅ **System Management API** fully tested (17 tests)  
✅ **Sales functionality** comprehensively covered (12 tests)  
✅ **E2E testing** complete (18 tests)  
✅ **Integration testing** operational (6 tests)

## Testing Architecture

### Test Types

1. **Unit Tests** (`server/__tests__/`)
   - Test individual functions and methods in isolation
   - Mock external dependencies (database, authentication)
   - Fast execution and immediate feedback
   - Coverage: Sales operations, authentication, middleware, data validation

2. **Integration Tests** (`server/__tests__/integration.working.test.ts`)
   - Test API endpoints end-to-end
   - Test database interactions with mocked data
   - Test cross-module functionality
   - Coverage: HTTP requests, route handling, error responses

3. **System Management Tests** (`server/__tests__/system-management.test.ts`)
   - Test system administration API endpoints
   - Test execution and monitoring capabilities
   - Authentication and authorization validation
   - Coverage: Test execution, system status, deployment monitoring
   - **17 comprehensive tests** covering:
     - `POST /api/system/run-tests` (6 test types: unit, integration, coverage, sales, pipeline, docker)
     - `GET /api/system/tests` (with filtering and pagination)
     - `GET /api/system/status` (system metrics and health)
     - `GET /api/system/deployment` (environment status)

4. **End-to-End Tests** (`server/__tests__/e2e.test.ts`)
   - Full application stack testing
   - Production-like testing scenarios
   - Cross-functional validation
   - Coverage: Authentication flow, sales operations, inventory management, error handling

5. **Docker-based Tests**
   - Tests running in containerized environments
   - Production-like testing scenarios
   - Database integration testing
   - Environment isolation

6. **CI/CD Pipeline Tests**
   - Automated test execution on code changes
   - Test reporting and coverage analysis
   - Pre-deployment validation

### Test Environment

#### Local Testing
- Uses local Node.js environment
- Connects to test database on localhost:5432
- Fast development feedback cycle
- Suitable for development and debugging

#### Docker Testing
- Isolated containerized environment
- Separate test database (port 5433)
- Mirrors production environment
- Suitable for CI/CD and final validation

## Quick Start

### Running Tests Locally

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suite
npm run test:sales

# Run tests for CI environment
npm run test:ci
```

### Docker-based Testing

```bash
# Run basic test suite in Docker
npm run test:docker

# Run specific sales tests in Docker
npm run test:docker-sales

# Run tests with coverage in Docker
npm run test:docker-coverage

# Run integration tests in Docker
npm run test:docker-integration

# Clean up test containers
npm run test:clean
```

## Test Commands Reference

### Core NPM Scripts

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm test` | Run all tests once | Basic test execution |
| `npm run test:watch` | Run tests in watch mode | Development workflow |
| `npm run test:coverage` | Generate coverage report | Code quality analysis |
| `npm run test:ci` | CI-friendly test run | Automated pipelines |
| `npm run test:sales` | Run sales-specific tests | Feature-focused testing |
| `npm run test:integration` | Run integration tests | End-to-end validation |
| `npm run test:all` | Run all test types | Comprehensive testing |

### Docker Testing Commands

| Command | Description | Environment |
|---------|-------------|-------------|
| `npm run test:docker` | Basic Docker test suite | Isolated container |
| `npm run test:docker-sales` | Sales tests in Docker | Feature-specific container |
| `npm run test:docker-coverage` | Coverage in Docker | CI/CD pipeline |
| `npm run test:docker-watch` | Watch mode in Docker | Development container |
| `npm run test:docker-integration` | Integration tests in Docker | Production-like environment |
| `npm run test:clean` | Clean test containers | Cleanup and reset |

### Docker Compose Profiles

```bash
# Run tests with testing profile
docker-compose --profile testing up test --abort-on-container-exit

# Run integration tests
docker-compose --profile integration up test-integration --abort-on-container-exit

# Run pre-deployment tests
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml --profile pre-deploy up test-suite --abort-on-container-exit

# Run production integration tests
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml --profile integration-prod up integration-tests --abort-on-container-exit
```

## Test Configuration

### Jest Configuration

The project uses multiple Jest configurations for different scenarios:

- **`jest.config.js`** - Main configuration with full feature set
- **`jest.config.minimal.js`** - Minimal configuration for quick tests
- **`jest.config.simple.js`** - Simple configuration for basic testing

#### Key Configuration Options

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/**/*.d.ts',
    '!server/__tests__/**',
    // ... exclusions
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['jest-junit', { 
      outputDirectory: './reports/junit/', 
      outputName: 'js-test-results.xml' 
    }]
  ],
  testTimeout: 30000,
  verbose: true
};
```

### Environment Variables for Testing

```bash
# Test environment variables
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@test-db:5432/test_inventory
SESSION_SECRET=test-secret-key
CI=true # For CI environments
TEST_TYPE=integration # For integration tests
```

## Docker Testing Infrastructure

### Test Services in Docker Compose

#### Main Testing Services

1. **test** - Basic unit and integration tests
   ```yaml
   test:
     build: 
       context: .
       target: test
     environment:
       - NODE_ENV=test
       - DATABASE_URL=postgresql://postgres:password@test-db:5432/test_inventory
     command: ["npm", "run", "test:ci"]
     profiles: [testing]
   ```

2. **test-integration** - Integration tests with full stack
   ```yaml
   test-integration:
     depends_on:
       - test-db
       - app
     command: ["npm", "run", "test:integration"]
     profiles: [integration]
   ```

3. **test-db** - Dedicated test database
   ```yaml
   test-db:
     image: postgres:15-alpine
     environment:
       POSTGRES_DB: test_inventory
       POSTGRES_USER: postgres
       POSTGRES_PASSWORD: password
     profiles: [testing, integration]
   ```

#### Production Testing Services

1. **test-suite** - Pre-deployment validation
   ```yaml
   test-suite:
     build: 
       context: .
       target: test
     command: ["npm", "run", "test:ci"]
     profiles: [pre-deploy]
   ```

2. **integration-tests** - Production-like integration testing
   ```yaml
   integration-tests:
     depends_on:
       - app-staging
       - test-db
     command: ["npm", "run", "test:integration"]
     profiles: [integration-prod]
   ```

3. **test-reporter** - Generate and publish test reports
   ```yaml
   test-reporter:
     command: ["node", "scripts/generate-test-reports.js"]
     profiles: [post-test]
   ```

## Test Structure and Organization

### Directory Structure

```
server/__tests__/
├── basic.test.ts                  # Basic functionality tests (2 tests)
├── simple.test.ts                 # Simple test placeholder (1 test)
├── sales.test.ts                  # Advanced sales functionality tests (12 tests)
├── sales.working.test.ts          # Sales feature tests (7 tests)
├── integration.test.ts            # Integration test placeholder (1 test)
├── integration.working.test.ts    # Integration tests (6 tests)
├── e2e.test.ts                    # End-to-end tests (18 tests)
├── system-management.test.ts      # System Management API tests (17 tests)
├── setup.ts                       # Test setup and configuration
├── testApp.ts                     # Test application setup
├── mockStorage.ts                 # Database mocking utilities
└── mockStorage.simple.ts          # Simplified mocks
```

### Test Suite Overview

| Test Suite | Tests | Focus Area | Key Features |
|------------|-------|------------|--------------|
| **System Management** | 17 | API Administration | Test execution, system monitoring, deployment status |
| **End-to-End** | 18 | Full Stack | Authentication, sales flow, inventory, performance |
| **Sales (Advanced)** | 12 | Core Business Logic | Advanced sales operations, analytics, filtering |
| **Sales (Working)** | 7 | Basic Sales | Sale creation, retrieval, data validation |
| **Integration (Working)** | 6 | API Integration | HTTP endpoints, error handling, health checks |
| **Basic** | 2 | Foundation | Basic math operations, test infrastructure |
| **Simple** | 1 | Placeholder | Test framework validation |
| **Integration** | 1 | Placeholder | Integration test framework |

### System Management Test Coverage

The System Management API (`/api/system/*`) provides comprehensive testing and monitoring capabilities:

#### Test Execution Endpoints (`POST /api/system/run-tests`)
- **Unit Tests**: Execute isolated unit test suites
- **Integration Tests**: Run API integration validation
- **Coverage Tests**: Generate code coverage reports
- **Sales Tests**: Execute sales-specific test suites
- **Pipeline Tests**: Run CI/CD pipeline validation
- **Docker Tests**: Execute containerized testing

#### Test Results Endpoints (`GET /api/system/tests`)
- **Test History**: Retrieve historical test results
- **Filtering**: Filter by test type (unit, integration, coverage, etc.)
- **Pagination**: Limit and paginate test results
- **Authentication**: Secure access to test data

#### System Status Endpoints (`GET /api/system/status`)
- **Resource Monitoring**: CPU usage, memory consumption, disk usage
- **Database Status**: Connection health, active connections, uptime
- **System Metrics**: Active sessions, system uptime, timestamps

#### Deployment Status Endpoints (`GET /api/system/deployment`)
- **Environment Monitoring**: Staging, production, development status
- **Version Tracking**: Deployment versions and timestamps
- **Health Checks**: Environment health validation
- **Build Information**: Last build status and GitHub integration

### Test File Naming Conventions

- `*.test.ts` - Unit tests
- `*.working.test.ts` - Working/stable tests
- `*.integration.test.ts` - Integration tests
- `*.broken` - Temporarily disabled tests
- `setup.ts` - Test environment configuration
- `mock*.ts` - Mock implementations

## Sales Testing Strategy

### Core Functionality Tests

1. **Sale Creation**
   ```typescript
   it('should create a sale with valid data', async () => {
     const saleData = {
       chargeCode: 'DEPT001',
       customerInfo: { name: 'Test Customer' },
       items: [{ itemId: 1, quantity: 2 }]
     };
     
     const sale = await storage.createSale(saleData, items);
     expect(sale.saleId).toMatch(/^S\d{8}\d{4}$/);
   });
   ```

2. **Data Validation**
   - Charge code format validation
   - Customer information validation
   - Item quantity validation
   - Stock availability checks

3. **Business Logic**
   - Unique sale ID generation
   - Total amount calculation
   - Stock level updates
   - Movement tracking

4. **Error Handling**
   - Invalid input data
   - Insufficient stock
   - Database connection issues
   - Concurrent access scenarios

### Integration Testing

1. **API Endpoint Testing**
   ```typescript
   describe('POST /api/sales', () => {
     it('should create a sale with valid data', async () => {
       const response = await request(app)
         .post('/api/sales')
         .send(saleData)
         .expect(201);
     });
   });
   ```

2. **Database Integration**
   - Sale record persistence
   - Stock movement recording
   - Transaction consistency
   - Data integrity constraints

3. **Cross-Module Integration**
   - Sales ↔ Inventory integration
   - Sales ↔ Reporting integration
   - Authentication integration
   - Session management

## Running Tests

### PowerShell Automation Script

The `test-automation.ps1` script provides easy access to all test scenarios:

```powershell
# Run unit tests locally
.\test-automation.ps1 unit

# Run sales tests in Docker
.\test-automation.ps1 sales -Docker

# Generate coverage report
.\test-automation.ps1 coverage -Docker

# Run in watch mode for development
.\test-automation.ps1 watch -Local

# Clean up test environment
.\test-automation.ps1 clean
```

### NPM Scripts

```json
{
  "test": "jest",
  "test:sales": "jest --testPathPattern=sales.test.ts",
  "test:ci": "jest --ci --coverage --watchAll=false",
  "test:docker": "docker-compose --profile testing up test --abort-on-container-exit",
  "test:integration": "jest --testPathPattern=integration.test.ts"
}
```

### Docker Compose Commands

```bash
# Run unit tests
docker-compose --profile testing up test --abort-on-container-exit

# Run sales-specific tests
docker-compose --profile testing up test-sales --abort-on-container-exit

# Run with coverage
docker-compose --profile testing up test-coverage --abort-on-container-exit

# Clean up
docker-compose --profile testing down -v
```

## CI/CD Integration

### GitHub Actions Workflow

The CI pipeline includes:

1. **Lint and Type Check**
   - TypeScript compilation
   - Code style validation
   - Static analysis

2. **Unit Tests**
   - Fast feedback on core functionality
   - Coverage reporting
   - Parallel execution

3. **Integration Tests**
   - Full application stack testing
   - Database integration validation
   - API endpoint verification

4. **Docker Tests**
   - Container environment validation
   - Production-like testing
   - Deployment readiness check

5. **Security Scanning**
   - Dependency vulnerability checks
   - Code security analysis
   - Docker image scanning

### Test Artifacts

- **Coverage Reports** - HTML and LCOV formats
- **Test Results** - JUnit XML format
- **Docker Logs** - Container execution logs
- **Security Reports** - Vulnerability scan results

## Coverage Requirements

### Minimum Coverage Thresholds

- **Global Coverage**: 80% lines, 70% branches
- **Sales Module**: 90% lines, 80% branches
- **API Routes**: 85% lines, 75% branches

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal Output**: Quick feedback during development
- **HTML Report**: Detailed visual coverage analysis
- **LCOV**: Machine-readable format for CI tools

## Test Data Management

### Mock Storage Implementation

The `MockStorage` class provides:
- In-memory data persistence
- Reset functionality for test isolation
- Seed data for consistent testing
- Realistic data relationships

### Test Database Setup

```sql
-- Automatic database initialization
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  sale_id VARCHAR(12) UNIQUE NOT NULL,
  charge_code VARCHAR(20) NOT NULL,
  -- ... other fields
);
```

## Best Practices

### Test Organization

1. **Describe Blocks**: Group related tests logically
2. **Setup/Teardown**: Use beforeEach/afterEach for clean state
3. **Descriptive Names**: Clear test descriptions
4. **Single Responsibility**: One assertion per test when possible

### Test Data

1. **Isolation**: Each test should be independent
2. **Realistic Data**: Use representative test data
3. **Edge Cases**: Test boundary conditions
4. **Error Scenarios**: Test failure paths

### Assertions

1. **Specific Assertions**: Test exact expected values
2. **Multiple Assertions**: Verify all relevant aspects
3. **Error Messages**: Provide clear failure descriptions
4. **Type Safety**: Use TypeScript for test safety

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   docker-compose --profile testing ps
   
   # View database logs
   docker-compose --profile testing logs test-db
   ```

2. **Test Timeouts**
   - Increase Jest timeout in configuration
   - Check for hanging promises
   - Verify mock implementations

3. **Coverage Gaps**
   - Review coverage reports
   - Add tests for uncovered branches
   - Update coverage thresholds

### Debug Mode

```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npm run test -- --testPathPattern=sales.test.ts

# Run with debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Complete Testing Procedures

### Step-by-Step Testing Workflows

#### 1. Development Testing Workflow

**Quick Development Testing:**
```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Run basic test suite
npm test

# 3. Run tests in watch mode for active development
npm run test:watch

# 4. Run specific sales tests while developing
npm run test:sales

# 5. Generate coverage report to check test coverage
npm run test:coverage
```

**Development with Docker:**
```bash
# 1. Build and run tests in Docker environment
npm run test:docker

# 2. Run tests with watch mode in Docker
npm run test:docker-watch

# 3. Test sales functionality specifically
npm run test:docker-sales

# 4. Generate coverage in Docker environment
npm run test:docker-coverage

# 5. Clean up Docker containers when done
npm run test:clean
```

#### 2. Pre-Commit Testing Workflow

**Before committing code:**
```bash
# 1. Run all tests with CI configuration
npm run test:ci

# 2. Run integration tests
npm run test:integration

# 3. Run comprehensive test suite
npm run test:all

# 4. Check test coverage meets requirements
npm run test:coverage

# 5. Generate test reports
npm run test:reports
```

#### 3. CI/CD Pipeline Testing Workflow

**Continuous Integration Testing:**
```bash
# 1. Lint and type check
npm run lint:check
npm run check

# 2. Run CI-optimized tests
npm run test:ci

# 3. Run integration tests
npm run test:docker-integration

# 4. Generate and publish test reports
npm run test:reports

# 5. Deploy to staging if all tests pass
npm run deploy:staging
```

#### 4. Pre-Deployment Testing Workflow

**Production Readiness Testing:**
```bash
# 1. Run production test suite
npm run test:prod

# 2. Run end-to-end integration tests
npm run test:e2e

# 3. Generate comprehensive test reports
npm run test:reports

# 4. Run full pipeline test
npm run test:full-pipeline

# 5. Deploy to staging if all tests pass
npm run deploy:staging
```

#### 5. Post-Deployment Validation Workflow

**Production Validation:**
```bash
# 1. Run smoke tests against staging
curl -f http://localhost:3000/health || echo "Health check failed"

# 2. Run integration tests against staging
TEST_URL=http://localhost:3000 npm run test:integration

# 3. Validate database connectivity
npm run db:check || echo "Database check required"

# 4. Deploy to production if validation passes
npm run deploy:prod
```

### Detailed Command Reference

#### Core NPM Test Scripts

| Command | Full Command | Purpose | Duration | Coverage |
|---------|--------------|---------|----------|----------|
| `npm test` | `jest` | Basic test execution | ~30s | No |
| `npm run test:watch` | `jest --watch` | Development testing | Continuous | No |
| `npm run test:coverage` | `jest --coverage` | Coverage analysis | ~45s | Yes |
| `npm run test:sales` | `jest --testPathPattern=sales.test.ts` | Sales feature testing | ~10s | No |
| `npm run test:ci` | `jest --ci --coverage --watchAll=false` | CI/CD testing | ~60s | Yes |
| `npm run test:integration` | `jest --testPathPattern=integration.test.ts` | Integration testing | ~45s | No |
| `npm run test:all` | `npm run test:ci && npm run test:integration` | Comprehensive testing | ~90s | Yes |

#### Docker-based Test Scripts

| Command | Purpose | Environment | Duration |
|---------|---------|-------------|----------|
| `npm run test:docker` | Basic Docker tests | Containerized | ~2min |
| `npm run test:docker-sales` | Sales tests in Docker | Containerized | ~1min |
| `npm run test:docker-coverage` | Coverage in Docker | Containerized | ~3min |
| `npm run test:docker-watch` | Watch mode in Docker | Containerized | Continuous |
| `npm run test:docker-integration` | Integration tests in Docker | Containerized | ~2min |
| `npm run test:clean` | Clean Docker containers | Host | ~30s |

#### Production Testing Scripts

| Command | Purpose | Environment | Duration |
|---------|---------|-------------|----------|
| `npm run test:prod` | Pre-deployment validation | Production-like | ~3min |
| `npm run test:e2e` | End-to-end testing | Production-like | ~5min |
| `npm run test:reports` | Generate test reports | Host | ~1min |
| `npm run test:full-pipeline` | Complete test pipeline | Mixed | ~10min |

#### Utility Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run test:clean` | Clean test containers | After Docker testing |
| `npm run clean:test` | Clean production test env | After production testing |
| `npm run lint` | Fix code style issues | Before committing |
| `npm run lint:check` | Check code style | In CI/CD |
| `npm run check` | TypeScript type checking | Before testing |

### Manual Docker Compose Commands

#### Development Testing Commands

```bash
# Run basic test suite
docker-compose --profile testing up test --abort-on-container-exit

# Run test suite with logs
docker-compose --profile testing up test

# Run integration tests
docker-compose --profile integration up test-integration --abort-on-container-exit

# Run tests in watch mode (development)
docker-compose --profile testing up test-watch

# View test logs
docker-compose --profile testing logs test

# Stop and clean up
docker-compose --profile testing down -v
```

#### Production Testing Commands

```bash
# Run pre-deployment test suite
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile pre-deploy up test-suite --abort-on-container-exit

# Run production integration tests
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile integration-prod up integration-tests --abort-on-container-exit

# Generate test reports
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile post-test up test-reporter --abort-on-container-exit

# Run staging environment
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
    --profile staging up app-staging -d

# Clean up production test environment
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml down -v
```

#### Debugging Commands

```bash
# Run tests with verbose output
docker-compose --profile testing run --rm test npm run test -- --verbose

# Run specific test file
docker-compose --profile testing run --rm test npm test -- --testPathPattern=sales.test.ts

# Access test container shell
docker-compose --profile testing run --rm test /bin/bash

# View test database
docker-compose --profile testing exec test-db psql -U postgres -d test_inventory

# Check container logs
docker-compose --profile testing logs --follow test
```

### Testing Environment Setup Commands

#### Initial Setup

```bash
# 1. Install all dependencies
npm install

# 2. Install additional test dependencies
npm install --save-dev @types/jest ts-jest jest-junit

# 3. Build TypeScript
npm run check

# 4. Initialize test database
docker-compose --profile testing up test-db -d

# 5. Run initial test
npm test
```

#### Environment Reset

```bash
# 1. Clean all Docker containers
npm run test:clean

# 2. Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Clean coverage reports
rm -rf coverage reports

# 4. Rebuild TypeScript
npm run check

# 5. Run fresh test
npm run test:ci
```

### Continuous Integration Commands

#### GitHub Actions Equivalent Commands

```bash
# Lint and type check
npm run lint:check
npm run check

# Install dependencies
npm ci

# Run tests with coverage
npm run test:ci

# Run integration tests
npm run test:docker-integration

# Generate reports
npm run test:reports

# Upload coverage (if using external service)
# bash <(curl -s https://codecov.io/bash)
```

#### Local CI Simulation

```bash
# Simulate complete CI pipeline locally
#!/bin/bash
set -e

echo "Starting CI simulation..."

# 1. Environment setup
echo "Setting up environment..."
npm ci

# 2. Linting and type checking
echo "Running lint and type checks..."
npm run lint:check
npm run check

# 3. Unit tests
echo "Running unit tests..."
npm run test:ci

# 4. Integration tests
echo "Running integration tests..."
npm run test:docker-integration

# 5. Generate reports
echo "Generating test reports..."
npm run test:reports

# 6. Production testing
echo "Running production tests..."
npm run test:prod

echo "CI simulation completed successfully!"
```

### Performance and Load Testing Commands

#### Performance Benchmarks

```bash
# Run performance tests (if implemented)
npm run test:performance

# Benchmark sales operations
npm run benchmark:sales

# Memory usage testing
npm run test:memory

# Database performance testing
npm run test:db-performance
```

#### Load Testing Commands

```bash
# Install load testing tools
npm install --save-dev autocannon

# Run load tests against staging
autocannon -c 10 -d 30 http://localhost:3000/api/sales

# Monitor performance during tests
docker stats $(docker ps --format "{{.Names}}" | grep lustores)
```

### Security Testing Commands

#### Security Scanning

```bash
# Run dependency security audit
npm audit

# Fix security vulnerabilities
npm audit fix

# Run security tests
npm run test:security

# Docker security scan
docker scan lustores:latest
```

### Test Reporting and Analysis Commands

#### Report Generation

```bash
# Generate comprehensive test reports
npm run test:reports

# View coverage report in browser
open coverage/index.html

# View JUnit XML report
cat reports/junit/js-test-results.xml

# Generate custom test summary
node scripts/test-summary.js
```

#### Coverage Analysis

```bash
# Generate detailed coverage
npm run test:coverage -- --coverage --coverageReporters=text-lcov | head -20

# Check coverage thresholds
npm run test:coverage -- --coverage --coverageThreshold='{"global":{"lines":80}}'

# Coverage for specific files
npm run test:coverage -- --collectCoverageFrom="server/routes/*.ts"
```

### Troubleshooting Commands

#### Common Issues Resolution

```bash
# Fix Jest cache issues
npm test -- --clearCache

# Debug hanging tests
npm test -- --detectOpenHandles

# Force exit hanging processes
npm test -- --forceExit

# Run tests with increased timeout
npm test -- --testTimeout=60000

# Debug specific test
npm test -- --testNamePattern="should create sale" --verbose
```

#### Container Issues

```bash
# Rebuild test containers
docker-compose --profile testing build --no-cache

# Remove all test containers
docker-compose --profile testing down -v --remove-orphans

# Check container status
docker-compose --profile testing ps

# View container logs
docker-compose --profile testing logs --tail=50 test

# Check test database connection
docker-compose --profile testing exec test-db pg_isready -U postgres
```

## System Management API Testing Strategy

The System Management API provides comprehensive administrative and monitoring capabilities for the LUStores application. This section documents the 17 tests that validate all system management endpoints.

### Test Execution Management (`POST /api/system/run-tests`)

The test execution endpoint allows administrators to trigger different types of tests programmatically:

```typescript
describe('POST /api/system/run-tests', () => {
  it('should start unit tests successfully', async () => {
    const response = await request(app)
      .post('/api/system/run-tests')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ testType: 'unit' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('unit tests started successfully');
    expect(response.body.result.type).toBe('unit');
  });
});
```

**Supported Test Types:**
- `unit` - Execute isolated unit test suites
- `integration` - Run API integration validation  
- `coverage` - Generate code coverage reports
- `sales` - Execute sales-specific test suites
- `pipeline` - Run CI/CD pipeline validation
- `docker` - Execute containerized testing

**Security & Validation:**
- Authentication required for all test execution
- Test type parameter validation
- Proper error responses for invalid requests

### Test Results Retrieval (`GET /api/system/tests`)

The test results endpoint provides access to historical test data with filtering capabilities:

```typescript
it('should retrieve test results', async () => {
  const response = await request(app)
    .get('/api/system/tests')
    .set('Authorization', `Bearer ${TEST_TOKEN}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  
  const testResult = response.body[0];
  expect(testResult).toHaveProperty('id');
  expect(testResult).toHaveProperty('type');
  expect(testResult).toHaveProperty('status');
  expect(testResult).toHaveProperty('passed');
  expect(testResult).toHaveProperty('failed');
  expect(testResult).toHaveProperty('duration');
  expect(testResult).toHaveProperty('timestamp');
});
```

**Features:**
- Filter by test type (`?type=unit`)
- Pagination support (`?limit=5`)
- Comprehensive test metadata
- Authentication-protected access

### System Status Monitoring (`GET /api/system/status`)

Real-time system health monitoring with detailed resource metrics:

```typescript
it('should retrieve system status', async () => {
  const response = await request(app)
    .get('/api/system/status')
    .set('Authorization', `Bearer ${TEST_TOKEN}`);

  expect(response.status).toBe(200);
  
  // CPU Monitoring
  expect(response.body.cpu.usage).toBeGreaterThanOrEqual(0);
  expect(response.body.cpu.usage).toBeLessThanOrEqual(100);
  
  // Memory Monitoring
  expect(response.body.memory).toHaveProperty('used');
  expect(response.body.memory).toHaveProperty('total');
  expect(response.body.memory).toHaveProperty('usage');
  
  // Database Health
  expect(response.body.database.status).toBe('connected');
  expect(response.body.database).toHaveProperty('connections');
});
```

**Monitored Resources:**
- **CPU**: Usage percentage, core count, load average
- **Memory**: Used memory, total memory, usage percentage
- **Disk**: Used space, total space, usage percentage
- **Database**: Connection status, active connections, uptime
- **System**: Active sessions, system uptime

### Deployment Status Tracking (`GET /api/system/deployment`)

Environment-specific deployment monitoring across all application tiers:

```typescript
it('should retrieve deployment status', async () => {
  const response = await request(app)
    .get('/api/system/deployment')
    .set('Authorization', `Bearer ${TEST_TOKEN}`);

  expect(response.status).toBe(200);
  
  // Environment Status
  const staging = response.body.environments.staging;
  expect(staging).toHaveProperty('status');
  expect(staging).toHaveProperty('version');
  expect(staging).toHaveProperty('health');
  expect(staging).toHaveProperty('lastDeployed');
});
```

**Environment Tracking:**
- **Staging Environment**: Status, version, health, deployment timestamp
- **Production Environment**: Live deployment monitoring
- **Development Environment**: Local development status
- **Build Information**: Last build status, GitHub integration
- **Version Control**: Current versions across environments

### Integration Testing Workflow

Complete system management testing workflow validation:

```typescript
it('should run a complete test cycle', async () => {
  // 1. Execute tests
  const runResponse = await request(app)
    .post('/api/system/run-tests')
    .send({ testType: 'unit' });
  
  // 2. Verify test results
  const resultsResponse = await request(app)
    .get('/api/system/tests');
  
  // 3. Check system health
  const statusResponse = await request(app)
    .get('/api/system/status');
  
  // 4. Validate deployment status
  const deploymentResponse = await request(app)
    .get('/api/system/deployment');
});
```

This comprehensive testing ensures that administrators can reliably monitor, execute, and validate all aspects of the LUStores system through the web interface.
