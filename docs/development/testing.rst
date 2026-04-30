Testing and Quality Assurance
=============================

The LUStores application includes comprehensive testing infrastructure with automated CI/CD pipelines, code coverage reporting, performance testing, and integration with the documentation system.

Test Types
----------

Unit Tests
~~~~~~~~~~
- **Location**: ``server/__tests__/``
- **Framework**: Jest with TypeScript support via tsx
- **Coverage**: Automated code coverage with lcov reports
- **Database**: PostgreSQL 15 Alpine service container
- **Command**: ``npm run test`` or ``npm run test:ci``

Integration Tests
~~~~~~~~~~~~~~~~~
- **Purpose**: Test API endpoints and database interactions
- **Environment**: Isolated test database with Docker Compose
- **Docker Profile**: ``--profile integration``
- **Command**: ``npm run test:integration``

Performance Tests
~~~~~~~~~~~~~~~~~
- **Tool**: k6 load testing framework
- **Location**: ``performance-tests/load-test.js``
- **Scope**: API health checks, authentication, and public endpoints
- **Triggers**: Main branch pushes only
- **Environment**: Full Docker Compose stack

Security Tests
~~~~~~~~~~~~~~
- **npm audit**: Dependency vulnerability scanning
- **Retire.js**: JavaScript library vulnerability detection
- **Trivy**: Filesystem vulnerability scanning with SARIF output
- **CodeQL**: GitHub's security analysis (via SARIF upload)

End-to-End Tests
~~~~~~~~~~~~~~~~
- **Scope**: Full application testing with Docker
- **Environment**: Production-like containers
- **Command**: ``docker compose --profile testing up test``

Running Tests
-------------

Local Development
~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Run all unit tests
   npm run test

   # Run tests in watch mode
   npm run test:watch

   # Run with coverage report
   npm run test:coverage

   # Run specific test suite
   npm run test:sales

   # Run charge codes tests
   npm run test:charge-codes

   # Run integration tests
   npm run test:integration

Docker Testing
~~~~~~~~~~~~~~

.. code-block:: bash

   # Start full application stack
   docker compose up -d

   # Run unit tests in Docker
   docker compose --profile testing up test --abort-on-container-exit

   # Run integration tests
   docker compose --profile integration up test-integration --abort-on-container-exit

   # Performance testing with k6
   k6 run performance-tests/load-test.js

GitHub Actions CI/CD Pipeline
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The automated testing pipeline includes multiple parallel and sequential jobs:

**Parallel Jobs:**
1. **Setup Dependencies**: Caches Node.js dependencies and Docker layers
2. **Lint and Type Check**: ESLint and TypeScript compilation checks
3. **Test**: Unit tests with PostgreSQL service container
4. **Security Scan**: Multiple security tools (npm audit, Retire.js, Trivy)

**Sequential Jobs:**
5. **Docker Build and Test**: Container building and Docker-based testing
6. **Performance Tests**: k6 load testing (main branch only)
7. **Integration Tests**: Full stack testing with Docker Compose
8. **Test Reports**: Aggregated reporting and artifact generation
9. **Build Docs**: Documentation generation with test results
10. **Deploy Docs**: GitHub Pages deployment with dashboard

**Pipeline Features:**
- **Caching Strategy**: Node modules and Docker layer caching
- **Artifact Management**: Test reports, coverage, security scans
- **Documentation Integration**: Auto-generated CI/CD dashboard
- **Multi-Environment**: Development, testing, staging, production
- **Performance Monitoring**: k6 load testing with thresholds

Current Test Coverage
~~~~~~~~~~~~~~~~~~~~~

The LUStores application maintains comprehensive test coverage across all major components:

- **85+ tests passing** across multiple test suites (100% success rate)
- **System Management API**: Administrative endpoints and monitoring
- **Sales Functionality**: Core business operations and workflows
- **End-to-End Testing**: Full application stack validation
- **Integration Testing**: API endpoint and database integration
- **Performance Testing**: Load testing with k6 (main branch)
- **Security Testing**: Vulnerability scanning and SARIF reporting

Test Reports and Dashboard
--------------------------

Test reports are automatically generated and integrated into the documentation dashboard:

**CI/CD Dashboard**: https://st7ma784.github.io/LUStores/
- **Test Reports**: Detailed Jest test execution results
- **Coverage Reports**: Interactive lcov HTML reports
- **Performance Tests**: k6 load testing results with metrics
- **Security Scans**: Vulnerability reports and SARIF analysis
- **API Documentation**: Auto-generated TypeScript API documentation

