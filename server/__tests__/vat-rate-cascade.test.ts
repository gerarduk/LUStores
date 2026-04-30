import request from 'supertest';
import { db } from '../dbConfig';
import { items, categories, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock auth for testing
const mockUserId = 'test-user-001';
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: mockUserId, claims: { sub: mockUserId }, role: 'admin' };
  next();
};

// Test variables
let testCategoryId: number;
let testItemId1: number;
let testItemId2: number;
let testApp: any;

describe('VAT Rate Cascade Updates', () => {
  beforeAll(async () => {
    // Create test category
    const categoryResult = await db
      .insert(categories)
      .values({
        name: `VAT Test Category ${Date.now()}`,
        description: 'Test category for VAT cascade',
        icon: 'fas fa-test',
        color: 'blue',
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
        firstName: 'Test',
        lastName: 'User',
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

  beforeEach(async () => {
    // Create test items for each test
    const item1Result = await db
      .insert(items)
      .values({
        name: 'Test Item 1',
        sku: `SKU-VAT-${Date.now()}-1`,
        description: 'Test item for VAT cascade',
        categoryId: testCategoryId,
        price: '120.00', // Price inc VAT (100 + 20% VAT)
        vatRate: '0.20', // 20% VAT
        vatIncluded: true,
        currentStock: '10.00',
        minimumStock: '5.00',
        unit: 'pieces',
        location: 'Test Location',
        isActive: true,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      })
      .returning({ id: items.id });
    
    testItemId1 = item1Result[0].id;

    const item2Result = await db
      .insert(items)
      .values({
        name: 'Test Item 2',
        sku: `SKU-VAT-${Date.now()}-2`,
        description: 'Another test item for VAT cascade',
        categoryId: testCategoryId,
        price: '240.00', // Price inc VAT (200 + 20% VAT)
        vatRate: '0.20', // 20% VAT
        vatIncluded: true,
        currentStock: '20.00',
        minimumStock: '10.00',
        unit: 'pieces',
        location: 'Test Location',
        isActive: true,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      })
      .returning({ id: items.id });
    
    testItemId2 = item2Result[0].id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCategoryId) {
      // Delete items first (foreign key constraint)
      await db.delete(items).where(eq(items.categoryId, testCategoryId));
      // Delete category
      await db.delete(categories).where(eq(categories.id, testCategoryId));
    }
  });

  it('should calculate correct price inc VAT when item has 20% VAT rate', async () => {
    // Get the item
    const item = await db
      .select()
      .from(items)
      .where(eq(items.id, testItemId1))
      .limit(1);

    expect(item[0].vatRate).toBe('0.20');
    expect(item[0].price).toBe('120.00'); // 100 * 1.2 = 120
  });

  it('should update all items when VAT rate is changed from 20% to 25%', async () => {
    // Update VAT rate from 20% to 25%
    const response = await request(testApp)
      .put('/api/settings/vat-rates/standard')
      .send({ rate: 0.25 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.oldRate).toBe(0.20);
    expect(response.body.newRate).toBe(0.25);
    expect(response.body.itemsUpdated).toBeGreaterThanOrEqual(2);

    // Verify item 1 price was updated
    // Original: 120.00 inc VAT (100 exc VAT at 20% VAT rate)
    // New: 125.00 inc VAT (100 exc VAT at 25% VAT rate)
    const item1 = await db
      .select()
      .from(items)
      .where(eq(items.id, testItemId1))
      .limit(1);

    expect(item1[0].vatRate).toBe('0.25');
    expect(parseFloat(item1[0].price.toString())).toBeCloseTo(125.00, 2);

    // Verify item 2 price was updated
    // Original: 240.00 inc VAT (200 exc VAT at 20% VAT rate)
    // New: 250.00 inc VAT (200 exc VAT at 25% VAT rate)
    const item2 = await db
      .select()
      .from(items)
      .where(eq(items.id, testItemId2))
      .limit(1);

    expect(item2[0].vatRate).toBe('0.25');
    expect(parseFloat(item2[0].price.toString())).toBeCloseTo(250.00, 2);
  });

  it('should keep price exc VAT constant when VAT rate changes', async () => {
    // Get original item price
    const itemBefore = await db
      .select()
      .from(items)
      .where(eq(items.id, testItemId1))
      .limit(1);

    const priceIncVatBefore = parseFloat(itemBefore[0].price.toString());
    const vatRateBefore = parseFloat(itemBefore[0].vatRate.toString());
    
    // Calculate price exc VAT
    const priceExcVat = priceIncVatBefore / (1 + vatRateBefore);
    expect(priceExcVat).toBeCloseTo(100.00, 2);

    // Update VAT rate to 30%
    await request(testApp)
      .put('/api/settings/vat-rates/standard')
      .send({ rate: 0.30 })
      .expect(200);

    // Get updated item
    const itemAfter = await db
      .select()
      .from(items)
      .where(eq(items.id, testItemId1))
      .limit(1);

    const priceIncVatAfter = parseFloat(itemAfter[0].price.toString());
    const vatRateAfter = parseFloat(itemAfter[0].vatRate.toString());
    
    // Calculate price exc VAT after update
    const priceExcVatAfter = priceIncVatAfter / (1 + vatRateAfter);
    
    // Price exc VAT should remain constant
    expect(priceExcVatAfter).toBeCloseTo(priceExcVat, 2);
    expect(priceExcVatAfter).toBeCloseTo(100.00, 2);
    
    // Price inc VAT should change
    expect(priceIncVatAfter).toBeCloseTo(130.00, 2); // 100 * 1.30
    expect(priceIncVatAfter).not.toBeCloseTo(priceIncVatBefore, 2);
  });

  it('should return 404 when updating non-existent VAT rate', async () => {
    const response = await request(testApp)
      .put('/api/settings/vat-rates/non-existent-rate')
      .send({ rate: 0.25 })
      .expect(404);

    expect(response.body.message).toContain('not found');
  });

  it('should return 400 when VAT rate is invalid', async () => {
    const response = await request(testApp)
      .put('/api/settings/vat-rates/standard')
      .send({ rate: 1.5 }) // Invalid rate > 1
      .expect(400);

    expect(response.body.message).toContain('between 0 and 1');
  });

  it('should not update items with different VAT rates', async () => {
    // Create an item with different VAT rate (0.15)
    const differentRateItemResult = await db
      .insert(items)
      .values({
        name: 'Test Item Different Rate',
        sku: `SKU-VAT-DIFF-${Date.now()}`,
        description: 'Test item with different VAT rate',
        categoryId: testCategoryId,
        price: '115.00', // 100 * 1.15
        vatRate: '0.15', // 15% VAT
        vatIncluded: true,
        currentStock: '5.00',
        minimumStock: '2.00',
        unit: 'pieces',
        location: 'Test Location',
        isActive: true,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      })
      .returning({ id: items.id });
    
    const differentRateItemId = differentRateItemResult[0].id;

    // Update standard rate to 25%
    await request(testApp)
      .put('/api/settings/vat-rates/standard')
      .send({ rate: 0.25 })
      .expect(200);

    // Verify item with 0.15 rate was NOT updated
    const differentRateItem = await db
      .select()
      .from(items)
      .where(eq(items.id, differentRateItemId))
      .limit(1);

    expect(differentRateItem[0].vatRate).toBe('0.15');
    expect(parseFloat(differentRateItem[0].price.toString())).toBeCloseTo(115.00, 2);

    // Cleanup
    await db.delete(items).where(eq(items.id, differentRateItemId));
  });

  it('should update VAT rate setting after cascade', async () => {
    // Update VAT rate
    const response = await request(testApp)
      .put('/api/settings/vat-rates/standard')
      .send({ rate: 0.22 })
      .expect(200);

    expect(response.body.vatRates).toBeDefined();
    expect(Array.isArray(response.body.vatRates)).toBe(true);
    
    const standardRate = response.body.vatRates.find((r: any) => r.id === 'standard');
    expect(standardRate).toBeDefined();
    expect(standardRate.rate).toBe(0.22);
  });
});
