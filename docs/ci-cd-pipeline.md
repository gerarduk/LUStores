# LUStores CI/CD Pipeline Documentation

## Overview

This document describes the comprehensive Continuous Integration and Continuous Deployment (CI/CD) pipeline for the LUStores application. The pipeline is designed to ensure code quality, security, and reliable deployments through automated testing, security scanning, performance testing, and deployment processes.

## Pipeline Architecture

### Pipeline Stages

```text
graph TD
    A[Code Commit] --> B[Setup Dependencies]
    B --> C[Lint & Type Check]
    B --> D[Unit Tests]
    B --> E[Security Scan]
    D --> F[Docker Build & Test]
    C --> F
    E --> F
    F --> G[Performance Tests]
    F --> H[Integration Tests]
    G --> I[Test Reports]
    H --> I
    I --> J[Build Documentation]
    J --> K[Deploy Documentation]
    K --> L[GitHub Pages]
```

### Job Execution Strategy

**Parallel Execution Jobs:**
- Setup Dependencies (caching)
- Lint and Type Check
- Unit Tests (with PostgreSQL)
- Security Scan

**Sequential Jobs:**
- Docker Build and Test (depends on setup, test)
- Performance Tests (depends on docker-build, main branch only)
- Integration Tests (depends on docker-build)
- Test Reports (depends on all test jobs)
- Build Documentation (depends on test-reports)
- Deploy Documentation (depends on build-docs, main branch only)

## Detailed Job Breakdown

### 1. Setup Dependencies

**Purpose**: Centralized dependency management and caching
**Runs on**: All pushes and pull requests
**Outputs**: Cache keys for Node.js and Docker layers

#### Features:
- **Node.js Caching**: npm dependencies cached across workflow runs
- **Docker Layer Caching**: Build cache optimization for faster builds
- **Dependency Verification**: Ensures database and CLI tools are available
- **Cache Key Generation**: Smart cache invalidation based on file changes

### 2. Lint and Type Check

**Purpose**: Code quality validation
**Dependencies**: Setup job completion
**Timeout**: 10 minutes

#### Checks:
- **TypeScript Compilation**: Full type checking across client/server
- **ESLint**: Code style and best practices (if configured)
- **Import Validation**: Ensures all imports are resolvable

### 3. Unit Tests

**Purpose**: Comprehensive unit testing with database integration
**Dependencies**: Setup job completion
**Database**: PostgreSQL 15 Alpine service container
**Timeout**: 20 minutes

#### Test Execution:
- **Database Setup**: Automated schema initialization via init.sql
- **Test Environment**: Isolated test database per workflow run
- **Coverage Collection**: lcov reports with artifact upload
- **Multiple Test Suites**: Sales, integration, charge codes testing
- **Codecov Integration**: Automatic coverage reporting

#### Test Database Configuration:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_DB: test_inventory
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### 4. Security Scan

**Purpose**: Multi-tool security vulnerability detection
**Dependencies**: Setup job completion
**Continue on Error**: Yes (warnings allowed)

#### Security Tools:
- **npm audit**: Dependency vulnerability scanning (moderate+ level)
- **Retire.js**: JavaScript library vulnerability detection
- **Trivy**: Filesystem vulnerability scanner with SARIF output
- **CodeQL Integration**: SARIF upload to GitHub Security tab

#### Security Thresholds:
- npm audit: Critical vulnerabilities fail the build
- Trivy: CRITICAL, HIGH, MEDIUM severity findings
- Retire.js: Known vulnerable library detection
- SARIF Reports: Uploaded to GitHub Security dashboard

### 5. Docker Build and Test

**Purpose**: Container image creation and validation
**Dependencies**: Setup, unit tests completion
**Registry**: GitHub Container Registry (ghcr.io)

#### Build Process:
- **Multi-stage Build**: Development and production targets
- **Build Cache**: Layer caching for faster subsequent builds
- **Image Testing**: Container-based test execution
- **Security Scanning**: Built image vulnerability assessment

#### Docker Profiles:
- **Testing Profile**: ``--profile testing`` for unit tests in containers
- **Integration Profile**: ``--profile integration`` for full stack testing
- **Production Profile**: Production-ready image building

