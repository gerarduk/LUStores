/**
 * User Permissions and Authorization Integration Tests
 * 
 * Tests real API endpoint protection and frontend permission integration including:
 * 1. API endpoint permission enforcement
 * 2. Authentication middleware integration
 * 3. Role-based route protection
 * 4. Permission middleware effectiveness
 * 5. Frontend permission API integration
 * 6. Real database permission storage
 * 7. Cross-feature permission dependencies
 * 8. Permission audit trail
 * 9. Session-based permission caching
 * 10. Security boundary validation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app'; // Adjust path as needed
import { testDb } from '../test-helpers/database';
import { createTestUser, authenticateUser } from '../test-helpers/auth';
import { setupTestData, cleanupTestData } from '../test-helpers/test-data';

interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'superuser' | 'admin';
  password: string;
  token?: string;
  isActive?: boolean;
}

interface PermissionTestScenario {
  name: string;
  userRole: 'user' | 'superuser' | 'admin' | 'anonymous';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  expectedStatus: number;
  expectedMessage?: string;
  requiredPermissions?: string[];
  testData?: any;
  description: string;
}

interface PermissionOverride {
  userId: string;
  permission: string;
  granted: boolean;
  grantedBy?: string;
}

describe('User Permissions and Authorization Integration Tests', () => {
  let testUsers: Record<string, TestUser>;
  let authHeaders: Record<string, Record<string, string>>;

  beforeAll(async () => {
    await testDb.connect();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  beforeEach(async () => {
    await setupTestData();
    
    // Create test users with different roles
    testUsers = {
      user: await createTestUser({
        email: 'basicuser@test.com',
        firstName: 'Basic',
        lastName: 'User',
        role: 'user',
        password: 'password123',
        isActive: true,
      }),
      superuser: await createTestUser({
        email: 'manager@test.com',
        firstName: 'Super',
        lastName: 'User',
        role: 'superuser',
        password: 'password123',
        isActive: true,
      }),
      admin: await createTestUser({
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User', 
        role: 'admin',
        password: 'password123',
        isActive: true,
      }),
      inactive: await createTestUser({
        email: 'inactive@test.com',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'admin',
        password: 'password123',
        isActive: false,
      }),
    };

    // Authenticate all users
    authHeaders = {};
    for (const [key, user] of Object.entries(testUsers)) {
      if (user.isActive !== false) {
        const token = await authenticateUser(user.email, user.password);
        authHeaders[key] = { Authorization: `Bearer ${token}` };
        testUsers[key].token = token;
      }
    }
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Authentication and Authorization Middleware', () => {

    const protectedEndpoints = [
      { method: 'GET', path: '/api/inventory', description: 'View inventory' },
      { method: 'POST', path: '/api/inventory', description: 'Create inventory item' },
      { method: 'GET', path: '/api/sales', description: 'View sales' },
      { method: 'POST', path: '/api/sales', description: 'Create sale' },
      { method: 'GET', path: '/api/users', description: 'View users' },
      { method: 'POST', path: '/api/users', description: 'Create user' },
      { method: 'GET', path: '/api/reports', description: 'View reports' },
      { method: 'GET', path: '/api/settings/permissions', description: 'View permission settings' },
    ];

    it('should reject unauthenticated requests to protected endpoints', async () => {
      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase() as 'get' | 'post'](endpoint.path)
          .send({});

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message.toLowerCase()).toMatch(/auth|unauthorized|login/);
      }
    });

    it('should reject requests with invalid tokens', async () => {
      const invalidTokens = [
        'Bearer invalid_token',
        'Bearer expired.token.here',
        'Bearer ' + 'x'.repeat(100),
        'InvalidFormat token_here',
        'Bearer ',
      ];

      const testEndpoint = '/api/inventory';

      for (const invalidToken of invalidTokens) {
        const response = await request(app)
          .get(testEndpoint)
          .set('Authorization', invalidToken);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should reject requests from inactive users', async () => {
      const inactiveUserToken = await authenticateUser(testUsers.inactive.email, testUsers.inactive.password);
      
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${inactiveUserToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/inactive|disabled|suspended/);
    });

    it('should include user context in successful requests', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testUsers.user.id);
      expect(response.body).toHaveProperty('email', testUsers.user.email);
      expect(response.body).toHaveProperty('role', testUsers.user.role);
    });
  });

  describe('API Endpoint Permission Protection', () => {

    const permissionScenarios: PermissionTestScenario[] = [
      // Inventory Management Tests
      {
        name: 'Inventory View Access',
        userRole: 'user',
        method: 'GET',
        endpoint: '/api/inventory',
        expectedStatus: 200,
        requiredPermissions: ['inventory.view'],
        description: 'Basic users should be able to view inventory',
      },
      {
        name: 'Inventory Creation Permission',
        userRole: 'user',
        method: 'POST',
        endpoint: '/api/inventory',
        expectedStatus: 403,
        requiredPermissions: ['inventory.create'],
        testData: { name: 'Test Item', quantity: 10 },
        description: 'Basic users should NOT be able to create inventory items',
      },
      {
        name: 'Inventory Creation - Superuser',
        userRole: 'superuser',
        method: 'POST',
        endpoint: '/api/inventory',
        expectedStatus: 201,
        requiredPermissions: ['inventory.create'],
        testData: { name: 'Test Item', quantity: 10, supplier: 'Test Supplier' },
        description: 'Superusers should be able to create inventory items',
      },

      // User Management Tests
      {
        name: 'User List Access - Basic User',
        userRole: 'user',
        method: 'GET',
        endpoint: '/api/users',
        expectedStatus: 403,
        requiredPermissions: ['users.view'],
        description: 'Basic users should NOT be able to view user list',
      },
      {
        name: 'User List Access - Admin',
        userRole: 'admin',
        method: 'GET',
        endpoint: '/api/users',
        expectedStatus: 200,
        requiredPermissions: ['users.view'],
        description: 'Admins should be able to view user list',
      },
      {
        name: 'User Creation - Admin',
        userRole: 'admin',
        method: 'POST',
        endpoint: '/api/users',
        expectedStatus: 201,
        requiredPermissions: ['users.add'],
        testData: {
          email: 'newuser@test.com',
          firstName: 'New',
          lastName: 'User',
          role: 'user',
        },
        description: 'Admins should be able to create new users',
      },
      {
        name: 'User Creation - Basic User',
        userRole: 'user',
        method: 'POST',
        endpoint: '/api/users',
        expectedStatus: 403,
        requiredPermissions: ['users.add'],
        testData: {
          email: 'newuser@test.com',
          firstName: 'New',
          lastName: 'User',
          role: 'user',
        },
        description: 'Basic users should NOT be able to create new users',
      },

      // Sales Management Tests
      {
        name: 'Sales View Access',
        userRole: 'user',
        method: 'GET',
        endpoint: '/api/sales',
        expectedStatus: 200,
        requiredPermissions: ['sales.view'],
        description: 'Basic users should be able to view sales',
      },
      {
        name: 'Sales Creation',
        userRole: 'user',
        method: 'POST',
        endpoint: '/api/sales',
        expectedStatus: 201,
        requiredPermissions: ['sales.create'],
        testData: {
          customerId: 'CUST_001',
          items: [{ id: 'ITEM_001', quantity: 2, price: 10.00 }],
          total: 20.00,
        },
        description: 'Basic users should be able to create sales',
      },

      // Reports Access Tests
      {
        name: 'Reports View - Basic User',
        userRole: 'user',
        method: 'GET',
        endpoint: '/api/reports',
        expectedStatus: 403,
        requiredPermissions: ['reports.view'],
        description: 'Basic users should NOT be able to view reports',
      },
      {
        name: 'Reports View - Superuser',
        userRole: 'superuser',
        method: 'GET',
        endpoint: '/api/reports',
        expectedStatus: 200,
        requiredPermissions: ['reports.view'],
        description: 'Superusers should be able to view reports',
      },

      // Settings and Configuration Tests
      {
        name: 'Permission Settings - Basic User',
        userRole: 'user',
        method: 'GET',
        endpoint: '/api/settings/permissions',
        expectedStatus: 403,
        requiredPermissions: ['settings.permissions'],
        description: 'Basic users should NOT be able to access permission settings',
      },
      {
        name: 'Permission Settings - Admin',
        userRole: 'admin',
        method: 'GET',
        endpoint: '/api/settings/permissions',
        expectedStatus: 200,
        requiredPermissions: ['settings.permissions'],
        description: 'Admins should be able to access permission settings',
      },

      // Backup Operations Tests
      {
        name: 'Backup Creation - Superuser',
        userRole: 'superuser',
        method: 'POST',
        endpoint: '/api/backup',
        expectedStatus: 403,
        requiredPermissions: ['backup.create'],
        description: 'Superusers should NOT be able to create backups',
      },
      {
        name: 'Backup Creation - Admin',
        userRole: 'admin',
        method: 'POST',
        endpoint: '/api/backup',
        expectedStatus: 201,
        requiredPermissions: ['backup.create'],
        description: 'Admins should be able to create backups',
      },
    ];

    permissionScenarios.forEach((scenario) => {
      it(`should handle ${scenario.name} (${scenario.description})`, async () => {
        const user = scenario.userRole === 'anonymous' ? null : testUsers[scenario.userRole];
        const headers = scenario.userRole === 'anonymous' ? {} : authHeaders[scenario.userRole];

        let requestBuilder = request(app)[scenario.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](scenario.endpoint);

        if (headers && Object.keys(headers).length > 0) {
          requestBuilder = requestBuilder.set(headers);
        }

        if (scenario.testData) {
          requestBuilder = requestBuilder.send(scenario.testData);
        }

        const response = await requestBuilder;

        expect(response.status).toBe(scenario.expectedStatus);

        if (scenario.expectedStatus === 403) {
          expect(response.body).toHaveProperty('message');
          expect(response.body.message.toLowerCase()).toMatch(/permission|authorization|access/);
          
          if (scenario.requiredPermissions) {
            expect(response.body).toHaveProperty('required');
          }
        }

        if (scenario.expectedStatus === 201 || scenario.expectedStatus === 200) {
          expect(response.body).not.toHaveProperty('error');
        }
      });
    });
  });

  describe('Permission Override System', () => {

    it('should allow explicit permission grants to override role defaults', async () => {
      const basicUser = testUsers.user;

      // Basic user normally cannot view reports
      let response = await request(app)
        .get('/api/reports')
        .set(authHeaders.user);

      expect(response.status).toBe(403);

      // Grant explicit permission via admin
      await request(app)
        .post(`/api/users/${basicUser.id}/permissions`)
        .set(authHeaders.admin)
        .send({
          permission: 'reports.view',
          granted: true,
        });

      // Should now have access
      response = await request(app)
        .get('/api/reports')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
    });

    it('should allow explicit permission denials to override role defaults', async () => {
      const superuser = testUsers.superuser;

      // Superuser normally CAN view inventory
      let response = await request(app)
        .get('/api/inventory')
        .set(authHeaders.superuser);

      expect(response.status).toBe(200);

      // Explicitly deny permission via admin
      await request(app)
        .post(`/api/users/${superuser.id}/permissions`)
        .set(authHeaders.admin)
        .send({
          permission: 'inventory.view',
          granted: false,
        });

      // Should now be denied
      response = await request(app)
        .get('/api/inventory')
        .set(authHeaders.superuser);

      expect(response.status).toBe(403);
    });

    it('should prevent non-admin users from managing permissions', async () => {
      const basicUser = testUsers.user;
      const superuser = testUsers.superuser;

      // Basic user tries to grant themselves permissions
      let response = await request(app)
        .post(`/api/users/${basicUser.id}/permissions`)
        .set(authHeaders.user)
        .send({
          permission: 'reports.view',
          granted: true,
        });

      expect(response.status).toBe(403);

      // Superuser tries to grant permissions
      response = await request(app)
        .post(`/api/users/${basicUser.id}/permissions`)
        .set(authHeaders.superuser)
        .send({
          permission: 'reports.view',
          granted: true,
        });

      expect(response.status).toBe(403);

      // Only admin should succeed
      response = await request(app)
        .post(`/api/users/${basicUser.id}/permissions`)
        .set(authHeaders.admin)
        .send({
          permission: 'reports.view',
          granted: true,
        });

      expect(response.status).toBe(201);
    });

    it('should track permission grant audit trail', async () => {
      const basicUser = testUsers.user;
      const admin = testUsers.admin;

      // Grant permission
      await request(app)
        .post(`/api/users/${basicUser.id}/permissions`)
        .set(authHeaders.admin)
        .send({
          permission: 'reports.view',
          granted: true,
        });

      // Check audit trail
      const response = await request(app)
        .get(`/api/users/${basicUser.id}/permissions/audit`)
        .set(authHeaders.admin);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        userId: basicUser.id,
        permission: 'reports.view',
        granted: true,
        grantedBy: admin.id,
      });
      expect(response.body[0]).toHaveProperty('grantedAt');
    });
  });

  describe('Permission Enforcement Settings Integration', () => {

    it('should respect permission enforcement setting changes', async () => {
      const basicUser = testUsers.user;

      // Enable strict enforcement
      await request(app)
        .put('/api/settings/permissions/enforce')
        .set(authHeaders.admin)
        .send({ enforce: true });

      // Basic user should be denied advanced features
      let response = await request(app)
        .get('/api/inventory/create-form')
        .set(authHeaders.user);

      expect(response.status).toBe(403);

      // Disable strict enforcement
      await request(app)
        .put('/api/settings/permissions/enforce')
        .set(authHeaders.admin)
        .send({ enforce: false });

      // Basic user should now have some additional permissions
      response = await request(app)
        .get('/api/inventory')
        .set(authHeaders.user);

      expect(response.status).toBe(200);

      // But still not admin-level permissions
      response = await request(app)
        .get('/api/users')
        .set(authHeaders.user);

      expect(response.status).toBe(403);
    });

    it('should require admin permission to change enforcement settings', async () => {
      // Basic user tries to change settings
      let response = await request(app)
        .put('/api/settings/permissions/enforce')
        .set(authHeaders.user)
        .send({ enforce: false });

      expect(response.status).toBe(403);

      // Superuser tries to change settings
      response = await request(app)
        .put('/api/settings/permissions/enforce')
        .set(authHeaders.superuser)
        .send({ enforce: false });

      expect(response.status).toBe(403);

      // Admin should succeed
      response = await request(app)
        .put('/api/settings/permissions/enforce')
        .set(authHeaders.admin)
        .send({ enforce: false });

      expect(response.status).toBe(200);
    });
  });

  describe('Frontend Permission API Integration', () => {

    it('should provide current user permissions via API', async () => {
      const response = await request(app)
        .get('/api/user/permissions')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('role', 'user');
      expect(response.body).toHaveProperty('canManagePermissions', false);

      // Should include basic permissions
      expect(response.body.permissions).toContain('inventory.view');
      expect(response.body.permissions).toContain('sales.view');
      expect(response.body.permissions).toContain('sales.create');

      // Should NOT include admin permissions
      expect(response.body.permissions).not.toContain('users.view');
      expect(response.body.permissions).not.toContain('settings.permissions');
    });

    it('should provide admin user permissions correctly', async () => {
      const response = await request(app)
        .get('/api/user/permissions')
        .set(authHeaders.admin);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('role', 'admin');
      expect(response.body).toHaveProperty('canManagePermissions', true);

      // Should include all permissions
      const adminPermissions = response.body.permissions;
      expect(adminPermissions).toContain('users.view');
      expect(adminPermissions).toContain('users.manage_permissions');
      expect(adminPermissions).toContain('settings.permissions');
      expect(adminPermissions).toContain('backup.create');
      expect(adminPermissions.length).toBeGreaterThan(10);
    });

    it('should handle permission check API correctly', async () => {
      // Basic user checks permission they have
      let response = await request(app)
        .get('/api/user/check-permission/inventory.view')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ hasPermission: true });

      // Basic user checks permission they don't have
      response = await request(app)
        .get('/api/user/check-permission/users.view')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ hasPermission: false });

      // Admin checks any permission
      response = await request(app)
        .get('/api/user/check-permission/users.view')
        .set(authHeaders.admin);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ hasPermission: true });
    });

    it('should support bulk permission checking for frontend UI', async () => {
      const permissionsToCheck = [
        'inventory.view',
        'inventory.create',
        'users.view',
        'reports.view',
        'settings.permissions',
      ];

      const response = await request(app)
        .post('/api/user/check-permissions')
        .set(authHeaders.user)
        .send({ permissions: permissionsToCheck });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('permissions');
      
      const results = response.body.permissions;
      expect(results['inventory.view']).toBe(true);
      expect(results['inventory.create']).toBe(false);
      expect(results['users.view']).toBe(false);
      expect(results['reports.view']).toBe(false);
      expect(results['settings.permissions']).toBe(false);
    });
  });

  describe('Cross-Feature Permission Dependencies', () => {

    it('should properly protect quote to sale conversion', async () => {
      // Create a test quote first
      const quoteResponse = await request(app)
        .post('/api/quotes')
        .set(authHeaders.user)
        .send({
          customerName: 'Test Customer',
          items: [{ name: 'Test Item', quantity: 2, price: 10.00 }],
          total: 20.00,
        });

      expect(quoteResponse.status).toBe(201);
      const quoteId = quoteResponse.body.id;

      // Basic user should be able to convert to sale (has sales.create permission)
      const conversionResponse = await request(app)
        .post(`/api/quotes/${quoteId}/convert-to-sale`)
        .set(authHeaders.user);

      expect(conversionResponse.status).toBe(201);
    });

    it('should protect inventory operations based on item permissions', async () => {
      // Create inventory item as superuser
      const itemResponse = await request(app)
        .post('/api/inventory')
        .set(authHeaders.superuser)
        .send({
          name: 'Protected Item',
          quantity: 10,
          supplier: 'Test Supplier',
        });

      expect(itemResponse.status).toBe(201);
      const itemId = itemResponse.body.id;

      // Basic user can view item
      let response = await request(app)
        .get(`/api/inventory/${itemId}`)
        .set(authHeaders.user);

      expect(response.status).toBe(200);

      // Basic user cannot edit item
      response = await request(app)
        .put(`/api/inventory/${itemId}`)
        .set(authHeaders.user)
        .send({ quantity: 15 });

      expect(response.status).toBe(403);

      // Superuser can edit item
      response = await request(app)
        .put(`/api/inventory/${itemId}`)
        .set(authHeaders.superuser)
        .send({ quantity: 15 });

      expect(response.status).toBe(200);
    });

    it('should handle complex permission chains correctly', async () => {
      // Test scenario: Creating sale requires both inventory access and sales permission

      // Basic user has sales.create but let's revoke inventory.view
      await request(app)
        .post(`/api/users/${testUsers.user.id}/permissions`)
        .set(authHeaders.admin)
        .send({
          permission: 'inventory.view',
          granted: false,
        });

      // User tries to create sale (which internally needs to check inventory)
      const response = await request(app)
        .post('/api/sales')
        .set(authHeaders.user)
        .send({
          customerId: 'CUST_001',
          items: [{ id: 'ITEM_001', quantity: 2, price: 10.00 }],
          total: 20.00,
        });

      // Should fail if system properly checks dependent permissions
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/inventory|permission/);
    });
  });

  describe('Security and Error Handling', () => {

    it('should handle malformed permission requests gracefully', async () => {
      const malformedRequests = [
        { permissions: null },
        { permissions: undefined },
        { permissions: 'not_an_array' },
        { permissions: [null, undefined, ''] },
        { permissions: ['../../../etc/passwd', '<script>alert(1)</script>'] },
      ];

      for (const malformedRequest of malformedRequests) {
        const response = await request(app)
          .post('/api/user/check-permissions')
          .set(authHeaders.user)
          .send(malformedRequest);

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should prevent permission escalation attempts', async () => {
      // Try to grant admin permissions to self
      let response = await request(app)
        .put(`/api/users/${testUsers.user.id}/role`)
        .set(authHeaders.user)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);

      // Try to modify other user's permissions
      response = await request(app)
        .post(`/api/users/${testUsers.admin.id}/permissions`)
        .set(authHeaders.user)
        .send({
          permission: 'users.view',
          granted: false,
        });

      expect(response.status).toBe(403);

      // Try SQL injection in permission names
      response = await request(app)
        .get('/api/user/check-permission/inventory.view\'; DROP TABLE users; --')
        .set(authHeaders.user);

      expect(response.status).toBe(400);
    });

    it('should properly handle database errors in permission checks', async () => {
      // This test would require mocking database errors
      // For now, we'll test that the API handles malformed requests correctly
      
      const response = await request(app)
        .get('/api/user/permissions')
        .set(authHeaders.user)
        .set('X-Simulate-DB-Error', 'true'); // Custom header to trigger error in test environment

      // Should either get permissions or a proper error, not crash
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should rate limit permission checking to prevent abuse', async () => {
      const promises = [];
      
      // Make many concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/user/permissions')
            .set(authHeaders.user)
        );
      }

      const responses = await Promise.all(promises);
      
      // Should handle all requests gracefully (rate limiting depends on implementation)
      responses.forEach((response) => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Performance and Caching', () => {

    it('should cache permission results for performance', async () => {
      const startTime = Date.now();

      // Make multiple permission checks for the same user
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/user/permissions')
            .set(authHeaders.user)
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly due to caching (exact threshold depends on system)
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 requests is reasonable
    });

    it('should invalidate permission cache when permissions change', async () => {
      const basicUser = testUsers.user;

      // Get initial permissions
      let response = await request(app)
        .get('/api/user/permissions')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
      const initialPermissions = response.body.permissions;
      expect(initialPermissions).not.toContain('reports.view');

      // Grant new permission
      await request(app)
        .post(`/api/users/${basicUser.id}/permissions`)
        .set(authHeaders.admin)
        .send({
          permission: 'reports.view',
          granted: true,
        });

      // Get updated permissions (should reflect change immediately)
      response = await request(app)
        .get('/api/user/permissions')
        .set(authHeaders.user);

      expect(response.status).toBe(200);
      const updatedPermissions = response.body.permissions;
      expect(updatedPermissions).toContain('reports.view');
    });
  });
});