// Basic Load Testing Configuration for k6
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_PREFIX = `perf_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Global cleanup list to track created test data
let createdTestData = [];

export function setup() {
  console.log(`🚀 Starting performance test with prefix: ${TEST_PREFIX}`);
  console.log(`📍 Testing against: ${BASE_URL}`);
  
  // Verify the application is responding
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error(`❌ Health check failed: ${healthCheck.status}`);
    throw new Error('Application is not responding to health checks');
  }
  
  console.log('✅ Application health check passed');
  return { testPrefix: TEST_PREFIX, baseUrl: BASE_URL };
}

export default function (data) {
  const testPrefix = data.testPrefix || TEST_PREFIX;
  
  group('API Health Check', () => {
    const response = http.get(`${BASE_URL}/api/health`);
    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 200ms': (r) => r.timings.duration < 200,
    }) || errorRate.add(1);
  });

  group('Auth Endpoints', () => {
    // Test user login (with existing users - no registration endpoint exists)
    const authLoginPayload = {
      email: 'admin@university.edu',
      password: 'admin123'
    };

    const authLoginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify(authLoginPayload), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(authLoginResponse, {
      'auth login status is 200': (r) => r.status === 200,
      'auth login response has user data': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.success === true && body.user && body.user.id;
        }
        return false;
      },
      'auth login response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    // Test current user endpoint
    const userInfoResponse = http.get(`${BASE_URL}/api/auth/user`);
    check(userInfoResponse, {
      'user info response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
  });

  group('Public API Endpoints', () => {
    // Test health check endpoint (should be publicly accessible)
    const healthResponse = http.get(`${BASE_URL}/health`);
    check(healthResponse, {
      'health endpoint status is 200': (r) => r.status === 200,
      'health response time < 200ms': (r) => r.timings.duration < 200,
    }) || errorRate.add(1);

    // Test user info endpoint (returns dev admin in development)
    const userInfoResponse = http.get(`${BASE_URL}/api/auth/user`);
    check(userInfoResponse, {
      'user info response time < 300ms': (r) => r.timings.duration < 300,
      'user info returns data': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.id && body.email;
        }
        return false;
      },
    }) || errorRate.add(1);
  });

  group('Sales API Endpoints', () => {
    // Test creating a sale with test prefix for isolation
    const saleData = {
      chargeCode: `${testPrefix}_PERF_TEST`,
      customerInfo: { 
        name: `${testPrefix} Performance Test Customer ${__VU}`,
        email: `${testPrefix}_customer_${__VU}_${__ITER}@example.com`
      },
      notes: `Performance test sale - ${testPrefix}`,
      items: [
        {
          itemName: `${testPrefix} Test Item`,
          unitPrice: 10.00,
          quantity: 1,
          vatRate: 0.20
        }
      ]
    };

    const createSaleResponse = http.post(
      `${BASE_URL}/api/sales`,
      JSON.stringify(saleData),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const saleCreated = check(createSaleResponse, {
      'sale creation response time < 1s': (r) => r.timings.duration < 1000,
      'sale creation status is 200 or 201': (r) => [200, 201].includes(r.status),
    });
    
    if (!saleCreated) {
      errorRate.add(1);
    } else if (createSaleResponse.status === 201) {
      const saleId = createSaleResponse.json('saleId');
      if (saleId) {
        createdTestData.push({
          type: 'sale',
          id: saleId
        });
      }
    }

    // Test retrieving sales list
    const salesListResponse = http.get(`${BASE_URL}/api/sales`);
    check(salesListResponse, {
      'sales list response time < 300ms': (r) => r.timings.duration < 300,
      'sales list status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(1);
}

export function teardown(data) {
  console.log(`🧹 Starting performance test cleanup for prefix: ${data.testPrefix}`);
  console.log(`📊 Performance test completed`);
  console.log(`📈 Total errors: ${errorRate.count}`);
  console.log(`🗑️ Created ${createdTestData.length} test data items to clean up`);

  // Attempt to clean up created test data
  if (createdTestData.length > 0) {
    console.log('🗑️ Cleaning up test data...');
    
    for (const item of createdTestData) {
      try {
        let cleanupUrl;
        switch (item.type) {
          case 'user':
            cleanupUrl = `${BASE_URL}/api/admin/users/${item.id}`;
            break;
          case 'sale':
            cleanupUrl = `${BASE_URL}/api/admin/sales/${item.id}`;
            break;
          default:
            continue;
        }
        
        // Attempt cleanup (may fail if endpoints don't exist)
        const cleanupResponse = http.del(cleanupUrl);
        if (cleanupResponse.status === 200 || cleanupResponse.status === 204) {
          console.log(`✅ Cleaned up ${item.type}: ${item.id || item.email}`);
        } else {
          console.log(`⚠️ Cleanup failed for ${item.type}: ${item.id || item.email} (${cleanupResponse.status})`);
        }
      } catch (error) {
        console.log(`⚠️ Cleanup error for ${item.type}: ${error.message}`);
      }
    }
  }

  console.log('✅ Performance test teardown completed');
  
  // Log summary
  console.log('\n📋 Performance Test Summary:');
  console.log(`   Test Prefix: ${data.testPrefix}`);
  console.log(`   Base URL: ${data.baseUrl}`);
  console.log(`   Total Errors: ${errorRate.count}`);
  console.log(`   Test Data Created: ${createdTestData.length} items`);
}
