import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../storage';
import { DatabaseTestHelper } from './helpers/databaseTestHelper';
import type { Category, Item } from '../../shared/schema';

describe('Storage Module', () => {
  let dbHelper: DatabaseTestHelper;

  beforeEach(async () => {
    dbHelper = new DatabaseTestHelper();
    await dbHelper.setup();
  });

  afterEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.close();
  });

  describe('User Operations', () => {
    // Helper function to generate unique user data for each test
    const createTestUser = () => {
      const uniqueId = `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      return {
        id: uniqueId,
        email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 3)}@university.edu`,
        password_hash: 'test-password-hash',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        mustChangePassword: false
      };
    };

    it('should create and retrieve a user', async () => {
      const testUser = createTestUser();
      const user = await storage.upsertUser(testUser);
      
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
      expect(user.firstName).toBe(testUser.firstName);
      expect(user.lastName).toBe(testUser.lastName);
      expect(user.role).toBe(testUser.role);

      const retrievedUser = await storage.getUser(testUser.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.email).toBe(testUser.email);
    });

    it('should retrieve user by email', async () => {
      const testUser = createTestUser();
      await storage.upsertUser(testUser);
      
      const retrievedUser = await storage.getUserByEmail(testUser.email);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(testUser.id);
    });

    it('should get all users', async () => {
      const testUser1 = createTestUser();
      const testUser2 = createTestUser();
      await storage.upsertUser(testUser1);
      await storage.upsertUser(testUser2);

      const allUsers = await storage.getAllUsers();
      expect(allUsers.length).toBeGreaterThanOrEqual(2);
      const emails = allUsers.map(u => u.email);
      expect(emails).toContain(testUser1.email);
      expect(emails).toContain(testUser2.email);
    });

    it('should update user role', async () => {
      const testUser = createTestUser();
      await storage.upsertUser(testUser);
      
      const updatedUser = await storage.updateUserRole(testUser.id, 'admin');
      expect(updatedUser.role).toBe('admin');
    });

    it('should deactivate user', async () => {
      const testUser = createTestUser();
      await storage.upsertUser(testUser);
      
      await storage.deactivateUser(testUser.id);
      
      const deactivatedUser = await storage.getUser(testUser.id);
      expect(deactivatedUser?.isActive).toBe(false);
    });
  });

  describe('Category Operations', () => {
    const getTestCategory = () => {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      return {
        name: `Test-Category-${timestamp}-${randomSuffix}`,
        description: `Test category for testing - ${timestamp}`,
        icon: 'fas fa-test',
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
      };
    };

    it('should create and retrieve categories', async () => {
      const testCategory = getTestCategory();
      const category = await storage.createCategory(testCategory);
      
      expect(category.name).toBe(testCategory.name);
      expect(category.description).toBe(testCategory.description);
      expect(category.icon).toBe(testCategory.icon);
      expect(category.color).toBe(testCategory.color);

      const categories = await storage.getCategories();
      const testCat = categories.find(c => c.name === testCategory.name);
      expect(testCat).toBeDefined();
    });

    it('should get all categories', async () => {
      const testCategory = getTestCategory();
      await storage.createCategory(testCategory);
      
      const categories = await storage.getCategories();
      expect(categories.length).toBeGreaterThanOrEqual(1);
      const testCat = categories.find(c => c.name === testCategory.name);
      expect(testCat).toBeDefined();
    });

    it('should update category', async () => {
      const testCategory = getTestCategory();
      const category = await storage.createCategory(testCategory);
      
      // Generate unique category name for each test run to avoid duplicate key violations
      const uniqueName = `Updated Category ${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const updatedCategory = await storage.updateCategory(category.id, {
        name: uniqueName,
        description: 'Updated description'
      });

      expect(updatedCategory.name).toBe(uniqueName);
      expect(updatedCategory.description).toBe('Updated description');
      expect(updatedCategory.icon).toBe(testCategory.icon); // Should remain unchanged
    });

    it('should delete category', async () => {
      const testCategory = getTestCategory();
      const category = await storage.createCategory(testCategory);
      
      await storage.deleteCategory(category.id);
      
      const categories = await storage.getCategories();
      const deletedCat = categories.find(c => c.id === category.id);
      expect(deletedCat).toBeUndefined();
    });
  });

  describe('Item Operations', () => {
    let testCategory: Category;
    
    beforeEach(async () => {
      testCategory = await storage.createCategory({
        name: `Test Category Items ${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Make name unique
        description: 'A test category',
        icon: 'fas fa-test',
        color: '#123456'
      });
    });

    const createTestItem = (categoryId: number) => ({
      name: 'Test Item',
      description: 'A test item for testing',
      sku: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      categoryId: categoryId,
      price: '15.00',
      vatRate: '0.2000',
      vatIncluded: true,
      currentStock: 100,
      minimumStock: 10,
      isActive: true,
      createdBy: null // Use null to avoid foreign key constraint violation
    });

    it('should create and retrieve items', async () => {
      const itemData = createTestItem(testCategory.id);
      const item = await storage.createItem(itemData);
      
      expect(item.name).toBe(itemData.name);
      expect(item.sku).toBe(itemData.sku);
      expect(item.categoryId).toBe(testCategory.id);
      expect(item.currentStock).toBe(100);

      const retrievedItem = await storage.getItem(item.id);
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem?.name).toBe(itemData.name);
    });

    it('should get items with pagination', async () => {
      const itemData = createTestItem(testCategory.id);
      await storage.createItem(itemData);
      await storage.createItem({ ...itemData, name: 'Another Test Item', sku: 'TEST-002' });

      const result = await storage.getItems(1, 10);
      
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should update item', async () => {
      const itemData = createTestItem(testCategory.id);
      const item = await storage.createItem(itemData);
      
      const updatedItem = await storage.updateItem(item.id, {
        name: 'Updated Test Item',
        price: '20.00'
      }, null);

      expect(updatedItem.name).toBe('Updated Test Item');
      expect(updatedItem.price).toBe('20.00');
    });

    it('should delete item', async () => {
      const itemData = createTestItem(testCategory.id);
      const item = await storage.createItem(itemData);
      
      await storage.deleteItem(item.id);
      
      const deletedItem = await storage.getItem(item.id);
      expect(deletedItem).toBeDefined();
      expect(deletedItem?.isActive).toBe(false); // Soft delete sets isActive to false
    });
  });

  describe('Stock Operations', () => {
    let testItem: Item;
    
    beforeEach(async () => {
      const testCategory = await storage.createCategory({
        name: `Test Category ${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Make name unique
        description: 'A test category',
        icon: 'fas fa-test',
        color: '#123456'
      });

      testItem = await storage.createItem({
        name: 'Test Item',
        description: 'A test item',
        sku: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '15.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        createdBy: null // Use null to avoid foreign key constraint violation
      });
    });

    it('should update stock levels', async () => {
      await storage.updateStock(testItem.id, 50, 'in', 'Received shipment', 'dev_admin_001');
      
      const updatedItem = await storage.getItem(testItem.id);
      expect(updatedItem?.currentStock).toBe(150); // 100 + 50

      await storage.updateStock(testItem.id, 25, 'out', 'Sale', 'dev_admin_001');
      
      const item2 = await storage.getItem(testItem.id);
      expect(item2?.currentStock).toBe(125); // 150 - 25
    });

    it('should record stock movements', async () => {
      await storage.updateStock(testItem.id, 30, 'adjustment', 'Stock count adjustment', 'dev_admin_001');
      
      const movements = await storage.getStockMovements(testItem.id, 10);
      expect(movements.length).toBeGreaterThan(0);
      
      const adjustment = movements.find(m => m.type === 'adjustment');
      expect(adjustment).toBeDefined();
      expect(adjustment?.quantity).toBe(30);
      expect(adjustment?.reason).toBe('Stock count adjustment');
    });
  });

  describe('Supplier Operations', () => {
    const getTestSupplier = () => ({
      id: `test-supplier-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Make ID unique
      name: 'Test Supplier Ltd',
      email: `contact-${Date.now()}@testsupplier.com`, // Make email unique
      phone: '+44-123-456-7890',
      address: '123 Test Street, Test City',
      contact: 'John Test'
    });

    it('should create and retrieve suppliers', async () => {
      const testSupplier = getTestSupplier();
      const supplier = await storage.createSupplier(testSupplier);
      
      expect(supplier.id).toBe(testSupplier.id);
      expect(supplier.name).toBe(testSupplier.name);
      expect(supplier.email).toBe(testSupplier.email);
      
      const retrievedSupplier = await storage.getSupplier(testSupplier.id);
      expect(retrievedSupplier).toBeDefined();
      expect(retrievedSupplier?.name).toBe(testSupplier.name);
    });

    it('should get all suppliers', async () => {
      const testSupplier1 = getTestSupplier();
      const testSupplier2 = getTestSupplier();
      testSupplier2.name = 'Another Test Supplier';
      
      await storage.createSupplier(testSupplier1);
      await storage.createSupplier(testSupplier2);

      const suppliers = await storage.getSuppliers();
      expect(suppliers.length).toBeGreaterThanOrEqual(2);
      const names = suppliers.map(s => s.name);
      expect(names).toContain('Test Supplier Ltd');
      expect(names).toContain('Another Test Supplier');
    });

    it('should update supplier', async () => {
      const testSupplier = getTestSupplier();
      await storage.createSupplier(testSupplier);
      
      const updatedSupplier = await storage.updateSupplier(testSupplier.id, {
        name: 'Updated Test Supplier',
        email: 'updated@testsupplier.com'
      });

      expect(updatedSupplier.name).toBe('Updated Test Supplier');
      expect(updatedSupplier.email).toBe('updated@testsupplier.com');
    });

    it('should delete supplier', async () => {
      const testSupplier = getTestSupplier();
      await storage.createSupplier(testSupplier);
      
      await storage.deleteSupplier(testSupplier.id);
      
      const deletedSupplier = await storage.getSupplier(testSupplier.id);
      expect(deletedSupplier).toBeUndefined();
    });
  });

  describe('Dashboard Operations', () => {
    let dashTestSku: string; // Declare at describe block level
    
    beforeEach(async () => {
      // Create test data for dashboard
      const testCategory = await storage.createCategory({
        name: `Dashboard Test Category ${Date.now()}`, // Make name unique
        description: 'A test category for dashboard',
        icon: 'fas fa-test',
        color: '#123456'
      });

      dashTestSku = `DASH-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
      
      await storage.createItem({
        name: 'Dashboard Test Item',
        description: 'A test item for dashboard',
        sku: dashTestSku,
        categoryId: testCategory.id,
        price: '15.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 5, // Low stock
        minimumStock: 10,
        isActive: true,
        createdBy: null // Use null to avoid foreign key constraint issues
      });

      const lowStockItems = await storage.getLowStockItems();
      
      expect(lowStockItems.length).toBeGreaterThan(0);
      lowStockItems.find(item => item.sku === dashTestSku);

      // Generate unique user ID for each test run to avoid duplicate key violations
      const uniqueUserId = `dashboard-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await storage.upsertUser({
        id: uniqueUserId,
        email: `dashboard-${Date.now()}@test.com`,
        password_hash: 'test-password-hash', // Add required password hash
        firstName: 'Dashboard',
        lastName: 'User',
        role: 'user',
        isActive: true,
        mustChangePassword: false
      });
    });

    it('should get dashboard stats', async () => {
      const stats = await storage.getDashboardStats();

      expect(typeof stats.totalItems).toBe('number');
      expect(typeof stats.lowStockItems).toBe('number');
      expect(typeof stats.totalValue).toBe('number');
      expect(typeof stats.totalValueExVAT).toBe('number');
      expect(typeof stats.totalUnits).toBe('number');
      expect(typeof stats.activeUsers).toBe('number');

      expect(stats.totalItems).toBeGreaterThan(0);
      expect(stats.lowStockItems).toBeGreaterThan(0); // We created a low stock item
      expect(stats.activeUsers).toBeGreaterThan(0);
      expect(stats.totalUnits).toBeGreaterThanOrEqual(0);
    });

    it('should get low stock items', async () => {
      const lowStockItems = await storage.getLowStockItems();
      
      expect(Array.isArray(lowStockItems)).toBe(true);
      expect(lowStockItems.length).toBeGreaterThan(0);
      
      const dashboardItem = lowStockItems.find(item => item.sku === dashTestSku);
      expect(dashboardItem).toBeDefined();
      expect(dashboardItem?.currentStock).toBeLessThan(dashboardItem?.minimumStock || 0);
    });

    it('should get category stats', async () => {
      const categoryStats = await storage.getCategoryStats();
      
      expect(Array.isArray(categoryStats)).toBe(true);
      expect(categoryStats.length).toBeGreaterThan(0);
      
      categoryStats.forEach(stat => {
        expect(stat.category).toBeDefined();
        expect(typeof stat.itemCount).toBe('number');
        expect(typeof stat.totalValue).toBe('number');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent user gracefully', async () => {
      const user = await storage.getUser('non-existent-user');
      expect(user).toBeUndefined();
    });

    it('should handle non-existent item gracefully', async () => {
      const item = await storage.getItem(999999);
      expect(item).toBeUndefined();
    });

    it('should handle non-existent supplier gracefully', async () => {
      const supplier = await storage.getSupplier('non-existent-supplier');
      expect(supplier).toBeUndefined();
    });

    it('should handle database errors in stock operations', async () => {
      // Try to update stock for non-existent item
      await expect(storage.updateStock(999999, 10, 'in', 'Test', 'test-user'))
        .rejects.toThrow();
    });
  });
});