### 6. Performance Tests

**Purpose**: k6 load testing and performance validation
**Triggers**: Main branch pushes only
**Dependencies**: Docker build completion
**Tool**: k6 load testing framework

#### Performance Test Execution:
- **k6 Installation**: Modern GPG keyring installation method
- **Docker Compose Stack**: Full application environment (app, replit-auth, db)
- **Service Health Checks**: Wait for application readiness
- **Load Test Scenarios**: Authentication, health checks, public APIs

#### Performance Thresholds:
```javascript
// k6 test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};
```

#### Test Scenarios:
- **Health Endpoint**: Response time under 200ms
- **Authentication Flow**: Login/logout performance
- **User Info API**: Development admin endpoint testing
- **Error Handling**: Proper error response validation

### 7. Integration Tests

**Purpose**: Full application stack testing
**Dependencies**: Docker build completion
**Environment**: Production-like containers

#### Integration Test Process:
- **Service Orchestration**: Docker Compose with all services
- **Database Readiness**: PostgreSQL health checks before testing
- **Application Startup**: Proper service initialization order
- **Test Execution**: End-to-end workflow validation

### 8. Test Reports Generation

**Purpose**: Comprehensive test result aggregation
**Dependencies**: All test jobs (always runs)
**Artifacts**: Unified test reporting

#### Report Generation:
- **JUnit XML**: Machine-readable test results
- **Coverage Summary**: JSON and HTML coverage reports
- **Test Execution Summary**: Environment and execution metadata
- **Artifact Collection**: All test outputs for documentation integration

### 9. Build Documentation

**Purpose**: Sphinx documentation with integrated test results
**Dependencies**: Test reports job
**Triggers**: Main branch pushes only

#### Documentation Features:
- **Sphinx Build**: ReStructuredText to HTML conversion
- **API Documentation**: TypeScript API reference generation
- **Test Integration**: Coverage and test results embedded
- **Performance Reports**: k6 results integration
- **CI/CD Dashboard**: Interactive navigation interface

#### Dashboard Components:
```html
<!-- Dashboard cards for easy navigation -->
📊 Test Reports - Detailed Jest test execution results
📈 Coverage Report - Interactive lcov HTML reports  
⚡ Performance Tests - k6 load testing metrics
📖 API Documentation - TypeScript API reference
🔒 Security Scan - Vulnerability reports and SARIF analysis
```

### 10. Deploy Documentation

**Purpose**: GitHub Pages deployment with CI/CD dashboard
**Dependencies**: Build documentation job
**Triggers**: Main branch pushes only
**Target**: https://st7ma784.github.io/LUStores/

#### Deployment Features:
- **GitHub Pages**: Automated static site deployment
- **Artifact Integration**: Test reports, coverage, performance results
- **Dashboard Navigation**: Unified interface for all reports
- **Security Reports**: Vulnerability scan results display
- **Version Tracking**: Commit SHA and date metadata

## Configuration Files

### GitHub Actions Workflow
- **File**: `.github/workflows/main.yml`
- **Node Version**: 20.x (LTS)
- **Triggers**: Push, Pull Request events
- **Environments**: Test, Integration, Production
- **Secrets Required**: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN (optional)

### Test Configuration
- **Jest Config**: `jest.config.js` with TypeScript support via tsx
- **Test Setup**: `jest.setup.js` for test environment configuration  
- **Test Environment**: Automated PostgreSQL service container
- **Coverage**: lcov and JSON reporters for comprehensive coverage

### Performance Testing
- **k6 Configuration**: `performance-tests/load-test.js`
- **Base URL**: http://localhost:5000 (Docker Compose mapped port)
- **Test Scenarios**: Health, authentication, public API endpoints
- **Output Formats**: JSON results and summary for dashboard integration

### Docker Configuration
- **Development**: `docker-compose.yml` with hot reload
- **Production**: `docker-compose.prod.yml` for production deployment  
- **Testing**: `docker-compose.test-prod.yml` for CI/CD testing
- **Multi-stage Dockerfile**: Development and production targets

## Environment Variables and Secrets