**Report Locations:**
- **Test Results**: ``/reports/html/test-report.html``
- **Coverage Reports**: ``/coverage/lcov-report/index.html``
- **Performance Tests**: ``/performance/index.html``
- **Security Reports**: ``/security/index.html``
- **API Documentation**: ``/api/index.html`` (https://st7ma784.github.io/LUStores/api/index.html)

Coverage Requirements and Quality Gates
---------------------------------------

The project maintains the following coverage targets and quality gates:

**Coverage Thresholds:**
- **Statements**: 70% minimum (currently exceeding)
- **Branches**: 60% minimum (currently exceeding)
- **Functions**: 70% minimum (currently exceeding)
- **Lines**: 70% minimum (currently exceeding)

**Performance Thresholds (k6):**
- **Response Time**: 95% of requests under 500ms
- **Error Rate**: Below 10% for all endpoints
- **Health Check**: Response time under 200ms
- **Authentication**: Login flow under 500ms

**Security Quality Gates:**
- **npm audit**: Critical vulnerabilities fail the build
- **Trivy**: High/Critical severity findings reported
- **Retire.js**: Known vulnerable libraries detected
- **SARIF Upload**: Security findings visible in GitHub Security tab

**CI/CD Quality Gates:**
- All unit tests must pass (100% success rate required)
- TypeScript compilation must succeed
- Docker images must build successfully
- Performance tests must meet response time thresholds
- Security scans complete (warnings allowed, failures investigated)  
- **Functions**: 80% minimum
- **Lines**: 70% minimum

Test Configuration
------------------

Jest Configuration
~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   // jest.config.js
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     collectCoverageFrom: [
       'server/**/*.ts',
       '!server/**/*.d.ts',
       '!server/__tests__/**'
     ],
     coverageReporters: ['text', 'lcov', 'html'],
     reporters: [
       'default',
       ['jest-junit', { 
         outputDirectory: './reports/junit/', 
         outputName: 'js-test-results.xml' 
       }]
     ]
   };

Docker Test Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: yaml

   # docker-compose.test-prod.yml
   services:
     test-suite:
       build: 
         context: .
         target: test
       environment:
         - NODE_ENV=test
         - CI=true
       command: ["npm", "run", "test:ci"]

Best Practices
--------------

Writing Tests
~~~~~~~~~~~~~

1. **Use descriptive test names**: Clearly describe what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies**: Use Jest mocks for database and API calls
4. **Test edge cases**: Include boundary conditions and error scenarios

Example Test Structure:

.. code-block:: typescript

   describe('Sales API', () => {
     describe('POST /api/sales', () => {
       it('should create a sale with valid data', async () => {
         // Arrange
         const saleData = { /* valid sale data */ };
         
         // Act
         const response = await request(app)
           .post('/api/sales')
           .send(saleData);
         
         // Assert
         expect(response.status).toBe(201);
         expect(response.body).toHaveProperty('id');
       });
     });
   });

Continuous Integration
~~~~~~~~~~~~~~~~~~~~~~

1. **Pre-commit hooks**: Run linting and basic tests before commits
2. **Pull request validation**: Full test suite on PR creation
3. **Deployment gates**: Tests must pass before production deployment
4. **Automated reporting**: Test results posted to PRs and documentation

Test Data Management
~~~~~~~~~~~~~~~~~~~~

1. **Isolated test database**: Separate database for testing
2. **Seed data**: Consistent test data setup
3. **Cleanup**: Reset state between tests
4. **Mock data**: Use realistic but fake data

Troubleshooting
---------------

Common Issues
~~~~~~~~~~~~~

**Tests timing out**:
- Increase ``testTimeout`` in Jest configuration
- Check for unresolved promises or hanging connections

**Coverage not updating**:
- Clear Jest cache: ``npm run test -- --clearCache``
- Check ``collectCoverageFrom`` patterns

**Docker tests failing**:
- Ensure test database is healthy before running tests
- Check environment variables and network connectivity

**Mock issues**:
- Verify mock setup in ``__tests__/setup.ts``
- Ensure mocks are cleared between tests

Debugging Tests
~~~~~~~~~~~~~~~

.. code-block:: bash

   # Run tests with debugging
   npm run test -- --verbose

   # Run specific test file
   npm run test -- auth.test.ts

   # Run tests with coverage
   npm run test:coverage

   # Debug in Docker
   docker-compose logs test-suite
