import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import express from 'express';

describe('Charge Code Management API', () => {
  let app: express.Express;
  let server: any;
  
  const testUser = {
    id: 'dev_admin_001',
    email: 'dev@admin.local',
    firstName: 'Development',
    lastName: 'Admin',
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
    
    // Ensure test user exists in database to avoid foreign key constraint violations
    try {
      await storage.upsertUser(testUser);
    } catch (error) {
      // User might already exist, ignore duplicate errors
      console.log('Test user already exists or creation failed:', error);
    }
  });

  afterAll(async () => {
    if (server) {
      server.close();
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
      const timestamp = Date.now();
      testCategory = categories[0];
      if (!testCategory) {
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        testCategory = await storage.createCategory({
          name: `Test-Charge-Code-Category-${timestamp}-${randomSuffix}`,
          description: `Category for testing charge code exclusions - ${timestamp}`,
          icon: 'fas fa-test',
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
        });
      }

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
        
        // Add category exclusion
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
      // Step 1: Create a new category (or get existing one)
      let workflowCategory;
      try {
        workflowCategory = await storage.createCategory({
          name: `Workflow Test Category ${Date.now()}`, // Make it unique
          description: 'Category for complete workflow test',
          icon: 'fas fa-workflow',
          color: 'purple'
        });
      } catch {
        // If category creation fails due to duplicate name, get existing categories
        const categories = await storage.getCategories();
        workflowCategory = categories.find(c => c.name.includes('Workflow Test Category')) || 
          categories[0]; // Fallback to first category
      }

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
        await storage.deleteChargeCode(createdChargeCode.code);
      } catch (error) {
        console.error('Cleanup error:', error);
        // Try individual cleanups
        try { await storage.deleteItem(workflowItem.id); } catch (cleanupError) { console.warn('Item cleanup failed:', cleanupError); }
        try { await storage.deleteCategory(workflowCategory.id); } catch (cleanupError) { console.warn('Category cleanup failed:', cleanupError); }
        try { await storage.deleteChargeCode(createdChargeCode.code); } catch (cleanupError) { console.warn('Charge code cleanup failed:', cleanupError); }
      }
    }, 30000); // Longer timeout for complex test
  });
});
