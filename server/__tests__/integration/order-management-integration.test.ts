/**
 * Order Management Integration Tests
 * 
 * Tests the complete order management workflow including:
 * 1. Order creation and validation
 * 2. Order lifecycle management (pending → partially received → received)
 * 3. Order receiving with inventory updates
 * 4. Permission-based access controls
 * 5. Order item management and VAT calculations
 * 6. Integration with supplier management
 * 7. Order status tracking and workflow
 * 8. Complex receiving scenarios and edge cases
 * 9. Invoice PDF handling and processing
 * 10. Performance with large orders
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

interface TestCategory {
  id: number;
  name: string;
  description?: string;
}

interface TestOrder {
  id: number;
  orderId: string;
  supplierId?: string;
  status: 'pending' | 'partially received' | 'received' | 'cancelled';
  notesId?: number;
  totalAmount?: string;
  deliveryCharge?: string;
  vatRate?: string;
  vatIncluded?: boolean;
  updateInventoryValues?: boolean;
  invoicePdfPath?: string;
  createdBy: string;
  receivedBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

interface TestOrderItem {
  id: number;
  orderId: number;
  itemId?: number;
  itemName: string;
  itemSku: string;
  vendorSku?: string;
  itemDescription?: string;
  categoryId?: number;
  unitCost: string;
  quantity: string;
  totalCost: string;
  vatRate: string;
  vatAmount: string;
  received: boolean;
  receivedQuantity?: string;
}

describe('Order Management Integration Tests', () => {
  let testHelper: DatabaseTestHelper;
  let testUsers: Record<string, TestUser>;
  let authHeaders: Record<string, Record<string, string>>;
  let testSupplier: TestSupplier;
  let testCategory: TestCategory;

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
        firstName: 'Manager',
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

    // Create test data
    testSupplier = await testHelper.createTestSupplier({
      id: 'ORDER-SUPPLIER-001',
      name: 'Order Test Supplier',
      contact: 'Order Contact',
      email: 'orders@testsupplier.com',
      phone: '+44 20 7946 0958',
      address: '123 Order Street, London',
      accountNumber: 'ORD123',
    });

    testCategory = await testHelper.createTestCategory({
      name: 'Order Test Category',
      description: 'Category for order testing',
    });
  });

  afterEach(async () => {
    await cleanupTestData();
    await testHelper.cleanup();
    await testHelper.close();
  });

  describe('Order API Endpoints', () => {

    describe('GET /api/orders', () => {

      it('should return list of orders for authenticated users', async () => {
        // Create test orders
        await testHelper.createTestOrder({
          orderId: 'ORDER-001',
          supplierId: testSupplier.id,
          status: 'pending',
          totalAmount: '500.00',
          createdBy: testUsers.superuser.id,
        });

        await testHelper.createTestOrder({
          orderId: 'ORDER-002',
          supplierId: testSupplier.id,
          status: 'received',
          totalAmount: '750.00',
          createdBy: testUsers.admin.id,
          receivedBy: testUsers.admin.id,
        });

        const response = await request(app)
          .get('/api/orders')
          .set(authHeaders.superuser);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('orders');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.orders)).toBe(true);
        expect(response.body.orders.length).toBeGreaterThanOrEqual(2);

        const order1 = response.body.orders.find((o: TestOrder) => o.orderId === 'ORDER-001');
        const order2 = response.body.orders.find((o: TestOrder) => o.orderId === 'ORDER-002');

        expect(order1).toBeDefined();
        expect(order1.status).toBe('pending');
        expect(order1.totalAmount).toBe('500.00');

        expect(order2).toBeDefined();
        expect(order2.status).toBe('received');
        expect(order2.totalAmount).toBe('750.00');
      });

      it('should support pagination', async () => {
        // Create multiple orders for pagination testing
        for (let i = 1; i <= 25; i++) {
          await testHelper.createTestOrder({
            orderId: `PAGE-ORDER-${i.toString().padStart(3, '0')}`,
            supplierId: testSupplier.id,
            status: 'pending',
            totalAmount: `${(i * 100).toFixed(2)}`,
            createdBy: testUsers.admin.id,
          });
        }

        // Test first page
        const firstPageResponse = await request(app)
          .get('/api/orders?page=1&limit=10')
          .set(authHeaders.admin);

        expect(firstPageResponse.status).toBe(200);
        expect(firstPageResponse.body.orders).toHaveLength(10);
        expect(firstPageResponse.body.total).toBeGreaterThanOrEqual(25);

        // Test second page
        const secondPageResponse = await request(app)
          .get('/api/orders?page=2&limit=10')
          .set(authHeaders.admin);

        expect(secondPageResponse.status).toBe(200);
        expect(secondPageResponse.body.orders).toHaveLength(10);

        // Verify different orders on different pages
        const firstPageOrderIds = firstPageResponse.body.orders.map((o: TestOrder) => o.orderId);
        const secondPageOrderIds = secondPageResponse.body.orders.map((o: TestOrder) => o.orderId);
        
        const intersection = firstPageOrderIds.filter((id: string) => secondPageOrderIds.includes(id));
        expect(intersection).toHaveLength(0); // No overlapping orders
      });

      it('should support filtering by status', async () => {
        await testHelper.createTestOrder({
          orderId: 'PENDING-ORDER',
          status: 'pending',
          createdBy: testUsers.admin.id,
        });

        await testHelper.createTestOrder({
          orderId: 'RECEIVED-ORDER',
          status: 'received',
          createdBy: testUsers.admin.id,
        });

        const pendingResponse = await request(app)
          .get('/api/orders?status=pending')
          .set(authHeaders.admin);

        expect(pendingResponse.status).toBe(200);
        const pendingOrders = pendingResponse.body.orders;
        expect(pendingOrders.every((o: TestOrder) => o.status === 'pending')).toBe(true);

        const receivedResponse = await request(app)
          .get('/api/orders?status=received')
          .set(authHeaders.admin);

        expect(receivedResponse.status).toBe(200);
        const receivedOrders = receivedResponse.body.orders;
        expect(receivedOrders.every((o: TestOrder) => o.status === 'received')).toBe(true);
      });

      it('should support filtering by supplier', async () => {
        const supplier2 = await testHelper.createTestSupplier({
          id: 'ORDER-SUPPLIER-002',
          name: 'Second Order Supplier',
        });

        await testHelper.createTestOrder({
          orderId: 'SUPPLIER1-ORDER',
          supplierId: testSupplier.id,
          createdBy: testUsers.admin.id,
        });

        await testHelper.createTestOrder({
          orderId: 'SUPPLIER2-ORDER',
          supplierId: supplier2.id,
          createdBy: testUsers.admin.id,
        });

        const supplier1Response = await request(app)
          .get(`/api/orders?supplierId=${testSupplier.id}`)
          .set(authHeaders.admin);

        expect(supplier1Response.status).toBe(200);
        const supplier1Orders = supplier1Response.body.orders;
        expect(supplier1Orders.every((o: TestOrder) => o.supplierId === testSupplier.id)).toBe(true);

        const supplier2Response = await request(app)
          .get(`/api/orders?supplierId=${supplier2.id}`)
          .set(authHeaders.admin);

        expect(supplier2Response.status).toBe(200);
        const supplier2Orders = supplier2Response.body.orders;
        expect(supplier2Orders.every((o: TestOrder) => o.supplierId === supplier2.id)).toBe(true);
      });

      it('should deny access to unauthorized users', async () => {
        const response = await request(app)
          .get('/api/orders');

        expect(response.status).toBe(401);
      });

      it('should handle permission-based access', async () => {
        // Basic users should not have order view permissions
        const response = await request(app)
          .get('/api/orders')
          .set(authHeaders.user);

        expect(response.status).toBe(403);
        expect(response.body.message).toMatch(/permission/i);
      });
    });

    describe('GET /api/orders/:id', () => {

      let testOrder: TestOrder;
      let testOrderItems: TestOrderItem[];

      beforeEach(async () => {
        testOrder = await testHelper.createTestOrder({
          orderId: 'DETAILED-ORDER',
          supplierId: testSupplier.id,
          status: 'pending',
          totalAmount: '1000.00',
          deliveryCharge: '25.00',
          vatRate: '0.20',
          vatIncluded: false,
          createdBy: testUsers.admin.id,
        });

        // Create test items and order items
        const testItem1 = await testHelper.createTestInventoryItem({
          name: 'Order Detail Item 1',
          sku: 'ODI001',
          unitPrice: 100.00,
          vatRate: 0.20,
          category: testCategory.name,
          currentStock: 50,
        });

        const testItem2 = await testHelper.createTestInventoryItem({
          name: 'Order Detail Item 2',
          sku: 'ODI002',
          unitPrice: 150.00,
          vatRate: 0.20,
          category: testCategory.name,
          currentStock: 30,
        });

        testOrderItems = [
          await testHelper.createTestOrderItem({
            orderId: testOrder.id,
            itemId: testItem1.id,
            itemName: testItem1.name,
            itemSku: testItem1.sku,
            unitCost: '100.00',
            quantity: '5',
            totalCost: '500.00',
            vatRate: '0.20',
            vatAmount: '100.00',
          }),
          await testHelper.createTestOrderItem({
            orderId: testOrder.id,
            itemId: testItem2.id,
            itemName: testItem2.name,
            itemSku: testItem2.sku,
            unitCost: '150.00',
            quantity: '3',
            totalCost: '450.00',
            vatRate: '0.20',
            vatAmount: '90.00',
          }),
        ];
      });

      it('should return detailed order with items', async () => {
        const response = await request(app)
          .get(`/api/orders/${testOrder.id}`)
          .set(authHeaders.admin);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testOrder.id);
        expect(response.body.orderId).toBe('DETAILED-ORDER');
        expect(response.body.supplierId).toBe(testSupplier.id);
        expect(response.body.status).toBe('pending');
        expect(response.body.totalAmount).toBe('1000.00');
        expect(response.body.deliveryCharge).toBe('25.00');

        // Verify supplier relationship
        expect(response.body.supplier).toBeDefined();
        expect(response.body.supplier.id).toBe(testSupplier.id);
        expect(response.body.supplier.name).toBe(testSupplier.name);

        // Verify creator relationship
        expect(response.body.creator).toBeDefined();
        expect(response.body.creator.id).toBe(testUsers.admin.id);

        // Verify order items
        expect(response.body.items).toBeDefined();
        expect(response.body.items).toHaveLength(2);

        const item1 = response.body.items.find((item: TestOrderItem) => item.itemSku === 'ODI001');
        const item2 = response.body.items.find((item: TestOrderItem) => item.itemSku === 'ODI002');

        expect(item1).toBeDefined();
        expect(item1.itemName).toBe('Order Detail Item 1');
        expect(item1.quantity).toBe('5');
        expect(item1.unitCost).toBe('100.00');
        expect(item1.totalCost).toBe('500.00');

        expect(item2).toBeDefined();
        expect(item2.itemName).toBe('Order Detail Item 2');
        expect(item2.quantity).toBe('3');
        expect(item2.unitCost).toBe('150.00');
        expect(item2.totalCost).toBe('450.00');
      });

      it('should return 404 for non-existent order', async () => {
        const response = await request(app)
          .get('/api/orders/99999')
          .set(authHeaders.admin);

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found/i);
      });

      it('should enforce permission requirements', async () => {
        const userResponse = await request(app)
          .get(`/api/orders/${testOrder.id}`)
          .set(authHeaders.user);

        expect(userResponse.status).toBe(403);
      });
    });

    describe('POST /api/orders', () => {

      it('should create a new order with complete data', async () => {
        const orderData = {
          supplierId: testSupplier.id,
          notes: 'Complete test order',
          deliveryCharge: '15.00',
          vatRate: '0.20',
          vatIncluded: false,
          updateInventoryValues: false,
          items: [
            {
              itemName: 'New Order Item 1',
              itemSku: 'NOI001',
              itemDescription: 'First new item for order',
              categoryId: testCategory.id,
              unitCost: '75.00',
              quantity: 10,
              vendorSku: 'VENDOR-NOI001',
            },
            {
              itemName: 'New Order Item 2',
              itemSku: 'NOI002',
              unitCost: '125.00',
              quantity: 5,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderData);

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.orderId).toMatch(/^O\d{13}$/); // Order ID format
        expect(response.body.supplierId).toBe(testSupplier.id);
        expect(response.body.status).toBe('pending');
        expect(response.body.deliveryCharge).toBe('15.00');
        expect(response.body.vatRate).toBe('0.20');
        expect(response.body.vatIncluded).toBe(false);
        expect(response.body.updateInventoryValues).toBe(false);
        expect(response.body.createdBy).toBe(testUsers.admin.id);
        expect(response.body.createdAt).toBeDefined();

        // Verify total amount calculation: (75*10 + 125*5) + 15 delivery = 1390
        const expectedSubtotal = (75.00 * 10) + (125.00 * 5);
        const expectedTotal = expectedSubtotal + 15.00;
        expect(parseFloat(response.body.totalAmount)).toBeCloseTo(expectedTotal, 2);

        // Verify order was created in database
        const getResponse = await request(app)
          .get(`/api/orders/${response.body.id}`)
          .set(authHeaders.admin);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.items).toHaveLength(2);
      });

      it('should create order without supplier', async () => {
        const orderData = {
          notes: 'Order without supplier',
          items: [
            {
              itemName: 'Standalone Item',
              itemSku: 'STANDALONE001',
              unitCost: '50.00',
              quantity: 2,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderData);

        expect(response.status).toBe(201);
        expect(response.body.supplierId).toBeNull();
        expect(response.body.totalAmount).toBe('100.00'); // 50 * 2
      });

      it('should link to existing inventory items', async () => {
        const existingItem = await testHelper.createTestInventoryItem({
          name: 'Existing Inventory Item',
          sku: 'EXISTING001',
          unitPrice: 200.00,
          vatRate: 0.20,
          category: testCategory.name,
          currentStock: 100,
        });

        const orderData = {
          supplierId: testSupplier.id,
          items: [
            {
              itemId: existingItem.id,
              itemName: 'Existing Inventory Item',
              itemSku: 'EXISTING001',
              unitCost: '180.00', // Different cost from inventory price
              quantity: 5,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderData);

        expect(response.status).toBe(201);
        
        const getResponse = await request(app)
          .get(`/api/orders/${response.body.id}`)
          .set(authHeaders.admin);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.items).toHaveLength(1);
        expect(getResponse.body.items[0].itemId).toBe(existingItem.id);
        expect(getResponse.body.items[0].itemSku).toBe('EXISTING001');
        expect(getResponse.body.items[0].unitCost).toBe('180.00');
      });

      it('should validate required fields', async () => {
        // Test missing items
        const noItemsResponse = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send({ notes: 'No items order' });

        expect(noItemsResponse.status).toBe(400);
        expect(noItemsResponse.body.message).toMatch(/items.*required/i);

        // Test invalid item data
        const invalidItemResponse = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send({
            items: [
              {
                itemName: '', // Empty name
                itemSku: 'INVALID001',
                unitCost: '10.00',
                quantity: 1,
              },
            ],
          });

        expect(invalidItemResponse.status).toBe(400);

        // Test negative quantity
        const negativeQuantityResponse = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send({
            items: [
              {
                itemName: 'Valid Item',
                itemSku: 'VALID001',
                unitCost: '10.00',
                quantity: -5, // Negative quantity
              },
            ],
          });

        expect(negativeQuantityResponse.status).toBe(400);
      });

      it('should handle VAT calculations correctly', async () => {
        const orderDataInclusive = {
          supplierId: testSupplier.id,
          vatRate: '0.20',
          vatIncluded: true,
          items: [
            {
              itemName: 'VAT Inclusive Item',
              itemSku: 'VATINC001',
              unitCost: '120.00', // Includes VAT
              quantity: 1,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderDataInclusive);

        expect(response.status).toBe(201);
        expect(response.body.vatIncluded).toBe(true);
        expect(response.body.totalAmount).toBe('120.00');

        // Test VAT-exclusive calculation
        const orderDataExclusive = {
          supplierId: testSupplier.id,
          vatRate: '0.20',
          vatIncluded: false,
          items: [
            {
              itemName: 'VAT Exclusive Item',
              itemSku: 'VATEXC001',
              unitCost: '100.00', // Excludes VAT
              quantity: 1,
            },
          ],
        };

        const exclusiveResponse = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderDataExclusive);

        expect(exclusiveResponse.status).toBe(201);
        expect(exclusiveResponse.body.vatIncluded).toBe(false);
        expect(exclusiveResponse.body.totalAmount).toBe('100.00'); // VAT not added to total in order creation
      });

      it('should enforce permission requirements', async () => {
        const orderData = {
          items: [
            {
              itemName: 'Permission Test Item',
              itemSku: 'PERM001',
              unitCost: '25.00',
              quantity: 1,
            },
          ],
        };

        // Basic user should not be able to create orders
        const userResponse = await request(app)
          .post('/api/orders')
          .set(authHeaders.user)
          .send(orderData);

        expect(userResponse.status).toBe(403);

        // Superuser should be able to create orders
        const superuserResponse = await request(app)
          .post('/api/orders')
          .set(authHeaders.superuser)
          .send(orderData);

        expect(superuserResponse.status).toBe(201);
      });

      it('should validate supplier existence', async () => {
        const orderData = {
          supplierId: 'NON-EXISTENT-SUPPLIER',
          items: [
            {
              itemName: 'Supplier Test Item',
              itemSku: 'SUPPLIER001',
              unitCost: '30.00',
              quantity: 1,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderData);

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/supplier.*not found/i);
      });
    });

    describe('POST /api/orders/:id/receive', () => {

      let pendingOrder: TestOrder;
      let orderItems: TestOrderItem[];
      let inventoryItems: TestItem[];

      beforeEach(async () => {
        // Create inventory items
        inventoryItems = [
          await testHelper.createTestInventoryItem({
            name: 'Receivable Item 1',
            sku: 'REC001',
            unitPrice: 50.00,
            vatRate: 0.20,
            category: testCategory.name,
            currentStock: 20,
          }),
          await testHelper.createTestInventoryItem({
            name: 'Receivable Item 2',
            sku: 'REC002',
            unitPrice: 75.00,
            vatRate: 0.20,
            category: testCategory.name,
            currentStock: 15,
          }),
        ];

        // Create order
        pendingOrder = await testHelper.createTestOrder({
          orderId: 'RECEIVABLE-ORDER',
          supplierId: testSupplier.id,
          status: 'pending',
          totalAmount: '625.00',
          updateInventoryValues: false,
          createdBy: testUsers.admin.id,
        });

        // Create order items
        orderItems = [
          await testHelper.createTestOrderItem({
            orderId: pendingOrder.id,
            itemId: inventoryItems[0].id,
            itemName: inventoryItems[0].name,
            itemSku: inventoryItems[0].sku,
            unitCost: '45.00', // Different from current inventory price
            quantity: '10',
            totalCost: '450.00',
            vatRate: '0.20',
            vatAmount: '90.00',
          }),
          await testHelper.createTestOrderItem({
            orderId: pendingOrder.id,
            itemId: inventoryItems[1].id,
            itemName: inventoryItems[1].name,
            itemSku: inventoryItems[1].sku,
            unitCost: '70.00',
            quantity: '5',
            totalCost: '350.00',
            vatRate: '0.20',
            vatAmount: '70.00',
          }),
        ];
      });

      it('should fully receive order and update inventory quantities', async () => {
        const receiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 10,
              addToInventory: true,
            },
            {
              orderItemId: orderItems[1].id,
              receivedQuantity: 5,
              addToInventory: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(receiveData);

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/received successfully/i);

        // Verify order status updated to 'received'
        const orderResponse = await request(app)
          .get(`/api/orders/${pendingOrder.id}`)
          .set(authHeaders.admin);

        expect(orderResponse.status).toBe(200);
        expect(orderResponse.body.status).toBe('received');
        expect(orderResponse.body.receivedBy).toBe(testUsers.admin.id);
        expect(orderResponse.body.receivedAt).toBeDefined();

        // Verify order items show received quantities
        const item1 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'REC001');
        const item2 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'REC002');

        expect(item1.receivedQuantity).toBe('10');
        expect(item2.receivedQuantity).toBe('5');

        // Verify inventory quantities updated
        const inventory1Response = await request(app)
          .get(`/api/items/${inventoryItems[0].id}`)
          .set(authHeaders.admin);

        const inventory2Response = await request(app)
          .get(`/api/items/${inventoryItems[1].id}`)
          .set(authHeaders.admin);

        expect(inventory1Response.body.currentStock).toBe(30); // 20 + 10
        expect(inventory2Response.body.currentStock).toBe(20); // 15 + 5
      });

      it('should partially receive order', async () => {
        const receiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 7, // Partial quantity
              addToInventory: true,
            },
            {
              orderItemId: orderItems[1].id,
              receivedQuantity: 0, // Not received
              addToInventory: false,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(receiveData);

        expect(response.status).toBe(200);

        // Verify order status updated to 'partially received'
        const orderResponse = await request(app)
          .get(`/api/orders/${pendingOrder.id}`)
          .set(authHeaders.admin);

        expect(orderResponse.status).toBe(200);
        expect(orderResponse.body.status).toBe('partially received');

        const item1 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'REC001');
        const item2 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'REC002');

        expect(item1.receivedQuantity).toBe('7');
        expect(item2.receivedQuantity).toBe('0');

        // Verify only received quantity added to inventory
        const inventory1Response = await request(app)
          .get(`/api/items/${inventoryItems[0].id}`)
          .set(authHeaders.admin);

        expect(inventory1Response.body.currentStock).toBe(27); // 20 + 7
      });

      it('should receive remaining quantities in subsequent receives', async () => {
        // First partial receive
        const firstReceiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 6,
              addToInventory: true,
            },
          ],
        };

        await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(firstReceiveData);

        // Second receive to complete the order
        const secondReceiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 4, // Remaining quantity
              addToInventory: true,
            },
            {
              orderItemId: orderItems[1].id,
              receivedQuantity: 5, // Full quantity
              addToInventory: true,
            },
          ],
        };

        const secondResponse = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(secondReceiveData);

        expect(secondResponse.status).toBe(200);

        // Verify order is now fully received
        const orderResponse = await request(app)
          .get(`/api/orders/${pendingOrder.id}`)
          .set(authHeaders.admin);

        expect(orderResponse.body.status).toBe('received');

        const item1 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'REC001');
        expect(item1.receivedQuantity).toBe('10'); // 6 + 4

        // Verify total inventory increase
        const inventory1Response = await request(app)
          .get(`/api/items/${inventoryItems[0].id}`)
          .set(authHeaders.admin);

        expect(inventory1Response.body.currentStock).toBe(30); // 20 + 10
      });

      it('should handle receiving without adding to inventory', async () => {
        const receiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 10,
              addToInventory: false, // Don't add to inventory
            },
          ],
        };

        const response = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(receiveData);

        expect(response.status).toBe(200);

        // Verify inventory quantities unchanged
        const inventoryResponse = await request(app)
          .get(`/api/items/${inventoryItems[0].id}`)
          .set(authHeaders.admin);

        expect(inventoryResponse.body.currentStock).toBe(20); // Unchanged
      });

      it('should update inventory prices when updateInventoryValues is true', async () => {
        // Update order to enable inventory value updates
        await testHelper.updateTestOrder(pendingOrder.id, {
          updateInventoryValues: true,
        });

        const receiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 10,
              addToInventory: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(receiveData);

        expect(response.status).toBe(200);

        // Verify inventory price updated using weighted average
        const inventoryResponse = await request(app)
          .get(`/api/items/${inventoryItems[0].id}`)
          .set(authHeaders.admin);

        // Weighted average: ((20 * 50) + (10 * 45)) / 30 = 48.33
        const expectedPrice = ((20 * 50.00) + (10 * 45.00)) / 30;
        expect(parseFloat(inventoryResponse.body.price)).toBeCloseTo(expectedPrice, 2);
        expect(inventoryResponse.body.currentStock).toBe(30);
      });

      it('should validate received quantities', async () => {
        // Test negative quantity
        const negativeQuantityData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: -5,
              addToInventory: true,
            },
          ],
        };

        const negativeResponse = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(negativeQuantityData);

        expect(negativeResponse.status).toBe(400);

        // Test excessive quantity (not typically an error but should be handled)
        const excessiveQuantityData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 1000, // Much more than ordered
              addToInventory: true,
            },
          ],
        };

        const excessiveResponse = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.admin)
          .send(excessiveQuantityData);

        // Should succeed but might log warnings
        expect(excessiveResponse.status).toBe(200);
      });

      it('should enforce permission requirements for receiving', async () => {
        const receiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 5,
              addToInventory: true,
            },
          ],
        };

        // Basic user should not be able to receive orders
        const userResponse = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.user)
          .send(receiveData);

        expect(userResponse.status).toBe(403);

        // Superuser should be able to receive orders
        const superuserResponse = await request(app)
          .post(`/api/orders/${pendingOrder.id}/receive`)
          .set(authHeaders.superuser)
          .send(receiveData);

        expect(superuserResponse.status).toBe(200);
      });

      it('should return 404 for non-existent order', async () => {
        const receiveData = {
          receivedItems: [
            {
              orderItemId: orderItems[0].id,
              receivedQuantity: 5,
              addToInventory: true,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders/99999/receive')
          .set(authHeaders.admin)
          .send(receiveData);

        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/orders/import', () => {

      it('should import order from validated JSON data', async () => {
        const importData = {
          orderId: 'IMPORTED-ORDER-001',
          supplier: {
            name: 'Imported Supplier Ltd',
            email: 'imported@supplier.com',
            phone: '+44 20 7946 0123',
          },
          subtotal: 500.00,
          vatRate: 0.20,
          vatAmount: 100.00,
          total: 600.00,
          status: 'pending',
          items: [
            {
              sku: 'IMP-001',
              name: 'Imported Item 1',
              quantity: 10,
              unitCost: 25.00,
              vatRate: 0.20,
              vatAmount: 50.00,
              totalCost: 300.00,
            },
            {
              sku: 'IMP-002',
              name: 'Imported Item 2',
              quantity: 5,
              unitCost: 40.00,
              vatRate: 0.20,
              vatAmount: 40.00,
              totalCost: 240.00,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders/import')
          .set(authHeaders.admin)
          .send(importData);

        expect(response.status).toBe(201);
        expect(response.body.orderId).toBe('IMPORTED-ORDER-001');
        expect(response.body.status).toBe('pending');
        expect(response.body.totalAmount).toBe('600.00');

        // Verify order was created with items
        const orderResponse = await request(app)
          .get(`/api/orders/${response.body.id}`)
          .set(authHeaders.admin);

        expect(orderResponse.status).toBe(200);
        expect(orderResponse.body.items).toHaveLength(2);

        const item1 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'IMP-001');
        const item2 = orderResponse.body.items.find((item: TestOrderItem) => item.itemSku === 'IMP-002');

        expect(item1).toBeDefined();
        expect(item1.itemName).toBe('Imported Item 1');
        expect(item1.quantity).toBe('10');

        expect(item2).toBeDefined();
        expect(item2.itemName).toBe('Imported Item 2');
        expect(item2.quantity).toBe('5');
      });

      it('should create supplier during import if not exists', async () => {
        const importData = {
          orderId: 'SUPPLIER-CREATE-ORDER',
          supplier: {
            name: 'Auto Created Supplier',
            email: 'autocreate@supplier.com',
          },
          subtotal: 100.00,
          vatRate: 0.20,
          vatAmount: 20.00,
          total: 120.00,
          items: [
            {
              sku: 'AUTO-001',
              name: 'Auto Item',
              quantity: 1,
              unitCost: 100.00,
              totalCost: 100.00,
            },
          ],
        };

        const response = await request(app)
          .post('/api/orders/import')
          .set(authHeaders.admin)
          .send(importData);

        expect(response.status).toBe(201);
        expect(response.body.supplier).toBeDefined();
        expect(response.body.supplier.name).toBe('Auto Created Supplier');

        // Verify supplier was created
        const suppliersResponse = await request(app)
          .get('/api/suppliers')
          .set(authHeaders.admin);

        const autoCreatedSupplier = suppliersResponse.body.find(
          (s: TestSupplier) => s.name === 'Auto Created Supplier'
        );
        expect(autoCreatedSupplier).toBeDefined();
        expect(autoCreatedSupplier.email).toBe('autocreate@supplier.com');
      });

      it('should validate import data', async () => {
        // Test missing required fields
        const invalidData = {
          // Missing orderId
          supplier: { name: 'Test' },
          items: [],
        };

        const response = await request(app)
          .post('/api/orders/import')
          .set(authHeaders.admin)
          .send(invalidData);

        expect(response.status).toBe(400);
      });

      it('should enforce permission requirements for import', async () => {
        const importData = {
          orderId: 'PERMISSION-IMPORT',
          items: [
            {
              sku: 'PERM-001',
              name: 'Permission Item',
              quantity: 1,
              unitCost: 10.00,
              totalCost: 10.00,
            },
          ],
        };

        const userResponse = await request(app)
          .post('/api/orders/import')
          .set(authHeaders.user)
          .send(importData);

        expect(userResponse.status).toBe(403);
      });
    });
  });

  describe('Order Workflow and Status Management', () => {

    it('should track complete order lifecycle', async () => {
      // 1. Create order
      const orderData = {
        supplierId: testSupplier.id,
        items: [
          {
            itemName: 'Lifecycle Test Item',
            itemSku: 'LIFECYCLE001',
            unitCost: '100.00',
            quantity: 10,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders.admin)
        .send(orderData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.status).toBe('pending');

      const orderId = createResponse.body.id;

      // 2. Check order details
      const detailResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set(authHeaders.admin);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.status).toBe('pending');
      expect(detailResponse.body.receivedBy).toBeNull();
      expect(detailResponse.body.receivedAt).toBeNull();

      // 3. Partially receive order
      const orderItem = detailResponse.body.items[0];
      const partialReceiveData = {
        receivedItems: [
          {
            orderItemId: orderItem.id,
            receivedQuantity: 6,
            addToInventory: true,
          },
        ],
      };

      const partialReceiveResponse = await request(app)
        .post(`/api/orders/${orderId}/receive`)
        .set(authHeaders.admin)
        .send(partialReceiveData);

      expect(partialReceiveResponse.status).toBe(200);

      // 4. Verify partial status
      const partialStatusResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set(authHeaders.admin);

      expect(partialStatusResponse.body.status).toBe('partially received');
      expect(partialStatusResponse.body.receivedBy).toBe(testUsers.admin.id);
      expect(partialStatusResponse.body.receivedAt).toBeDefined();

      // 5. Complete the order
      const completeReceiveData = {
        receivedItems: [
          {
            orderItemId: orderItem.id,
            receivedQuantity: 4, // Remaining quantity
            addToInventory: true,
          },
        ],
      };

      const completeReceiveResponse = await request(app)
        .post(`/api/orders/${orderId}/receive`)
        .set(authHeaders.admin)
        .send(completeReceiveData);

      expect(completeReceiveResponse.status).toBe(200);

      // 6. Verify complete status
      const completeStatusResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set(authHeaders.admin);

      expect(completeStatusResponse.body.status).toBe('received');
      expect(completeStatusResponse.body.items[0].receivedQuantity).toBe('10');
    });

    it('should handle order cancellation', async () => {
      const order = await testHelper.createTestOrder({
        orderId: 'CANCEL-TEST',
        status: 'pending',
        createdBy: testUsers.admin.id,
      });

      // Update order status to cancelled (would be done via PUT endpoint)
      const updateResponse = await request(app)
        .put(`/api/orders/${order.id}`)
        .set(authHeaders.admin)
        .send({ status: 'cancelled' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('cancelled');

      // Verify cancelled orders cannot be received
      const receiveData = {
        receivedItems: [
          {
            orderItemId: 1,
            receivedQuantity: 5,
            addToInventory: true,
          },
        ],
      };

      const receiveResponse = await request(app)
        .post(`/api/orders/${order.id}/receive`)
        .set(authHeaders.admin)
        .send(receiveData);

      expect(receiveResponse.status).toBe(400);
      expect(receiveResponse.body.message).toMatch(/cancelled.*cannot/i);
    });
  });

  describe('Complex Scenarios and Edge Cases', () => {

    it('should handle large orders efficiently', async () => {
      const largeOrderItems = [];
      
      // Create 100 order items
      for (let i = 1; i <= 100; i++) {
        largeOrderItems.push({
          itemName: `Large Order Item ${i}`,
          itemSku: `LARGE-${i.toString().padStart(3, '0')}`,
          unitCost: (Math.random() * 100 + 10).toFixed(2),
          quantity: Math.ceil(Math.random() * 20),
        });
      }

      const orderData = {
        supplierId: testSupplier.id,
        notes: 'Large order performance test',
        items: largeOrderItems,
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders.admin)
        .send(orderData);

      const endTime = Date.now();

      expect(response.status).toBe(201);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all items were created
      const orderResponse = await request(app)
        .get(`/api/orders/${response.body.id}`)
        .set(authHeaders.admin);

      expect(orderResponse.body.items).toHaveLength(100);
    });

    it('should handle concurrent order operations', async () => {
      const concurrentOperations = [];

      // Create multiple orders concurrently
      for (let i = 1; i <= 5; i++) {
        const orderData = {
          supplierId: testSupplier.id,
          notes: `Concurrent order ${i}`,
          items: [
            {
              itemName: `Concurrent Item ${i}`,
              itemSku: `CONCURRENT-${i}`,
              unitCost: '50.00',
              quantity: 5,
            },
          ],
        };

        const createOperation = request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(orderData);

        concurrentOperations.push(createOperation);
      }

      const results = await Promise.allSettled(concurrentOperations);

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe(201);
          expect(result.value.body.orderId).toBeDefined();
        }
      });

      // Verify all orders were created
      const listResponse = await request(app)
        .get('/api/orders')
        .set(authHeaders.admin);

      const concurrentOrders = listResponse.body.orders.filter((o: TestOrder) => 
        o.notes && o.notes.startsWith('Concurrent order')
      );

      expect(concurrentOrders).toHaveLength(5);
    });

    it('should handle over-receiving scenarios gracefully', async () => {
      const order = await testHelper.createTestOrder({
        orderId: 'OVER-RECEIVE-TEST',
        createdBy: testUsers.admin.id,
      });

      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Over Receive Item',
        sku: 'OVERREC001',
        unitPrice: 25.00,
        vatRate: 0.20,
        category: testCategory.name,
        currentStock: 100,
      });

      const orderItem = await testHelper.createTestOrderItem({
        orderId: order.id,
        itemId: inventoryItem.id,
        itemName: inventoryItem.name,
        itemSku: inventoryItem.sku,
        unitCost: '25.00',
        quantity: '10',
        totalCost: '250.00',
      });

      // Receive more than ordered
      const receiveData = {
        receivedItems: [
          {
            orderItemId: orderItem.id,
            receivedQuantity: 15, // 5 more than ordered
            addToInventory: true,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/orders/${order.id}/receive`)
        .set(authHeaders.admin)
        .send(receiveData);

      expect(response.status).toBe(200); // Should succeed
      
      // Verify inventory updated with received quantity
      const inventoryResponse = await request(app)
        .get(`/api/items/${inventoryItem.id}`)
        .set(authHeaders.admin);

      expect(inventoryResponse.body.currentStock).toBe(115); // 100 + 15
    });

    it('should handle malformed order data gracefully', async () => {
      const malformedRequests = [
        { data: null, expected: 400 },
        { data: undefined, expected: 400 },
        { data: '', expected: 400 },
        { data: 'not-an-object', expected: 400 },
        { data: { items: null }, expected: 400 },
        { data: { items: 'invalid' }, expected: 400 },
        { data: { items: [] }, expected: 400 }, // Empty items array
      ];

      for (const { data, expected } of malformedRequests) {
        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders.admin)
          .send(data);

        expect(response.status).toBeGreaterThanOrEqual(expected);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Integration with Other Systems', () => {

    it('should integrate with inventory management for stock tracking', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Stock Integration Item',
        sku: 'STOCKINT001',
        unitPrice: 100.00,
        vatRate: 0.20,
        category: testCategory.name,
        currentStock: 50,
        minimumStock: 10,
      });

      // Create order
      const orderData = {
        supplierId: testSupplier.id,
        items: [
          {
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            itemSku: inventoryItem.sku,
            unitCost: '90.00',
            quantity: 100, // Large quantity to test stock updates
          },
        ],
      };

      const orderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders.admin)
        .send(orderData);

      expect(orderResponse.status).toBe(201);

      // Receive the order
      const orderDetail = await request(app)
        .get(`/api/orders/${orderResponse.body.id}`)
        .set(authHeaders.admin);

      const receiveData = {
        receivedItems: [
          {
            orderItemId: orderDetail.body.items[0].id,
            receivedQuantity: 100,
            addToInventory: true,
          },
        ],
      };

      await request(app)
        .post(`/api/orders/${orderResponse.body.id}/receive`)
        .set(authHeaders.admin)
        .send(receiveData);

      // Verify stock levels updated
      const inventoryResponse = await request(app)
        .get(`/api/items/${inventoryItem.id}`)
        .set(authHeaders.admin);

      expect(inventoryResponse.body.currentStock).toBe(150); // 50 + 100
      
      // Verify item is no longer under minimum stock
      expect(inventoryResponse.body.currentStock).toBeGreaterThan(inventoryResponse.body.minimumStock);
    });

    it('should respect supplier relationships and data consistency', async () => {
      // Create order linked to supplier
      const orderData = {
        supplierId: testSupplier.id,
        items: [
          {
            itemName: 'Supplier Link Item',
            itemSku: 'SUPPLINK001',
            unitCost: '75.00',
            quantity: 5,
          },
        ],
      };

      const orderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders.admin)
        .send(orderData);

      expect(orderResponse.status).toBe(201);

      // Verify order includes supplier information
      const orderDetail = await request(app)
        .get(`/api/orders/${orderResponse.body.id}`)
        .set(authHeaders.admin);

      expect(orderDetail.body.supplier).toBeDefined();
      expect(orderDetail.body.supplier.id).toBe(testSupplier.id);
      expect(orderDetail.body.supplier.name).toBe(testSupplier.name);

      // Try to delete supplier with existing orders (should fail)
      const deleteSupplierResponse = await request(app)
        .delete(`/api/suppliers/${testSupplier.id}`)
        .set(authHeaders.admin);

      expect(deleteSupplierResponse.status).toBe(400);
      expect(deleteSupplierResponse.body.message).toMatch(/order.*dependency/i);
    });

    it('should maintain audit trail for order changes', async () => {
      const order = await testHelper.createTestOrder({
        orderId: 'AUDIT-TEST',
        status: 'pending',
        createdBy: testUsers.admin.id,
      });

      const orderItem = await testHelper.createTestOrderItem({
        orderId: order.id,
        itemName: 'Audit Item',
        itemSku: 'AUDIT001',
        unitCost: '50.00',
        quantity: '10',
        totalCost: '500.00',
      });

      // Receive order (creates audit trail)
      const receiveData = {
        receivedItems: [
          {
            orderItemId: orderItem.id,
            receivedQuantity: 8,
            addToInventory: true,
          },
        ],
      };

      await request(app)
        .post(`/api/orders/${order.id}/receive`)
        .set(authHeaders.admin)
        .send(receiveData);

      // Verify order history is preserved
      const orderDetail = await request(app)
        .get(`/api/orders/${order.id}`)
        .set(authHeaders.admin);

      expect(orderDetail.body.createdBy).toBe(testUsers.admin.id);
      expect(orderDetail.body.receivedBy).toBe(testUsers.admin.id);
      expect(orderDetail.body.createdAt).toBeDefined();
      expect(orderDetail.body.receivedAt).toBeDefined();
      expect(orderDetail.body.updatedAt).toBeDefined();

      // Verify creator and receiver information included
      expect(orderDetail.body.creator).toBeDefined();
      expect(orderDetail.body.creator.id).toBe(testUsers.admin.id);
      expect(orderDetail.body.receivedByUser).toBeDefined();
    });
  });
});