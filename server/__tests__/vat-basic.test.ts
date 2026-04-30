import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../storage';
import type { InsertItem } from '../../shared/schema';

describe('VAT Items Basic Test', () => {
  let createdItemIds: number[] = [];
  let testUserId: string;
  let testCategoryId: number;

  beforeEach(async () => {
    // Clean up any existing test data
    createdItemIds = [];
    
    // Create a test user for item creation with unique email
    const uniqueEmail = `vat.basic.test.${Date.now()}@example.com`;
    const testUser = await storage.createLocalUser({
      email: uniqueEmail,
      password_hash: 'test-hash',
      firstName: 'VAT Basic',
      lastName: 'Tester',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });
    testUserId = testUser.id;
    
    // Create a test category for items with a unique name
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const testCategory = await storage.createCategory({
      name: `VAT-Test-Category-${timestamp}-${randomSuffix}`,
      description: `Category for VAT testing - ${timestamp}`,
      icon: 'fas fa-test',
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    });
    testCategoryId = testCategory.id;
  });

  afterEach(async () => {
    // Clean up created items
    for (const itemId of createdItemIds) {
      try {
        await storage.deleteItem(itemId);
      } catch {
        // Item may already be deleted
      }
    }
    
    // Clean up test category
    if (testCategoryId) {
      try {
        await storage.deleteCategory(testCategoryId);
      } catch {
        // Category may already be deleted or in use
      }
    }
  });

  describe('Item Creation with VAT', () => {
    it('should create an item with VAT included', async () => {
      const uniqueSku = `VAT-INC-${Date.now()}`;
      const itemData: InsertItem = {
        name: 'VAT Included Item',
        sku: uniqueSku,
        description: 'Test item with VAT included in price',
        categoryId: testCategoryId,
        price: '12.00', // £12.00 including VAT
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        vatRate: '0.2000', // 20% VAT
        vatIncluded: true,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      expect(createdItem).toMatchObject({
        name: 'VAT Included Item',
        sku: uniqueSku,
        price: '12.00',
        vatRate: '0.2000',
        vatIncluded: true,
      });

      // Verify item can be retrieved with VAT information
      const retrievedItem = await storage.getItem(createdItem.id);
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.vatRate).toBe('0.2000');
      expect(retrievedItem!.vatIncluded).toBe(true);
      expect(retrievedItem!.price).toBe('12.00');
    });

    it('should verify VAT is visible in items list', async () => {
      // Create a test item
      const uniqueSku = `VAT-LIST-${Date.now()}`;
      const itemData: InsertItem = {
        name: 'VAT List Test Item',
        sku: uniqueSku,
        description: 'Test item for list display',
        categoryId: testCategoryId,
        price: '24.00',
        currentStock: 50,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      // Get items list and verify VAT information is included
      const { items } = await storage.getItems(1, 10);
      const foundItem = items.find(item => item.id === createdItem.id);

      expect(foundItem).toBeDefined();
      expect(foundItem!.vatRate).toBe('0.2000');
      expect(foundItem!.vatIncluded).toBe(true);
      expect(foundItem!.price).toBe('24.00');
    });
  });
});
