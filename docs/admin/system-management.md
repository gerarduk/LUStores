# System Management Documentation

The System Management feature provides administrators with comprehensive tools to monitor system health, run tests, and manage deployments for the LUStores inventory management system.

## Overview

The System Management page is accessible to admin users and provides three main tabs:

1. **Test Runner** - Execute different types of tests and view results
2. **Deployment** - Monitor deployment status and access GitHub repository
3. **System Health** - View real-time system metrics and database status

## Features

### Test Runner

The Test Runner allows administrators to execute various types of tests:

- **Unit Tests** - Run individual component tests
- **Integration Tests** - Test component interactions
- **Coverage Tests** - Generate code coverage reports
- **Sales Tests** - Test sales-specific functionality
- **Pipeline Tests** - Validate CI/CD pipeline
- **Docker Tests** - Test containerized environment

#### Test Execution

Tests can be triggered via:
- Web UI button clicks
- API endpoints
- Command line scripts

#### Test Results

Results include:
- Test type and status (passed/failed)
- Number of passed/failed tests
- Execution duration
- Timestamp
- Detailed logs (when available)

### Deployment Dashboard

The Deployment tab provides:

#### GitHub Repository Links
- **Actions** - View CI/CD pipeline status
- **Issues** - Access bug reports and feature requests
- **Insights** - Repository analytics and statistics

#### Environment Status
- **Development** - Local development environment
- **Staging** - Pre-production testing environment
- **Production** - Live production environment

Each environment shows:
- Deployment status
- Version information
- Health status
- Deployment timestamp
- Environment URL

### System Health Monitoring

Real-time system metrics include:

#### Resource Usage
- **CPU Usage** - Current percentage and core count
- **Memory Usage** - Used/total memory and percentage
- **Disk Usage** - Storage utilization metrics

#### Database Health
- Connection status
- Active connections vs. maximum
- Response time metrics
- Connection pool status

#### User Activity
- Active user sessions
- Total registered users
- Current session count

## API Endpoints

### POST /api/system/run-tests

Execute a specific test type.

**Request Body:**
```json
{
  "testType": "unit|integration|coverage|sales|pipeline|docker"
}
```

**Response:**
```json
{
  "message": "unit tests started successfully",
  "testId": 123,
  "result": {
    "id": 123,
    "type": "unit",
    "status": "passed",
    "passed": 45,
    "failed": 0,
    "duration": 1200,
    "timestamp": "2025-06-09T10:30:00Z"
  }
}
```

### GET /api/system/tests

Retrieve test execution history.

**Query Parameters:**
- `type` (optional) - Filter by test type
- `limit` (optional) - Limit number of results

**Response:**
```json
[
  {
    "id": 123,
    "type": "unit",
    "status": "passed",
    "passed": 45,
    "failed": 0,
    "duration": 1200,
    "timestamp": "2025-06-09T10:30:00Z"
  }
]
```

### GET /api/system/status

Get current system health metrics.

**Response:**
```json
{
  "cpu": {
    "usage": 45,
    "cores": 4,
    "load": [0.5, 0.7, 0.6]
  },
  "memory": {
    "used": 4096,
    "total": 8192,
    "usage": 50
  },
  "disk": {
    "used": 200,
    "total": 500,
    "usage": 40
  },
  "database": {
    "status": "connected",
    "connections": 5,
    "maxConnections": 20,
    "responseTime": 25
  },
  "users": {
    "active": 35,
    "total": 150,
    "sessionsActive": 12
  },
  "uptime": 86400,
  "lastUpdated": "2025-06-09T10:30:00Z"
}
```

### GET /api/system/deployment

Get deployment status across environments.

**Response:**
```json
{
  "staging": {
    "status": "deployed",
    "version": "v1.2.3-staging",
    "deployedAt": "2025-06-09T09:30:00Z",
    "health": "healthy",
    "url": "https://staging.lustores.com"
  },
  "production": {
    "status": "deployed",
    "version": "v1.2.2",
    "deployedAt": "2025-06-08T10:30:00Z",
    "health": "healthy",
    "url": "https://lustores.com"
  },
  "development": {
    "status": "running",
    "version": "v1.2.4-dev",
    "deployedAt": "2025-06-09T10:30:00Z",
    "health": "healthy",
    "url": "http://localhost:5000"
  }
}
```

## User Interface

### Navigation

Access System Management via:
1. Admin sidebar menu
2. Direct URL: `/system`
3. Navigation requires admin role

### Test Runner Tab

Features:
- Six test type buttons with icons
- Real-time status indicators
- Test history table
- Execution logs panel

### Deployment Tab

Includes:
- GitHub repository dashboard links
- Environment status cards
- Deployment history
- Health monitoring indicators

### System Health Tab

Displays:
- Resource usage charts
- Database connection metrics
- User activity statistics
- System uptime information

## Testing

### Unit Tests

System Management functionality includes comprehensive test coverage:

```bash
# Run system management tests
npm run test:system

# Run all tests including system management
npm run test:all

# Run with coverage
npm run test:coverage
```

### Test Files

- `server/__tests__/system-management.test.ts` - API endpoint tests
- `client/src/pages/__tests__/SystemManagement.test.tsx` - UI component tests

### Mock Data

Tests use mock implementations for:
- Test execution results
- System metrics
- Deployment status
- User authentication

## Security

### Authentication

- Requires valid authentication token
- Admin role verification
- Session-based access control

### Authorization

Only users with admin role can:
- Access System Management page
- Execute tests via API
- View system health metrics
- Monitor deployment status

## Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Docker (for containerized tests)
- Admin user account

### Configuration

1. Ensure admin role in user account
2. Verify database connectivity
3. Configure environment variables
4. Set up GitHub repository access

### Environment Variables

Required variables for full functionality:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Admin override for development
DEV_ADMIN_OVERRIDE=true

# Session security
SESSION_SECRET=your-secret-key
```

## Monitoring & Alerts

### Health Checks

The system provides automatic health monitoring:
- Database connectivity tests
- Resource usage thresholds
- Service availability checks

### Alert Thresholds

Default alert levels:
- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 90%
- Database response time > 1000ms

## Troubleshooting

### Common Issues

**Test Execution Failures:**
1. Verify database connectivity
2. Check test environment setup
3. Review test logs for errors

**System Health Data Unavailable:**
1. Confirm monitoring services running
2. Check system permissions
3. Verify API endpoint accessibility

**Deployment Status Errors:**
1. Validate GitHub repository access
2. Check environment connectivity
3. Verify deployment pipeline status

### Logs

System logs available at:
- Application logs: `/var/log/lustores/`
- Test logs: `./test-results/`
- System metrics: Real-time via API

## Contributing

When contributing to System Management features:

1. Add comprehensive tests
2. Update documentation
3. Follow security best practices
4. Include error handling
5. Provide user feedback mechanisms

### Code Standards

- TypeScript interfaces for all data structures
- Proper error handling and validation
- Responsive UI design
- Accessibility compliance
- Performance optimization
