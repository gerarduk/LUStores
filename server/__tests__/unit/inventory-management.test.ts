/**
 * Inventory Management Unit Tests
 * 
 * Tests the core inventory management functionality including:
 * 1. Item creation and management
 * 2. Stock level tracking and validation  
 * 3. Low stock threshold monitoring
 * 4. Stock movement audit trails
 * 5. Decimal quantity support
 * 6. Category organization
 * 7. SKU uniqueness validation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock data structures
 */
interface MockItem {
  id: number;
  name: string;
  sku: string;
  description?: string;
  categoryId: number;
  price: number;
  vatRate: number;
  vatIncluded: boolean;
  currentStock: number;
  minimumStock: number;
  unit: string;
  location?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
  color: string;
}

interface MockStockMovement {
  id: number;
  itemId: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number; // Positive for 'in', negative for 'out' and 'adjustment'
  previousStock: number;
  newStock: number;
  reason?: string;
  performedBy: string;
  createdAt: Date;
}

interface MockUser {
  id: string;
  email: string;
  role: 'user' | 'manager' | 'admin';
}

/**
 * Mock inventory service
 */
class MockInventoryService {
  private items: Map<number, MockItem> = new Map();
  private categories: Map<number, MockCategory> = new Map();
  private stockMovements: Map<number, MockStockMovement> = new Map();
  private users: Map<string, MockUser> = new Map();
  
  private itemCounter = 0;
  private categoryCounter = 0;
  private movementCounter = 0;

  // Helper methods for setup
  setupCategory(category: Partial<MockCategory>): MockCategory {
    const fullCategory: MockCategory = {
      id: category.id || ++this.categoryCounter,
      name: category.name || `Category ${this.categoryCounter}`,
      description: category.description,
      icon: category.icon || 'fas fa-box',
      color: category.color || '#007bff',
    };
    this.categories.set(fullCategory.id, fullCategory);
    return fullCategory;
  }

  setupUser(user: MockUser): void {
    this.users.set(user.id, user);
  }

