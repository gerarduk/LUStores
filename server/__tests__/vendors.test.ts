import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockStorage } from './mockStorage';

describe('Vendor System', () => {
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    
    // Set up basic test data
    await storage.createCategory({
      name: 'Electronics',
      description: 'Electronic devices',
      icon: 'fas fa-laptop',
      color: 'blue'
    });
  });

  describe('Supplier Management', () => {
    it('should create a new supplier', async () => {
      const supplier = await storage.createSupplier({
        id: 'SUPP001',
        name: 'Test Supplier',
        contact: 'John Doe',
        email: 'contact@testsupplier.com',
        phone: '555-0123',
        address: '123 Business St'
      });

      expect(supplier).toMatchObject({
        id: 'SUPP001',
        name: 'Test Supplier',
        contact: 'John Doe',
        email: 'contact@testsupplier.com'
      });
    });

    it('should retrieve all suppliers', async () => {
      // Create multiple suppliers
      await storage.createSupplier({
        id: 'SUPP001',
        name: 'Supplier One'
      });
      
      await storage.createSupplier({
        id: 'SUPP002', 
        name: 'Supplier Two'
      });

      const suppliers = await storage.getSuppliers();
      expect(suppliers).toHaveLength(2);
      expect(suppliers.map(s => s.id)).toContain('SUPP001');
      expect(suppliers.map(s => s.id)).toContain('SUPP002');
    });

    it('should update supplier information', async () => {
      await storage.createSupplier({
        id: 'SUPP001',
        name: 'Original Name'
      });

      const updated = await storage.updateSupplier('SUPP001', {
        name: 'Updated Name',
        email: 'new@email.com'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe('new@email.com');
    });

    it('should delete a supplier', async () => {
      await storage.createSupplier({
        id: 'SUPP001',
        name: 'To Be Deleted'
      });

      await storage.deleteSupplier('SUPP001');
      
      const suppliers = await storage.getSuppliers();
      expect(suppliers.find(s => s.id === 'SUPP001')).toBeUndefined();
    });

    it('should validate required fields when creating a supplier', async () => {
      // Test missing ID
      await expect(storage.createSupplier({
        id: '',
        name: 'Test Supplier'
      })).rejects.toThrow();

      // Test missing name
      await expect(storage.createSupplier({
        id: 'SUPP001',
        name: ''
      })).rejects.toThrow();
    });

    it('should validate email format when provided', async () => {
      // Test invalid email format
      await expect(storage.createSupplier({
        id: 'SUPP001',
        name: 'Test Supplier',
        email: 'invalid-email'
      })).rejects.toThrow();

      // Test valid email should work
      const supplier = await storage.createSupplier({
        id: 'SUPP001',
        name: 'Test Supplier',
        email: 'valid@email.com'
      });
      expect(supplier.email).toBe('valid@email.com');
    });

    it('should prevent duplicate supplier IDs', async () => {
      await storage.createSupplier({
        id: 'SUPP001',
        name: 'First Supplier'
      });

      // Attempting to create another supplier with same ID should fail
      await expect(storage.createSupplier({
        id: 'SUPP001',
        name: 'Second Supplier'
      })).rejects.toThrow();
    });

    it('should handle optional fields correctly', async () => {
      const supplier = await storage.createSupplier({
        id: 'SUPP001',
        name: 'Minimal Supplier'
        // No optional fields provided
      });

      expect(supplier).toMatchObject({
        id: 'SUPP001',
        name: 'Minimal Supplier'
      });
      expect(supplier.contact).toBeUndefined();
      expect(supplier.email).toBeUndefined();
      expect(supplier.phone).toBeUndefined();
      expect(supplier.address).toBeUndefined();
    });

    it('should create supplier with all fields populated', async () => {
      const supplierData = {
        id: 'TECH-CORP-001',
        name: 'TechCorp Solutions',
        contact: 'John Smith',
        email: 'orders@techcorp.co.uk',
        phone: '+44 20 7946 0958',
        address: '123 Tech Street, London, UK'
      };

      const supplier = await storage.createSupplier(supplierData);

      expect(supplier).toMatchObject(supplierData);
      expect(supplier.createdAt).toBeDefined();
      expect(supplier.updatedAt).toBeDefined();
    });
  });

  describe('Item-Supplier Relationships (Sources)', () => {
    beforeEach(async () => {
      // Create test supplier and item
      await storage.createSupplier({
        id: 'SUPP001',
        name: 'Test Supplier'
      });

      await storage.createItem({
        name: 'Test Item',
        sku: 'ITEM001',
        description: 'Test item description',
        categoryId: 1,
        price: '10.99',
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: 'admin'
      });
    });

    it('should create a source relationship between supplier and item', async () => {
      const source = await storage.createSource({
        supplierId: 'SUPP001',
        itemId: 1,
        price: '9.99',
        notesId: undefined // No note attached initially
      });

      expect(source).toMatchObject({
        supplierId: 'SUPP001',
        itemId: 1,
        price: '9.99',
        notesId: undefined // No note attached initially
      });
    });

    it('should get supplier details with supplied items', async () => {
      // Create source relationship
      await storage.createSource({
        supplierId: 'SUPP001',
        itemId: 1,
        price: '9.99'
      });

      const supplierDetail = await storage.getSupplierWithItems('SUPP001');
      
      expect(supplierDetail).toBeDefined();
      expect(supplierDetail!.items).toHaveLength(1);
      expect(supplierDetail!.items[0]).toMatchObject({
        id: 1,
        unitCost: '9.99'
      });
    });

    it('should remove item from supplier', async () => {
      const source = await storage.createSource({
        supplierId: 'SUPP001',
        itemId: 1,
        price: '9.99'
      });

      await storage.deleteSource(source.id);

      const supplierDetail = await storage.getSupplierWithItems('SUPP001');
      expect(supplierDetail!.items).toHaveLength(0);
    });
  });

  describe('Orders and Vendor Relationships', () => {
    beforeEach(async () => {
      // Create test data
      await storage.createSupplier({
        id: 'SUPP001',
        name: 'Hardware Supplier'
      });

      await storage.createItem({
        name: 'Laptop',
        sku: 'LAP001',
        description: 'Business laptop',
        categoryId: 1,
        price: '999.99',
        currentStock: 5,
        minimumStock: 2,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: 'admin'
      });

      await storage.createItem({
        name: 'Mouse',
        sku: 'MOU001', 
        description: 'Wireless mouse',
        categoryId: 1,
        price: '29.99',
        currentStock: 20,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: 'admin'
      });
    });

    it('should create an order with multiple items from a supplier', async () => {
      const order = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Laptop',
            itemSku: 'LAP001',
            itemDescription: 'Business laptop',
            categoryId: 1,
            unitCost: '950.00',
            quantity: 2,
            totalCost: '1900.00'
          },
          {
            itemId: 2,
            itemName: 'Mouse',
            itemSku: 'MOU001',
            itemDescription: 'Wireless mouse', 
            categoryId: 1,
            unitCost: '25.00',
            quantity: 5,
            totalCost: '125.00'
          }
        ]
      );

      expect(order).toMatchObject({
        supplierId: 'SUPP001',
        status: 'pending',
        totalAmount: '2025.00'
      });
      expect(order.orderId).toMatch(/^O\d+$/);
    });

    it('should mark order as received and update item relationships', async () => {
      // Create order
      const order = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Laptop',
            itemSku: 'LAP001',
            itemDescription: 'Business laptop',
            categoryId: 1,
            unitCost: '950.00',
            quantity: 2,
            totalCost: '1900.00'
          }
        ]
      );

      // Mark as received
      const receivedOrder = await storage.receiveOrder(
        order.id,
        'admin',
        [{ orderItemId: 1, receivedQuantity: 2 }]
      );

      expect(receivedOrder.status).toBe('received');
      expect(receivedOrder.receivedBy).toBe('admin');
      expect(receivedOrder.receivedAt).toBeDefined();
    });

    it('should show that a vendor stocks an item after receiving an order', async () => {
      // Create and receive order
      const order = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Laptop',
            itemSku: 'LAP001',
            itemDescription: 'Business laptop',
            categoryId: 1,
            unitCost: '950.00',
            quantity: 3,
            totalCost: '2850.00'
          }
        ]
      );

      // Receive the order
      await storage.receiveOrder(
        order.id,
        'admin',
        [{ orderItemId: 1, receivedQuantity: 3 }]
      );

      // Check if supplier now shows as stocking this item
      const supplierDetail = await storage.getSupplierWithItems('SUPP001');
      
      // After receiving an order, the system should create a source relationship
      // or the getSupplierWithItems should include items from received orders
      expect(supplierDetail).toBeDefined();
      
      // The supplier should now be associated with the laptop item
      const hasLaptop = supplierDetail!.items.some(item => 
        item.id === 1 && item.sku === 'LAP001'
      );
      
      expect(hasLaptop).toBe(true);
    });

    it('should track order history with a supplier', async () => {
      // Create multiple orders
      const order1 = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Laptop',
            itemSku: 'LAP001',
            itemDescription: 'Business laptop',
            categoryId: 1,
            unitCost: '950.00',
            quantity: 1,
            totalCost: '950.00'
          }
        ]
      );

      const order2 = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 2,
            itemName: 'Mouse',
            itemSku: 'MOU001',
            itemDescription: 'Wireless mouse',
            categoryId: 1,
            unitCost: '25.00',
            quantity: 10,
            totalCost: '250.00'
          }
        ]
      );

      // Get orders for this supplier
      const result = await storage.getOrders(1, 20, undefined, 'SUPP001');
      
      expect(result.orders).toHaveLength(2);
      expect(result.orders.map(o => o.id)).toContain(order1.id);
      expect(result.orders.map(o => o.id)).toContain(order2.id);
    });

    it('should calculate total spending with a supplier', async () => {
      // Create and receive multiple orders
      const order1 = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Laptop',
            itemSku: 'LAP001',
            itemDescription: 'Business laptop',
            categoryId: 1,
            unitCost: '1000.00',
            quantity: 2,
            totalCost: '2000.00'
          }
        ]
      );

      const order2 = await storage.createOrder(
        {
          supplierId: 'SUPP001',
          notesId: undefined, // No note attached initially
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 2,
            itemName: 'Mouse',
            itemSku: 'MOU001',
            itemDescription: 'Wireless mouse',
            categoryId: 1,
            unitCost: '30.00',
            quantity: 5,
            totalCost: '150.00'
          }
        ]
      );

      // Receive both orders
      await storage.receiveOrder(order1.id, 'admin', [{ orderItemId: 1, receivedQuantity: 2 }]);
      await storage.receiveOrder(order2.id, 'admin', [{ orderItemId: 2, receivedQuantity: 5 }]);

      // Get all orders for supplier
      const result = await storage.getOrders(1, 20, 'received', 'SUPP001');
      
      const totalSpent = result.orders.reduce((sum, order) => 
        sum + parseFloat(order.totalAmount || '0'), 0
      );

      expect(totalSpent).toBe(2150.00);
    });
  });

  describe('Vendor Performance Analytics', () => {
    beforeEach(async () => {
      // Create test suppliers
      await storage.createSupplier({
        id: 'FAST_SUPP',
        name: 'Fast Supplier'
      });

      await storage.createSupplier({
        id: 'SLOW_SUPP',
        name: 'Slow Supplier'
      });

      // Create test items
      await storage.createItem({
        name: 'Item A',
        sku: 'ITEM_A',
        description: 'Test item A',
        categoryId: 1,
        price: '100.00',
        currentStock: 10,
        minimumStock: 5,
        isActive: true,
        vatRate: '0.2000',
        vatIncluded: true,
        createdBy: 'admin'
      });
    });

    it('should track supplier reliability (order fulfillment rate)', async () => {
      // Create orders for both suppliers
      const fastOrder = await storage.createOrder(
        {
          supplierId: 'FAST_SUPP',
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Item A',
            itemSku: 'ITEM_A',
            unitCost: '95.00',
            quantity: 5,
            totalCost: '475.00'
          }
        ]
      );

      const slowOrder = await storage.createOrder(
        {
          supplierId: 'SLOW_SUPP',
          status: 'pending',
          createdBy: 'admin'
        },
        [
          {
            itemId: 1,
            itemName: 'Item A',
            itemSku: 'ITEM_A',
            unitCost: '90.00',
            quantity: 5,
            totalCost: '450.00'
          }
        ]
      );

      // Fast supplier receives order fully
      await storage.receiveOrder(fastOrder.id, 'admin', [
        { orderItemId: 1, receivedQuantity: 5 }
      ]);

      // Slow supplier only partially fulfills
      await storage.receiveOrder(slowOrder.id, 'admin', [
        { orderItemId: 2, receivedQuantity: 3 }
      ]);

      // Check fulfillment rates
      const fastSupplierOrders = await storage.getOrders(1, 20, undefined, 'FAST_SUPP');
      const slowSupplierOrders = await storage.getOrders(1, 20, undefined, 'SLOW_SUPP');

      expect(fastSupplierOrders.orders[0].status).toBe('received');
      expect(slowSupplierOrders.orders[0].status).toBe('received');

      // In a real implementation, you'd calculate fulfillment percentages
      // based on ordered vs received quantities
    });
  });
});