### Required Secrets (Optional)
```yaml
DOCKERHUB_USERNAME: # Docker Hub registry username
DOCKERHUB_TOKEN: # Docker Hub registry access token
CODECOV_TOKEN: # Codecov coverage reporting (auto-detected)
```

### Environment Variables
```yaml
NODE_ENV: test|development|production
DATABASE_URL: postgresql://postgres:password@localhost:5432/test_inventory
SESSION_SECRET: test-secret-key
BASE_URL: http://localhost:5000 # For performance testing
```

## Quality Gates and Thresholds

### Test Coverage Requirements
- **Statements**: 70% minimum (currently exceeding)
- **Branches**: 60% minimum (currently exceeding)  
- **Functions**: 70% minimum (currently exceeding)
- **Lines**: 70% minimum (currently exceeding)

### Performance Requirements
- **Response Time**: 95th percentile under 500ms
- **Error Rate**: Less than 10% for all endpoints
- **Health Check**: Under 200ms response time
- **Concurrent Users**: 20 simultaneous users supported

### Security Requirements
- **npm audit**: Critical vulnerabilities fail build
- **Trivy**: High/Critical findings reported via SARIF
- **Retire.js**: Vulnerable library detection and reporting
- **Container Security**: Built image vulnerability scanning

## Monitoring and Notifications

### Artifact Management
- **Test Reports**: 1-day retention for pull requests
- **Coverage Reports**: Persistent for main branch
- **Performance Results**: Historical tracking for trend analysis
- **Security Scans**: SARIF upload to GitHub Security dashboard

### Documentation Dashboard
The CI/CD pipeline automatically generates and deploys a comprehensive dashboard at:
**https://st7ma784.github.io/LUStores/**

**Dashboard Features:**
- Real-time test execution status
- Interactive coverage reports
- Performance testing trends  
- Security vulnerability tracking
- API documentation with examples
- Deployment history and commit tracking
- **Trigger**: Pushes to develop branch
- **Environment**: Staging environment with production-like configuration
- **Validation**: Smoke tests and health checks
- **Notifications**: Slack integration for deployment status

#### Production Deployment
- **Trigger**: Pushes to main branch after all checks pass
- **Dependencies**: All previous stages must complete successfully
- **Environment Protection**: Manual approval gates
- **Validation**: Post-deployment health checks and monitoring

### 6. Release Management

**Purpose**: Automated release artifact creation and distribution
**Triggers**: Published GitHub releases

#### Release Process:
- Application build and artifact creation
- Release asset upload to GitHub
- Production deployment triggering
- Version-specific tagging and distribution

## Configuration Files

### GitHub Actions Workflow
- **File**: `.github/workflows/ci-cd.yml`
- **Triggers**: Push, Pull Request, Release events
- **Environments**: Test, Staging, Production
- **Secrets Required**: SNYK_TOKEN, SLACK_WEBHOOK_URL, GITHUB_TOKEN

### Test Configuration
- **Jest Config**: `jest.config.js` with TypeScript and coverage
- **Test Environment**: `.env.test.template` for environment setup
- **Docker Testing**: `docker-compose.test-prod.yml` for container testing

### Performance Testing
- **k6 Configuration**: `performance-tests/load-test.js`
- **Test Scenarios**: API endpoints, authentication, public routes
- **Metrics**: Response times, error rates, throughput

## Environment Variables and Secrets

### Required Secrets
```yaml
GITHUB_TOKEN: # Automatic GitHub token
SNYK_TOKEN: # Snyk security scanning token
SLACK_WEBHOOK_URL: # Slack notifications webhook
CODECOV_TOKEN: # Code coverage reporting (optional)
```

### Environment-Specific Variables
```yaml
# Test Environment
NODE_ENV: test
DATABASE_URL: postgresql://testuser:testpassword@localhost:5432/lustores_test
JWT_SECRET: test-jwt-secret-key-for-ci

# Staging Environment
NODE_ENV: staging
DATABASE_URL: # Staging database connection
JWT_SECRET: # Staging JWT secret

# Production Environment
NODE_ENV: production
DATABASE_URL: # Production database connection
JWT_SECRET: # Production JWT secret
```

## Quality Gates and Thresholds

