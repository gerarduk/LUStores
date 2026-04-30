import { MockStorage } from './mockStorage';
import type { IStorage } from '../storage';

// Define interface for excluded items
interface ExcludedItem {
  itemId: number;
  itemName: string;
  categoryName: string;
  reason: string;
}

// Mock the actual sales logic that would be tested in the routes
async function validateSaleWithExclusions(
  storage: IStorage,
  chargeCode: string,
  items: Array<{ itemId: number; itemName: string; quantity: number }>
): Promise<{ isValid: boolean; error?: { message: string; code: string; excludedItems?: ExcludedItem[] } }> {
  // Validate charge code exists and is not expired
  const chargeCodeRecord = await storage.getChargeCode(chargeCode.trim());
  if (!chargeCodeRecord) {
    return {
      isValid: false,
      error: {
        message: "Invalid charge code: Code does not exist",
        code: "INVALID_CHARGE_CODE"
      }
    };
  }

  // Check if charge code is expired
  if (chargeCodeRecord.validUntil && new Date(chargeCodeRecord.validUntil) < new Date()) {
    return {
      isValid: false,
      error: {
        message: `Charge code '${chargeCode}' has expired on ${new Date(chargeCodeRecord.validUntil).toLocaleDateString()}`,
        code: "EXPIRED_CHARGE_CODE"
      }
    };
  }

  // Check if charge code is valid from date
  if (chargeCodeRecord.validFrom && new Date(chargeCodeRecord.validFrom) > new Date()) {
    return {
      isValid: false,
      error: {
        message: `Charge code '${chargeCode}' is not yet valid until ${new Date(chargeCodeRecord.validFrom).toLocaleDateString()}`,
        code: "PREMATURE_CHARGE_CODE"
      }
    };
  }

  // Check for charge code exclusions
  const excludedCategoryIds = await storage.getChargeCodeExclusions(chargeCode.trim());
  if (excludedCategoryIds.length > 0) {
    // Check if any items belong to excluded categories
    const itemsToCheck = await Promise.all(
      items.map(async (item) => {
        const dbItem = await storage.getItem(item.itemId);
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          categoryId: dbItem?.categoryId,
        };
      })
    );

    const excludedItems = itemsToCheck.filter(item => 
      item.categoryId && excludedCategoryIds.includes(item.categoryId)
    );

    if (excludedItems.length > 0) {
      // Get category names for better error message
      const categories = await storage.getCategories();
      const categoryNames: ExcludedItem[] = excludedItems.map(item => {
        const category = categories.find(c => c.id === item.categoryId);
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          categoryName: category?.name || 'Unknown Category',
          reason: 'Category excluded by charge code'
        };
      });

      return {
        isValid: false,
        error: {
          message: `Charge code '${chargeCode}' cannot be used for items in the following categories: ${categoryNames.map(c => `${c.itemName} (${c.categoryName})`).join(', ')}`,
          code: "CHARGE_CODE_EXCLUSION",
          excludedItems: categoryNames
        }
      };
    }
  }

  return { isValid: true };
}

