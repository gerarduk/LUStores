Performance Testing Guide
========================

LUStores includes comprehensive performance testing using k6 load testing framework, integrated into the CI/CD pipeline to ensure application performance meets quality standards.

Overview
--------

Performance testing is automatically executed on every push to the main branch, providing continuous performance monitoring and regression detection. The tests validate:

- **Application Response Times**: Health endpoints and core functionality
- **Authentication Performance**: Login/logout flow efficiency  
- **API Endpoint Performance**: Public API response time validation
- **Concurrent User Handling**: Multi-user load simulation
- **Error Rate Monitoring**: System stability under load

k6 Load Testing Framework
-------------------------

Test Configuration
~~~~~~~~~~~~~~~~~~

**Location**: ``performance-tests/load-test.js``
**Execution Environment**: Docker Compose with full application stack
**Load Testing Tool**: k6 (https://k6.io/)

**Test Stages:**
.. code-block:: javascript

   export const options = {
     stages: [
       { duration: '30s', target: 20 },  // Ramp up to 20 users
       { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
       { duration: '30s', target: 0 },   // Ramp down to 0 users
     ],
     thresholds: {
       http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
       http_req_failed: ['rate<0.1'],     // Error rate under 10%
     },
   };

Test Scenarios
~~~~~~~~~~~~~~

**1. Health Check Performance**
   - **Endpoint**: ``GET /health``
   - **Expected Response Time**: < 200ms
   - **Purpose**: Validate basic application availability and responsiveness

**2. User Information API**
   - **Endpoint**: ``GET /api/auth/user``
   - **Expected Response Time**: < 300ms
   - **Purpose**: Test user authentication and session management performance
   - **Validation**: Ensures response contains user data (id, email)

**3. Authentication Flow Testing**
   - **Endpoint**: ``POST /auth/login``
   - **Test Data**: Predefined admin credentials
   - **Expected Response Time**: < 500ms
   - **Purpose**: Validate login performance and response structure
   - **Validation**: Successful authentication with user data returned

Performance Thresholds
~~~~~~~~~~~~~~~~~~~~~~

**Response Time Requirements:**
- **Health Endpoint**: 95th percentile under 200ms
- **Authentication API**: 95th percentile under 500ms
- **User Info API**: 95th percentile under 300ms
- **Overall Application**: 95th percentile under 500ms

**Error Rate Requirements:**
- **Maximum Error Rate**: 10% across all endpoints
- **Authentication Errors**: Login failures tracked separately
- **Health Check Availability**: 99%+ success rate required

**Concurrent User Limits:**
- **Simultaneous Users**: 20 users supported
- **Peak Load Duration**: 1 minute sustained load
- **Ramp-up Time**: 30 seconds gradual increase

CI/CD Integration
-----------------

Automated Execution
~~~~~~~~~~~~~~~~~~~

**Trigger Conditions:**
- Pushes to ``main`` branch only
- Successful completion of unit tests and Docker build
- All security scans must pass

**Execution Environment:**
.. code-block:: yaml

   # Docker Compose services started for testing
   - app: Main application server
   - replit-auth: Authentication service
   - db: PostgreSQL database
   - redis: Session storage

**Test Execution Flow:**
1. **k6 Installation**: Modern GPG keyring method for Ubuntu
2. **Docker Stack Startup**: Full application environment
3. **Health Check Wait**: Wait for service readiness (60s timeout)
4. **Load Test Execution**: k6 test script execution
5. **Results Collection**: JSON and summary report generation
6. **Artifact Upload**: Performance results stored for dashboard

Results and Reporting
~~~~~~~~~~~~~~~~~~~~~

**Generated Artifacts:**
- ``performance-results.json``: Detailed k6 execution data
- ``performance-summary.json``: High-level test summary
- ``reports/performance/index.html``: HTML dashboard report

**Dashboard Integration:**
Performance results are automatically integrated into the documentation dashboard at:
``https://st7ma784.github.io/LUStores/performance/``

**Report Contents:**
- **Test Execution Summary**: Date, environment, configuration
- **Response Time Metrics**: Percentiles, averages, maximums
- **Error Rate Analysis**: Failed requests and error categorization  
- **Threshold Compliance**: Pass/fail status for all defined thresholds
- **Historical Trends**: Performance changes over time (when available)

Local Performance Testing
-------------------------

Prerequisites
~~~~~~~~~~~~~

**System Requirements:**
- Docker and Docker Compose installed
- k6 load testing tool
- Minimum 4GB RAM for full stack testing

**k6 Installation:**
.. code-block:: bash

   # Ubuntu/Debian
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # macOS
   brew install k6

   # Windows
   choco install k6

Running Tests Locally
~~~~~~~~~~~~~~~~~~~~~

**1. Start Application Stack:**
.. code-block:: bash

   # Start all required services
   docker compose up -d
   
   # Wait for application readiness
   curl -s http://localhost:5000/health

**2. Execute Performance Tests:**
.. code-block:: bash

   # Run k6 load tests
   k6 run performance-tests/load-test.js
   
   # Run with custom output
   k6 run performance-tests/load-test.js \
     --out json=results.json \
     --summary-export=summary.json

**3. Analyze Results:**
.. code-block:: bash

   # View test summary
   cat summary.json | jq .
   
   # Check specific metrics
   k6 run performance-tests/load-test.js --quiet

Custom Test Scenarios
~~~~~~~~~~~~~~~~~~~~~

**Creating Custom Tests:**
.. code-block:: javascript

   import { check, group } from 'k6';
   import http from 'k6/http';
   
   export default function () {
     group('Custom API Test', () => {
       const response = http.get(`${BASE_URL}/api/custom-endpoint`);
       
       check(response, {
         'status is 200': (r) => r.status === 200,
         'response time < 300ms': (r) => r.timings.duration < 300,
         'response has data': (r) => {
           const body = JSON.parse(r.body);
           return body.data && body.data.length > 0;
         },
       });
     });
   }

**Environment Variables:**
.. code-block:: bash

   # Customize test environment
   export BASE_URL=http://localhost:3000  # Different port
   export TEST_DURATION=30s               # Shorter test duration
   export CONCURRENT_USERS=10             # Fewer concurrent users
   
   k6 run performance-tests/load-test.js

Troubleshooting
---------------

Common Issues
~~~~~~~~~~~~~

**1. Service Startup Failures**
.. code-block:: bash

   # Check service status
   docker compose ps
   
   # View service logs
   docker compose logs app
   docker compose logs replit-auth

**2. Authentication Failures**
   - **Issue**: Login requests returning unexpected status codes
   - **Solution**: Verify authentication service is running and accessible
   - **Debug**: Check ``POST /auth/login`` endpoint manually

**3. High Response Times**
   - **Issue**: Tests failing due to slow response times
   - **Investigation**: Check system resources and database connections
   - **Optimization**: Consider database query optimization or caching

**4. k6 Installation Issues**
   - **Ubuntu**: Use modern GPG keyring method (not deprecated apt-key)
   - **Permissions**: Ensure proper sudo access for package installation
   - **Network**: Verify internet access for package downloads

Performance Optimization
~~~~~~~~~~~~~~~~~~~~~~~~

**Database Optimization:**
- Index optimization for frequently queried tables
- Connection pooling configuration
- Query performance analysis

**Application Optimization:**
- Response caching strategies
- API response optimization
- Static asset optimization

**Infrastructure Optimization:**
- Container resource allocation
- Load balancer configuration
- CDN implementation for static assets

Performance Monitoring
----------------------

Continuous Monitoring
~~~~~~~~~~~~~~~~~~~~~

**CI/CD Integration:**
- Automated performance regression detection
- Historical performance trend analysis
- Performance threshold enforcement

**Alert Configuration:**
- Performance degradation alerts
- Error rate spike notifications
- Service availability monitoring

**Metrics Collection:**
- Response time percentiles (50th, 95th, 99th)
- Request rate and throughput
- Error rate and error categorization
- Resource utilization (CPU, memory, database)

**Dashboard Features:**
- Real-time performance metrics
- Historical trend visualization
- Comparative analysis across builds
- Performance budget tracking

Best Practices
--------------

Test Design
~~~~~~~~~~~

**1. Realistic Load Patterns:**
   - Model actual user behavior patterns
   - Include realistic think time between requests
   - Test peak usage scenarios

**2. Comprehensive Coverage:**
   - Test all critical user journeys
   - Include both read and write operations
   - Validate error handling under load

**3. Environment Consistency:**
   - Use production-like data volumes
   - Match production configuration settings
   - Consistent test environment setup

Performance Standards
~~~~~~~~~~~~~~~~~~~~~

**1. Response Time Goals:**
   - Interactive responses: < 200ms
   - Page loads: < 1 second
   - API responses: < 500ms
   - Background operations: < 5 seconds

**2. Availability Targets:**
   - System availability: 99.9%
   - Error rate: < 1% under normal load
   - Error rate: < 10% under stress

**3. Scalability Requirements:**
   - Support 20+ concurrent users
   - Graceful degradation under high load
   - Automatic recovery from temporary failures
