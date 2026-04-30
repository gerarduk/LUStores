import { MockStorage } from './mockStorage';
import type { IStorage } from '../storage';
import type { Category, Item } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import log from './debug-logger';

// Extend the default timeout for tests
jest.setTimeout(30000); // 30 seconds

describe('Charge Code Exclusions', () => {
  // Define test items interface for better type safety
  interface TestItems {
    stationeryItem: Item;
    itItem: Item;
    furnitureItem: Item;
    stationeryCategory: Category;
    itCategory: Category;
    furnitureCategory: Category;
  }

  // Extend storage interface for testing
  interface TestStorage extends IStorage {
    testCategoryNames?: {
      stationery: string;
      itEquipment: string;
      officeFurniture: string;
    };
  }
  
  let storage: TestStorage;
  let testItems: TestItems;
  
  // Helper function to create a test category
  async function createTestCategory(name: string, description: string, icon: string) {
    const category = {
      id: uuidv4(),
      name: `${name}-${Date.now()}`,
      description,
      icon,
      isActive: true,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    log('Creating test category:', { name, id: category.id });
    await storage.createCategory(category);
    
    if (!category || !category.id) {
      throw new Error(`Failed to create ${name} category`);
    }
    
    return category;
  }
  
  // Helper function to create a test item
  async function createTestItem(name: string, description: string, categoryId: number) {
    const item = {
      name: `${name}-${Date.now()}`,
      description,
      categoryId,
      sku: `SKU-${Date.now()}`,
      price: '9.99',
      vatRate: '0.2',
      vatIncluded: false,
      currentStock: 100,
      minimumStock: 10,
      isActive: true,
      createdBy: 'admin_001'
    };
    
    log('Creating test item:', { name: item.name, categoryId });
    const createdItem = await storage.createItem(item);
    
    if (!createdItem || !createdItem.id) {
      throw new Error(`Failed to create ${name} item`);
    }
    
    log('Created item successfully:', { name: createdItem.name, id: createdItem.id });
    return createdItem;
  }

  beforeAll(async () => {
    log('=== Starting beforeAll ===');
    
    try {
      // Initialize storage once before all tests
      storage = new MockStorage();
      log('Initialized MockStorage');
      
      if (!storage) {
        log('ERROR: Failed to initialize MockStorage');
        throw new Error('Failed to initialize MockStorage');
      }
      
      // Create categories
      log('Creating test categories...');
      const stationeryCategory = await createTestCategory(
        'Stationery',
        'Office supplies and stationery items',
        'fas fa-pen'
      );
      log('Created stationery category:', { 
        id: stationeryCategory.id, 
        name: stationeryCategory.name 
      });
      
      const itCategory = await createTestCategory(
        'IT-Equipment',
        'Computers, peripherals, and IT hardware',
        'fas fa-laptop'
      );
      log('Created IT category:', { 
        id: itCategory.id, 
        name: itCategory.name 
      });
      
      const furnitureCategory = await createTestCategory(
        'Office-Furniture',
        'Desks, chairs, and office furniture',
        'fas fa-chair'
      );
      log('Created furniture category:', { 
        id: furnitureCategory.id, 
        name: furnitureCategory.name 
      });
      
      // Store category names for later reference in tests
      storage.testCategoryNames = {
        stationery: stationeryCategory.name,
        itEquipment: itCategory.name,
        officeFurniture: furnitureCategory.name
      };
      log('Stored test category names:', storage.testCategoryNames);

      // Verify categories were created
      const allCategories = await storage.getCategories();
      log('All categories in storage:', allCategories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description
      })));

      // Create test charge codes
      log('Creating test charge codes...');
      await storage.createChargeCode({
        code: 'ACCT001',
        title: 'Accounting Department',
        authorisedBy: 'admin_001',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
      });
      log('Created charge code: ACCT001');

      await storage.createChargeCode({
        code: 'IT002',
        title: 'IT Department',
        authorisedBy: 'admin_001',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
      });
      log('Created charge code: IT002');

      await storage.createChargeCode({
        code: 'RESTRICTED',
        title: 'Restricted Charge Code',
        authorisedBy: 'admin_001',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
      });
      log('Created charge code: RESTRICTED');
      
      // Verify charge codes were created
      const chargeCodes = await storage.getChargeCodes();
      log('All charge codes in storage:', chargeCodes.map(cc => ({
        code: cc.code,
        title: cc.title
      })));
      
      log('=== Completed beforeAll ===');
    } catch (error) {
      log('ERROR in beforeAll:', error);
      throw error;
    }
  });

  // Helper function to get or create a test item if it doesn't exist
  async function getOrCreateItem(name: string, description: string, categoryId: number) {
    const itemsResponse = await storage.getItems();
    const existingItem = itemsResponse.items?.find(i => i.name.includes(name.split('-')[0]));
    
    if (existingItem) {
      log(`Found existing item: ${existingItem.name} (ID: ${existingItem.id})`);
      return existingItem;
    }
    
    log(`Creating new test item: ${name}`);
    const newItem = await createTestItem(name, description, categoryId);
    log(`Created item: ${newItem.name} (ID: ${newItem.id})`);
    return newItem;
  }

  // Helper function to get test items and their categories
  async function getTestItems(): Promise<TestItems> {
    log('=== Starting getTestItems ===');
    
    try {
      // First, ensure categories exist
      log('Fetching categories...');
      const categories = await storage.getCategories();
      log(`Found ${categories.length} categories:`, categories);
      
      if (!categories || categories.length === 0) {
        log('ERROR: No categories found in test database');
        throw new Error('No categories found in test database');
      }
    
      // Find categories by their prefix
      log('Finding categories by prefix...');
      const stationeryCategory = categories.find(c => c.name?.startsWith('Stationery'));
      const itCategory = categories.find(c => c.name?.startsWith('IT-Equipment'));
      const furnitureCategory = categories.find(c => c.name?.startsWith('Office-Furniture'));
      
      log('Found categories by prefix:', {
        stationery: stationeryCategory ? { id: stationeryCategory.id, name: stationeryCategory.name } : 'Not found',
        it: itCategory ? { id: itCategory.id, name: itCategory.name } : 'Not found',
        furniture: furnitureCategory ? { id: furnitureCategory.id, name: furnitureCategory.name } : 'Not found'
      });
      
      if (!stationeryCategory || !itCategory || !furnitureCategory) {
        log('ERROR: Required test categories not found');
        throw new Error(`Required test categories not found. Found: ${categories.map(c => c.name).join(', ')}`);
      }
      
      // Store category names for later reference in tests
      storage.testCategoryNames = {
        stationery: stationeryCategory.name,
        itEquipment: itCategory.name,
        officeFurniture: furnitureCategory.name
      };
      log('Stored test category names:', storage.testCategoryNames);

      // Get or create test items
      const [stationeryItem, itItem, furnitureItem] = await Promise.all([
        getOrCreateItem('Notebook', 'A4 notebook', stationeryCategory.id),
        getOrCreateItem('Wireless Mouse', 'Bluetooth mouse', itCategory.id),
        getOrCreateItem('Office Chair', 'Ergonomic office chair', furnitureCategory.id)
      ]);
      
      // Verify items were created/retrieved
      if (!stationeryItem || !itItem || !furnitureItem) {
        log('ERROR: Failed to create/retrieve test items:', {
          stationeryItem,
          itItem,
          furnitureItem
        });
        throw new Error('Failed to create/retrieve test items');
      }
      
      // Log the final items being returned
      log('Returning test items:', {
        stationeryItem: { id: stationeryItem.id, name: stationeryItem.name },
        itItem: { id: itItem.id, name: itItem.name },
        furnitureItem: { id: furnitureItem.id, name: furnitureItem.name }
      });
      
      return {
        stationeryCategory,
        itCategory,
        furnitureCategory,
        stationeryItem,
        itItem,
        furnitureItem
      };
    } catch (error) {
      log('ERROR in getTestItems:', error);
      throw error;
    }
  }

  describe('Exclusion Management', () => {
    beforeEach(async () => {
      // Initialize test items before each test
      testItems = await getTestItems();
      
      // Clean up any existing exclusions to ensure test isolation
      try {
        const existingExclusions = await storage.getChargeCodeExclusions('RESTRICTED');
        for (const categoryId of existingExclusions) {
          await storage.deleteChargeCodeExclusion('RESTRICTED', categoryId);
        }
      } catch {
        // Ignore errors if exclusions don't exist
        log('Note: No existing exclusions to clean up');
      }
    });
    
    it('should create charge code exclusions', async () => {
      const { stationeryCategory, itCategory } = testItems;

      // Create exclusions for RESTRICTED charge code
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryCategory.id, 'admin_001');
      await storage.createChargeCodeExclusion('RESTRICTED', itCategory.id, 'admin_001');

      const exclusions = await storage.getChargeCodeExclusions('RESTRICTED');
      expect(exclusions).toHaveLength(2);
      expect(exclusions).toContain(stationeryCategory.id);
      expect(exclusions).toContain(itCategory.id);
    });

    it('should check if charge code is excluded for category', async () => {
      const { stationeryItem, furnitureItem } = testItems;
      
      // Create exclusion for stationery only
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryItem.categoryId, 'admin_001');

      const isStationeryExcluded = await storage.isChargeCodeExcludedForCategory('RESTRICTED', stationeryItem.categoryId);
      const isFurnitureExcluded = await storage.isChargeCodeExcludedForCategory('RESTRICTED', furnitureItem.categoryId);
      
      expect(isStationeryExcluded).toBe(true);
      expect(isFurnitureExcluded).toBe(false);
    });

    it('should delete charge code exclusions', async () => {
      const { stationeryItem } = testItems;
      
      // Create and then delete exclusion
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryItem.categoryId, 'admin_001');
      expect(await storage.isChargeCodeExcludedForCategory('RESTRICTED', stationeryItem.categoryId)).toBe(true);

      await storage.deleteChargeCodeExclusion('RESTRICTED', stationeryItem.categoryId);
      const exclusions = await storage.getChargeCodeExclusions('RESTRICTED');
      expect(exclusions).not.toContain(stationeryItem.categoryId);
    });

    it('should return empty array for charge code with no exclusions', async () => {
      const exclusions = await storage.getChargeCodeExclusions('ACCT001');
      expect(exclusions).toHaveLength(0);
    });

    it('should return empty array for non-existent charge code', async () => {
      const exclusions = await storage.getChargeCodeExclusions('NONEXISTENT');
      expect(exclusions).toHaveLength(0);
    });
  });

  describe('Sales Validation with Exclusions', () => {
    beforeEach(async () => {
      // Get test items and their categories
      testItems = await getTestItems();
      
      // Clean up any existing exclusions to ensure test isolation
      try {
        const existingExclusions = await storage.getChargeCodeExclusions('RESTRICTED');
        for (const categoryId of existingExclusions) {
          await storage.deleteChargeCodeExclusion('RESTRICTED', categoryId);
        }
      } catch {
        // Ignore errors if exclusions don't exist
        log('Note: No existing exclusions to clean up in Sales Validation tests');
      }
    });

    it('should allow sales when no exclusions exist', async () => {
      const { stationeryItem } = testItems;
      
      const exclusions = await storage.getChargeCodeExclusions('ACCT001');
      expect(exclusions).toHaveLength(0);

      const isExcluded = await storage.isChargeCodeExcludedForCategory('ACCT001', stationeryItem.categoryId);
      expect(isExcluded).toBe(false);
    });

    it('should prevent sales of excluded categories', async () => {
      const { stationeryCategory, stationeryItem } = testItems;
      
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryCategory.id, 'admin_001');

      // Check if sale would be blocked
      const isExcluded = await storage.isChargeCodeExcludedForCategory('RESTRICTED', stationeryItem.categoryId);
      expect(isExcluded).toBe(true);
    });

    it('should allow purchases from non-excluded categories', async () => {
      const { stationeryItem, itItem, furnitureItem } = testItems;
      
      // Set up exclusions: RESTRICTED cannot buy stationery or IT
      await storage.createChargeCodeExclusion('RESTRICTED', stationeryItem.categoryId, 'admin_001');
      await storage.createChargeCodeExclusion('RESTRICTED', itItem.categoryId, 'admin_001');

      // Furniture should still be allowed
      const isExcluded = await storage.isChargeCodeExcludedForCategory('RESTRICTED', furnitureItem.categoryId);
      expect(isExcluded).toBe(false);
      
      const exclusions = await storage.getChargeCodeExclusions('RESTRICTED');
      expect(exclusions).toHaveLength(2);
      expect(exclusions).toContain(stationeryItem.categoryId);
      expect(exclusions).toContain(itItem.categoryId);
    });
  });

  describe('Integration with Existing Charge Code Validation', () => {
    it('should work alongside existing charge code validation', async () => {
      const { stationeryItem } = testItems;
      
      // Test that exclusions work with valid charge codes
      const chargeCode = await storage.getChargeCode('ACCT001');
      expect(chargeCode).toBeDefined();
      expect(chargeCode!.code).toBe('ACCT001');
      
      // Create exclusion and verify
      await storage.createChargeCodeExclusion('ACCT001', stationeryItem.categoryId, 'admin_001');
      const isExcluded = await storage.isChargeCodeExcludedForCategory('ACCT001', stationeryItem.categoryId);
      expect(isExcluded).toBe(true);
    });

    it('should handle expired charge codes with exclusions', async () => {
      const { stationeryItem } = testItems;
      
      // Create an expired charge code
      await storage.createChargeCode({
        code: 'EXPIRED001',
        title: 'Expired Charge Code',
        authorisedBy: 'admin_001',
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-12-31'), // Expired
      });
      
      // Add exclusion to expired charge code
      await storage.createChargeCodeExclusion('EXPIRED001', stationeryItem.categoryId, 'admin_001');
      
      const isExcluded = await storage.isChargeCodeExcludedForCategory('EXPIRED001', stationeryItem.categoryId);
      expect(isExcluded).toBe(true);
      
      // The exclusion should still exist even though the charge code is expired
      const exclusions = await storage.getChargeCodeExclusions('EXPIRED001');
      expect(exclusions).toContain(stationeryItem.categoryId);
    });
  });
});
