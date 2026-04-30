import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import express from 'express';
import { setupTestDatabase } from './setup/index';

describe('Charge Code Management API', () => {
  let app: express.Express;
  let server: any;
  
  const testUser = {
    id: 'admin_001',
    email: 'admin@university.edu',
    firstName: 'Admin',
    lastName: 'University',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    lastLogin: new Date()
  };

  // Test data with unique codes to avoid conflicts
  const getTestChargeCode = () => ({
    code: `TEST-CC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Charge Code',
    authorisedBy: testUser.id,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    pin: '1234',
    costCentre: 'TEST-DEPT'
  });

  const getExpiredChargeCode = () => ({
    code: `EXPIRED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Expired Charge Code',
    authorisedBy: testUser.id,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    pin: '9999',
    costCentre: 'OLD-DEPT'
  });

  const getFutureChargeCode = () => ({
    code: `FUTURE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Future Charge Code',
    authorisedBy: testUser.id,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    pin: '5555',
    costCentre: 'FUTURE-DEPT'
  });

  let testChargeCode: any;
  let expiredChargeCode: any;
  let futureChargeCode: any;

  let testCategory: any;
  let testItem: any;

  beforeAll(async () => {
    // Ensure database schema is properly set up
    await setupTestDatabase();
    
    // Initialize test user - use upsertUser to ensure consistent ID
    try {
      await storage.upsertUser({
        id: testUser.id, // Use the same ID as defined in testUser
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: 'admin' as const,
        isActive: testUser.isActive
      });
    } catch (error) {
      // User might already exist, that's okay
      console.log('Test user already exists or creation failed:', (error as Error)?.message || 'Unknown error');
    }

    // Set up Express app with routes
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware to use test user
    app.use((req: any, res, next) => {
      req.user = testUser;
      req.isAuthenticated = () => true;
      next();
    });

    server = await registerRoutes(app);
    // Wait a bit for database initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await storage.deleteChargeCode(testChargeCode.code);
      await storage.deleteChargeCode(expiredChargeCode.code);
      await storage.deleteChargeCode(futureChargeCode.code);
      await storage.deleteChargeCode('DUPLICATE-TEST');
      await storage.deleteChargeCode('MINIMAL-001');
      await storage.deleteChargeCode('EXPIRING-SOON');
      await storage.deleteChargeCode('EXPIRING-FAR');
      await storage.deleteChargeCode('WORKFLOW-CC');
      await storage.deleteChargeCode('EXCLUSION-TEST');
      
      // Clean up test items and categories
      if (testItem) {
        await storage.deleteItem(testItem.id);
      }
      if (testCategory && testCategory.name === 'Test Category') {
        await storage.deleteCategory(testCategory.id);
      }
    } catch {
      // Ignore errors for non-existent records
    }
  });

  beforeEach(async () => {
    // Generate fresh test data for each test to avoid conflicts
    testChargeCode = getTestChargeCode();
    expiredChargeCode = getExpiredChargeCode();
    futureChargeCode = getFutureChargeCode();

    // Clean up test data before each test - more aggressive cleanup
    try {
      const existingChargeCodes = await storage.getChargeCodes();
      for (const cc of existingChargeCodes) {
        if (cc.code.startsWith('TEST-CC-') || 
            cc.code.startsWith('EXPIRED-') || 
            cc.code.startsWith('FUTURE-') || 
            cc.code === 'DUPLICATE-TEST' || 
            cc.code === 'MINIMAL-001' || 
            cc.code === 'EXPIRING-SOON' || 
            cc.code === 'EXPIRING-FAR' || 
            cc.code === 'EXCLUSION-TEST' || 
            cc.code.startsWith('WORKFLOW-CC')) {
          try {
            await storage.deleteChargeCode(cc.code);
          } catch {
            // Ignore errors for records in use
          }
        }
      }
    } catch {
      // Ignore errors for non-existent records
    }

    // Create test category and item for exclusion tests
    try {
      const categories = await storage.getCategories();
      testCategory = categories.find(c => c.name === 'Test Category') || 
        await storage.createCategory({
          name: 'Test Category',
          description: 'Category for testing charge code exclusions',
          icon: 'fas fa-test',
          color: 'red'
        });

      // Always create a new test item for exclusion testing, ensuring it belongs to the test category
      const existingItems = await storage.getItems(1, 10, 'Test Exclusion Item');
      if (existingItems.items.length === 0) {
        testItem = await storage.createItem({
          name: 'Test Exclusion Item',
          sku: `TEST-EXCLUSION-${Date.now()}`,
          description: 'Item for testing exclusions',
          categoryId: testCategory.id,
          price: '10.00',
          vatRate: '0.20',
          vatIncluded: true,
          currentStock: 100,
          minimumStock: 10,
          isActive: true,
          notesId: undefined,
          createdBy: testUser.id
        });
      } else {
        testItem = existingItems.items[0];
        // Update the item to ensure it belongs to the test category
        await storage.updateItem(testItem.id, {
          categoryId: testCategory.id
        }, testUser.id);
        // Refresh the item data
        testItem = await storage.getItem(testItem.id);
      }
    } catch (error) {
      console.error('Failed to set up test data:', error);
      throw new Error(`Test setup failed: ${error}`);
    }

    // Ensure testItem was created successfully
    if (!testItem) {
      throw new Error('testItem was not created during test setup');
    }
  });

  describe('GET /api/chargecodes', () => {
    it('should return all charge codes', async () => {
      // Create a test charge code first
      await storage.createChargeCode(testChargeCode);

      const response = await request(app)
        .get('/api/chargecodes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((cc: any) => cc.code === testChargeCode.code)).toBe(true);
    });

    it('should return empty array when no charge codes exist', async () => {
      const response = await request(app)
        .get('/api/chargecodes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/chargecodes/:code', () => {
    it('should return a specific charge code', async () => {
      await storage.createChargeCode(testChargeCode);

      const response = await request(app)
        .get(`/api/chargecodes/${testChargeCode.code}`)
        .expect(200);

      expect(response.body.code).toBe(testChargeCode.code);
      expect(response.body.title).toBe(testChargeCode.title);
      expect(response.body.costCentre).toBe(testChargeCode.costCentre);
    });

    it('should return 404 for non-existent charge code', async () => {
      const response = await request(app)
        .get('/api/chargecodes/NON-EXISTENT')
        .expect(404);

      expect(response.body.message).toBe('Charge code not found');
    });
  });

  describe('POST /api/chargecodes', () => {
    it('should create a new charge code', async () => {
      const response = await request(app)
        .post('/api/chargecodes')
        .send(testChargeCode)
        .expect(201);

      expect(response.body.code).toBe(testChargeCode.code);
      expect(response.body.title).toBe(testChargeCode.title);
    });

    it('should return 400 if code is missing', async () => {
      const invalidChargeCode = { ...testChargeCode };
      delete (invalidChargeCode as any).code;

      const response = await request(app)
        .post('/api/chargecodes')
        .send(invalidChargeCode)
        .expect(400);

      expect(response.body.message).toBe('Code and title are required');
    });

    it('should return 400 if title is missing', async () => {
      const invalidChargeCode = { ...testChargeCode };
      delete (invalidChargeCode as any).title;

      const response = await request(app)
        .post('/api/chargecodes')
        .send(invalidChargeCode)
        .expect(400);

      expect(response.body.message).toBe('Code and title are required');
    });

    it('should return 409 for duplicate charge code', async () => {
      // Create the charge code first
      await storage.createChargeCode(testChargeCode);

      // Try to create the same charge code again
      const response = await request(app)
        .post('/api/chargecodes')
        .send(testChargeCode)
        .expect(409);

      expect(response.body.message).toBe('Charge code already exists');
    });

    it('should trim whitespace from code and title', async () => {
      const codeWithWhitespace = {
        ...testChargeCode,
        code: '  ' + testChargeCode.code + '  ',
        title: '  ' + testChargeCode.title + '  '
      };

      const response = await request(app)
        .post('/api/chargecodes')
        .send(codeWithWhitespace)
        .expect(201);

      expect(response.body.code).toBe(testChargeCode.code);
      expect(response.body.title).toBe(testChargeCode.title);
    });

    it('should handle optional fields correctly', async () => {
      const minimalChargeCode = {
        code: 'MINIMAL-001',
        title: 'Minimal Charge Code'
      };

      const response = await request(app)
        .post('/api/chargecodes')
        .send(minimalChargeCode)
        .expect(201);

      expect(response.body.code).toBe(minimalChargeCode.code);
      expect(response.body.title).toBe(minimalChargeCode.title);
      expect(response.body.authorisedBy).toBe(testUser.id); // Should default to current user
    });
  });

  describe('PUT /api/chargecodes/:code', () => {
    it('should update an existing charge code', async () => {
      await storage.createChargeCode(testChargeCode);

      const updatedData = {
        title: 'Updated Test Charge Code',
        costCentre: 'UPDATED-DEPT',
        pin: '9876'
      };

      const response = await request(app)
        .put(`/api/chargecodes/${testChargeCode.code}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.title).toBe(updatedData.title);
      expect(response.body.costCentre).toBe(updatedData.costCentre);
      expect(response.body.pin).toBe(updatedData.pin);
      expect(response.body.code).toBe(testChargeCode.code); // Code should not change
    });

    it('should return 404 for non-existent charge code', async () => {
      const response = await request(app)
        .put('/api/chargecodes/NON-EXISTENT')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.message).toBe('Charge code not found');
    });

    it('should return 400 if title is missing', async () => {
      await storage.createChargeCode(testChargeCode);

      const response = await request(app)
        .put(`/api/chargecodes/${testChargeCode.code}`)
        .send({ costCentre: 'NEW-DEPT' })
        .expect(400);

      expect(response.body.message).toBe('Title is required');
    });
  });

  describe('DELETE /api/chargecodes/:code', () => {
    it('should delete an unused charge code', async () => {
      // Use a unique charge code for this test to avoid conflicts
      const uniqueChargeCode = {
        ...testChargeCode,
        code: `DELETE-TEST-${Date.now()}`
      };
      
      await storage.createChargeCode(uniqueChargeCode);

      const response = await request(app)
        .delete(`/api/chargecodes/${uniqueChargeCode.code}`)
        .expect(200);

      expect(response.body.message).toBe('Charge code deleted successfully');

      // Verify it's actually deleted
      await request(app)
        .get(`/api/chargecodes/${uniqueChargeCode.code}`)
        .expect(404);
    });

    it('should return 400 when trying to delete a charge code in use', async () => {
      await storage.createChargeCode(testChargeCode);

      // Create a sale using this charge code
      const saleData = {
        chargeCode: testChargeCode.code,
        subtotalAmount: '10.00',
        vatAmount: '2.00',
        totalAmount: '12.00',
        vatApplied: true,
        processedBy: testUser.id,
        status: 'completed' as const
      };

      const saleItems = [{
        itemId: testItem.id,
        itemName: testItem.name,
        itemSku: testItem.sku,
        unitPrice: parseFloat(testItem.price),
        quantity: 1,
        vatRate: parseFloat(testItem.vatRate),
        vatAmount: 2.00,
        subtotal: 10.00,
        totalWithVat: 12.00,
      }];

      await storage.createSale(saleData, saleItems, 'test-user-id');

      const response = await request(app)
        .delete(`/api/chargecodes/${testChargeCode.code}`)
        .expect(400);

      expect(response.body.message).toContain('Cannot delete charge code that is being used in sales');
      expect(response.body.salesCount).toBeGreaterThan(0);
    });
  });

  describe('GET /api/chargecodes/expiring/soon', () => {
    it('should return charge codes expiring within 30 days', async () => {
      // Create a charge code expiring in 15 days
      const expiringCode = {
        ...testChargeCode,
        code: 'EXPIRING-SOON',
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
      };

      await storage.createChargeCode(expiringCode);

      const response = await request(app)
        .get('/api/chargecodes/expiring/soon')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((cc: any) => cc.code === expiringCode.code)).toBe(true);
    });

    it('should not return charge codes expiring beyond 30 days', async () => {
      // Create a charge code expiring in 60 days
      const farExpiringCode = {
        ...testChargeCode,
        code: 'EXPIRING-FAR',
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      };

      await storage.createChargeCode(farExpiringCode);

      const response = await request(app)
        .get('/api/chargecodes/expiring/soon')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((cc: any) => cc.code === farExpiringCode.code)).toBe(false);
    });
  });

  describe('Sales with Charge Code Validation', () => {
    beforeEach(async () => {
      // Ensure test charge codes exist
      try {
        await storage.createChargeCode(testChargeCode);
        await storage.createChargeCode(expiredChargeCode);
        await storage.createChargeCode(futureChargeCode);
      } catch {
        // Ignore if already exists
      }
    });

    it('should create sale with valid charge code', async () => {
      const saleRequest = {
        chargeCode: testChargeCode.code,
        customerNotes: 'Test sale with valid charge code',
        items: [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku,
          unitPrice: '10.00',
          quantity: 1
        }],
        totalAmount: '12.00'
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.sale.chargeCode).toBe(testChargeCode.code);
    });

    it('should reject sale with expired charge code', async () => {
      const saleRequest = {
        chargeCode: expiredChargeCode.code,
        customerNotes: 'Test sale with expired charge code',
        items: [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku,
          unitPrice: '10.00',
          quantity: 1
        }],
        totalAmount: '12.00'
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(400);

      expect(response.body.code).toBe('EXPIRED_CHARGE_CODE');
      expect(response.body.message).toContain('has expired');
    });

    it('should reject sale with future charge code', async () => {
      const saleRequest = {
        chargeCode: futureChargeCode.code,
        customerNotes: 'Test sale with future charge code',
        items: [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku,
          unitPrice: '10.00',
          quantity: 1
        }],
        totalAmount: '12.00'
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(400);

      expect(response.body.code).toBe('PREMATURE_CHARGE_CODE');
      expect(response.body.message).toContain('is not yet valid');
    });
  });

  describe('Charge Code Exclusions Integration', () => {
    let exclusionChargeCode: any;

    beforeEach(async () => {
      // Create a charge code for exclusion testing
      exclusionChargeCode = {
        code: 'EXCLUSION-TEST',
        title: 'Charge Code with Exclusions',
        authorisedBy: testUser.id,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31')
      };

      try {
        await storage.createChargeCode(exclusionChargeCode);
        // Add category exclusion (use correct signature)
        await storage.createChargeCodeExclusion(
          exclusionChargeCode.code,
          testCategory.id,
          testUser.id
        );
      } catch {
        // Ignore if already exists
      }
    });

    afterEach(async () => {
      try {
        await storage.deleteChargeCodeExclusion(exclusionChargeCode.code, testCategory.id);
        await storage.deleteChargeCode(exclusionChargeCode.code);
      } catch {
        // Ignore errors
      }
    });

    it('should reject sale when item category is excluded for charge code', async () => {
      const saleRequest = {
        chargeCode: exclusionChargeCode.code,
        customerNotes: 'Test sale with excluded category',
        items: [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku,
          unitPrice: '10.00',
          quantity: 1
        }],
        totalAmount: '12.00'
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(400);

      expect(response.body.code).toBe('CHARGE_CODE_EXCLUSION');
      expect(response.body.message).toContain('cannot be used for items in the following categories');
    });
  });

  describe('Complex Scenario: Complete Workflow', () => {
    it('should handle complete charge code lifecycle with sales and exclusions', async () => {
      // Step 1: Create a unique test category to avoid conflicts
      const workflowCategory = await storage.createCategory({
        name: `Workflow Test Category ${Date.now()}`,
        description: 'Category for complete workflow testing',
        icon: 'fas fa-workflow',
        color: 'blue'
      });

      // Step 2: Create an item in this category
      const workflowItem = await storage.createItem({
        name: 'Workflow Test Item',
        sku: `WORKFLOW-${Date.now()}`,
        description: 'Item for workflow testing',
        categoryId: workflowCategory.id,
        price: '25.00',
        vatRate: '0.20',
        vatIncluded: true,
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        createdBy: testUser.id
      });

      // Step 3: Create a charge code via storage (not API) to ensure it exists
      const workflowChargeCode = {
        code: `WORKFLOW-CC-${Date.now()}`,
        title: 'Workflow Test Charge Code',
        authorisedBy: testUser.id,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
        costCentre: 'WORKFLOW-DEPT'
      };

      const createdChargeCode = await storage.createChargeCode(workflowChargeCode);

      // Step 4: Verify sale works initially
      const saleRequest = {
        chargeCode: createdChargeCode.code,
        customerNotes: 'Initial workflow test sale',
        items: [{
          itemId: workflowItem.id,
          itemName: workflowItem.name,
          itemSku: workflowItem.sku,
          unitPrice: '25.00',
          quantity: 1
        }],
        totalAmount: '30.00'
      };

      await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(201);

      // Step 5: Add category exclusion for this charge code
      await storage.createChargeCodeExclusion(
        createdChargeCode.code,
        workflowCategory.id,
        testUser.id
      );

      // Step 6: Verify sale is now blocked due to exclusion
      await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(400);

      // Step 7: Remove exclusion
      await storage.deleteChargeCodeExclusion(createdChargeCode.code, workflowCategory.id);

      // Step 8: Verify sale works again
      await request(app)
        .post('/api/sales')
        .send(saleRequest)
        .expect(201);

      // Step 9: Try to delete charge code (should fail due to existing sales)
      await request(app)
        .delete(`/api/chargecodes/${createdChargeCode.code}`)
        .expect(400);

      // Clean up - delete in correct order to avoid foreign key constraints
      try {
        await storage.deleteItem(workflowItem.id);
        await storage.deleteCategory(workflowCategory.id);
        // Don't delete charge code as it has sales
      } catch (error) {
        console.error('Cleanup error:', error);
        // Try individual cleanups
        try { await storage.deleteItem(workflowItem.id); } catch (cleanupError) { console.warn('Item cleanup failed:', cleanupError); }
        try { await storage.deleteCategory(workflowCategory.id); } catch (cleanupError) { console.warn('Category cleanup failed:', cleanupError); }
      }
    }, 30000); // Longer timeout for complex test
  });
});