  /**
   * Create a new item
   */
  async createItem(itemData: Partial<MockItem>): Promise<{ success: boolean; item?: MockItem; error?: string }> {
    try {
      // Validate required fields
      if (!itemData.name || !itemData.sku || !itemData.categoryId || itemData.price === undefined) {
        return { 
          success: false, 
          error: 'Name, SKU, category, and price are required' 
        };
      }

      // Check SKU uniqueness
      const existingSku = Array.from(this.items.values()).find(item => 
        item.sku.toLowerCase() === itemData.sku!.toLowerCase()
      );
      if (existingSku) {
        return { 
          success: false, 
          error: 'SKU already exists' 
        };
      }

      // Check category exists
      if (!this.categories.has(itemData.categoryId)) {
        return { 
          success: false, 
          error: 'Category not found' 
        };
      }

      const now = new Date();
      const item: MockItem = {
        id: ++this.itemCounter,
        name: itemData.name,
        sku: itemData.sku,
        description: itemData.description,
        categoryId: itemData.categoryId,
        price: itemData.price,
        vatRate: itemData.vatRate || 0.20,
        vatIncluded: itemData.vatIncluded ?? true,
        currentStock: itemData.currentStock || 0,
        minimumStock: itemData.minimumStock || 0,
        unit: itemData.unit || 'pieces',
        location: itemData.location,
        isActive: itemData.isActive ?? true,
        createdBy: itemData.createdBy || 'system',
        createdAt: now,
        updatedAt: now,
      };

      this.items.set(item.id, item);
      return { success: true, item };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update an existing item
   */
  async updateItem(
    itemId: number, 
    updateData: Partial<MockItem>,
    updatedBy: string
  ): Promise<{ success: boolean; item?: MockItem; error?: string }> {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Check for SKU conflicts (excluding current item)
    if (updateData.sku) {
      const existingSku = Array.from(this.items.values()).find(existingItem => 
        existingItem.id !== itemId && 
        existingItem.sku.toLowerCase() === updateData.sku!.toLowerCase()
      );
      if (existingSku) {
        return { success: false, error: 'SKU already exists' };
      }
    }

    // Check category exists if updating
    if (updateData.categoryId && !this.categories.has(updateData.categoryId)) {
      return { success: false, error: 'Category not found' };
    }

    // Update item
    const updatedItem: MockItem = {
      ...item,
      ...updateData,
      updatedBy,
      updatedAt: new Date(),
    };

    this.items.set(itemId, updatedItem);
    return { success: true, item: updatedItem };
  }

  /**
   * Update stock levels with movement tracking
   */
  async updateStock(
    itemId: number,
    quantity: number,
    type: 'in' | 'out' | 'adjustment',
    reason?: string,
    performedBy?: string
  ): Promise<{ success: boolean; newStock?: number; error?: string }> {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const previousStock = item.currentStock;
    
    // Calculate new stock based on movement type
    let newStock: number;
    let movementQuantity: number; // What to record in movement (positive/negative)

    switch (type) {
      case 'in':
        newStock = previousStock + quantity;
        movementQuantity = quantity; // Positive for stock in
        break;
      case 'out':
        newStock = previousStock - quantity;
        movementQuantity = -quantity; // Negative for stock out
        break;
      case 'adjustment':
        // For adjustments, quantity represents the final stock level
        newStock = quantity;
        movementQuantity = quantity - previousStock; // Could be positive or negative
        break;
      default:
        return { success: false, error: 'Invalid movement type' };
    }

    // Prevent negative stock
    if (newStock < 0) {
      return { 
        success: false, 
        error: `Insufficient stock. Available: ${previousStock}, Required: ${quantity}` 
      };
    }

    // Update item stock
    const updatedItem: MockItem = {
      ...item,
      currentStock: newStock,
      updatedAt: new Date(),
    };
    this.items.set(itemId, updatedItem);

    // Create stock movement record
    const movement: MockStockMovement = {
      id: ++this.movementCounter,
      itemId,
      type,
      quantity: movementQuantity,
      previousStock,
      newStock,
      reason,
      performedBy: performedBy || 'system',
      createdAt: new Date(),
    };
    this.stockMovements.set(movement.id, movement);

    return { success: true, newStock };
  }

  /**
   * Get low stock items
   */
  getLowStockItems(): MockItem[] {
    return Array.from(this.items.values()).filter(item => 
      item.isActive && 
      item.currentStock <= item.minimumStock
    );
  }

  /**
   * Get out of stock items
   */
  getOutOfStockItems(): MockItem[] {
    return Array.from(this.items.values()).filter(item => 
      item.isActive && item.currentStock === 0
    );
  }

  /**
   * Get stock movements for an item
   */
  getStockMovements(itemId?: number): MockStockMovement[] {
    const movements = Array.from(this.stockMovements.values());
    if (itemId) {
      return movements.filter(movement => movement.itemId === itemId);
    }
    return movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Validate stock availability for sale
   */
  validateStockAvailability(itemId: number, requestedQuantity: number): {
    available: boolean;
    currentStock: number;
    shortfall?: number;
  } {
    const item = this.items.get(itemId);
    if (!item) {
      return { available: false, currentStock: 0 };
    }

    const available = item.currentStock >= requestedQuantity;
    const shortfall = available ? undefined : requestedQuantity - item.currentStock;

    return {
      available,
      currentStock: item.currentStock,
      shortfall,
    };
  }

  /**
   * Get item by ID
   */
  getItem(itemId: number): MockItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Get all items with filtering
   */
  getItems(filters: {
    includeInactive?: boolean;
    categoryId?: number;
    lowStockOnly?: boolean;
    search?: string;
  } = {}): MockItem[] {
    let items = Array.from(this.items.values());

    if (!filters.includeInactive) {
      items = items.filter(item => item.isActive);
    }

    if (filters.categoryId) {
      items = items.filter(item => item.categoryId === filters.categoryId);
    }

    if (filters.lowStockOnly) {
      items = items.filter(item => item.currentStock <= item.minimumStock);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }

    return items;
  }

  /**
   * Calculate total inventory value
   */
  getTotalInventoryValue(): number {
    return Array.from(this.items.values())
      .filter(item => item.isActive)
      .reduce((total, item) => total + (item.price * item.currentStock), 0);
  }

  /**
   * Get category statistics
   */
  getCategoryStats(): Array<{
    category: MockCategory;
    itemCount: number;
    totalValue: number;
    lowStockCount: number;
  }> {
    const stats: Map<number, any> = new Map();

    // Initialize with all categories
    this.categories.forEach(category => {
      stats.set(category.id, {
        category,
        itemCount: 0,
        totalValue: 0,
        lowStockCount: 0,
      });
    });

    // Calculate stats from items
    Array.from(this.items.values())
      .filter(item => item.isActive)
      .forEach(item => {
        const stat = stats.get(item.categoryId);
        if (stat) {
          stat.itemCount++;
          stat.totalValue += item.price * item.currentStock;
          if (item.currentStock <= item.minimumStock) {
            stat.lowStockCount++;
          }
        }
      });

    return Array.from(stats.values());
  }

  reset(): void {
    this.items.clear();
    this.categories.clear();
    this.stockMovements.clear();
    this.users.clear();
    this.itemCounter = 0;
    this.categoryCounter = 0;
    this.movementCounter = 0;
  }
}

describe('Inventory Management Unit Tests', () => {
  let service: MockInventoryService;
  let testCategory: MockCategory;
  let testUser: MockUser;

  beforeEach(() => {
    service = new MockInventoryService();
    
    testCategory = service.setupCategory({
      name: 'Test Category',
      description: 'Category for testing',
      icon: 'fas fa-test',
      color: '#007bff',
    });

    testUser = {
      id: 'user123',
      email: 'test@example.com',
      role: 'manager',
    };
    service.setupUser(testUser);
  });

  afterEach(() => {
    service.reset();
  });

  describe('Item Creation and Management', () => {

    it('should create a valid item with all required fields', async () => {
      const itemData = {
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item description',
        categoryId: testCategory.id,
        price: 25.99,
        vatRate: 0.20,
        vatIncluded: true,
        currentStock: 100,
        minimumStock: 10,
        unit: 'pieces',
        location: 'Shelf A1',
        createdBy: testUser.id,
      };

      const result = await service.createItem(itemData);

      expect(result.success).toBe(true);
      expect(result.item).toBeTruthy();
      expect(result.item!.name).toBe(itemData.name);
      expect(result.item!.sku).toBe(itemData.sku);
      expect(result.item!.price).toBe(itemData.price);
      expect(result.item!.currentStock).toBe(itemData.currentStock);
      expect(result.item!.minimumStock).toBe(itemData.minimumStock);
      expect(result.item!.isActive).toBe(true);
    });

    it('should reject item creation without required fields', async () => {
      const invalidItemData = {
        name: 'Test Item',
        // Missing SKU, categoryId, and price
      };

      const result = await service.createItem(invalidItemData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should enforce SKU uniqueness', async () => {
      const itemData1 = {
        name: 'First Item',
        sku: 'DUPLICATE-SKU',
        categoryId: testCategory.id,
        price: 10.00,
        createdBy: testUser.id,
      };

      const itemData2 = {
        name: 'Second Item',
        sku: 'duplicate-sku', // Different case but same SKU
        categoryId: testCategory.id,
        price: 20.00,
        createdBy: testUser.id,
      };

      const result1 = await service.createItem(itemData1);
      const result2 = await service.createItem(itemData2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('SKU already exists');
    });

    it('should use default values for optional fields', async () => {
      const minimalItemData = {
        name: 'Minimal Item',
        sku: 'MIN-001',
        categoryId: testCategory.id,
        price: 15.50,
        createdBy: testUser.id,
      };

      const result = await service.createItem(minimalItemData);

      expect(result.success).toBe(true);
      expect(result.item!.vatRate).toBe(0.20); // Default VAT rate
      expect(result.item!.vatIncluded).toBe(true);
      expect(result.item!.currentStock).toBe(0);
      expect(result.item!.minimumStock).toBe(0);
      expect(result.item!.unit).toBe('pieces');
      expect(result.item!.isActive).toBe(true);
    });

    it('should update item details properly', async () => {
      // Create initial item
      const createResult = await service.createItem({
        name: 'Original Name',
        sku: 'UPD-001',
        categoryId: testCategory.id,
        price: 30.00,
        createdBy: testUser.id,
      });

      expect(createResult.success).toBe(true);
      const itemId = createResult.item!.id;

      // Update the item
      const updateResult = await service.updateItem(
        itemId,
        {
          name: 'Updated Name',
          price: 35.00,
          minimumStock: 5,
          location: 'Shelf B2',
        },
        testUser.id
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.item!.name).toBe('Updated Name');
      expect(updateResult.item!.price).toBe(35.00);
      expect(updateResult.item!.minimumStock).toBe(5);
      expect(updateResult.item!.location).toBe('Shelf B2');
      expect(updateResult.item!.sku).toBe('UPD-001'); // Should remain unchanged
    });

    it('should prevent SKU conflicts during updates', async () => {
      // Create two items
      const result1 = await service.createItem({
        name: 'Item 1',
        sku: 'ITEM-001',
        categoryId: testCategory.id,
        price: 10.00,
        createdBy: testUser.id,
      });

      const result2 = await service.createItem({
        name: 'Item 2',
        sku: 'ITEM-002',
        categoryId: testCategory.id,
        price: 20.00,
        createdBy: testUser.id,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Try to update second item to use first item's SKU
      const updateResult = await service.updateItem(
        result2.item!.id,
        { sku: 'ITEM-001' },
        testUser.id
      );

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('SKU already exists');
    });
  });

  describe('Stock Level Management', () => {

    let testItem: MockItem;

    beforeEach(async () => {
      const createResult = await service.createItem({
        name: 'Stock Test Item',
        sku: 'STOCK-001',
        categoryId: testCategory.id,
        price: 50.00,
        currentStock: 100,
        minimumStock: 10,
        createdBy: testUser.id,
      });

      testItem = createResult.item!;
    });

    it('should increase stock with "in" movement', async () => {
      const result = await service.updateStock(
        testItem.id,
        50,
        'in',
        'Received shipment',
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(150);

      const updatedItem = service.getItem(testItem.id);
      expect(updatedItem!.currentStock).toBe(150);
    });

    it('should decrease stock with "out" movement', async () => {
      const result = await service.updateStock(
        testItem.id,
        30,
        'out',
        'Sale transaction',
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(70);

      const updatedItem = service.getItem(testItem.id);
      expect(updatedItem!.currentStock).toBe(70);
    });

    it('should set exact stock with "adjustment" movement', async () => {
      const result = await service.updateStock(
        testItem.id,
        75, // Set stock to exactly 75
        'adjustment',
        'Physical count adjustment',
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(75);

      const updatedItem = service.getItem(testItem.id);
      expect(updatedItem!.currentStock).toBe(75);
    });

    it('should prevent negative stock levels', async () => {
      const result = await service.updateStock(
        testItem.id,
        150, // Try to remove more than available (100)
        'out',
        'Over-sale attempt',
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
      expect(result.error).toContain('Available: 100');
      expect(result.error).toContain('Required: 150');

      // Stock should remain unchanged
      const unchangedItem = service.getItem(testItem.id);
      expect(unchangedItem!.currentStock).toBe(100);
    });

    it('should handle fractional stock quantities', async () => {
      const result = await service.updateStock(
        testItem.id,
        25.75, // Fractional quantity
        'in',
        'Partial unit received',
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(125.75);

      const updatedItem = service.getItem(testItem.id);
      expect(updatedItem!.currentStock).toBe(125.75);
    });

    it('should create proper stock movement records', async () => {
      // Perform multiple stock operations
      await service.updateStock(testItem.id, 25, 'in', 'Shipment received', testUser.id);
      await service.updateStock(testItem.id, 15, 'out', 'Sale #001', testUser.id);
      await service.updateStock(testItem.id, 105, 'adjustment', 'Physical count', testUser.id);

      const movements = service.getStockMovements(testItem.id);

      expect(movements).toHaveLength(3);

      // Check first movement (stock in)
      expect(movements[2].type).toBe('in');
      expect(movements[2].quantity).toBe(25); // Positive for stock in
      expect(movements[2].previousStock).toBe(100);
      expect(movements[2].newStock).toBe(125);
      expect(movements[2].reason).toBe('Shipment received');

      // Check second movement (stock out)
      expect(movements[1].type).toBe('out');
      expect(movements[1].quantity).toBe(-15); // Negative for stock out
      expect(movements[1].previousStock).toBe(125);
      expect(movements[1].newStock).toBe(110);

      // Check third movement (adjustment)
      expect(movements[0].type).toBe('adjustment');
      expect(movements[0].quantity).toBe(-5); // 105 - 110 = -5
      expect(movements[0].previousStock).toBe(110);
      expect(movements[0].newStock).toBe(105);
    });
  });

  describe('Low Stock and Alerts', () => {

    it('should identify low stock items correctly', async () => {
      // Create items with different stock levels
      const items = await Promise.all([
        service.createItem({
          name: 'Low Stock Item 1',
          sku: 'LOW-001',
          categoryId: testCategory.id,
          price: 10.00,
          currentStock: 5,
          minimumStock: 10, // Below minimum
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'In Stock Item',
          sku: 'GOOD-001',
          categoryId: testCategory.id,
          price: 10.00,
          currentStock: 50,
          minimumStock: 10, // Above minimum
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Low Stock Item 2',
          sku: 'LOW-002',
          categoryId: testCategory.id,
          price: 10.00,
          currentStock: 10,
          minimumStock: 10, // Equal to minimum (should be flagged)
          createdBy: testUser.id,
        }),
      ]);

      const lowStockItems = service.getLowStockItems();

      expect(lowStockItems).toHaveLength(2);
      expect(lowStockItems.map(item => item.sku)).toContain('LOW-001');
      expect(lowStockItems.map(item => item.sku)).toContain('LOW-002');
      expect(lowStockItems.map(item => item.sku)).not.toContain('GOOD-001');
    });

    it('should identify out of stock items', async () => {
      await Promise.all([
        service.createItem({
          name: 'Out of Stock Item',
          sku: 'OUT-001',
          categoryId: testCategory.id,
          price: 10.00,
          currentStock: 0, // Out of stock
          minimumStock: 5,
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Low Stock Item',
          sku: 'LOW-001',
          categoryId: testCategory.id,
          price: 10.00,
          currentStock: 3, // Low but not zero
          minimumStock: 5,
          createdBy: testUser.id,
        }),
      ]);

      const outOfStockItems = service.getOutOfStockItems();

      expect(outOfStockItems).toHaveLength(1);
      expect(outOfStockItems[0].sku).toBe('OUT-001');
      expect(outOfStockItems[0].currentStock).toBe(0);
    });

    it('should exclude inactive items from low stock alerts', async () => {
      await service.createItem({
        name: 'Inactive Low Stock Item',
        sku: 'INACTIVE-001',
        categoryId: testCategory.id,
        price: 10.00,
        currentStock: 2,
        minimumStock: 10,
        isActive: false, // Inactive
        createdBy: testUser.id,
      });

      const lowStockItems = service.getLowStockItems();
      
      expect(lowStockItems).toHaveLength(0);
    });
  });

  describe('Stock Availability Validation', () => {

    let stockItem: MockItem;

    beforeEach(async () => {
      const createResult = await service.createItem({
        name: 'Stock Validation Item',
        sku: 'VAL-001',
        categoryId: testCategory.id,
        price: 25.00,
        currentStock: 50,
        minimumStock: 10,
        createdBy: testUser.id,
      });
      stockItem = createResult.item!;
    });

    it('should validate sufficient stock availability', () => {
      const result = service.validateStockAvailability(stockItem.id, 30);

      expect(result.available).toBe(true);
      expect(result.currentStock).toBe(50);
      expect(result.shortfall).toBeUndefined();
    });

    it('should detect insufficient stock', () => {
      const result = service.validateStockAvailability(stockItem.id, 75);

      expect(result.available).toBe(false);
      expect(result.currentStock).toBe(50);
      expect(result.shortfall).toBe(25); // 75 - 50
    });

    it('should handle exact stock quantity requests', () => {
      const result = service.validateStockAvailability(stockItem.id, 50);

      expect(result.available).toBe(true);
      expect(result.currentStock).toBe(50);
      expect(result.shortfall).toBeUndefined();
    });

    it('should handle non-existent items', () => {
      const result = service.validateStockAvailability(99999, 10);

      expect(result.available).toBe(false);
      expect(result.currentStock).toBe(0);
    });

    it('should validate fractional quantities', () => {
      const result = service.validateStockAvailability(stockItem.id, 49.5);

      expect(result.available).toBe(true);
      expect(result.currentStock).toBe(50);
    });
  });

  describe('Inventory Search and Filtering', () => {

    beforeEach(async () => {
      // Create test items in different categories
      const category2 = service.setupCategory({
        name: 'Electronics',
        description: 'Electronic items',
      });

      await Promise.all([
        service.createItem({
          name: 'Office Chair',
          sku: 'FURN-001',
          description: 'Ergonomic office chair',
          categoryId: testCategory.id,
          price: 299.99,
          currentStock: 15,
          minimumStock: 5,
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Standing Desk',
          sku: 'FURN-002', 
          description: 'Height adjustable standing desk',
          categoryId: testCategory.id,
          price: 599.99,
          currentStock: 3, // Low stock
          minimumStock: 5,
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Laptop Computer',
          sku: 'ELEC-001',
          description: 'Business laptop',
          categoryId: category2.id,
          price: 999.99,
          currentStock: 8,
          minimumStock: 3,
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Monitor Screen',
          sku: 'ELEC-002',
          description: '24 inch monitor',
          categoryId: category2.id,
          price: 199.99,
          currentStock: 0, // Out of stock
          minimumStock: 2,
          isActive: false, // Inactive
          createdBy: testUser.id,
        }),
      ]);
    });

    it('should return all active items by default', () => {
      const items = service.getItems();

      expect(items).toHaveLength(3); // Should exclude inactive item
      expect(items.every(item => item.isActive)).toBe(true);
    });

    it('should include inactive items when requested', () => {
      const items = service.getItems({ includeInactive: true });

      expect(items).toHaveLength(4); // Should include inactive item
    });

    it('should filter by category', () => {
      const items = service.getItems({ categoryId: testCategory.id });

      expect(items).toHaveLength(2);
      expect(items.every(item => item.categoryId === testCategory.id)).toBe(true);
      expect(items.map(item => item.name)).toContain('Office Chair');
      expect(items.map(item => item.name)).toContain('Standing Desk');
    });

    it('should filter for low stock only', () => {
      const items = service.getItems({ lowStockOnly: true });

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Standing Desk');
      expect(items[0].currentStock).toBe(3);
      expect(items[0].minimumStock).toBe(5);
    });

    it('should search by name, SKU, or description', () => {
      // Search by name
      const chairResults = service.getItems({ search: 'chair' });
      expect(chairResults).toHaveLength(1);
      expect(chairResults[0].name).toBe('Office Chair');

      // Search by SKU
      const skuResults = service.getItems({ search: 'FURN-002' });
      expect(skuResults).toHaveLength(1);
      expect(skuResults[0].name).toBe('Standing Desk');

      // Search by description
      const descResults = service.getItems({ search: 'laptop' });
      expect(descResults).toHaveLength(1);
      expect(descResults[0].name).toBe('Laptop Computer');

      // Case insensitive search
      const caseResults = service.getItems({ search: 'CHAIR' });
      expect(caseResults).toHaveLength(1);
    });

    it('should combine multiple filters', () => {
      // Search for items in test category that are low stock
      const items = service.getItems({ 
        categoryId: testCategory.id,
        lowStockOnly: true,
        search: 'desk'
      });

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Standing Desk');
    });
  });

  describe('Inventory Analytics and Reporting', () => {

    beforeEach(async () => {
      // Create items for analytics testing
      const electronicsCategory = service.setupCategory({
        name: 'Electronics',
        description: 'Electronic equipment',
      });

      await Promise.all([
        service.createItem({
          name: 'Item 1',
          sku: 'ANA-001',
          categoryId: testCategory.id,
          price: 100.00,
          currentStock: 10, // Value: $1000
          minimumStock: 5,
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Item 2',
          sku: 'ANA-002',
          categoryId: testCategory.id,
          price: 50.00,
          currentStock: 4, // Value: $200, Low stock
          minimumStock: 5,
          createdBy: testUser.id,
        }),
        service.createItem({
          name: 'Item 3',
          sku: 'ANA-003',
          categoryId: electronicsCategory.id,
          price: 200.00,
          currentStock: 5, // Value: $1000
          minimumStock: 2,
          createdBy: testUser.id,
        }),
      ]);
    });

    it('should calculate total inventory value', () => {
      const totalValue = service.getTotalInventoryValue();

      // (100 * 10) + (50 * 4) + (200 * 5) = 1000 + 200 + 1000 = 2200
      expect(totalValue).toBe(2200);
    });

    it('should generate category statistics', () => {
      const stats = service.getCategoryStats();

      expect(stats).toHaveLength(2); // Two categories

      const testCategoryStat = stats.find(stat => stat.category.name === 'Test Category');
      const electronicsStat = stats.find(stat => stat.category.name === 'Electronics');

      // Test category: 2 items, $1200 value, 1 low stock
      expect(testCategoryStat!.itemCount).toBe(2);
      expect(testCategoryStat!.totalValue).toBe(1200); // (100*10) + (50*4)
      expect(testCategoryStat!.lowStockCount).toBe(1); // Item 2

      // Electronics category: 1 item, $1000 value, 0 low stock
      expect(electronicsStat!.itemCount).toBe(1);
      expect(electronicsStat!.totalValue).toBe(1000); // (200*5)
      expect(electronicsStat!.lowStockCount).toBe(0);
    });

    it('should handle empty categories in statistics', () => {
      const emptyCategory = service.setupCategory({
        name: 'Empty Category',
        description: 'No items here',
      });

      const stats = service.getCategoryStats();
      const emptyStat = stats.find(stat => stat.category.name === 'Empty Category');

      expect(emptyStat!.itemCount).toBe(0);
      expect(emptyStat!.totalValue).toBe(0);
      expect(emptyStat!.lowStockCount).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {

    it('should handle non-existent item updates', async () => {
      const result = await service.updateItem(99999, { name: 'New Name' }, testUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle non-existent item stock updates', async () => {
      const result = await service.updateStock(99999, 10, 'in');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle zero and negative quantities appropriately', async () => {
      const createResult = await service.createItem({
        name: 'Zero Test Item',
        sku: 'ZERO-001',
        categoryId: testCategory.id,
        price: 10.00,
        currentStock: 5,
        createdBy: testUser.id,
      });

      const item = createResult.item!;

      // Zero quantity stock out (should succeed but not change stock)
      const zeroResult = await service.updateStock(item.id, 0, 'out');
      expect(zeroResult.success).toBe(true);
      expect(zeroResult.newStock).toBe(5);

      // Negative quantity (depends on business rules - typically invalid)
      // This implementation treats negative as direction, not absolute value
    });

    it('should handle very large stock quantities', async () => {
      const createResult = await service.createItem({
        name: 'Large Stock Item',
        sku: 'LARGE-001',
        categoryId: testCategory.id,
        price: 0.01,
        currentStock: 0,
        createdBy: testUser.id,
      });

      const item = createResult.item!;

      const largeStockResult = await service.updateStock(
        item.id,
        999999.99,
        'in',
        'Large inventory adjustment'
      );

      expect(largeStockResult.success).toBe(true);
      expect(largeStockResult.newStock).toBe(999999.99);
    });

    it('should handle invalid movement types gracefully', async () => {
      const createResult = await service.createItem({
        name: 'Movement Test Item',
        sku: 'MOVE-001',
        categoryId: testCategory.id,
        price: 10.00,
        currentStock: 10,
        createdBy: testUser.id,
      });

      const result = await service.updateStock(
        createResult.item!.id,
        5,
        'invalid' as any, // Invalid movement type
        'Invalid test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid movement type');
    });
  });
});