describe('Sales API with Charge Code Exclusions', () => {
  let storage: IStorage;
  let testCategoryNames: { stationery: string; itEquipment: string; officeFurniture: string };

  beforeEach(async () => {
    storage = new MockStorage();
    
    // Set up test data with unique category names
    const timestamp = Date.now();
    testCategoryNames = {
      stationery: `Stationery-${timestamp}-1`,
      itEquipment: `IT Equipment-${timestamp}-2`,
      officeFurniture: `Office Furniture-${timestamp}-3`
    };

    // Store category names in storage for reference in tests
    (storage as MockStorage).testCategoryNames = testCategoryNames;

    // Create categories
    await storage.createCategory({
      name: testCategoryNames.stationery,
      description: 'Office supplies and stationery items',
      icon: 'fas fa-pen',
      color: 'blue'
    });

    await storage.createCategory({
      name: testCategoryNames.itEquipment, 
      description: 'Computers, peripherals, and IT hardware',
      icon: 'fas fa-laptop',
      color: 'purple'
    });

    await storage.createCategory({
      name: testCategoryNames.officeFurniture,
      description: 'Desks, chairs, and office furniture',
      icon: 'fas fa-chair',
      color: 'brown'
    });

    // Create test charge codes
    await storage.createChargeCode({
      code: 'ACCT001',
      title: 'Accounting Department',
      authorisedBy: 'admin_001',
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31'),
    });

    await storage.createChargeCode({
      code: 'RESTRICTED',
      title: 'Restricted Charge Code',
      authorisedBy: 'admin_001',
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31'),
    });

    await storage.createChargeCode({
      code: 'EXPIRED001',
      title: 'Expired Charge Code',
      authorisedBy: 'admin_001',
      validFrom: new Date('2023-01-01'),
      validUntil: new Date('2023-12-31'), // Expired
    });

    // Create test items in different categories
    const categories = await storage.getCategories();
    const stationeryCategory = categories.find(c => c.name === testCategoryNames.stationery);
    const itCategory = categories.find(c => c.name === testCategoryNames.itEquipment);
    const furnitureCategory = categories.find(c => c.name === testCategoryNames.officeFurniture);

    if (stationeryCategory) {
      await storage.createItem({
        name: 'Ballpoint Pen',
        sku: 'PEN001',
        description: 'Standard black ballpoint pen',
        categoryId: stationeryCategory.id,
        price: '1.50',
        currentStock: 100,
        minimumStock: 10,
        createdBy: 'admin_001'
      });
    }

    if (itCategory) {
      await storage.createItem({
        name: 'Laptop Computer',
        sku: 'LAPTOP001',
        description: 'Business laptop computer',
        categoryId: itCategory.id,
        price: '1200.00',
        currentStock: 5,
        minimumStock: 2,
        createdBy: 'admin_001'
      });
    }

    if (furnitureCategory) {
      await storage.createItem({
        name: 'Office Chair',
        sku: 'CHAIR001',
        description: 'Ergonomic office chair',
        categoryId: furnitureCategory.id,
        price: '350.00',
        currentStock: 8,
        minimumStock: 2,
        createdBy: 'admin_001'
      });
    }
  });

  describe('Sales Validation Integration', () => {
    it('should allow sales with valid charge code and no exclusions', async () => {
      const items = await storage.getItems();
      const penItem = items.items.find(i => i.name === 'Ballpoint Pen');
      expect(penItem).toBeDefined();

      const saleItems = [{
        itemId: penItem.id,
        itemName: penItem.name,
        quantity: 2
      }];

      const result = await validateSaleWithExclusions(storage, 'ACCT001', saleItems);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject sales with invalid charge code', async () => {
      const items = await storage.getItems();
      const penItem = items.items.find(i => i.name === 'Ballpoint Pen');
      expect(penItem).toBeDefined();

      const saleItems = [{
        itemId: penItem.id,
        itemName: penItem.name,
        quantity: 2
      }];

      const result = await validateSaleWithExclusions(storage, 'NONEXISTENT', saleItems);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('INVALID_CHARGE_CODE');
    });

    it('should reject sales with expired charge code', async () => {
      const items = await storage.getItems();
      const penItem = items.items.find(i => i.name === 'Ballpoint Pen');
      expect(penItem).toBeDefined();

      const saleItems = [{
        itemId: penItem.id,
        itemName: penItem.name,
        quantity: 2
      }];

      const result = await validateSaleWithExclusions(storage, 'EXPIRED001', saleItems);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('EXPIRED_CHARGE_CODE');
    });

    it('should reject sales when charge code is excluded for item category', async () => {
      const categories = await storage.getCategories();
      const items = await storage.getItems();
      const stationeryCategory = categories.find(c => c.name === testCategoryNames.stationery);
      const penItem = items.items.find(i => i.name === 'Ballpoint Pen');
      
      expect(stationeryCategory).toBeDefined();
      expect(penItem).toBeDefined();

      // Set up exclusion: RESTRICTED cannot buy stationery
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryCategory.id, 'admin_001');

      const saleItems = [{
        itemId: penItem.id,
        itemName: penItem.name,
        quantity: 2
      }];

      const result = await validateSaleWithExclusions(storage, 'RESTRICTED', saleItems);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('CHARGE_CODE_EXCLUSION');
      expect(result.error?.message).toContain('Ballpoint Pen');
      expect(result.error?.excludedItems).toHaveLength(1);
      expect(result.error?.excludedItems?.[0].itemName).toBe('Ballpoint Pen');
      expect(result.error?.excludedItems?.[0].categoryName).toBe(testCategoryNames.stationery);
    });

    it('should allow sales for non-excluded categories', async () => {
      const categories = await storage.getCategories();
      const items = await storage.getItems();
      const stationeryCategory = categories.find(c => c.name === testCategoryNames.stationery);
      const chairItem = items.items.find(i => i.name === 'Office Chair');
      
      expect(stationeryCategory).toBeDefined();
      expect(chairItem).toBeDefined();

      // Set up exclusion: RESTRICTED cannot buy stationery
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryCategory.id, 'admin_001');

      const saleItems = [{
        itemId: chairItem.id,
        itemName: chairItem.name,
        quantity: 1
      }];

      const result = await validateSaleWithExclusions(storage, 'RESTRICTED', saleItems);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle mixed cart with some excluded items', async () => {
      const categories = await storage.getCategories();
      const items = await storage.getItems();
      const stationeryCategory = categories.find(c => c.name === testCategoryNames.stationery);
      const itCategory = categories.find(c => c.name === testCategoryNames.itEquipment);
      
      const penItem = items.items.find(i => i.name === 'Ballpoint Pen');
      const laptopItem = items.items.find(i => i.name === 'Laptop Computer');
      const chairItem = items.items.find(i => i.name === 'Office Chair');
      
      expect(stationeryCategory).toBeDefined();
      expect(itCategory).toBeDefined();
      expect(penItem).toBeDefined();
      expect(laptopItem).toBeDefined();
      expect(chairItem).toBeDefined();

      // Set up exclusions: RESTRICTED cannot buy stationery or IT
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryCategory.id, 'admin_001');
      await storage.createChargeCodeExclusion('RESTRICTED', itCategory.id, 'admin_001');

      const saleItems = [
        {
          itemId: penItem.id,
          itemName: penItem.name,
          quantity: 2
        },
        {
          itemId: laptopItem.id,
          itemName: laptopItem.name,
          quantity: 1
        },
        {
          itemId: chairItem.id,
          itemName: chairItem.name,
          quantity: 1
        }
      ];

      const result = await validateSaleWithExclusions(storage, 'RESTRICTED', saleItems);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('CHARGE_CODE_EXCLUSION');
      expect(result.error?.excludedItems).toHaveLength(2);
      
      const excludedItemNames = result.error?.excludedItems?.map(item => item.itemName);
      expect(excludedItemNames).toContain('Ballpoint Pen');
      expect(excludedItemNames).toContain('Laptop Computer');
    });

    it('should work with multiple exclusions on the same charge code', async () => {
      const categories = await storage.getCategories();
      const stationeryCategory = categories.find(c => c.name?.startsWith('Stationery'))!;
      const itCategory = categories.find(c => c.name?.startsWith('IT-Equipment') || c.name?.startsWith('IT Equipment'))!;

      // Set up multiple exclusions
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryCategory.id, 'admin_001');
      await storage.createChargeCodeExclusion('RESTRICTED', itCategory.id, 'admin_001');

      const exclusions = await storage.getChargeCodeExclusions('RESTRICTED');
      expect(exclusions).toHaveLength(2);
      expect(exclusions).toContain(stationeryCategory.id);
      expect(exclusions).toContain(itCategory.id);
    });
  });
});
