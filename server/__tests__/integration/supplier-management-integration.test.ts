/**
 * Supplier Management Integration Tests
 * 
 * Tests supplier management API endpoints and database integration including:
 * 1. Complete supplier CRUD API operations
 * 2. Permission-based access controls
 * 3. Supplier-item relationship management (sources)
 * 4. Enhanced supplier features with order history
 * 5. Safe deletion with dependency checking
 * 6. Data validation and error handling
 * 7. Complex supplier queries and filtering
 * 8. Bulk operations and performance
 * 9. Supplier audit and history tracking
 * 10. Integration with order management system
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app'; // Adjust path as needed
import { testDb } from '../test-helpers/database';
import { createTestUser, authenticateUser } from '../test-helpers/auth';
import { setupTestData, cleanupTestData } from '../test-helpers/test-data';
import { DatabaseTestHelper } from '../helpers/databaseTestHelper';

interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'superuser' | 'admin';
  password: string;
  token?: string;
}

interface TestSupplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  accountNumber?: string;
  notesId?: number;
  createdAt: Date;
  updatedAt?: Date;
}

interface TestItem {
  id: number;
  name: string;
  sku: string;
  unitPrice: number;
  vatRate: number;
  category: string;
  currentStock: number;
}

interface TestSource {
  id: number;
  itemId: number;
  supplierId: string;
  price?: string;
  notesId?: number;
}

interface TestOrder {
  id: number;
  orderId: string;
  supplierId: string;
  status: string;
  totalAmount: string;
  createdBy: string;
  receivedBy?: string;
}

describe('Supplier Management Integration Tests', () => {
  let testHelper: DatabaseTestHelper;
  let testUsers: Record<string, TestUser>;
  let authHeaders: Record<string, Record<string, string>>;

  beforeAll(async () => {
    await testDb.connect();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  beforeEach(async () => {
    testHelper = new DatabaseTestHelper();
    await testHelper.setup();
    await setupTestData();
    
    // Create test users with different permission levels
    testUsers = {
      user: await createTestUser({
        email: 'basicuser@test.com',
        firstName: 'Basic',
        lastName: 'User',
        role: 'user',
        password: 'password123',
      }),
      superuser: await createTestUser({
        email: 'manager@test.com',
        firstName: 'Super',
        lastName: 'User',
        role: 'superuser',
        password: 'password123',
      }),
      admin: await createTestUser({
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User', 
        role: 'admin',
        password: 'password123',
      }),
    };

    // Authenticate users
    authHeaders = {};
    for (const [key, user] of Object.entries(testUsers)) {
      const token = await authenticateUser(user.email, user.password);
      authHeaders[key] = { Authorization: `Bearer ${token}` };
      testUsers[key].token = token;
    }
  });

  afterEach(async () => {
    await cleanupTestData();
    await testHelper.cleanup();
    await testHelper.close();
  });

  describe('Supplier API Endpoints', () => {

    describe('GET /api/suppliers', () => {

      it('should return list of suppliers for authenticated users', async () => {
        // Create test suppliers
        await testHelper.createTestSupplier({
          id: 'SUPPLIER-001',
          name: 'Test Supplier One',
          contact: 'John Doe',
          email: 'john@supplier1.com',
          phone: '+44 123 456 7890',
        });

        await testHelper.createTestSupplier({
          id: 'SUPPLIER-002',
          name: 'Test Supplier Two',
          contact: 'Jane Smith',
          email: 'jane@supplier2.com',
          phone: '+44 987 654 3210',
        });

        const response = await request(app)
          .get('/api/suppliers')
          .set(authHeaders.superuser);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const supplier1 = response.body.find((s: TestSupplier) => s.id === 'SUPPLIER-001');
        const supplier2 = response.body.find((s: TestSupplier) => s.id === 'SUPPLIER-002');

        expect(supplier1).toBeDefined();
        expect(supplier1.name).toBe('Test Supplier One');
        expect(supplier1.email).toBe('john@supplier1.com');

        expect(supplier2).toBeDefined();
        expect(supplier2.name).toBe('Test Supplier Two');
        expect(supplier2.email).toBe('jane@supplier2.com');
      });

      it('should include order history when withHistory=true', async () => {
        // Create supplier and add some order history
        await testHelper.createTestSupplier({
          id: 'SUPPLIER-WITH-ORDERS',
          name: 'Supplier With Order History',
          email: 'orders@supplier.com',
        });

        // Create mock order for this supplier
        await testHelper.createTestOrder({
          supplierId: 'SUPPLIER-WITH-ORDERS',
          totalAmount: '500.00',
          status: 'completed',
          createdBy: testUsers.superuser.id,
        });

        const response = await request(app)
          .get('/api/suppliers?withHistory=true')
          .set(authHeaders.superuser);

        expect(response.status).toBe(200);
        
        const supplierWithHistory = response.body.find((s: any) => s.id === 'SUPPLIER-WITH-ORDERS');
        expect(supplierWithHistory).toBeDefined();
        expect(supplierWithHistory).toHaveProperty('orderCount');
        expect(supplierWithHistory).toHaveProperty('totalOrderValue');
        expect(supplierWithHistory).toHaveProperty('lastOrderDate');
        expect(supplierWithHistory).toHaveProperty('itemsSupplied');
      });

      it('should deny access to unauthorized users', async () => {
        const response = await request(app)
          .get('/api/suppliers');

        expect(response.status).toBe(401);
      });

      it('should handle permission-based access', async () => {
        // Basic users should not have supplier view permissions
        const response = await request(app)
          .get('/api/suppliers')
          .set(authHeaders.user);

        expect(response.status).toBe(403);
        expect(response.body.message).toMatch(/permission/i);
      });
    });

    describe('GET /api/suppliers/:id', () => {

      it('should return specific supplier by ID', async () => {
        await testHelper.createTestSupplier({
          id: 'SPECIFIC-SUPPLIER',
          name: 'Specific Test Supplier',
          contact: 'Contact Person',
          email: 'contact@specific.com',
          phone: '+44 555 999 8888',
          address: '123 Specific Street, London',
          accountNumber: 'ACC12345',
        });

        const response = await request(app)
          .get('/api/suppliers/SPECIFIC-SUPPLIER')
          .set(authHeaders.superuser);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe('SPECIFIC-SUPPLIER');
        expect(response.body.name).toBe('Specific Test Supplier');
        expect(response.body.contact).toBe('Contact Person');
        expect(response.body.email).toBe('contact@specific.com');
        expect(response.body.phone).toBe('+44 555 999 8888');
        expect(response.body.address).toBe('123 Specific Street, London');
        expect(response.body.accountNumber).toBe('ACC12345');
      });

      it('should return 404 for non-existent supplier', async () => {
        const response = await request(app)
          .get('/api/suppliers/NON-EXISTENT')
          .set(authHeaders.superuser);

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found/i);
      });

      it('should include order history for specific supplier when requested', async () => {
        await testHelper.createTestSupplier({
          id: 'SUPPLIER-DETAILED',
          name: 'Detailed Supplier',
        });

        const response = await request(app)
          .get('/api/suppliers/SUPPLIER-DETAILED?withHistory=true')
          .set(authHeaders.superuser);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe('SUPPLIER-DETAILED');
        // Should include order history fields even if empty
        expect(response.body).toHaveProperty('orders');
      });
    });

    describe('POST /api/suppliers', () => {

      it('should create a new supplier with complete data', async () => {
        const supplierData = {
          id: 'NEW-SUPPLIER-001',
          name: 'New Test Supplier',
          contact: 'New Contact Person',
          email: 'new@testsupplier.com',
          phone: '+44 20 7946 0958',
          address: '456 New Business Park, London, UK',
          accountNumber: 'NEWACC123',
        };

        const response = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(supplierData);

        expect(response.status).toBe(201);
        expect(response.body.id).toBe('NEW-SUPPLIER-001');
        expect(response.body.name).toBe('New Test Supplier');
        expect(response.body.contact).toBe('New Contact Person');
        expect(response.body.email).toBe('new@testsupplier.com');
        expect(response.body.phone).toBe('+44 20 7946 0958');
        expect(response.body.address).toBe('456 New Business Park, London, UK');
        expect(response.body.accountNumber).toBe('NEWACC123');
        expect(response.body.createdAt).toBeDefined();

        // Verify supplier was actually created in database
        const getResponse = await request(app)
          .get('/api/suppliers/NEW-SUPPLIER-001')
          .set(authHeaders.superuser);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.id).toBe('NEW-SUPPLIER-001');
      });

      it('should create a supplier with only required fields', async () => {
        const supplierData = {
          id: 'MINIMAL-SUPPLIER',
          name: 'Minimal Supplier',
        };

        const response = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(supplierData);

        expect(response.status).toBe(201);
        expect(response.body.id).toBe('MINIMAL-SUPPLIER');
        expect(response.body.name).toBe('Minimal Supplier');
        expect(response.body.contact).toBe(null);
        expect(response.body.email).toBe(null);
        expect(response.body.phone).toBe(null);
        expect(response.body.address).toBe(null);
        expect(response.body.accountNumber).toBe(null);
      });

      it('should validate required fields', async () => {
        // Test missing ID
        const noIdResponse = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send({ name: 'Missing ID Supplier' });

        expect(noIdResponse.status).toBe(400);
        expect(noIdResponse.body.message).toMatch(/ID.*required/i);

        // Test missing name
        const noNameResponse = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send({ id: 'NO-NAME-TEST' });

        expect(noNameResponse.status).toBe(400);
        expect(noNameResponse.body.message).toMatch(/name.*required/i);
      });

      it('should validate email format', async () => {
        const supplierData = {
          id: 'INVALID-EMAIL-TEST',
          name: 'Email Test Supplier',
          email: 'invalid-email-format',
        };

        const response = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(supplierData);

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/email.*invalid/i);
      });

      it('should prevent duplicate supplier IDs', async () => {
        const supplierData = {
          id: 'DUPLICATE-TEST',
          name: 'First Supplier',
        };

        // Create first supplier
        const firstResponse = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(supplierData);

        expect(firstResponse.status).toBe(201);

        // Try to create duplicate
        const duplicateData = {
          id: 'DUPLICATE-TEST', // Same ID
          name: 'Second Supplier',
        };

        const duplicateResponse = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(duplicateData);

        expect(duplicateResponse.status).toBe(400);
        expect(duplicateResponse.body.message).toMatch(/already exists/i);
      });

      it('should enforce permission requirements', async () => {
        const supplierData = {
          id: 'PERMISSION-TEST',
          name: 'Permission Test Supplier',
        };

        // Basic user should not be able to create suppliers
        const userResponse = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.user)
          .send(supplierData);

        expect(userResponse.status).toBe(403);
        expect(userResponse.body.message).toMatch(/permission/i);

        // Superuser should be able to create suppliers
        const superuserResponse = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(supplierData);

        expect(superuserResponse.status).toBe(201);
      });

      it('should handle data sanitization', async () => {
        const supplierData = {
          id: '  TRIM-TEST  ',
          name: '  Supplier with spaces  ',
          contact: '  Contact Person  ',
          email: '  test@example.com  ',
          phone: '  +44 123 456 789  ',
          address: '  123 Street Name  ',
          accountNumber: '  ACC123  ',
        };

        const response = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.superuser)
          .send(supplierData);

        expect(response.status).toBe(201);
        expect(response.body.id).toBe('TRIM-TEST');
        expect(response.body.name).toBe('Supplier with spaces');
        expect(response.body.contact).toBe('Contact Person');
        expect(response.body.email).toBe('test@example.com');
        expect(response.body.phone).toBe('+44 123 456 789');
        expect(response.body.address).toBe('123 Street Name');
        expect(response.body.accountNumber).toBe('ACC123');
      });
    });

    describe('PUT/PATCH /api/suppliers/:id', () => {

      beforeEach(async () => {
        await testHelper.createTestSupplier({
          id: 'UPDATE-TEST',
          name: 'Original Supplier Name',
          contact: 'Original Contact',
          email: 'original@example.com',
          phone: '+44 111 222 333',
          address: 'Original Address',
          accountNumber: 'ORIG123',
        });
      });

      it('should update supplier with PUT', async () => {
        const updateData = {
          id: 'UPDATE-TEST',
          name: 'Updated Supplier Name',
          contact: 'Updated Contact',
          email: 'updated@example.com',
          phone: '+44 999 888 777',
          address: 'Updated Address',
          accountNumber: 'UPD456',
        };

        const response = await request(app)
          .put('/api/suppliers/UPDATE-TEST')
          .set(authHeaders.superuser)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Supplier Name');
        expect(response.body.contact).toBe('Updated Contact');
        expect(response.body.email).toBe('updated@example.com');
        expect(response.body.phone).toBe('+44 999 888 777');
        expect(response.body.address).toBe('Updated Address');
        expect(response.body.accountNumber).toBe('UPD456');

        // Verify changes persisted
        const getResponse = await request(app)
          .get('/api/suppliers/UPDATE-TEST')
          .set(authHeaders.superuser);

        expect(getResponse.body.name).toBe('Updated Supplier Name');
      });

      it('should update supplier with PATCH (partial update)', async () => {
        const partialUpdate = {
          name: 'Partially Updated Name',
          email: 'newemail@example.com',
        };

        const response = await request(app)
          .patch('/api/suppliers/UPDATE-TEST')
          .set(authHeaders.superuser)
          .send(partialUpdate);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Partially Updated Name');
        expect(response.body.email).toBe('newemail@example.com');
        expect(response.body.contact).toBe('Original Contact'); // Unchanged
        expect(response.body.phone).toBe('+44 111 222 333'); // Unchanged
      });

      it('should validate data during updates', async () => {
        const invalidUpdate = {
          name: '', // Empty name should fail
          email: 'invalid-email',
        };

        const response = await request(app)
          .put('/api/suppliers/UPDATE-TEST')
          .set(authHeaders.superuser)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/name.*required|email.*invalid/i);
      });

      it('should return 404 for updating non-existent supplier', async () => {
        const updateData = {
          name: 'Updated Name',
        };

        const response = await request(app)
          .put('/api/suppliers/NON-EXISTENT')
          .set(authHeaders.superuser)
          .send(updateData);

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found/i);
      });

      it('should enforce permission requirements for updates', async () => {
        const updateData = {
          name: 'Permission Test Update',
        };

        // Basic user should not be able to update suppliers
        const userResponse = await request(app)
          .put('/api/suppliers/UPDATE-TEST')
          .set(authHeaders.user)
          .send(updateData);

        expect(userResponse.status).toBe(403);
        expect(userResponse.body.message).toMatch(/permission/i);
      });
    });

    describe('DELETE /api/suppliers/:id', () => {

      beforeEach(async () => {
        await testHelper.createTestSupplier({
          id: 'DELETE-TEST',
          name: 'To Be Deleted Supplier',
        });
      });

      it('should delete supplier when no dependencies exist', async () => {
        const response = await request(app)
          .delete('/api/suppliers/DELETE-TEST')
          .set(authHeaders.admin);

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/deleted successfully/i);

        // Verify supplier was deleted
        const getResponse = await request(app)
          .get('/api/suppliers/DELETE-TEST')
          .set(authHeaders.admin);

        expect(getResponse.status).toBe(404);
      });

      it('should prevent deletion when dependencies exist', async () => {
        // Create an item and link it to the supplier
        const testItem = await testHelper.createTestInventoryItem({
          name: 'Dependency Test Item',
          sku: 'DEP001',
          unitPrice: 25.00,
          vatRate: 0.20,
          category: 'Test Category',
          currentStock: 10,
        });

        // Create source relationship
        await testHelper.createTestSource({
          itemId: testItem.id,
          supplierId: 'DELETE-TEST',
          price: '25.00',
        });

        const response = await request(app)
          .delete('/api/suppliers/DELETE-TEST')
          .set(authHeaders.admin);

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/item relationships/i);

        // Verify supplier was NOT deleted
        const getResponse = await request(app)
          .get('/api/suppliers/DELETE-TEST')
          .set(authHeaders.admin);

        expect(getResponse.status).toBe(200);
      });

      it('should return 404 for deleting non-existent supplier', async () => {
        const response = await request(app)
          .delete('/api/suppliers/NON-EXISTENT')
          .set(authHeaders.admin);

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found/i);
      });

      it('should enforce permission requirements for deletion', async () => {
        // Regular user should not be able to delete suppliers (admin only)
        const userResponse = await request(app)
          .delete('/api/suppliers/DELETE-TEST')
          .set(authHeaders.user);

        expect(userResponse.status).toBe(403);

        // Superuser should not be able to delete suppliers (admin only)
        const superuserResponse = await request(app)
          .delete('/api/suppliers/DELETE-TEST')
          .set(authHeaders.superuser);

        expect(superuserResponse.status).toBe(403);

        // Admin should be able to delete suppliers
        const adminResponse = await request(app)
          .delete('/api/suppliers/DELETE-TEST')
          .set(authHeaders.admin);

        expect(adminResponse.status).toBe(200);
      });
    });
  });

  describe('Safe Deletion Endpoints', () => {

    beforeEach(async () => {
      await testHelper.createTestSupplier({
        id: 'SAFE-DELETE-TEST',
        name: 'Safe Delete Test Supplier',
      });
    });

    describe('GET /api/suppliers/:id/deletion-check', () => {

      it('should report supplier as safely deletable when no dependencies exist', async () => {
        const response = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST/deletion-check')
          .set(authHeaders.admin);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('canDelete', true);
        expect(response.body).toHaveProperty('blockers');
        expect(response.body.blockers).toHaveLength(0);
        expect(response.body).toHaveProperty('itemCount', 0);
        expect(response.body).toHaveProperty('orderCount');
        expect(response.body).toHaveProperty('totalOrderValue');
      });

      it('should report dependencies when they exist', async () => {
        // Create an item and link it to the supplier
        const testItem = await testHelper.createTestInventoryItem({
          name: 'Dependency Check Item',
          sku: 'DEPCHECK001',
          unitPrice: 50.00,
          vatRate: 0.20,
          category: 'Test Category',
          currentStock: 20,
        });

        await testHelper.createTestSource({
          itemId: testItem.id,
          supplierId: 'SAFE-DELETE-TEST',
          price: '50.00',
        });

        const response = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST/deletion-check')
          .set(authHeaders.admin);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('canDelete', false);
        expect(response.body.blockers.length).toBeGreaterThan(0);
        expect(response.body).toHaveProperty('itemCount', 1);
        expect(response.body.blockers[0]).toMatch(/item relationships/i);
      });

      it('should require admin permissions for deletion checks', async () => {
        const userResponse = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST/deletion-check')
          .set(authHeaders.user);

        expect(userResponse.status).toBe(403);

        // Superuser should have access
        const superuserResponse = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST/deletion-check')
          .set(authHeaders.superuser);

        expect(superuserResponse.status).toBe(200);
      });
    });

    describe('DELETE /api/suppliers/:id/safe', () => {

      it('should safely delete supplier when no blockers exist', async () => {
        // First check that it can be deleted
        const checkResponse = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST/deletion-check')
          .set(authHeaders.admin);

        expect(checkResponse.body.canDelete).toBe(true);

        // Then perform safe deletion
        const deleteResponse = await request(app)
          .delete('/api/suppliers/SAFE-DELETE-TEST/safe')
          .set(authHeaders.admin);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.message).toMatch(/deleted successfully/i);

        // Verify deletion
        const getResponse = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST')
          .set(authHeaders.admin);

        expect(getResponse.status).toBe(404);
      });

      it('should prevent safe deletion when blockers exist', async () => {
        // Create dependency
        const testItem = await testHelper.createTestInventoryItem({
          name: 'Safe Delete Blocker Item',
          sku: 'SAFEBLOCKER001',
          unitPrice: 75.00,
          vatRate: 0.20,
          category: 'Test Category',
          currentStock: 15,
        });

        await testHelper.createTestSource({
          itemId: testItem.id,
          supplierId: 'SAFE-DELETE-TEST',
          price: '75.00',
        });

        const deleteResponse = await request(app)
          .delete('/api/suppliers/SAFE-DELETE-TEST/safe')
          .set(authHeaders.admin);

        expect(deleteResponse.status).toBe(400);
        expect(deleteResponse.body.message).toMatch(/cannot delete/i);

        // Verify supplier was NOT deleted
        const getResponse = await request(app)
          .get('/api/suppliers/SAFE-DELETE-TEST')
          .set(authHeaders.admin);

        expect(getResponse.status).toBe(200);
      });
    });
  });

  describe('Source Management (Supplier-Item Relationships)', () => {

    let testItem: TestItem;
    let testSupplier: TestSupplier;

    beforeEach(async () => {
      testItem = await testHelper.createTestInventoryItem({
        name: 'Source Test Item',
        sku: 'SOURCE001',
        unitPrice: 30.00,
        vatRate: 0.20,
        category: 'Electronics',
        currentStock: 25,
      });

      testSupplier = await testHelper.createTestSupplier({
        id: 'SOURCE-SUPPLIER',
        name: 'Source Test Supplier',
        contact: 'Source Contact',
        email: 'source@test.com',
      });
    });

    describe('POST /api/suppliers/:id/items', () => {

      it('should create item-supplier relationship with price', async () => {
        const sourceData = {
          itemId: testItem.id,
          price: '28.50',
        };

        const response = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.superuser)
          .send(sourceData);

        expect(response.status).toBe(201);
        expect(response.body.itemId).toBe(testItem.id);
        expect(response.body.supplierId).toBe(testSupplier.id);
        expect(response.body.price).toBe('28.50');
        expect(response.body.id).toBeDefined();
        expect(response.body.createdAt).toBeDefined();
      });

      it('should create item-supplier relationship without price', async () => {
        const sourceData = {
          itemId: testItem.id,
        };

        const response = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.superuser)
          .send(sourceData);

        expect(response.status).toBe(201);
        expect(response.body.itemId).toBe(testItem.id);
        expect(response.body.supplierId).toBe(testSupplier.id);
        expect(response.body.price).toBe(null);
      });

      it('should prevent duplicate item-supplier relationships', async () => {
        const sourceData = {
          itemId: testItem.id,
          price: '25.00',
        };

        // Create first relationship
        const firstResponse = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.superuser)
          .send(sourceData);

        expect(firstResponse.status).toBe(201);

        // Try to create duplicate
        const duplicateResponse = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.superuser)
          .send(sourceData);

        expect(duplicateResponse.status).toBe(400);
        expect(duplicateResponse.body.message).toMatch(/already exists|duplicate/i);
      });

      it('should validate item and supplier existence', async () => {
        // Test with non-existent item
        const invalidItemResponse = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.superuser)
          .send({ itemId: 99999, price: '10.00' });

        expect(invalidItemResponse.status).toBe(400);
        expect(invalidItemResponse.body.message).toMatch(/item.*not found/i);

        // Test with non-existent supplier  
        const invalidSupplierResponse = await request(app)
          .post('/api/suppliers/NON-EXISTENT/items')
          .set(authHeaders.superuser)
          .send({ itemId: testItem.id, price: '10.00' });

        expect(invalidSupplierResponse.status).toBe(404);
        expect(invalidSupplierResponse.body.message).toMatch(/supplier.*not found/i);
      });

      it('should validate price format when provided', async () => {
        const invalidPriceData = {
          itemId: testItem.id,
          price: 'invalid-price',
        };

        const response = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.superuser)
          .send(invalidPriceData);

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/price.*invalid/i);
      });

      it('should require proper permissions', async () => {
        const sourceData = {
          itemId: testItem.id,
          price: '20.00',
        };

        // Basic user should not be able to create source relationships
        const userResponse = await request(app)
          .post(`/api/suppliers/${testSupplier.id}/items`)
          .set(authHeaders.user)
          .send(sourceData);

        expect(userResponse.status).toBe(403);
        expect(userResponse.body.message).toMatch(/permission/i);
      });
    });

    describe('DELETE /api/sources/:id', () => {

      let testSource: TestSource;

      beforeEach(async () => {
        testSource = await testHelper.createTestSource({
          itemId: testItem.id,
          supplierId: testSupplier.id,
          price: '35.00',
        });
      });

      it('should delete source relationship', async () => {
        const response = await request(app)
          .delete(`/api/sources/${testSource.id}`)
          .set(authHeaders.admin);

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/deleted successfully/i);
      });

      it('should return 404 for non-existent source', async () => {
        const response = await request(app)
          .delete('/api/sources/99999')
          .set(authHeaders.admin);

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found/i);
      });

      it('should require admin permissions for source deletion', async () => {
        // User should not be able to delete sources
        const userResponse = await request(app)
          .delete(`/api/sources/${testSource.id}`)
          .set(authHeaders.user);

        expect(userResponse.status).toBe(403);

        // Superuser should be able to delete sources
        const superuserResponse = await request(app)
          .delete(`/api/sources/${testSource.id}`)
          .set(authHeaders.superuser);

        expect(superuserResponse.status).toBe(200);
      });
    });
  });

  describe('Enhanced Supplier Features', () => {

    beforeEach(async () => {
      // Create suppliers with varying order history
      await testHelper.createTestSupplier({
        id: 'ENHANCED-SUPPLIER-1',
        name: 'High Volume Supplier',
        email: 'highvolume@supplier.com',
      });

      await testHelper.createTestSupplier({
        id: 'ENHANCED-SUPPLIER-2',
        name: 'Regular Supplier',
        email: 'regular@supplier.com',
      });

      await testHelper.createTestSupplier({
        id: 'ENHANCED-SUPPLIER-3',
        name: 'New Supplier',
        email: 'new@supplier.com',
      });
    });

    it('should provide supplier analytics and metrics', async () => {
      // Create orders for high volume supplier
      await testHelper.createTestOrder({
        supplierId: 'ENHANCED-SUPPLIER-1',
        totalAmount: '1500.00',
        status: 'completed',
        createdBy: testUsers.admin.id,
      });

      await testHelper.createTestOrder({
        supplierId: 'ENHANCED-SUPPLIER-1',
        totalAmount: '2000.00',
        status: 'completed',
        createdBy: testUsers.admin.id,
      });

      // Create order for regular supplier
      await testHelper.createTestOrder({
        supplierId: 'ENHANCED-SUPPLIER-2',
        totalAmount: '800.00',
        status: 'pending',
        createdBy: testUsers.admin.id,
      });

      const response = await request(app)
        .get('/api/suppliers?withHistory=true')
        .set(authHeaders.admin);

      expect(response.status).toBe(200);

      const highVolumeSupplier = response.body.find((s: any) => s.id === 'ENHANCED-SUPPLIER-1');
      const regularSupplier = response.body.find((s: any) => s.id === 'ENHANCED-SUPPLIER-2');
      const newSupplier = response.body.find((s: any) => s.id === 'ENHANCED-SUPPLIER-3');

      // High volume supplier metrics
      expect(highVolumeSupplier.orderCount).toBe(2);
      expect(parseFloat(highVolumeSupplier.totalOrderValue)).toBeCloseTo(3500.00, 2);
      expect(highVolumeSupplier.lastOrderDate).not.toBeNull();

      // Regular supplier metrics
      expect(regularSupplier.orderCount).toBe(1);
      expect(parseFloat(regularSupplier.totalOrderValue)).toBeCloseTo(800.00, 2);

      // New supplier metrics
      expect(newSupplier.orderCount).toBe(0);
      expect(parseFloat(newSupplier.totalOrderValue)).toBe(0);
      expect(newSupplier.lastOrderDate).toBeNull();
    });

    it('should provide detailed supplier order history', async () => {
      // Create order with items
      const order = await testHelper.createTestOrder({
        supplierId: 'ENHANCED-SUPPLIER-1',
        totalAmount: '500.00',
        status: 'received',
        createdBy: testUsers.admin.id,
        receivedBy: testUsers.superuser.id,
      });

      const testItem = await testHelper.createTestInventoryItem({
        name: 'Order History Item',
        sku: 'HIST001',
        unitPrice: 25.00,
        vatRate: 0.20,
        category: 'Test Category',
        currentStock: 100,
      });

      await testHelper.createTestOrderItem({
        orderId: order.id,
        itemId: testItem.id,
        quantity: 20,
        unitPrice: 25.00,
        receivedQuantity: 20,
      });

      const response = await request(app)
        .get('/api/suppliers/ENHANCED-SUPPLIER-1?withOrderHistory=true')
        .set(authHeaders.admin);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders).toHaveLength(1);

      const orderData = response.body.orders[0];
      expect(orderData.id).toBe(order.id);
      expect(orderData.status).toBe('received');
      expect(orderData.totalAmount).toBe('500.00');
      expect(orderData.createdBy).toBeDefined();
      expect(orderData.receivedBy).toBeDefined();
      expect(orderData.items).toBeDefined();
      expect(orderData.items).toHaveLength(1);
      expect(orderData.items[0].itemName).toBe('Order History Item');
      expect(orderData.items[0].quantity).toBe(20);
    });
  });

  describe('Performance and Edge Cases', () => {

    it('should handle large number of suppliers efficiently', async () => {
      // Create multiple suppliers
      const createPromises = [];
      for (let i = 1; i <= 50; i++) {
        const supplierData = {
          id: `PERF-SUPPLIER-${i.toString().padStart(3, '0')}`,
          name: `Performance Test Supplier ${i}`,
          email: `supplier${i}@performance.test`,
        };

        createPromises.push(
          testHelper.createTestSupplier(supplierData)
        );
      }

      await Promise.all(createPromises);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/suppliers')
        .set(authHeaders.admin);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(50);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle suppliers with complex unicode data', async () => {
      const unicodeSupplierData = {
        id: 'UNICODE-SUPPLIER',
        name: '测试供应商 Ltd. (Тест Поставщик)',
        contact: 'José María García-Rodríguez',
        email: 'test@méxico.com.co',
        address: '123 Straße, Köln, Deutschland 🇩🇪',
        phone: '+49 221 1234567',
      };

      const response = await request(app)
        .post('/api/suppliers')
        .set(authHeaders.admin)
        .send(unicodeSupplierData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('测试供应商 Ltd. (Тест Поставщик)');
      expect(response.body.contact).toBe('José María García-Rodríguez');
      expect(response.body.email).toBe('test@méxico.com.co');
      expect(response.body.address).toBe('123 Straße, Köln, Deutschland 🇩🇪');
    });

    it('should handle concurrent supplier operations', async () => {
      // Create multiple suppliers concurrently
      const concurrentOperations = [];

      for (let i = 1; i <= 10; i++) {
        const createOperation = request(app)
          .post('/api/suppliers')
          .set(authHeaders.admin)
          .send({
            id: `CONCURRENT-${i}`,
            name: `Concurrent Supplier ${i}`,
          });

        concurrentOperations.push(createOperation);
      }

      const results = await Promise.allSettled(concurrentOperations);

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe(201);
          expect(result.value.body.id).toBe(`CONCURRENT-${index + 1}`);
        }
      });

      // Verify all suppliers were created
      const listResponse = await request(app)
        .get('/api/suppliers')
        .set(authHeaders.admin);

      const concurrentSuppliers = listResponse.body.filter((s: TestSupplier) => 
        s.id.startsWith('CONCURRENT-')
      );

      expect(concurrentSuppliers).toHaveLength(10);
    });

    it('should handle malformed request data gracefully', async () => {
      const malformedRequests = [
        { data: null, expected: 400 },
        { data: undefined, expected: 400 },
        { data: '', expected: 400 },
        { data: 'not-an-object', expected: 400 },
        { data: { id: null }, expected: 400 },
        { data: { name: null }, expected: 400 },
        { data: { email: 123 }, expected: 400 },
        { data: { accountNumber: 'x'.repeat(50) }, expected: 400 }, // Too long
      ];

      for (const { data, expected } of malformedRequests) {
        const response = await request(app)
          .post('/api/suppliers')
          .set(authHeaders.admin)
          .send(data);

        expect(response.status).toBeGreaterThanOrEqual(expected);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Integration with Order Management', () => {

    it('should properly integrate with order creation workflow', async () => {
      const supplier = await testHelper.createTestSupplier({
        id: 'ORDER-INTEGRATION',
        name: 'Order Integration Supplier',
        email: 'orders@integration.com',
      });

      // Create order via API
      const orderData = {
        supplierId: supplier.id,
        items: [{
          name: 'Integration Test Item',
          quantity: 10,
          unitPrice: 15.00,
        }],
        notes: 'Integration test order',
      };

      const orderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders.admin)
        .send(orderData);

      expect(orderResponse.status).toBe(201);
      expect(orderResponse.body.supplierId).toBe(supplier.id);

      // Verify supplier now shows order history
      const supplierResponse = await request(app)
        .get(`/api/suppliers/${supplier.id}?withOrderHistory=true`)
        .set(authHeaders.admin);

      expect(supplierResponse.status).toBe(200);
      expect(supplierResponse.body.orders).toBeDefined();
      expect(supplierResponse.body.orders).toHaveLength(1);
      expect(supplierResponse.body.orders[0].id).toBe(orderResponse.body.id);
    });

    it('should maintain referential integrity when supplier is deleted', async () => {
      const supplier = await testHelper.createTestSupplier({
        id: 'INTEGRITY-TEST',
        name: 'Integrity Test Supplier',
      });

      // Create order for this supplier
      const order = await testHelper.createTestOrder({
        supplierId: supplier.id,
        totalAmount: '100.00',
        status: 'pending',
        createdBy: testUsers.admin.id,
      });

      // Try to delete supplier with existing orders
      const deleteResponse = await request(app)
        .delete(`/api/suppliers/${supplier.id}`)
        .set(authHeaders.admin);

      // Should prevent deletion due to order dependency
      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.body.message).toMatch(/order|dependency/i);

      // Verify supplier still exists
      const supplierResponse = await request(app)
        .get(`/api/suppliers/${supplier.id}`)
        .set(authHeaders.admin);

      expect(supplierResponse.status).toBe(200);
    });
  });
});