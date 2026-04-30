/**
 * Charge Code Management Integration Tests
 * 
 * Tests the complete charge code workflow including:
 * 1. Creating charge codes via API
 * 2. Assigning charge codes to users
 * 3. Validating charge codes in sales context
 * 4. Managing authorized users
 * 5. Hold/unhold functionality
 * 6. Category exclusions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';
import { registerRoutes } from '../../routes';
import express from 'express';

interface TestChargeCode {
  code: string;
  title: string;
  authorisedBy?: string;
  validFrom?: string;
  validUntil?: string;
  pin?: string;
  costCentre?: string;
  authorizedUsers?: Array<{
    userName: string;
    email?: string;
    department?: string;
  }>;
}

interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'manager' | 'admin' | 'superuser';
  isActive: boolean;
}

describe('Charge Code Management Integration Tests', () => {
  let app: Express;
  let server: any;
  
  const adminUser: TestUser = {
    id: 'admin001',
    email: 'admin@university.edu',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true
  };

  const regularUser: TestUser = {
    id: 'user001', 
    email: 'user@university.edu',
    firstName: 'Regular',
    lastName: 'User',
    role: 'user',
    isActive: true
  };

  const managerUser: TestUser = {
    id: 'manager001',
    email: 'manager@university.edu', 
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    isActive: true
  };

  beforeAll(async () => {
    await setupTestDatabase();
    
    app = express();
    server = await registerRoutes(app);

    // Create test users if they don't exist
    // This would normally be done via user creation API
    console.log('Setting up test users for charge code integration tests...');
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up any test data before each test
    console.log('Cleaning test charge codes...');
    
    // Note: This would need actual cleanup logic
    // For now, use unique codes per test to avoid conflicts
  });

  afterEach(async () => {
    // Additional cleanup if needed
  });

  /**
   * Helper function to create a unique charge code for each test
   */
  function getUniqueChargeCode(prefix = 'TEST'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
  }

  describe('Charge Code CRUD Operations', () => {

    it('should create a new charge code with admin privileges', async () => {
      const chargeCodeData: TestChargeCode = {
        code: getUniqueChargeCode('CREATE'),
        title: 'Test Creation Charge Code',
        authorisedBy: adminUser.id,
        validFrom: '2025-01-01',
        validUntil: '2025-12-31', 
        costCentre: 'TEST-DEPT',
        authorizedUsers: [
          { userName: 'John Doe', email: 'john@university.edu', department: 'Physics' },
          { userName: 'Jane Smith', email: 'jane@university.edu', department: 'Chemistry' }
        ]
      };

      // Mock authentication as admin
      const response = await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send(chargeCodeData)
        .expect(201);

      expect(response.body).toHaveProperty('code', chargeCodeData.code);
      expect(response.body).toHaveProperty('title', chargeCodeData.title);
      expect(response.body).toHaveProperty('costCentre', chargeCodeData.costCentre);
      expect(response.body.authorizedUsers).toHaveLength(2);
      
      // Verify timestamps
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should reject charge code creation by regular users', async () => {
      const chargeCodeData: TestChargeCode = {
        code: getUniqueChargeCode('REJECT'),
        title: 'Unauthorized Creation Attempt'
      };

      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(regularUser))
        .send(chargeCodeData)
        .expect(403); // Forbidden
    });

    it('should prevent duplicate charge code creation', async () => {
      const chargeCode = getUniqueChargeCode('DUP');
      
      const chargeCodeData: TestChargeCode = {
        code: chargeCode,
        title: 'First Creation'
      };

      // Create first charge code
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send(chargeCodeData)
        .expect(201);

      // Attempt to create duplicate
      const duplicateData: TestChargeCode = {
        code: chargeCode, // Same code
        title: 'Duplicate Attempt'
      };

      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send(duplicateData)
        .expect(409); // Conflict
    });

    it('should retrieve charge code by code', async () => {
      const chargeCode = getUniqueChargeCode('RETRIEVE');
      
      // Create charge code first
      const createData: TestChargeCode = {
        code: chargeCode,
        title: 'Retrievable Charge Code',
        costCentre: 'RETRIEVE-DEPT'
      };

      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send(createData)
        .expect(201);

      // Retrieve it
      const response = await request(app)
        .get(`/api/chargecodes/${chargeCode}`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(response.body).toHaveProperty('code', chargeCode);
      expect(response.body).toHaveProperty('title', createData.title);
      expect(response.body).toHaveProperty('costCentre', createData.costCentre);
    });

    it('should update existing charge code', async () => {
      const chargeCode = getUniqueChargeCode('UPDATE');
      
      // Create charge code
      const createData: TestChargeCode = {
        code: chargeCode,
        title: 'Original Title',
        costCentre: 'ORIGINAL-DEPT'
      };

      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send(createData)
        .expect(201);

      // Update it
      const updateData = {
        title: 'Updated Title',
        costCentre: 'UPDATED-DEPT',
        authorizedUsers: [
          { userName: 'New User', email: 'newuser@university.edu' }
        ]
      };

      const response = await request(app)
        .put(`/api/chargecodes/${chargeCode}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('title', updateData.title);
      expect(response.body).toHaveProperty('costCentre', updateData.costCentre);
      expect(response.body.authorizedUsers).toHaveLength(1);
    });

    it('should list all charge codes', async () => {
      // Create a few test charge codes
      const codes = [
        getUniqueChargeCode('LIST1'),
        getUniqueChargeCode('LIST2'),
        getUniqueChargeCode('LIST3')
      ];

      for (const code of codes) {
        await request(app)
          .post('/api/chargecodes')
          .set('X-Test-User', JSON.stringify(adminUser))
          .send({ code, title: `List Test ${code}` })
          .expect(201);
      }

      const response = await request(app)
        .get('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      
      // Check that our test codes are included
      const returnedCodes = response.body.map((cc: any) => cc.code);
      for (const code of codes) {
        expect(returnedCodes).toContain(code);
      }
    });
  });

  describe('User Assignment Operations', () => {

    let testChargeCode: string;

    beforeEach(async () => {
      // Create a charge code for assignment tests
      testChargeCode = getUniqueChargeCode('ASSIGN');
      
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: testChargeCode,
          title: 'Assignment Test Code',
          authorizedUsers: []
        })
        .expect(201);
    });

    it('should assign charge code to user', async () => {
      const response = await request(app)
        .post(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          chargeCode: testChargeCode,
          notes: 'Test assignment'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.assignment).toHaveProperty('chargeCode', testChargeCode);
      expect(response.body.assignment).toHaveProperty('userId', regularUser.id);
    });

    it('should prevent regular users from assigning charge codes', async () => {
      await request(app)
        .post(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(regularUser)) // Regular user trying to assign
        .send({
          chargeCode: testChargeCode
        })
        .expect(403);
    });

    it('should retrieve user assigned charge codes', async () => {
      // First assign the charge code
      await request(app)
        .post(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          chargeCode: testChargeCode,
          notes: 'Retrieval test'
        })
        .expect(200);

      // Then retrieve assignments
      const response = await request(app)
        .get(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      const assignment = response.body.find((cc: any) => cc.code === testChargeCode);
      expect(assignment).toBeDefined();
      expect(assignment.notes).toBe('Retrieval test');
    });

    it('should remove charge code assignment', async () => {
      // First assign the charge code
      await request(app)
        .post(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({ chargeCode: testChargeCode })
        .expect(200);

      // Then remove it
      await request(app)
        .delete(`/api/users/${regularUser.id}/charge-codes/${testChargeCode}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .expect(200);

      // Verify it's removed
      const response = await request(app)
        .get(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      const assignment = response.body.find((cc: any) => cc.code === testChargeCode);
      expect(assignment).toBeUndefined();
    });

    it('should handle assignment to non-existent user', async () => {
      await request(app)
        .post('/api/users/nonexistent-user/charge-codes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({ chargeCode: testChargeCode })
        .expect(404);
    });

    it('should handle assignment of non-existent charge code', async () => {
      await request(app)
        .post(`/api/users/${regularUser.id}/charge-codes`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({ chargeCode: 'NONEXISTENT-CODE' })
        .expect(404);
    });
  });

  describe('Charge Code Validation in Sales Context', () => {

    let validChargeCode: string;
    let expiredChargeCode: string;
    let onHoldChargeCode: string;

    beforeEach(async () => {
      // Create valid charge code
      validChargeCode = getUniqueChargeCode('VALID');
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: validChargeCode,
          title: 'Valid Sales Code',
          validFrom: '2025-01-01',
          validUntil: '2025-12-31',
          authorizedUsers: [
            { userName: 'Regular User', email: regularUser.email }
          ]
        })
        .expect(201);

      // Create expired charge code  
      expiredChargeCode = getUniqueChargeCode('EXPIRED');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: expiredChargeCode,
          title: 'Expired Sales Code',
          validUntil: pastDate.toISOString().split('T')[0]
        })
        .expect(201);

      // Create on-hold charge code
      onHoldChargeCode = getUniqueChargeCode('HOLD');
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: onHoldChargeCode,
          title: 'On Hold Code'
        })
        .expect(201);

      // Put it on hold (this would be a separate API call in real system)
      await request(app)
        .put(`/api/chargecodes/${onHoldChargeCode}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          title: 'On Hold Code',
          onHold: true,
          holdReason: 'Budget exceeded'
        })
        .expect(200);
    });

    it('should validate charge code for sales use', async () => {
      const response = await request(app)
        .get(`/api/chargecodes/${validChargeCode}/validate`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(response.body).toHaveProperty('isValid', true);
      expect(response.body).toHaveProperty('chargeCode', validChargeCode);
    });

    it('should reject expired charge codes', async () => {
      const response = await request(app)
        .get(`/api/chargecodes/${expiredChargeCode}/validate`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200); // Returns 200 but with invalid result

      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body.reason).toContain('expired');
    });

    it('should reject on-hold charge codes', async () => {
      const response = await request(app)
        .get(`/api/chargecodes/${onHoldChargeCode}/validate`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body.reason).toContain('Budget exceeded');
    });

    it('should reject non-existent charge codes', async () => {
      const response = await request(app)
        .get('/api/chargecodes/NONEXISTENT/validate')
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body.reason).toContain('not found');
    });

    it('should allow admin to use any charge code', async () => {
      // Admin should be able to use even expired codes (with warning)
      const response = await request(app)
        .get(`/api/chargecodes/${expiredChargeCode}/validate`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .expect(200);

      // Admins might get different validation behavior
      // This depends on business rules
    });
  });

  describe('Authorized Users Management', () => {

    let testChargeCodeWithUsers: string;

    beforeEach(async () => {
      testChargeCodeWithUsers = getUniqueChargeCode('AUTHUSERS');
      
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: testChargeCodeWithUsers,
          title: 'Authorized Users Test',
          authorizedUsers: [
            { userName: 'Alice Johnson', email: 'alice@university.edu', department: 'Biology' },
            { userName: 'Bob Wilson', email: 'bob@university.edu', department: 'Physics' }
          ]
        })
        .expect(201);
    });

    it('should return authorized users with charge code', async () => {
      const response = await request(app)
        .get(`/api/chargecodes/${testChargeCodeWithUsers}`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(response.body.authorizedUsers).toHaveLength(2);
      expect(response.body.authorizedUsers[0]).toHaveProperty('userName');
      expect(response.body.authorizedUsers[0]).toHaveProperty('email');
      expect(response.body.authorizedUsers[0]).toHaveProperty('department');
    });

    it('should update authorized users list', async () => {
      const newUsers = [
        { userName: 'Charlie Brown', email: 'charlie@university.edu', department: 'Chemistry' },
        { userName: 'Diana Prince', email: 'diana@university.edu', department: 'Mathematics' },
        { userName: 'Ethan Hunt', email: 'ethan@university.edu', department: 'Engineering' }
      ];

      const response = await request(app)
        .put(`/api/chargecodes/${testChargeCodeWithUsers}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          title: 'Authorized Users Test',
          authorizedUsers: newUsers
        })
        .expect(200);

      expect(response.body.authorizedUsers).toHaveLength(3);
      expect(response.body.authorizedUsers.map((u: any) => u.userName)).toContain('Charlie Brown');
    });

    it('should clear authorized users when empty array provided', async () => {
      const response = await request(app)
        .put(`/api/chargecodes/${testChargeCodeWithUsers}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          title: 'Authorized Users Test',
          authorizedUsers: []
        })
        .expect(200);

      expect(response.body.authorizedUsers).toHaveLength(0);
    });

    it('should enforce authorization for regular users', async () => {
      // Create a charge code with specific authorized users (not including regularUser)
      const restrictedCode = getUniqueChargeCode('RESTRICTED');
      
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: restrictedCode,
          title: 'Restricted Code',
          authorizedUsers: [
            { userName: 'Other User', email: 'other@university.edu' }
          ]
        })
        .expect(201);

      // Regular user should not be able to validate this code successfully
      const response = await request(app)
        .get(`/api/chargecodes/${restrictedCode}/validate`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .expect(200);

      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body.reason).toContain('not authorized');
    });
  });

  describe('Hold/Unhold Functionality', () => {

    let holdTestCode: string;

    beforeEach(async () => {
      holdTestCode = getUniqueChargeCode('HOLDTEST');
      
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: holdTestCode,
          title: 'Hold Test Code'
        })
        .expect(201);
    });

    it('should put charge code on hold', async () => {
      const response = await request(app)
        .put(`/api/chargecodes/${holdTestCode}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          title: 'Hold Test Code',
          onHold: true,
          holdReason: 'Budget review required'
        })
        .expect(200);

      expect(response.body).toHaveProperty('onHold', true);
      expect(response.body).toHaveProperty('holdReason', 'Budget review required');
      expect(response.body).toHaveProperty('heldBy', adminUser.id);
      expect(response.body).toHaveProperty('heldAt');
    });

    it('should release charge code from hold', async () => {
      // First put on hold
      await request(app)
        .put(`/api/chargecodes/${holdTestCode}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          title: 'Hold Test Code',
          onHold: true,
          holdReason: 'Test hold'
        })
        .expect(200);

      // Then release
      const response = await request(app)
        .put(`/api/chargecodes/${holdTestCode}`)
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          title: 'Hold Test Code',
          onHold: false
        })
        .expect(200);

      expect(response.body).toHaveProperty('onHold', false);
      expect(response.body.holdReason).toBeNull();
      expect(response.body.heldBy).toBeNull();
    });

    it('should prevent non-admins from changing hold status', async () => {
      await request(app)
        .put(`/api/chargecodes/${holdTestCode}`)
        .set('X-Test-User', JSON.stringify(regularUser))
        .send({
          title: 'Hold Test Code',
          onHold: true,
          holdReason: 'Unauthorized attempt'
        })
        .expect(403);
    });
  });

  describe('Error Handling and Edge Cases', () => {

    it('should handle malformed requests gracefully', async () => {
      await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate date formats', async () => {
      const response = await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: getUniqueChargeCode('DATETEST'),
          title: 'Date Format Test',
          validFrom: 'invalid-date',
          validUntil: '2025-12-31'
        });

      // Should either reject (400) or accept with validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should handle very long charge code titles', async () => {
      const longTitle = 'A'.repeat(1000); // Very long title

      const response = await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: getUniqueChargeCode('LONG'),
          title: longTitle
        });

      // Should either accept (with truncation) or reject
      expect([201, 400, 422]).toContain(response.status);
    });

    it('should handle concurrent charge code creation attempts', async () => {
      const sameCode = getUniqueChargeCode('CONCURRENT');
      
      // Start both requests at the same time
      const [response1, response2] = await Promise.allSettled([
        request(app)
          .post('/api/chargecodes')
          .set('X-Test-User', JSON.stringify(adminUser))
          .send({
            code: sameCode,
            title: 'Concurrent Test 1'
          }),
        request(app)
          .post('/api/chargecodes')
          .set('X-Test-User', JSON.stringify(adminUser))
          .send({
            code: sameCode,
            title: 'Concurrent Test 2'
          })
      ]);

      // One should succeed, one should fail with conflict
      const statuses = [
        response1.status === 'fulfilled' ? response1.value.status : 500,
        response2.status === 'fulfilled' ? response2.value.status : 500
      ];

      expect(statuses).toContain(201); // One success
      expect(statuses).toContain(409); // One conflict
    });
  });

  describe('Performance and Scale Testing', () => {

    it('should handle creating multiple charge codes efficiently', async () => {
      const startTime = Date.now();
      const codeCount = 10;
      const promises = [];

      for (let i = 0; i < codeCount; i++) {
        promises.push(
          request(app)
            .post('/api/chargecodes')
            .set('X-Test-User', JSON.stringify(adminUser))
            .send({
              code: getUniqueChargeCode(`PERF${i}`),
              title: `Performance Test ${i}`
            })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete in reasonable time (adjust threshold as needed)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`Created ${codeCount} charge codes in ${duration}ms`);
    });

    it('should handle large authorized users lists', async () => {
      const largeUserList = Array.from({ length: 50 }, (_, i) => ({
        userName: `User ${i}`,
        email: `user${i}@university.edu`,
        department: `Department ${i % 5}`
      }));

      const response = await request(app)
        .post('/api/chargecodes')
        .set('X-Test-User', JSON.stringify(adminUser))
        .send({
          code: getUniqueChargeCode('LARGE'),
          title: 'Large User List Test',
          authorizedUsers: largeUserList
        })
        .expect(201);

      expect(response.body.authorizedUsers).toHaveLength(50);
    });
  });
});