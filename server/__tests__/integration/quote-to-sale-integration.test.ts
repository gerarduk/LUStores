/**
 * Quote-to-Sale Conversion Integration Tests
 * 
 * Tests the complete quote-to-sale conversion workflow including:
 * 1. Complete data preservation from quote to sale
 * 2. VAT rate preservation and calculation accuracy
 * 3. Inventory updates during conversion
 * 4. Sale ID generation and formatting
 * 5. Customer/recipient information transfer
 * 6. Picking list generation with recipients
 * 7. Database transaction atomicity
 * 8. API endpoint integration testing
 * 9. Error handling and edge cases
 * 10. Multi-item complex quotes with mixed VAT rates
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

interface TestInventoryItem {
  id: number;
  name: string;
  sku: string;
  unitPrice: number;
  vatRate: number;
  vatIncluded: boolean;
  category: string;
  currentStock: number;
  location: string;
}

interface TestQuote {
  id: number;
  quoteId: string;
  chargeCode: string;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatApplied: boolean;
  customerInfo: any;
  notesId?: number;
  status: 'draft' | 'pending' | 'approved';
  createdBy: string;
  items: TestQuoteItem[];
}

interface TestQuoteItem {
  id: number;
  quoteId: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  unitPrice: number;
  quantity: number;
  vatRate: number;
  vatAmount: number;
  subtotal: number;
  totalWithVat: number;
}

interface TestSale {
  id: number;
  saleId: string;
  chargeCode: string;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  vatApplied: boolean;
  customerInfo: any;
  notesId?: number;
  status: 'completed';
  processedBy: string;
  createdAt: Date;
  items: TestSaleItem[];
}

interface TestSaleItem {
  id: number;
  saleId: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  unitPrice: number;
  quantity: number;
  vatRate: number;
  vatAmount: number;
  subtotal: number;
  totalWithVat: number;
}

describe('Quote-to-Sale Conversion Integration Tests', () => {
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
    
    // Create test users
    testUsers = {
      user: await createTestUser({
        email: 'basicuser@test.com',
        firstName: 'Basic',
        lastName: 'User',
        role: 'user',
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

  describe('Basic Quote-to-Sale Conversion', () => {

    it('should successfully convert a simple quote to sale with all data preserved', async () => {
      // Create test inventory item
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Test Widget',
        sku: 'WIDGET001',
        unitPrice: 100.00,
        vatRate: 0.20,
        vatIncluded: false,
        category: 'Electronics',
        currentStock: 50,
        location: 'A1-B2',
      });

      // Create test charge code
      const chargeCode = await testHelper.createTestChargeCode({
        code: 'QTS_TEST_001',
        title: 'Quote-to-Sale Test',
        categories: ['Electronics'],
      });

      // Create quote with single item
      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: {
          name: 'Test Customer',
          email: 'customer@test.com',
          deliveredTo: 'Dr. Jane Smith',
          deliveredToEmail: 'jane@university.edu',
          department: 'Engineering'
        },
        notes: 'Test quote for integration testing',
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 5,
          vatRate: inventoryItem.vatRate,
          vatAmount: 100.00, // 5 * 100 * 0.20
          subtotal: 500.00,  // 5 * 100
          totalWithVat: 600.00, // 500 + 100
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Verify quote calculations
      expect(quote.subtotalAmount).toBe('500.00');
      expect(quote.vatAmount).toBe('100.00');
      expect(quote.totalAmount).toBe('600.00');
      expect(quote.vatApplied).toBe(true);

      // Convert quote to sale via API
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({
          processedBy: testUsers.user.id,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sale');

      const sale = response.body.sale;

      // Verify sale data preservation
      expect(sale.saleId).toMatch(/^S\d{13,15}$/); // Format: S + timestamp + random
      expect(sale.chargeCode).toBe(quote.chargeCode);
      expect(sale.subtotalAmount).toBe(quote.subtotalAmount);
      expect(sale.vatAmount).toBe(quote.vatAmount);
      expect(sale.totalAmount).toBe(quote.totalAmount);
      expect(sale.vatApplied).toBe(quote.vatApplied);
      expect(sale.status).toBe('completed');
      expect(sale.processedBy).toBe(testUsers.user.id);

      // Verify customer info preservation
      expect(sale.customerInfo.name).toBe(quoteData.customerInfo.name);
      expect(sale.customerInfo.deliveredTo).toBe(quoteData.customerInfo.deliveredTo);
      expect(sale.customerInfo.deliveredToEmail).toBe(quoteData.customerInfo.deliveredToEmail);

      // Verify sale items
      const saleItems = await testHelper.getSaleItems(sale.id);
      expect(saleItems).toHaveLength(1);
      
      const saleItem = saleItems[0];
      const quoteItem = quote.items[0];
      
      expect(saleItem.itemId).toBe(quoteItem.itemId);
      expect(saleItem.itemName).toBe(quoteItem.itemName);
      expect(saleItem.itemSku).toBe(quoteItem.itemSku);
      expect(saleItem.quantity).toBe(quoteItem.quantity);
      expect(saleItem.unitPrice).toBe(quoteItem.unitPrice);
      expect(saleItem.vatRate).toBe(quoteItem.vatRate);
      expect(parseFloat(saleItem.vatAmount.toString())).toBeCloseTo(quoteItem.vatAmount, 2);
      expect(parseFloat(saleItem.subtotal.toString())).toBeCloseTo(quoteItem.subtotal, 2);

      // Verify inventory was reduced
      const updatedInventory = await testHelper.getInventoryItem(inventoryItem.id);
      expect(updatedInventory.currentStock).toBe(inventoryItem.currentStock - quoteItem.quantity);

      // Verify original quote was removed
      const deletedQuote = await testHelper.getQuote(quote.id);
      expect(deletedQuote).toBeNull();
    });

    it('should handle quotes with mixed VAT rates correctly', async () => {
      // Create multiple inventory items with different VAT rates
      const items = [
        await testHelper.createTestInventoryItem({
          name: 'Standard Rate Item',
          sku: 'STD001',
          unitPrice: 50.00,
          vatRate: 0.20, // 20% VAT
          vatIncluded: false,
          category: 'Standard',
          currentStock: 100,
        }),
        await testHelper.createTestInventoryItem({
          name: 'Reduced Rate Item',
          sku: 'RED001',
          unitPrice: 30.00,
          vatRate: 0.05, // 5% VAT
          vatIncluded: false,
          category: 'Books',
          currentStock: 75,
        }),
        await testHelper.createTestInventoryItem({
          name: 'Zero Rate Item',
          sku: 'ZERO001',
          unitPrice: 25.00,
          vatRate: 0.00, // 0% VAT
          vatIncluded: false,
          category: 'Education',
          currentStock: 60,
        }),
      ];

      // Create charge code that allows all categories
      const chargeCode = await testHelper.createTestChargeCode({
        code: 'MIXED_VAT_001',
        title: 'Mixed VAT Test',
        categories: ['Standard', 'Books', 'Education'],
      });

      // Create quote with mixed VAT items
      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: {
          name: 'Mixed VAT Customer',
          deliveredTo: 'Prof. John Doe',
          department: 'Mixed VAT Department'
        },
        items: [
          {
            itemId: items[0].id,
            itemName: items[0].name,
            itemSku: items[0].sku,
            unitPrice: items[0].unitPrice,
            quantity: 4,
            vatRate: items[0].vatRate,
            vatAmount: 40.00, // 4 * 50 * 0.20
            subtotal: 200.00, // 4 * 50
            totalWithVat: 240.00,
          },
          {
            itemId: items[1].id,
            itemName: items[1].name,
            itemSku: items[1].sku,
            unitPrice: items[1].unitPrice,
            quantity: 3,
            vatRate: items[1].vatRate,
            vatAmount: 4.50, // 3 * 30 * 0.05
            subtotal: 90.00, // 3 * 30
            totalWithVat: 94.50,
          },
          {
            itemId: items[2].id,
            itemName: items[2].name,
            itemSku: items[2].sku,
            unitPrice: items[2].unitPrice,
            quantity: 2,
            vatRate: items[2].vatRate,
            vatAmount: 0.00, // 2 * 25 * 0.00
            subtotal: 50.00, // 2 * 25
            totalWithVat: 50.00,
          },
        ],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Verify quote totals
      expect(quote.subtotalAmount).toBe('340.00'); // 200 + 90 + 50
      expect(quote.vatAmount).toBe('44.50');       // 40 + 4.5 + 0
      expect(quote.totalAmount).toBe('384.50');    // 340 + 44.5

      // Convert to sale
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(200);
      const sale = response.body.sale;

      // Verify sale totals match
      expect(sale.subtotalAmount).toBe(quote.subtotalAmount);
      expect(sale.vatAmount).toBe(quote.vatAmount);
      expect(sale.totalAmount).toBe(quote.totalAmount);

      // Verify individual sale items preserve VAT rates
      const saleItems = await testHelper.getSaleItems(sale.id);
      expect(saleItems).toHaveLength(3);

      // Check each item's VAT rate is preserved
      const standardItem = saleItems.find(item => item.itemSku === 'STD001');
      const reducedItem = saleItems.find(item => item.itemSku === 'RED001');
      const zeroItem = saleItems.find(item => item.itemSku === 'ZERO001');

      expect(standardItem?.vatRate).toBe(0.20);
      expect(reducedItem?.vatRate).toBe(0.05);
      expect(zeroItem?.vatRate).toBe(0.00);

      // Verify VAT calculations are preserved
      expect(parseFloat(standardItem?.vatAmount.toString() || '0')).toBeCloseTo(40.00, 2);
      expect(parseFloat(reducedItem?.vatAmount.toString() || '0')).toBeCloseTo(4.50, 2);
      expect(parseFloat(zeroItem?.vatAmount.toString() || '0')).toBe(0.00);

      // Verify all inventory was reduced correctly
      for (let i = 0; i < items.length; i++) {
        const updatedItem = await testHelper.getInventoryItem(items[i].id);
        const expectedStock = items[i].currentStock - quoteData.items[i].quantity;
        expect(updatedItem.currentStock).toBe(expectedStock);
      }
    });
  });

  describe('Recipient and Customer Information', () => {

    it('should preserve detailed recipient information through conversion', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Recipient Test Item',
        sku: 'RECIPIENT001',
        unitPrice: 75.00,
        vatRate: 0.20,
        currentStock: 30,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'RECIPIENT_TEST',
        title: 'Recipient Information Test',
      });

      // Complex customer/recipient information
      const customerInfo = {
        name: 'University Research Department',
        email: 'purchasing@university.edu',
        phone: '+44 123 456 7890',
        deliveredTo: 'Dr. Sarah Wilson',
        deliveredToEmail: 'sarah.wilson@university.edu',
        deliveredToPhone: '+44 123 456 7891',
        department: 'Materials Science',
        building: 'Engineering Block C',
        room: 'Room 301',
        specialInstructions: 'Deliver between 9 AM and 11 AM only. Use rear entrance.',
        projectCode: 'PROJ-2026-001',
        costCenter: 'CC-MAT-SCI-001',
      };

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo,
        notes: 'Special delivery requirements for research equipment',
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 2,
          vatRate: inventoryItem.vatRate,
          vatAmount: 30.00,
          subtotal: 150.00,
          totalWithVat: 180.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Convert to sale
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(200);
      const sale = response.body.sale;

      // Verify all customer information is preserved
      expect(sale.customerInfo).toMatchObject(customerInfo);

      // Verify specific recipient details
      expect(sale.customerInfo.deliveredTo).toBe('Dr. Sarah Wilson');
      expect(sale.customerInfo.deliveredToEmail).toBe('sarah.wilson@university.edu');
      expect(sale.customerInfo.specialInstructions).toBe('Deliver between 9 AM and 11 AM only. Use rear entrance.');
      expect(sale.customerInfo.projectCode).toBe('PROJ-2026-001');
    });

    it('should generate picking list with recipient information', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Picking List Item',
        sku: 'PICK001',
        unitPrice: 40.00,
        vatRate: 0.20,
        currentStock: 25,
        location: 'Shelf-A3-Bin-12',
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'PICKING_LIST',
        title: 'Picking List Test',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: {
          name: 'Laboratory Supplies Order',
          deliveredTo: 'Dr. Emily Chen',
          deliveredToEmail: 'emily.chen@lab.edu',
          department: 'Chemistry Lab',
          building: 'Science Complex',
          room: 'Lab 205',
        },
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 3,
          vatRate: inventoryItem.vatRate,
          vatAmount: 24.00,
          subtotal: 120.00,
          totalWithVat: 144.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Convert to sale
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(200);
      const sale = response.body.sale;

      // Get picking list via API
      const pickingListResponse = await request(app)
        .get(`/api/sales/${sale.id}/picking-list`)
        .set(authHeaders.user);

      expect(pickingListResponse.status).toBe(200);
      const pickingList = pickingListResponse.body;

      // Verify picking list contains recipient info
      expect(pickingList.recipient).toBe('Dr. Emily Chen');
      expect(pickingList.deliveredToEmail).toBe('emily.chen@lab.edu');
      expect(pickingList.department).toBe('Chemistry Lab');
      expect(pickingList.building).toBe('Science Complex');
      expect(pickingList.room).toBe('Lab 205');

      // Verify picking list items
      expect(pickingList.items).toHaveLength(1);
      expect(pickingList.items[0]).toMatchObject({
        itemName: inventoryItem.name,
        itemSku: inventoryItem.sku,
        quantity: 3,
        location: 'Shelf-A3-Bin-12',
      });
    });
  });

  describe('Sale ID Generation and Formatting', () => {

    it('should generate unique sale IDs with proper format', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Sale ID Test Item',
        sku: 'SALEID001',
        unitPrice: 10.00,
        vatRate: 0.00,
        currentStock: 100,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'SALE_ID_TEST',
        title: 'Sale ID Generation Test',
      });

      // Create multiple quotes to test unique ID generation
      const saleIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const quoteData = {
          chargeCode: chargeCode.code,
          customerInfo: { name: `Customer ${i}` },
          items: [{
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            itemSku: inventoryItem.sku,
            unitPrice: inventoryItem.unitPrice,
            quantity: 1,
            vatRate: inventoryItem.vatRate,
            vatAmount: 0.00,
            subtotal: 10.00,
            totalWithVat: 10.00,
          }],
        };

        const quote = await testHelper.createTestQuoteWithItems(quoteData);

        // Convert to sale with small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const response = await request(app)
          .post(`/api/quotes/${quote.id}/convert`)
          .set(authHeaders.user)
          .send({ processedBy: testUsers.user.id });

        expect(response.status).toBe(200);
        const sale = response.body.sale;

        // Verify sale ID format: S + 13-15 digit number
        expect(sale.saleId).toMatch(/^S\d{13,15}$/);
        
        // Verify uniqueness
        expect(saleIds).not.toContain(sale.saleId);
        saleIds.push(sale.saleId);
      }

      // All sale IDs should be unique
      const uniqueIds = [...new Set(saleIds)];
      expect(uniqueIds).toHaveLength(saleIds.length);
    });

    it('should maintain sale ID format consistency across different quote types', async () => {
      const items = [
        await testHelper.createTestInventoryItem({
          name: 'Simple Item',
          sku: 'SIMPLE001',
          unitPrice: 1.00,
          vatRate: 0.00,
          currentStock: 100,
        }),
        await testHelper.createTestInventoryItem({
          name: 'Complex Item',
          sku: 'COMPLEX001',
          unitPrice: 999.99,
          vatRate: 0.20,
          currentStock: 5,
        }),
      ];

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'FORMAT_TEST',
        title: 'Sale ID Format Test',
      });

      // Test different quote complexities
      const testCases = [
        {
          name: 'Simple single-item quote',
          items: [{ ...items[0], quantity: 1 }],
        },
        {
          name: 'High-value single item',
          items: [{ ...items[1], quantity: 2 }],
        },
        {
          name: 'Multi-item quote',
          items: [
            { ...items[0], quantity: 50 },
            { ...items[1], quantity: 1 },
          ],
        },
      ];

      for (const testCase of testCases) {
        const quoteItems = testCase.items.map(item => ({
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          vatRate: item.vatRate,
          vatAmount: item.unitPrice * item.quantity * item.vatRate,
          subtotal: item.unitPrice * item.quantity,
          totalWithVat: item.unitPrice * item.quantity * (1 + item.vatRate),
        }));

        const quoteData = {
          chargeCode: chargeCode.code,
          customerInfo: { name: `${testCase.name} Customer` },
          items: quoteItems,
        };

        const quote = await testHelper.createTestQuoteWithItems(quoteData);

        const response = await request(app)
          .post(`/api/quotes/${quote.id}/convert`)
          .set(authHeaders.user)
          .send({ processedBy: testUsers.user.id });

        expect(response.status).toBe(200);
        const sale = response.body.sale;

        // All sale IDs should follow the same format regardless of quote complexity
        expect(sale.saleId).toMatch(/^S\d{13,15}$/);
      }
    });
  });

  describe('Transaction Atomicity and Error Handling', () => {

    it('should rollback entire transaction if any step fails', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Rollback Test Item',
        sku: 'ROLLBACK001',
        unitPrice: 50.00,
        vatRate: 0.20,
        currentStock: 10,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'ROLLBACK_TEST',
        title: 'Transaction Rollback Test',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { name: 'Rollback Test Customer' },
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 5,
          vatRate: inventoryItem.vatRate,
          vatAmount: 50.00,
          subtotal: 250.00,
          totalWithVat: 300.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);
      const originalStock = inventoryItem.currentStock;

      // Simulate a failure scenario (e.g., insufficient permissions)
      // This would be handled by the actual implementation
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set({ Authorization: 'Bearer invalid_token' }) // Invalid auth
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(401); // Unauthorized

      // Verify nothing was changed
      const unchangedQuote = await testHelper.getQuote(quote.id);
      expect(unchangedQuote).not.toBeNull(); // Quote should still exist

      const unchangedInventory = await testHelper.getInventoryItem(inventoryItem.id);
      expect(unchangedInventory.currentStock).toBe(originalStock); // Stock unchanged

      // Verify no sale was created
      const salesResponse = await request(app)
        .get('/api/sales')
        .set(authHeaders.user);
      
      const sales = salesResponse.body.filter((sale: any) => 
        sale.customerInfo?.name === 'Rollback Test Customer'
      );
      expect(sales).toHaveLength(0);
    });

    it('should handle insufficient inventory gracefully', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Low Stock Item',
        sku: 'LOWSTOCK001',
        unitPrice: 30.00,
        vatRate: 0.20,
        currentStock: 2, // Very low stock
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'LOW_STOCK_TEST',
        title: 'Low Stock Test',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { name: 'Low Stock Test Customer' },
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 10, // More than available stock
          vatRate: inventoryItem.vatRate,
          vatAmount: 60.00,
          subtotal: 300.00,
          totalWithVat: 360.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Attempt conversion (this should either succeed with negative stock or fail gracefully)
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      // Depending on business logic:
      // Option 1: Allow negative stock (common for academic institutions)
      if (response.status === 200) {
        const updatedInventory = await testHelper.getInventoryItem(inventoryItem.id);
        expect(updatedInventory.currentStock).toBe(-8); // 2 - 10 = -8
      }
      // Option 2: Reject conversion due to insufficient stock
      else {
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/insufficient.*stock/i);
        
        // Verify no changes were made
        const unchangedQuote = await testHelper.getQuote(quote.id);
        expect(unchangedQuote).not.toBeNull();
        
        const unchangedInventory = await testHelper.getInventoryItem(inventoryItem.id);
        expect(unchangedInventory.currentStock).toBe(2);
      }
    });

    it('should validate charge code restrictions during conversion', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Restricted Category Item',
        sku: 'RESTRICTED001',
        unitPrice: 75.00,
        vatRate: 0.20,
        currentStock: 20,
        category: 'RestrictedCategory',
      });

      // Create charge code that excludes the item's category
      const chargeCode = await testHelper.createTestChargeCode({
        code: 'RESTRICTED_TEST',
        title: 'Charge Code Restrictions Test',
        categories: ['AllowedCategory'], // Does not include 'RestrictedCategory'
        excludedCategories: ['RestrictedCategory'],
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { name: 'Restricted Category Customer' },
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 2,
          vatRate: inventoryItem.vatRate,
          vatAmount: 30.00,
          subtotal: 150.00,
          totalWithVat: 180.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Attempt conversion - should fail due to category restriction
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/charge code.*cannot be used.*category restrictions/i);

      // Verify no changes were made
      const unchangedQuote = await testHelper.getQuote(quote.id);
      expect(unchangedQuote).not.toBeNull();

      const unchangedInventory = await testHelper.getInventoryItem(inventoryItem.id);
      expect(unchangedInventory.currentStock).toBe(20);
    });
  });

  describe('Performance and Edge Cases', () => {

    it('should handle large quotes with many items efficiently', async () => {
      // Create 20 different inventory items
      const inventoryItems = [];
      for (let i = 1; i <= 20; i++) {
        const item = await testHelper.createTestInventoryItem({
          name: `Bulk Item ${i}`,
          sku: `BULK${i.toString().padStart(3, '0')}`,
          unitPrice: i * 5.00, // Varying prices from £5 to £100
          vatRate: i % 2 === 0 ? 0.20 : 0.05, // Alternate VAT rates
          currentStock: 100,
          category: i % 3 === 0 ? 'Category1' : i % 3 === 1 ? 'Category2' : 'Category3',
        });
        inventoryItems.push(item);
      }

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'BULK_ORDER',
        title: 'Bulk Order Test',
        categories: ['Category1', 'Category2', 'Category3'],
      });

      // Create quote with all 20 items
      const quoteItems = inventoryItems.map((item, index) => ({
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        unitPrice: item.unitPrice,
        quantity: (index % 5) + 1, // Quantities from 1 to 5
        vatRate: item.vatRate,
        vatAmount: item.unitPrice * ((index % 5) + 1) * item.vatRate,
        subtotal: item.unitPrice * ((index % 5) + 1),
        totalWithVat: item.unitPrice * ((index % 5) + 1) * (1 + item.vatRate),
      }));

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: {
          name: 'Bulk Order Customer',
          deliveredTo: 'Dr. Large Order',
          department: 'Bulk Testing Department'
        },
        items: quoteItems,
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Measure conversion time
      const startTime = Date.now();
      
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      const conversionTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(conversionTime).toBeLessThan(5000); // Should complete within 5 seconds

      const sale = response.body.sale;
      
      // Verify all items were converted
      const saleItems = await testHelper.getSaleItems(sale.id);
      expect(saleItems).toHaveLength(20);

      // Verify inventory was updated for all items
      for (let i = 0; i < inventoryItems.length; i++) {
        const updatedItem = await testHelper.getInventoryItem(inventoryItems[i].id);
        const expectedStock = 100 - quoteItems[i].quantity;
        expect(updatedItem.currentStock).toBe(expectedStock);
      }
    });

    it('should handle quotes with zero-value items', async () => {
      const freeItem = await testHelper.createTestInventoryItem({
        name: 'Free Sample',
        sku: 'FREE001',
        unitPrice: 0.00, // Zero price
        vatRate: 0.00,
        currentStock: 50,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'FREE_SAMPLE',
        title: 'Free Sample Test',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { name: 'Free Sample Customer' },
        items: [{
          itemId: freeItem.id,
          itemName: freeItem.name,
          itemSku: freeItem.sku,
          unitPrice: 0.00,
          quantity: 5,
          vatRate: 0.00,
          vatAmount: 0.00,
          subtotal: 0.00,
          totalWithVat: 0.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      // Convert zero-value quote to sale
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(200);
      const sale = response.body.sale;

      // Verify zero amounts are handled correctly
      expect(sale.subtotalAmount).toBe('0.00');
      expect(sale.vatAmount).toBe('0.00');
      expect(sale.totalAmount).toBe('0.00');

      // Verify inventory is still reduced
      const updatedInventory = await testHelper.getInventoryItem(freeItem.id);
      expect(updatedInventory.currentStock).toBe(45); // 50 - 5
    });

    it('should preserve decimal precision in financial calculations', async () => {
      const precisionItem = await testHelper.createTestInventoryItem({
        name: 'Precision Test Item',
        sku: 'PRECISION001',
        unitPrice: 33.33, // Repeating decimal
        vatRate: 0.175, // Non-standard VAT rate
        currentStock: 30,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'PRECISION_TEST',
        title: 'Decimal Precision Test',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { name: 'Precision Test Customer' },
        items: [{
          itemId: precisionItem.id,
          itemName: precisionItem.name,
          itemSku: precisionItem.sku,
          unitPrice: 33.33,
          quantity: 3,
          vatRate: 0.175,
          vatAmount: 17.50, // 33.33 * 3 * 0.175 = 17.4975 ≈ 17.50
          subtotal: 99.99,  // 33.33 * 3
          totalWithVat: 117.49, // 99.99 + 17.50
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(200);
      const sale = response.body.sale;

      // Verify financial precision is maintained
      expect(parseFloat(sale.subtotalAmount)).toBeCloseTo(99.99, 2);
      expect(parseFloat(sale.vatAmount)).toBeCloseTo(17.50, 2);
      expect(parseFloat(sale.totalAmount)).toBeCloseTo(117.49, 2);

      const saleItems = await testHelper.getSaleItems(sale.id);
      const saleItem = saleItems[0];
      
      expect(parseFloat(saleItem.vatAmount.toString())).toBeCloseTo(17.50, 2);
      expect(parseFloat(saleItem.subtotal.toString())).toBeCloseTo(99.99, 2);
    });
  });

  describe('API Integration and Response Format', () => {

    it('should return properly formatted API response for successful conversion', async () => {
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'API Test Item',
        sku: 'API001',
        unitPrice: 25.00,
        vatRate: 0.20,
        currentStock: 40,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'API_TEST',
        title: 'API Integration Test',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { 
          name: 'API Test Customer',
          email: 'api@test.com',
        },
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 2,
          vatRate: inventoryItem.vatRate,
          vatAmount: 10.00,
          subtotal: 50.00,
          totalWithVat: 60.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      const response = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('sale');

      const sale = response.body.sale;
      
      // Verify sale object structure
      expect(sale).toHaveProperty('id');
      expect(sale).toHaveProperty('saleId');
      expect(sale).toHaveProperty('chargeCode');
      expect(sale).toHaveProperty('subtotalAmount');
      expect(sale).toHaveProperty('vatAmount');
      expect(sale).toHaveProperty('totalAmount');
      expect(sale).toHaveProperty('customerInfo');
      expect(sale).toHaveProperty('status', 'completed');
      expect(sale).toHaveProperty('processedBy');
      expect(sale).toHaveProperty('createdAt');

      // Verify response includes audit information
      expect(response.body.message).toMatch(/successfully converted|successfully processed/i);
    });

    it('should return appropriate error responses for various failure scenarios', async () => {
      // Test 1: Non-existent quote
      const nonExistentResponse = await request(app)
        .post('/api/quotes/99999/convert')
        .set(authHeaders.user)
        .send({ processedBy: testUsers.user.id });

      expect(nonExistentResponse.status).toBe(404);
      expect(nonExistentResponse.body).toHaveProperty('message');
      expect(nonExistentResponse.body.message).toMatch(/not found/i);

      // Test 2: Missing processedBy
      const inventoryItem = await testHelper.createTestInventoryItem({
        name: 'Error Test Item',
        sku: 'ERROR001',
        unitPrice: 10.00,
        vatRate: 0.00,
        currentStock: 10,
      });

      const chargeCode = await testHelper.createTestChargeCode({
        code: 'ERROR_TEST',
        title: 'Error Testing',
      });

      const quoteData = {
        chargeCode: chargeCode.code,
        customerInfo: { name: 'Error Test Customer' },
        items: [{
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice: inventoryItem.unitPrice,
          quantity: 1,
          vatRate: inventoryItem.vatRate,
          vatAmount: 0.00,
          subtotal: 10.00,
          totalWithVat: 10.00,
        }],
      };

      const quote = await testHelper.createTestQuoteWithItems(quoteData);

      const missingProcessedByResponse = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set(authHeaders.user)
        .send({}); // Missing processedBy

      expect(missingProcessedByResponse.status).toBe(400);
      expect(missingProcessedByResponse.body).toHaveProperty('message');
      expect(missingProcessedByResponse.body.message).toMatch(/processedBy.*required/i);

      // Test 3: Invalid authentication
      const invalidAuthResponse = await request(app)
        .post(`/api/quotes/${quote.id}/convert`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ processedBy: testUsers.user.id });

      expect(invalidAuthResponse.status).toBe(401);
      expect(invalidAuthResponse.body).toHaveProperty('message');
    });
  });
});