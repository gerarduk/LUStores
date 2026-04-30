import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../storage';
import type { InsertItem } from '../../shared/schema';

describe('VAT in Sales Functionality', () => {
  let createdItemIds: number[] = [];
  let createdSaleIds: number[] = [];
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
    createdSaleIds = [];
    
    // Create a test user for item and sales creation with unique email
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const testUser = await storage.createLocalUser({
      email: `vat.sales.test.${timestamp}.${randomId}@example.com`,
      password_hash: 'test-hash',
      firstName: 'VAT Sales',
      lastName: 'Tester',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });
    testUserId = testUser.id;
    
    // Create a test category for items with a unique name
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const testCategory = await storage.createCategory({
      name: `VAT-Sales-Test-Category-${timestamp}-${randomSuffix}`,
      description: `Category for VAT sales testing - ${timestamp}`,
      icon: 'fas fa-test',
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    });
    testCategoryId = testCategory.id;
  });

  afterEach(async () => {
    // Clean up created items and sales
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

  describe('Sales with VAT-Included Items', () => {
    let vatIncludedItemId: number;

    beforeEach(async () => {
      // Create a test item with VAT included
      const itemData: InsertItem = {
        name: 'VAT Included Test Item',
        sku: generateUniqueSku(generateUniqueSku('VAT-INC-SALE')),
        description: 'Test item with VAT included for sales',
        categoryId: testCategoryId,
        price: '24.00', // Â£24.00 including 20% VAT
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      vatIncludedItemId = createdItem.id;
      createdItemIds.push(vatIncludedItemId);
    });

    it('should create a sale with correct VAT calculation for VAT-included item', async () => {
      const saleData = {
        chargeCode: generateUniqueSku('TEST-CC'),
        subtotalAmount: '20.00', // Ex VAT
        vatAmount: '4.00',       // VAT amount
        totalAmount: '24.00',    // Inc VAT
        vatApplied: true,
        customerInfo: { name: 'Test Customer' },
        notes: 'Test sale with VAT included item',
        status: 'completed' as const,
        processedBy: testUserId,
      };

      const saleItems = [
        {
          itemId: vatIncludedItemId,
          itemName: 'VAT Included Test Item',
          itemSku: generateUniqueSku(generateUniqueSku('VAT-INC-SALE')),
          unitPrice: 24.00,     // Price including VAT
          quantity: 1,
          vatRate: 0.20,        // 20% VAT
          vatAmount: 4.00,      // VAT amount for this line
          subtotal: 20.00,      // Subtotal excluding VAT
          totalWithVat: 24.00,  // Total including VAT
        }
      ];

      const sale = await storage.createSale(saleData, saleItems, 'test-user-id');
      createdSaleIds.push(sale.id);

      expect(sale).toMatchObject({
        subtotalAmount: '20.00',
        vatAmount: '4.00',
        totalAmount: '24.00',
        vatApplied: true,
      });
      // Check charge code format instead of exact value
      expect(sale.chargeCode).toMatch(/^TEST-CC-/);

      // Verify the sale was created successfully
      expect(sale.saleId).toBeDefined();
      expect(typeof sale.saleId).toBe('string');
    });

    it('should create a sale with multiple VAT-included items', async () => {
      // Create another item
      const secondItemData: InsertItem = {
        name: 'Second VAT Item',
        sku: generateUniqueSku(generateUniqueSku('VAT-INC-SALE')),
        description: 'Second test item with VAT included',
        categoryId: testCategoryId,
        price: '12.00', // Â£12.00 including 20% VAT
        currentStock: 50,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };

      const secondItem = await storage.createItem(secondItemData);
      createdItemIds.push(secondItem.id);

      const saleData = {
        chargeCode: generateUniqueSku('TEST-CC'),
        subtotalAmount: '30.00', // Â£20.00 + Â£10.00 ex VAT
        vatAmount: '6.00',       // Â£4.00 + Â£2.00 VAT
        totalAmount: '36.00',    // Â£24.00 + Â£12.00 inc VAT
        vatApplied: true,
        customerInfo: { name: 'Test Customer' },
        notes: 'Test sale with multiple VAT included items',
        status: 'completed' as const,
        processedBy: testUserId,
      };

      const saleItems = [
        {
          itemId: vatIncludedItemId,
          itemName: 'VAT Included Test Item',
          itemSku: generateUniqueSku(generateUniqueSku('VAT-INC-SALE')),
          unitPrice: 24.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 4.00,
          subtotal: 20.00,
          totalWithVat: 24.00,
        },
        {
          itemId: secondItem.id,
          itemName: 'Second VAT Item',
          itemSku: generateUniqueSku(generateUniqueSku('VAT-INC-SALE')),
          unitPrice: 12.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 2.00,
          subtotal: 10.00,
          totalWithVat: 12.00,
        }
      ];

      const sale = await storage.createSale(saleData, saleItems, 'test-user-id');
      createdSaleIds.push(sale.id);

      expect(sale).toMatchObject({
        subtotalAmount: '30.00',
        vatAmount: '6.00',
        totalAmount: '36.00',
        vatApplied: true,
      });
      expect(sale.chargeCode).toMatch(/^TEST-CC-/);
    });
  });

  describe('Sales with VAT-Excluded Items', () => {
    let vatExcludedItemId: number;

    beforeEach(async () => {
      // Create a test item with VAT excluded
      const itemData: InsertItem = {
        name: 'VAT Excluded Test Item',
        sku: generateUniqueSku('VAT-EXC-SALE'),
        description: 'Test item with VAT excluded for sales',
        categoryId: testCategoryId,
        price: '20.00', // Â£20.00 excluding 20% VAT
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: false,
        createdBy: testUserId,
      };

      const createdItem = await storage.createItem(itemData);
      vatExcludedItemId = createdItem.id;
      createdItemIds.push(vatExcludedItemId);
    });

    it('should create a sale with correct VAT calculation for VAT-excluded item', async () => {
      const saleData = {
        chargeCode: generateUniqueSku('TEST-CC'),
        subtotalAmount: '20.00', // Ex VAT
        vatAmount: '4.00',       // VAT amount
        totalAmount: '24.00',    // Inc VAT
        vatApplied: true,
        customerInfo: { name: 'Test Customer' },
        notes: 'Test sale with VAT excluded item',
        status: 'completed' as const,
        processedBy: testUserId,
      };

      const saleItems = [
        {
          itemId: vatExcludedItemId,
          itemName: 'VAT Excluded Test Item',
          itemSku: generateUniqueSku('VAT-EXC-SALE'),
          unitPrice: 20.00,     // Price excluding VAT
          quantity: 1,
          vatRate: 0.20,        // 20% VAT
          vatAmount: 4.00,      // VAT amount for this line
          subtotal: 20.00,      // Subtotal excluding VAT
          totalWithVat: 24.00,  // Total including VAT
        }
      ];

      const sale = await storage.createSale(saleData, saleItems, 'test-user-id');
      createdSaleIds.push(sale.id);

      expect(sale).toMatchObject({
        subtotalAmount: '20.00',
        vatAmount: '4.00',
        totalAmount: '24.00',
        vatApplied: true,
      });
      expect(sale.chargeCode).toMatch(/^TEST-CC-/);
    });
  });

  describe('Sales with Mixed VAT Configurations', () => {
    let standardVatItemId: number;
    let reducedVatItemId: number;
    let zeroVatItemId: number;

    beforeEach(async () => {
      // Create items with different VAT configurations
      const items: InsertItem[] = [
        {
          name: 'Standard VAT Item',
          sku: generateUniqueSku('STD-VAT-SALE'),
          description: 'Standard rate VAT item',
          categoryId: testCategoryId,
          price: '12.00', // Â£12.00 including 20% VAT
          currentStock: 50,
          minimumStock: 5,
          isActive: true,
          vatRate: '0.2000',
          vatIncluded: true,
          createdBy: testUserId,
        },
        {
          name: 'Reduced VAT Item',
          sku: generateUniqueSku('RED-VAT-SALE'),
          description: 'Reduced rate VAT item',
          categoryId: testCategoryId,
          price: '10.00', // Â£10.00 excluding 5% VAT
          currentStock: 30,
          minimumStock: 3,
          isActive: true,
          vatRate: '0.0500',
          vatIncluded: false,
          createdBy: testUserId,
        },
        {
          name: 'Zero VAT Item',
          sku: generateUniqueSku('ZERO-VAT-SALE'),
          description: 'Zero rate VAT item',
          categoryId: testCategoryId,
          price: '15.00', // Â£15.00 with 0% VAT
          currentStock: 20,
          minimumStock: 2,
          isActive: true,
          vatRate: '0.0000',
          vatIncluded: false,
          createdBy: testUserId,
        },
      ];

      for (let i = 0; i < items.length; i++) {
        const createdItem = await storage.createItem(items[i]);
        createdItemIds.push(createdItem.id);
        
        // Assign IDs in order they were created
        if (i === 0) standardVatItemId = createdItem.id;
        if (i === 1) reducedVatItemId = createdItem.id;
        if (i === 2) zeroVatItemId = createdItem.id;
      }
    });

    it('should create a sale with items having different VAT rates', async () => {
      const saleData = {
        chargeCode: generateUniqueSku('TEST-CC'),
        subtotalAmount: '35.00', // Â£10.00 + Â£10.00 + Â£15.00 ex VAT
        vatAmount: '2.50',       // Â£2.00 + Â£0.50 + Â£0.00 VAT
        totalAmount: '37.50',    // Â£12.00 + Â£10.50 + Â£15.00 inc VAT
        vatApplied: true,
        customerInfo: { name: 'Test Customer' },
        notes: 'Test sale with mixed VAT rates',
        status: 'completed' as const,
        processedBy: testUserId,
      };

      const saleItems = [
        {
          itemId: standardVatItemId,
          itemName: 'Standard VAT Item',
          itemSku: generateUniqueSku('STD-VAT-SALE'),
          unitPrice: 12.00,     // Price including VAT
          quantity: 1,
          vatRate: 0.20,        // 20% VAT
          vatAmount: 2.00,      // VAT amount
          subtotal: 10.00,      // Subtotal excluding VAT
          totalWithVat: 12.00,  // Total including VAT
        },
        {
          itemId: reducedVatItemId,
          itemName: 'Reduced VAT Item',
          itemSku: generateUniqueSku('RED-VAT-SALE'),
          unitPrice: 10.00,     // Price excluding VAT
          quantity: 1,
          vatRate: 0.05,        // 5% VAT
          vatAmount: 0.50,      // VAT amount
          subtotal: 10.00,      // Subtotal excluding VAT
          totalWithVat: 10.50,  // Total including VAT
        },
        {
          itemId: zeroVatItemId,
          itemName: 'Zero VAT Item',
          itemSku: generateUniqueSku('ZERO-VAT-SALE'),
          unitPrice: 15.00,     // Price with 0% VAT
          quantity: 1,
          vatRate: 0.00,        // 0% VAT
          vatAmount: 0.00,      // No VAT
          subtotal: 15.00,      // Subtotal excluding VAT
          totalWithVat: 15.00,  // Total same as subtotal
        }
      ];

      const sale = await storage.createSale(saleData, saleItems, 'test-user-id');
      createdSaleIds.push(sale.id);

      expect(sale).toMatchObject({
        subtotalAmount: '35.00',
        vatAmount: '2.50',
        totalAmount: '37.50',
        vatApplied: true,
      });
      expect(sale.chargeCode).toMatch(/^TEST-CC-/);
    });
  });

  describe('VAT Information Persistence in Sales', () => {
    it('should retrieve sales with VAT information intact', async () => {
      // Create an item
      const itemData: InsertItem = {
        name: 'Retrieval Test Item',
        sku: generateUniqueSku('RETRIEVAL'),
        description: 'Item for testing sales retrieval',
        categoryId: testCategoryId,
        price: '30.00',
        currentStock: 20,
        minimumStock: 2,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: testUserId,
      };

      const item = await storage.createItem(itemData);
      createdItemIds.push(item.id);

      // Create a sale
      const saleData = {
        chargeCode: generateUniqueSku('TEST-CC'),
        subtotalAmount: '25.00',
        vatAmount: '5.00',
        totalAmount: '30.00',
        vatApplied: true,
        customerInfo: { name: 'Retrieval Test Customer' },
        notes: 'Test sale for retrieval verification',
        status: 'completed' as const,
        processedBy: testUserId,
      };

      const saleItems = [
        {
          itemId: item.id,
          itemName: 'Retrieval Test Item',
          itemSku: generateUniqueSku('RETRIEVAL'),
          unitPrice: 30.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 5.00,
          subtotal: 25.00,
          totalWithVat: 30.00,
        }
      ];

      const sale = await storage.createSale(saleData, saleItems, 'test-user-id');
      createdSaleIds.push(sale.id);

      // Retrieve sales and verify VAT information
      const { sales } = await storage.getSales(1, 10);
      const createdSale = sales.find(s => s.saleId === sale.saleId);

      expect(createdSale).toBeDefined();
      expect(createdSale!.subtotalAmount).toBe('25.00');
      expect(createdSale!.vatAmount).toBe('5.00');
      expect(createdSale!.totalAmount).toBe('30.00');
      expect(createdSale!.vatApplied).toBe(true);

      // Check sale items have VAT information
      expect(createdSale!.items).toHaveLength(1);
      const saleItem = createdSale!.items[0];
      expect(saleItem.vatRate).toBe('0.2000');
      expect(saleItem.vatAmount).toBe('5.00');
      expect(saleItem.subtotal).toBe('25.00');
      expect(saleItem.totalWithVat).toBe('30.00');
    });
  });
});
