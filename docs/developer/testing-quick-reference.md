# Testing Quick Reference

## Essential Commands

### Local Development
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
npm run test:sales         # Run sales-specific tests
```

### Docker Testing
```bash
npm run test:docker        # Basic Docker tests
npm run test:docker-coverage # Docker tests with coverage
npm run test:clean         # Clean up test containers
```

### CI/CD Commands
```bash
npm run test:ci            # CI-friendly test execution
npm run test:all           # Run comprehensive test suite
```

## Docker Compose Profiles

### Development Testing
```bash
# Basic test suite
docker-compose --profile testing up test --abort-on-container-exit

# Integration tests
docker-compose --profile integration up test-integration --abort-on-container-exit

# Watch mode for development
docker-compose --profile testing up test-watch
```

### Production Testing
```bash
# Pre-deployment validation
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
  --profile pre-deploy up test-suite --abort-on-container-exit

# Production-like integration tests
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
  --profile integration-prod up integration-tests --abort-on-container-exit

# Generate test reports
docker-compose -f docker-compose.yml -f docker-compose.test-prod.yml \
  --profile post-test up test-reporter --abort-on-container-exit
```

## Test File Locations

- **Unit Tests**: `server/__tests__/*.test.ts`
- **System Management Tests**: `server/__tests__/system-management.test.ts`
- **End-to-End Tests**: `server/__tests__/e2e.test.ts`
- **Integration Tests**: `server/__tests__/integration.working.test.ts`
- **Sales Tests**: `server/__tests__/sales.test.ts`, `server/__tests__/sales.working.test.ts`
- **Test Configuration**: `jest.config.js`
- **Mock Setup**: `server/__tests__/mockStorage.ts`
- **Test Reports**: `reports/junit/js-test-results.xml`
- **Coverage Reports**: `coverage/index.html`

## Environment Variables

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@test-db:5432/test_inventory
SESSION_SECRET=test-secret-key
CI=true                    # For CI environments
TEST_TYPE=integration      # For integration tests
```

## Test Status

- ✅ **66 tests passing** across 8 test suites
- ✅ **System Management API** fully tested (17 tests)
- ✅ **Sales functionality** comprehensive coverage (19 tests)
- ✅ **End-to-end testing** complete (18 tests)
- ✅ **Integration testing** operational (7 tests)
- ✅ **JUnit XML reporting** configured
- ✅ **Coverage reporting** with HTML output
- ✅ **Docker test infrastructure** ready
- ✅ **CI/CD integration** prepared
- ✅ **Mock implementations** for database operations

## Quick Debugging

```bash
# Run specific test
npm test -- --testPathPattern=sales.test.ts

# Debug test output
DEBUG=* npm test

# Force exit hanging tests
npm test -- --forceExit

# Verbose test output
npm test -- --verbose
```

## Reports and Coverage

- **Test Results**: [View JUnit XML](../reports/junit/js-test-results.xml)
- **Coverage Report**: [View HTML Report](../coverage/index.html)
- **Documentation**: [View Documentation](_build/html/index.html)

For detailed information, see the [Complete Testing Guide](testing-guide.md).

## Test Automation Scripts

### Interactive Test Automation (Linux/macOS)
```bash
# Run interactive test menu
./scripts/test-automation.sh

# Run specific commands
./scripts/test-automation.sh local basic
./scripts/test-automation.sh docker coverage
./scripts/test-automation.sh production pre-deploy
./scripts/test-automation.sh comprehensive
```

### Interactive Test Automation (Windows)
```powershell
# Run interactive test menu
.\scripts\test-automation.ps1

# Run specific commands
.\scripts\test-automation.ps1 local basic
.\scripts\test-automation.ps1 docker coverage
.\scripts\test-automation.ps1 production pre-deploy
.\scripts\test-automation.ps1 comprehensive
```

### Automation Script Features
- ✅ Interactive menu with 18 testing options
- ✅ Comprehensive prerequisite checking
- ✅ Automated environment setup
- ✅ Colored output and detailed logging
- ✅ Cross-platform support (Bash + PowerShell)
- ✅ Error handling and cleanup
- ✅ Test status monitoring
- ✅ Report generation and integration
