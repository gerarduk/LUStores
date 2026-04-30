import request from 'supertest';
import { db } from '../dbConfig';
import { items, categories, users, sales, saleItems } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

/**
 * Comprehensive tests for VAT Inc/Exc handling
 *
 * Tests verify:
 * 1. Items with vatIncluded=true (price already includes VAT)
 * 2. Items with vatIncluded=false (VAT added to price)
 * 3. Sales calculations are correct for both types
 * 4. VAT rate changes update items but preserve historical sales
 * 5. Reports show correct inc/exc VAT values
 */

// Mock auth for testing
const mockUserId = 'vat-test-user-001';
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: mockUserId, claims: { sub: mockUserId }, role: 'admin' };
  next();
};

// Test variables
let testCategoryId: number;
let testApp: any;

// Helper to generate unique identifiers
const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `${prefix}-${timestamp}-${random}`;
};

describe('VAT Inc/Exc Handling', () => {
  beforeAll(async () => {
    // Create test category
    const categoryResult = await db
      .insert(categories)
      .values({
        name: `VAT Inc/Exc Test Category ${Date.now()}`,
        description: 'Test category for VAT inc/exc handling',
        icon: 'fas fa-calculator',
        color: 'green',
      })
      .returning({ id: categories.id });

    testCategoryId = categoryResult[0].id;

    // Ensure test user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, mockUserId))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: mockUserId,
        email: `${mockUserId}@test.com`,
        role: 'admin',
        firstName: 'VAT',
        lastName: 'Tester',
      });
    }

    // Create test app with mock auth
    const { registerRoutes } = await import('../routes');
    const express = await import('express');
    const testAppInstance = express.default();

    testAppInstance.use(mockAuthMiddleware);

    await registerRoutes(testAppInstance);
    testApp = testAppInstance;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCategoryId) {
      await db.delete(items).where(eq(items.categoryId, testCategoryId));
      await db.delete(categories).where(eq(categories.id, testCategoryId));
    }
  });

  describe('Item Creation with VAT Inc/Exc', () => {
    let vatIncludedItemId: number;
    let vatExcludedItemId: number;

    afterEach(async () => {
      // Clean up created items
      if (vatIncludedItemId) {
        await db.delete(items).where(eq(items.id, vatIncludedItemId));
      }
      if (vatExcludedItemId) {
        await db.delete(items).where(eq(items.id, vatExcludedItemId));
      }
    });

    it('should create item with vatIncluded=true (price includes VAT)', async () => {
      // £120 price that INCLUDES 20% VAT (so £100 exc VAT)
      const response = await request(testApp)
        .post('/api/items')
        .send({
          name: 'VAT Included Item',
          sku: generateUniqueId('VAT-INC'),
          description: 'Item where price includes VAT',
          categoryId: testCategoryId,
          price: '120.00',
          vatRate: '0.2000',
          vatIncluded: true,
          currentStock: 50,
          minimumStock: 5,
          unit: 'pieces',
          location: 'Test Location',
        })
        .expect(201);

      vatIncludedItemId = response.body.id;

      expect(response.body.price).toBe('120.00');
      expect(response.body.vatRate).toBe('0.2000');
      expect(response.body.vatIncluded).toBe(true);

      // Verify: For vatIncluded=true, the stored price IS the inc-VAT price
      // So £120 stored means £120 inc VAT, £100 exc VAT
      const storedItem = await db
        .select()
        .from(items)
        .where(eq(items.id, vatIncludedItemId))
        .limit(1);

      expect(storedItem[0].price).toBe('120.00');
      expect(storedItem[0].vatIncluded).toBe(true);
    });

    it('should create item with vatIncluded=false (VAT added to price)', async () => {
      // £100 price that EXCLUDES VAT (so £120 inc VAT with 20%)
      const response = await request(testApp)
        .post('/api/items')
        .send({
          name: 'VAT Excluded Item',
          sku: generateUniqueId('VAT-EXC'),
          description: 'Item where VAT is added to price',
          categoryId: testCategoryId,
          price: '100.00',
          vatRate: '0.2000',
          vatIncluded: false,
          currentStock: 50,
          minimumStock: 5,
          unit: 'pieces',
          location: 'Test Location',
        })
        .expect(201);

      vatExcludedItemId = response.body.id;

      expect(response.body.price).toBe('100.00');
      expect(response.body.vatRate).toBe('0.2000');
      expect(response.body.vatIncluded).toBe(false);

      // Verify: For vatIncluded=false, the stored price IS the exc-VAT price
      // So £100 stored means £100 exc VAT, £120 inc VAT
      const storedItem = await db
        .select()
        .from(items)
        .where(eq(items.id, vatExcludedItemId))
        .limit(1);

      expect(storedItem[0].price).toBe('100.00');
      expect(storedItem[0].vatIncluded).toBe(false);
    });
  });

  describe('Sales with VAT Inc/Exc Items', () => {
    let vatIncludedItemId: number;
    let vatExcludedItemId: number;
    let createdSaleIds: number[] = [];

    beforeEach(async () => {
      // Create VAT included item: £120 inc VAT (£100 exc VAT)
      const incItem = await db
        .insert(items)
        .values({
          name: 'Sale Test - VAT Included',
          sku: generateUniqueId('SALE-VAT-INC'),
          description: 'Test item with VAT included',
          categoryId: testCategoryId,
          price: '120.00',
          vatRate: '0.2000',
          vatIncluded: true,
          currentStock: '100.00',
          minimumStock: '10.00',
          unit: 'pieces',
          location: 'Test',
          isActive: true,
          createdBy: mockUserId,
          updatedBy: mockUserId,
        })
        .returning({ id: items.id });
      vatIncludedItemId = incItem[0].id;

      // Create VAT excluded item: £100 exc VAT (£120 inc VAT)
      const excItem = await db
        .insert(items)
        .values({
          name: 'Sale Test - VAT Excluded',
          sku: generateUniqueId('SALE-VAT-EXC'),
          description: 'Test item with VAT excluded',
          categoryId: testCategoryId,
          price: '100.00',
          vatRate: '0.2000',
          vatIncluded: false,
          currentStock: '100.00',
          minimumStock: '10.00',
          unit: 'pieces',
          location: 'Test',
          isActive: true,
          createdBy: mockUserId,
          updatedBy: mockUserId,
        })
        .returning({ id: items.id });
      vatExcludedItemId = excItem[0].id;
    });

    afterEach(async () => {
      // Clean up sales and items
      for (const saleId of createdSaleIds) {
        await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
        await db.delete(sales).where(eq(sales.id, saleId));
      }
      createdSaleIds = [];

      if (vatIncludedItemId) {
        await db.delete(items).where(eq(items.id, vatIncludedItemId));
      }
      if (vatExcludedItemId) {
        await db.delete(items).where(eq(items.id, vatExcludedItemId));
      }
    });

    it('should calculate correct values for sale with vatIncluded=true item', async () => {
      // Sell 2 units of the VAT included item (£120 each inc VAT)
      const response = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('CC'),
          items: [
            {
              itemId: vatIncludedItemId,
              itemName: 'Sale Test - VAT Included',
              itemSku: 'TEST-INC',
              unitPrice: 120.00, // Price including VAT
              quantity: 2,
            }
          ],
        })
        .expect(201);

      createdSaleIds.push(response.body.sale.id);

      // Expected calculations:
      // Unit price: £120 (inc VAT)
      // Quantity: 2
      // Total inc VAT: £240
      // Total exc VAT: £200 (£240 / 1.2)
      // VAT amount: £40

      expect(response.body.sale.totalAmount).toBe('240.00');
      expect(parseFloat(response.body.sale.subtotalAmount)).toBeCloseTo(200.00, 2);
      expect(parseFloat(response.body.sale.vatAmount)).toBeCloseTo(40.00, 2);

      // Verify sale items stored correctly
      const storedSaleItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, response.body.sale.id));

      expect(storedSaleItems.length).toBe(1);
      const item = storedSaleItems[0];

      // vatIncluded should be stored as snapshot
      expect(item.vatIncluded).toBe(true);
      expect(parseFloat(item.totalWithVat.toString())).toBeCloseTo(240.00, 2);
      expect(parseFloat(item.subtotal.toString())).toBeCloseTo(200.00, 2);
      expect(parseFloat(item.vatAmount.toString())).toBeCloseTo(40.00, 2);
    });

    it('should calculate correct values for sale with vatIncluded=false item', async () => {
      // Sell 2 units of the VAT excluded item (£100 each exc VAT)
      const response = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('CC'),
          items: [
            {
              itemId: vatExcludedItemId,
              itemName: 'Sale Test - VAT Excluded',
              itemSku: 'TEST-EXC',
              unitPrice: 100.00, // Price excluding VAT
              quantity: 2,
            }
          ],
        })
        .expect(201);

      createdSaleIds.push(response.body.sale.id);

      // Expected calculations:
      // Unit price: £100 (exc VAT)
      // Quantity: 2
      // Total exc VAT: £200
      // VAT amount: £40 (£200 * 0.2)
      // Total inc VAT: £240

      expect(parseFloat(response.body.sale.subtotalAmount)).toBeCloseTo(200.00, 2);
      expect(parseFloat(response.body.sale.vatAmount)).toBeCloseTo(40.00, 2);
      expect(parseFloat(response.body.sale.totalAmount)).toBeCloseTo(240.00, 2);

      // Verify sale items stored correctly
      const storedSaleItems = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, response.body.sale.id));

      expect(storedSaleItems.length).toBe(1);
      const item = storedSaleItems[0];

      // vatIncluded should be stored as snapshot
      expect(item.vatIncluded).toBe(false);
      expect(parseFloat(item.subtotal.toString())).toBeCloseTo(200.00, 2);
      expect(parseFloat(item.vatAmount.toString())).toBeCloseTo(40.00, 2);
      expect(parseFloat(item.totalWithVat.toString())).toBeCloseTo(240.00, 2);
    });

    it('should produce identical totals for equivalent inc/exc VAT items', async () => {
      // Both items represent the same value:
      // VAT included: £120 stored (= £100 exc + £20 VAT)
      // VAT excluded: £100 stored (+ £20 VAT = £120)

      // Sell 1 of each
      const incResponse = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('CC-INC'),
          items: [
            {
              itemId: vatIncludedItemId,
              itemName: 'Sale Test - VAT Included',
              itemSku: 'TEST-INC',
              unitPrice: 120.00,
              quantity: 1,
            }
          ],
        })
        .expect(201);
      createdSaleIds.push(incResponse.body.sale.id);

      const excResponse = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('CC-EXC'),
          items: [
            {
              itemId: vatExcludedItemId,
              itemName: 'Sale Test - VAT Excluded',
              itemSku: 'TEST-EXC',
              unitPrice: 100.00,
              quantity: 1,
            }
          ],
        })
        .expect(201);
      createdSaleIds.push(excResponse.body.sale.id);

      // Both should have identical totals
      expect(parseFloat(incResponse.body.sale.totalAmount)).toBeCloseTo(
        parseFloat(excResponse.body.sale.totalAmount), 2
      );
      expect(parseFloat(incResponse.body.sale.subtotalAmount)).toBeCloseTo(
        parseFloat(excResponse.body.sale.subtotalAmount), 2
      );
      expect(parseFloat(incResponse.body.sale.vatAmount)).toBeCloseTo(
        parseFloat(excResponse.body.sale.vatAmount), 2
      );
    });
  });

  describe('VAT Rate Changes and Historical Sales', () => {
    let vatIncludedItemId: number;
    let vatExcludedItemId: number;
    let saleAtOldRateId: number;
    let originalVatRates: any;

    beforeEach(async () => {
      // Store original VAT rates to restore later
      const response = await request(testApp)
        .get('/api/settings/vat-rates')
        .expect(200);
      originalVatRates = response.body.rates;

      // Ensure standard rate is 20%
      await request(testApp)
        .put('/api/settings/vat-rates/standard')
        .send({ rate: 0.20 });

      // Create VAT included item: £120 inc VAT at 20% (£100 exc VAT)
      const incItem = await db
        .insert(items)
        .values({
          name: 'Rate Change Test - VAT Inc',
          sku: generateUniqueId('RATE-INC'),
          description: 'Test item for rate change',
          categoryId: testCategoryId,
          price: '120.00',
          vatRate: '0.2000',
          vatIncluded: true,
          currentStock: '100.00',
          minimumStock: '10.00',
          unit: 'pieces',
          location: 'Test',
          isActive: true,
          createdBy: mockUserId,
          updatedBy: mockUserId,
        })
        .returning({ id: items.id });
      vatIncludedItemId = incItem[0].id;

      // Create VAT excluded item: £100 exc VAT at 20%
      const excItem = await db
        .insert(items)
        .values({
          name: 'Rate Change Test - VAT Exc',
          sku: generateUniqueId('RATE-EXC'),
          description: 'Test item for rate change',
          categoryId: testCategoryId,
          price: '100.00',
          vatRate: '0.2000',
          vatIncluded: false,
          currentStock: '100.00',
          minimumStock: '10.00',
          unit: 'pieces',
          location: 'Test',
          isActive: true,
          createdBy: mockUserId,
          updatedBy: mockUserId,
        })
        .returning({ id: items.id });
      vatExcludedItemId = excItem[0].id;
    });

    afterEach(async () => {
      // Restore original VAT rates
      if (originalVatRates) {
        await request(testApp)
          .put('/api/settings/vat-rates/standard')
          .send({ rate: 0.20 });
      }

      // Clean up
      if (saleAtOldRateId) {
        await db.delete(saleItems).where(eq(saleItems.saleId, saleAtOldRateId));
        await db.delete(sales).where(eq(sales.id, saleAtOldRateId));
      }
      if (vatIncludedItemId) {
        await db.delete(items).where(eq(items.id, vatIncludedItemId));
      }
      if (vatExcludedItemId) {
        await db.delete(items).where(eq(items.id, vatExcludedItemId));
      }
    });

    it('should update vatIncluded=true item price when VAT rate changes (preserve exc-VAT)', async () => {
      // Initial: £120 inc VAT at 20% = £100 exc VAT
      const itemBefore = await db
        .select()
        .from(items)
        .where(eq(items.id, vatIncludedItemId))
        .limit(1);

      expect(itemBefore[0].price).toBe('120.00');
      expect(itemBefore[0].vatRate).toBe('0.2000');

      // Change VAT rate from 20% to 25%
      await request(testApp)
        .put('/api/settings/vat-rates/standard')
        .send({ rate: 0.25 })
        .expect(200);

      // After: Should be £125 inc VAT at 25% = £100 exc VAT (preserved)
      const itemAfter = await db
        .select()
        .from(items)
        .where(eq(items.id, vatIncludedItemId))
        .limit(1);

      expect(itemAfter[0].vatRate).toBe('0.2500');
      // Price should be recalculated: £100 * 1.25 = £125
      expect(parseFloat(itemAfter[0].price.toString())).toBeCloseTo(125.00, 2);
    });

    it('should keep vatIncluded=false item price unchanged when VAT rate changes', async () => {
      // Initial: £100 exc VAT at 20%
      const itemBefore = await db
        .select()
        .from(items)
        .where(eq(items.id, vatExcludedItemId))
        .limit(1);

      expect(itemBefore[0].price).toBe('100.00');
      expect(itemBefore[0].vatRate).toBe('0.2000');

      // Change VAT rate from 20% to 25%
      await request(testApp)
        .put('/api/settings/vat-rates/standard')
        .send({ rate: 0.25 })
        .expect(200);

      // After: Price should stay £100, only rate changes
      const itemAfter = await db
        .select()
        .from(items)
        .where(eq(items.id, vatExcludedItemId))
        .limit(1);

      expect(itemAfter[0].vatRate).toBe('0.2500');
      // Price stays the same (it's the exc-VAT price)
      expect(itemAfter[0].price).toBe('100.00');
    });

    it('should preserve historical sale VAT rate when item VAT rate changes', async () => {
      // Create a sale at the current 20% rate
      const saleResponse = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('HIST-CC'),
          items: [
            {
              itemId: vatIncludedItemId,
              itemName: 'Rate Change Test - VAT Inc',
              itemSku: 'RATE-INC',
              unitPrice: 120.00,
              quantity: 1,
            }
          ],
        })
        .expect(201);

      saleAtOldRateId = saleResponse.body.sale.id;

      // Verify sale was created at 20% rate
      const saleItemBefore = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleAtOldRateId))
        .limit(1);

      expect(parseFloat(saleItemBefore[0].vatRate.toString())).toBeCloseTo(0.20, 4);
      expect(parseFloat(saleItemBefore[0].vatAmount.toString())).toBeCloseTo(20.00, 2);
      expect(parseFloat(saleItemBefore[0].totalWithVat.toString())).toBeCloseTo(120.00, 2);

      // Now change VAT rate to 25%
      await request(testApp)
        .put('/api/settings/vat-rates/standard')
        .send({ rate: 0.25 })
        .expect(200);

      // Verify the item was updated
      const itemAfter = await db
        .select()
        .from(items)
        .where(eq(items.id, vatIncludedItemId))
        .limit(1);
      expect(itemAfter[0].vatRate).toBe('0.2500');

      // BUT the historical sale should STILL be at 20%
      const saleItemAfter = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleAtOldRateId))
        .limit(1);

      // These should NOT have changed - historical snapshot preserved
      expect(parseFloat(saleItemAfter[0].vatRate.toString())).toBeCloseTo(0.20, 4);
      expect(parseFloat(saleItemAfter[0].vatAmount.toString())).toBeCloseTo(20.00, 2);
      expect(parseFloat(saleItemAfter[0].totalWithVat.toString())).toBeCloseTo(120.00, 2);
      expect(parseFloat(saleItemAfter[0].subtotal.toString())).toBeCloseTo(100.00, 2);
    });

    it('should preserve vatIncluded snapshot in historical sales', async () => {
      // Create sale with VAT excluded item
      const saleResponse = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('SNAP-CC'),
          items: [
            {
              itemId: vatExcludedItemId,
              itemName: 'Rate Change Test - VAT Exc',
              itemSku: 'RATE-EXC',
              unitPrice: 100.00,
              quantity: 1,
            }
          ],
        })
        .expect(201);

      saleAtOldRateId = saleResponse.body.sale.id;

      // Verify vatIncluded was snapshotted as false
      const saleItem = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleAtOldRateId))
        .limit(1);

      expect(saleItem[0].vatIncluded).toBe(false);

      // Even if we somehow changed the item's vatIncluded (which we shouldn't normally do),
      // the sale's snapshot should remain unchanged
      await db
        .update(items)
        .set({ vatIncluded: true })
        .where(eq(items.id, vatExcludedItemId));

      // Sale item should still show vatIncluded: false
      const saleItemAfter = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleAtOldRateId))
        .limit(1);

      expect(saleItemAfter[0].vatIncluded).toBe(false);
    });
  });

  describe('Reports with VAT Inc/Exc Items', () => {
    let vatIncludedItemId: number;
    let vatExcludedItemId: number;
    let saleId: number;

    beforeEach(async () => {
      // Create VAT included item
      const incItem = await db
        .insert(items)
        .values({
          name: 'Report Test - VAT Inc',
          sku: generateUniqueId('RPT-INC'),
          description: 'Test item for reports',
          categoryId: testCategoryId,
          price: '120.00',
          vatRate: '0.2000',
          vatIncluded: true,
          currentStock: '100.00',
          minimumStock: '10.00',
          unit: 'pieces',
          location: 'Test',
          isActive: true,
          createdBy: mockUserId,
          updatedBy: mockUserId,
        })
        .returning({ id: items.id });
      vatIncludedItemId = incItem[0].id;

      // Create VAT excluded item
      const excItem = await db
        .insert(items)
        .values({
          name: 'Report Test - VAT Exc',
          sku: generateUniqueId('RPT-EXC'),
          description: 'Test item for reports',
          categoryId: testCategoryId,
          price: '100.00',
          vatRate: '0.2000',
          vatIncluded: false,
          currentStock: '100.00',
          minimumStock: '10.00',
          unit: 'pieces',
          location: 'Test',
          isActive: true,
          createdBy: mockUserId,
          updatedBy: mockUserId,
        })
        .returning({ id: items.id });
      vatExcludedItemId = excItem[0].id;

      // Create a sale with both items
      const saleResponse = await request(testApp)
        .post('/api/sales')
        .send({
          chargeCode: generateUniqueId('RPT-CC'),
          items: [
            {
              itemId: vatIncludedItemId,
              itemName: 'Report Test - VAT Inc',
              itemSku: 'RPT-INC',
              unitPrice: 120.00,
              quantity: 1,
            },
            {
              itemId: vatExcludedItemId,
              itemName: 'Report Test - VAT Exc',
              itemSku: 'RPT-EXC',
              unitPrice: 100.00,
              quantity: 1,
            }
          ],
        })
        .expect(201);

      saleId = saleResponse.body.sale.id;
    });

    afterEach(async () => {
      if (saleId) {
        await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
        await db.delete(sales).where(eq(sales.id, saleId));
      }
      if (vatIncludedItemId) {
        await db.delete(items).where(eq(items.id, vatIncludedItemId));
      }
      if (vatExcludedItemId) {
        await db.delete(items).where(eq(items.id, vatExcludedItemId));
      }
    });

    it('should return correct VAT values in sales report', async () => {
      // Get the sale from reports API
      const response = await request(testApp)
        .get('/api/sales/reports')
        .expect(200);

      // Find our test sale
      const testSale = response.body.data.sales.find((s: any) => s.id === saleId);
      expect(testSale).toBeDefined();

      // Verify total calculations
      // VAT Inc item: £120 inc VAT = £100 exc + £20 VAT
      // VAT Exc item: £100 exc VAT + £20 VAT = £120 inc VAT
      // Combined: £200 exc VAT + £40 VAT = £240 inc VAT
      expect(parseFloat(testSale.subtotalAmount)).toBeCloseTo(200.00, 2);
      expect(parseFloat(testSale.vatAmount)).toBeCloseTo(40.00, 2);
      expect(parseFloat(testSale.totalAmount)).toBeCloseTo(240.00, 2);

      // Verify individual items have vatIncluded stored
      expect(testSale.items.length).toBe(2);

      const incItem = testSale.items.find((i: any) => i.itemName === 'Report Test - VAT Inc');
      const excItem = testSale.items.find((i: any) => i.itemName === 'Report Test - VAT Exc');

      expect(incItem.vatIncluded).toBe(true);
      expect(excItem.vatIncluded).toBe(false);

      // Both should have correct calculated values
      expect(parseFloat(incItem.subtotal)).toBeCloseTo(100.00, 2);
      expect(parseFloat(incItem.vatAmount)).toBeCloseTo(20.00, 2);
      expect(parseFloat(incItem.totalWithVat)).toBeCloseTo(120.00, 2);

      expect(parseFloat(excItem.subtotal)).toBeCloseTo(100.00, 2);
      expect(parseFloat(excItem.vatAmount)).toBeCloseTo(20.00, 2);
      expect(parseFloat(excItem.totalWithVat)).toBeCloseTo(120.00, 2);
    });
  });
});