### Test Coverage Requirements
- **Minimum Coverage**: 80%
- **Line Coverage**: 85%
- **Branch Coverage**: 75%
- **Function Coverage**: 90%

### Performance Requirements
- **API Response Time**: p95 < 500ms
- **Error Rate**: < 10%
- **Concurrent Users**: Support 20+ users
- **Load Test Duration**: 1 minute sustained

### Security Requirements
- **Vulnerability Severity**: No high or critical vulnerabilities
- **Dependency Audit**: Regular security updates
- **Code Scanning**: Clean CodeQL analysis
- **Container Security**: No medium+ severity container vulnerabilities

## Monitoring and Notifications

### Test Reporting
- **JUnit XML**: Machine-readable test results
- **HTML Reports**: Human-readable test and coverage reports
- **GitHub Status Checks**: PR status integration
- **Artifact Retention**: 30 days for test results and logs

### Deployment Notifications
- **Slack Integration**: Real-time deployment status updates
- **GitHub Status**: Deployment environment status tracking
- **Email Notifications**: Critical failure alerts
- **Dashboard Integration**: Monitoring system integration

## Troubleshooting Guide

### Common Issues

#### Test Failures
```bash
# Check test logs in GitHub Actions
# Download test artifacts for detailed analysis
# Verify test environment configuration
# Check database connectivity and schema
```

#### Security Scan Failures
```bash
# Review security scan results
# Update vulnerable dependencies
# Configure security exceptions if needed
# Verify Snyk token configuration
```

#### Docker Build Issues
```bash
# Check Dockerfile syntax and dependencies
# Verify build context and file paths
# Review Docker build logs
# Test build locally before pushing
```

#### Deployment Failures
```bash
# Check environment configuration
# Verify deployment target connectivity
# Review deployment logs and errors
# Validate health check endpoints
```

### Performance Issues
```bash
# Review k6 performance test results
# Check application resource usage
# Analyze database query performance
# Monitor infrastructure metrics
```

## Maintenance and Updates

### Regular Tasks
- **Weekly**: Review and update dependencies
- **Monthly**: Security audit and vulnerability assessment
- **Quarterly**: Performance baseline review and optimization
- **Annually**: Pipeline architecture review and improvement

### Version Updates
- **Node.js**: Update matrix to include new LTS versions
- **Dependencies**: Regular updates for security and performance
- **Actions**: Keep GitHub Actions up to date
- **Tools**: Update security scanning and testing tools

## Best Practices

### Development Workflow
1. **Feature Development**: Create feature branches with descriptive names
2. **Testing**: Write tests for new features and bug fixes
3. **Code Quality**: Follow linting and formatting standards
4. **Documentation**: Update documentation with code changes
5. **Security**: Follow secure coding practices

### CI/CD Best Practices
1. **Fast Feedback**: Optimize pipeline for quick feedback loops
2. **Parallel Execution**: Run independent jobs in parallel
3. **Caching**: Use build and dependency caching effectively
4. **Environment Parity**: Keep test/staging/production environments similar
5. **Rollback Strategy**: Maintain ability to quickly rollback deployments

### Monitoring and Alerting
1. **Health Checks**: Implement comprehensive health check endpoints
2. **Logging**: Use structured logging for better observability
3. **Metrics**: Track key performance and business metrics
4. **Alerting**: Set up proactive alerting for critical issues
5. **Documentation**: Keep runbooks updated for incident response

## Pipeline Metrics and KPIs

### Development Metrics
- **Build Success Rate**: > 95%
- **Test Coverage**: > 80%
- **Pipeline Duration**: < 15 minutes
- **Deployment Frequency**: Daily for staging, weekly for production

### Quality Metrics
- **Bug Escape Rate**: < 5%
- **Security Vulnerabilities**: 0 high/critical
- **Performance Regression**: 0 regressions
- **Code Review Coverage**: 100%

### Operational Metrics
- **Deployment Success Rate**: > 98%
- **Mean Time to Recovery**: < 1 hour
- **Change Failure Rate**: < 15%
- **Lead Time for Changes**: < 1 day

## Contact and Support

For questions about the CI/CD pipeline:
- **Documentation**: This file and inline comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Team Contact**: Development team leads
- **Emergency**: On-call rotation for critical production issues
