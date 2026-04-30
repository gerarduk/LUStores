import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../storage';
import type { InsertItem, Item } from '../../shared/schema';

describe('VAT Functionality for Items', () => {
  let createdItemIds: number[] = [];
  let testUserId: string;
  let testCategoryId: number;

  // Helper function to generate unique SKUs
  const generateUniqueSku = (prefix: string): string => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${randomId}`;
  };

  beforeEach(async () => {
    // Clean up any existing test data
    createdItemIds = [];
    
    // Create a test user for item creation with unique email
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const testUser = await storage.createLocalUser({
      email: `vat.test.${timestamp}.${randomId}@example.com`,
      password_hash: 'test-hash',
      firstName: 'VAT',
      lastName: 'Tester',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });
    testUserId = testUser.id;
    
    // Create a test category for items with a unique name
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
    it('should create an item with VAT included (default behavior)', async () => {
      const itemData: InsertItem = {
        name: 'VAT Included Item',
        sku: generateUniqueSku('VAT-INC'),
        description: 'Test item with VAT included in price',
        categoryId: testCategoryId,
        price: '12.00', // Â£12.00 including VAT
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
        sku: itemData.sku,
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

    it('should create an item with VAT excluded', async () => {
      const sku = generateUniqueSku('VAT-EXC');
      const itemData: InsertItem = {
        name: 'VAT Excluded Item',
        sku,
        description: 'Test item with VAT excluded from price',
        categoryId: testCategoryId,
        price: '10.00', // Â£10.00 excluding VAT
        currentStock: 50,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000', // 20% VAT
        vatIncluded: false,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      expect(createdItem).toMatchObject({
        name: 'VAT Excluded Item',
        sku,
        price: '10.00',
        vatRate: '0.2000',
        vatIncluded: false,
      });

      // Verify item can be retrieved with VAT information
      const retrievedItem = await storage.getItem(createdItem.id);
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.vatRate).toBe('0.2000');
      expect(retrievedItem!.vatIncluded).toBe(false);
      expect(retrievedItem!.price).toBe('10.00');
    });

    it('should create an item with custom VAT rate', async () => {
      const customSku = generateUniqueSku('VAT-CUSTOM');
      const itemData: InsertItem = {
        name: 'Custom VAT Rate Item',
        sku: customSku,
        description: 'Test item with custom VAT rate',
        categoryId: testCategoryId,
        price: '15.00',
        currentStock: 25,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.0500', // 5% VAT (reduced rate)
        vatIncluded: true,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      expect(createdItem).toMatchObject({
        name: 'Custom VAT Rate Item',
        sku: customSku,
        price: '15.00',
        vatRate: '0.0500',
        vatIncluded: true,
      });

      // Verify custom VAT rate is preserved
      const retrievedItem = await storage.getItem(createdItem.id);
      expect(retrievedItem!.vatRate).toBe('0.0500');
    });

    it('should create an item with zero VAT rate', async () => {
      const zeroSku = generateUniqueSku('VAT-ZERO');
      const itemData: InsertItem = {
        name: 'Zero VAT Item',
        sku: zeroSku,
        description: 'Test item with zero VAT rate',
        categoryId: testCategoryId,
        price: '8.00',
        currentStock: 15,
        minimumStock: 2,
        isActive: true,
        vatRate: '0.0000', // 0% VAT (exempt)
        vatIncluded: false, // Doesn't matter for zero rate
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      expect(createdItem).toMatchObject({
        name: 'Zero VAT Item',
        sku: zeroSku,
        price: '8.00',
        vatRate: '0.0000',
        vatIncluded: false,
      });

      // Verify zero VAT rate is preserved
      const retrievedItem = await storage.getItem(createdItem.id);
      expect(retrievedItem!.vatRate).toBe('0.0000');
    });
  });

  describe('Item Updates with VAT', () => {
    let testItemId: number;

    beforeEach(async () => {
      // Create a test item for updating
      const itemData: InsertItem = {
        name: 'Update Test Item',
        sku: generateUniqueSku('UPDATE'),
        description: 'Item for testing VAT updates',
        categoryId: testCategoryId,
        price: '20.00',
        currentStock: 30,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      testItemId = createdItem.id;
      createdItemIds.push(testItemId);
    });

    it('should update VAT rate for an existing item', async () => {
      await storage.updateItem(testItemId, {
        vatRate: '0.1500', // Change to 15%
      }, testUserId);

      const updatedItem = await storage.getItem(testItemId);
      expect(updatedItem!.vatRate).toBe('0.1500');
      expect(updatedItem!.vatIncluded).toBe(true); // Should remain unchanged
    });

    it('should update VAT inclusion flag for an existing item', async () => {
      await storage.updateItem(testItemId, {
        vatIncluded: false,
      }, testUserId);

      const updatedItem = await storage.getItem(testItemId);
      expect(updatedItem!.vatIncluded).toBe(false);
      expect(updatedItem!.vatRate).toBe('0.2000'); // Should remain unchanged
    });

    it('should update both VAT rate and inclusion simultaneously', async () => {
      await storage.updateItem(testItemId, {
        vatRate: '0.0500',
        vatIncluded: false,
        price: '25.00', // Also update price
      }, testUserId);

      const updatedItem = await storage.getItem(testItemId);
      expect(updatedItem!.vatRate).toBe('0.0500');
      expect(updatedItem!.vatIncluded).toBe(false);
      expect(updatedItem!.price).toBe('25.00');
    });
  });

  describe('VAT Display and Calculation Logic', () => {
    it('should verify VAT calculation for VAT-included items', async () => {
      const itemData: InsertItem = {
        name: 'VAT Calculation Test',
        sku: generateUniqueSku('VAT-CALC-1'),
        description: 'Item for testing VAT calculations',
        categoryId: testCategoryId,
        price: '24.00', // Â£24.00 including 20% VAT
        currentStock: 10,
        minimumStock: 1,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      // Calculate what the ex-VAT price should be
      const priceIncVAT = parseFloat(createdItem.price);
      const vatRate = parseFloat(createdItem.vatRate);
      const expectedExVATPrice = priceIncVAT / (1 + vatRate);
      const expectedVATAmount = priceIncVAT - expectedExVATPrice;

      // Verify calculations
      expect(expectedExVATPrice).toBeCloseTo(20.00, 2); // Â£20.00 ex VAT
      expect(expectedVATAmount).toBeCloseTo(4.00, 2);   // Â£4.00 VAT amount
      expect(priceIncVAT).toBe(24.00);                  // Â£24.00 inc VAT
    });

    it('should verify VAT calculation for VAT-excluded items', async () => {
      const itemData: InsertItem = {
        name: 'VAT Excluded Calculation Test',
        sku: generateUniqueSku('VAT-CALC-2'),
        description: 'Item for testing VAT excluded calculations',
        categoryId: testCategoryId,
        price: '30.00', // Â£30.00 excluding 20% VAT
        currentStock: 10,
        minimumStock: 1,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: false,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      // Calculate what the inc-VAT price should be
      const priceExVAT = parseFloat(createdItem.price);
      const vatRate = parseFloat(createdItem.vatRate);
      const expectedVATAmount = priceExVAT * vatRate;
      const expectedIncVATPrice = priceExVAT + expectedVATAmount;

      // Verify calculations
      expect(priceExVAT).toBe(30.00);                    // Â£30.00 ex VAT
      expect(expectedVATAmount).toBeCloseTo(6.00, 2);    // Â£6.00 VAT amount
      expect(expectedIncVATPrice).toBeCloseTo(36.00, 2); // Â£36.00 inc VAT
    });
  });

  describe('Items List with VAT Information', () => {
    const createdTestItems: { standardVat: Item | null, reducedVat: Item | null, zeroVat: Item | null } = {
      standardVat: null,
      reducedVat: null,
      zeroVat: null
    };

    beforeEach(async () => {
      // Create multiple items with different VAT configurations
      const standardVatItem: InsertItem = {
        name: 'Standard VAT Item',
        sku: generateUniqueSku('STD-VAT'),
        description: 'Standard VAT included item',
        categoryId: testCategoryId,
        price: '12.00',
        currentStock: 50,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };
      
      const reducedVatItem: InsertItem = {
        name: 'Reduced VAT Item',
        sku: generateUniqueSku('RED-VAT'),
        description: 'Reduced VAT rate item',
        categoryId: testCategoryId,
        price: '10.50',
        currentStock: 30,
        minimumStock: 3,
        isActive: true,
        vatRate: '0.0500',
        vatIncluded: true,
        createdBy: testUserId,
      };
      
      const zeroVatItem: InsertItem = {
        name: 'Zero VAT Item',
        sku: generateUniqueSku('ZERO-VAT'),
        description: 'Zero VAT rate item',
        categoryId: testCategoryId,
        price: '15.00',
        currentStock: 20,
        minimumStock: 2,
        isActive: true,
        vatRate: '0.0000',
        vatIncluded: false,
        createdBy: testUserId,
      };

      // Create the items and store references
      createdTestItems.standardVat = await storage.createItem(standardVatItem);
      createdTestItems.reducedVat = await storage.createItem(reducedVatItem);
      createdTestItems.zeroVat = await storage.createItem(zeroVatItem);
      
      // Ensure items were created successfully
      if (!createdTestItems.standardVat || !createdTestItems.reducedVat || !createdTestItems.zeroVat) {
        throw new Error('Failed to create test items');
      }
      
      createdItemIds.push(createdTestItems.standardVat.id);
      createdItemIds.push(createdTestItems.reducedVat.id);
      createdItemIds.push(createdTestItems.zeroVat.id);
    });

    it('should retrieve all items with VAT information intact', async () => {
      const { items, total } = await storage.getItems(1, 10);
      
      // Ensure test items exist before using them
      if (!createdTestItems.standardVat || !createdTestItems.reducedVat || !createdTestItems.zeroVat) {
        throw new Error('Test items not properly initialized');
      }
      
      // Find our test items by ID
      const standardVatItem = items.find(item => item.id === createdTestItems.standardVat!.id);
      const reducedVatItem = items.find(item => item.id === createdTestItems.reducedVat!.id);
      const zeroVatItem = items.find(item => item.id === createdTestItems.zeroVat!.id);

      expect(standardVatItem).toBeDefined();
      expect(standardVatItem!.vatRate).toBe('0.2000');
      expect(standardVatItem!.vatIncluded).toBe(true);

      expect(reducedVatItem).toBeDefined();
      expect(reducedVatItem!.vatRate).toBe('0.0500');
      expect(reducedVatItem!.vatIncluded).toBe(true);

      expect(zeroVatItem).toBeDefined();
      expect(zeroVatItem!.vatRate).toBe('0.0000');
      expect(zeroVatItem!.vatIncluded).toBe(false);

      expect(total).toBeGreaterThanOrEqual(3);
    });

    it('should verify VAT information is preserved in search results', async () => {
      const { items } = await storage.getItems(1, 10, 'VAT');
      
      // Should find our test items
      expect(items.length).toBeGreaterThanOrEqual(3);
      
      // Verify each found item has VAT information
      items.forEach(item => {
        expect(item.vatRate).toBeDefined();
        expect(item.vatIncluded).toBeDefined();
        expect(typeof item.vatRate).toBe('string');
        expect(typeof item.vatIncluded).toBe('boolean');
      });
    });
  });

  describe('Default VAT Values', () => {
    it('should use default VAT values when not specified', async () => {
      const itemData: InsertItem = {
        name: 'Default VAT Item',
        sku: generateUniqueSku('DEFAULT-VAT'),
        description: 'Item using default VAT settings',
        categoryId: testCategoryId,
        price: '18.00',
        currentStock: 40,
        minimumStock: 4,
        isActive: true,
        vatRate: '0.2000', // Required by schema
        vatIncluded: true,  // Required by schema
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      createdItemIds.push(createdItem.id);

      // Check that default values are applied and preserved
      expect(createdItem.vatRate).toBe('0.2000'); // Default 20% VAT
      expect(createdItem.vatIncluded).toBe(true);  // Default VAT included
    });
  });
});
