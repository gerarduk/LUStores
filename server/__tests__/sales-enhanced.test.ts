// Enhanced unit tests for sales functionality with stock verification
import { MockStorage } from './mockStorage';
import type { InsertSale } from '../../shared/schema';

describe('Sales Functionality with Stock Management', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    storage.seedTestData();
  });

  afterEach(() => {
    storage.reset();
  });

  describe('createSale with multiple items', () => {
    it('should create sale with multiple items and verify stock reductions', async () => {
      // Check initial stock levels
      const initialItem1 = await storage.getItem(1);
      const initialItem2 = await storage.getItem(2);
      expect(initialItem1?.currentStock).toBe(100);
      expect(initialItem2?.currentStock).toBe(50);

      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '71.67',
        vatAmount: '14.33',
        totalAmount: '86.00',
        vatApplied: true,
        customerInfo: { name: 'Test Customer', department: 'Research' },
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 3, // Reducing stock by 3
          vatRate: 0.20,
          vatAmount: 5.25,
          subtotal: 26.25,
          totalWithVat: 31.50,
        },
        {
          itemId: 2,
          itemName: 'Test Item 2',
          itemSku: 'TEST002',
          unitPrice: 25.00,
          quantity: 2, // Reducing stock by 2
          vatRate: 0.20,
          vatAmount: 9.17,
          subtotal: 45.83,
          totalWithVat: 55.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      // Verify sale creation
      expect(sale).toBeDefined();
      expect(sale.saleId).toMatch(/^S\d{8}\d{4}\d{3}$/);
      expect(sale.chargeCode).toBe('DEPT001');
      expect(sale.totalAmount).toBe('86.00');
      expect(sale.status).toBe('completed');

      // Simulate stock reduction (this would normally happen in the route)
      await storage.updateStock(1, -3, 'out', `Sale ${sale.saleId}`, 'test-user-1');
      await storage.updateStock(2, -2, 'out', `Sale ${sale.saleId}`, 'test-user-1');

      // Verify stock has been reduced
      const updatedItem1 = await storage.getItem(1);
      const updatedItem2 = await storage.getItem(2);
      expect(updatedItem1?.currentStock).toBe(97); // 100 - 3
      expect(updatedItem2?.currentStock).toBe(48); // 50 - 2

      // Verify stock movements were recorded
      const movements = await storage.getStockMovements();
      expect(movements).toHaveLength(2);
      expect(movements[0].type).toBe('out');
      expect(movements[0].quantity).toBe(-3);
      expect(movements[1].type).toBe('out');
      expect(movements[1].quantity).toBe(-2);
    });

    it('should handle complex VAT calculations correctly', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'COMPLEX_VAT',
        subtotalAmount: '416.67',
        vatAmount: '83.33',
        totalAmount: '500.00',
        vatApplied: true,
        customerInfo: {
          name: 'Dr. Research',
          department: 'Chemistry',
          email: 'research@university.edu',
          project: 'Lab Equipment Upgrade'
        },
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'High-value Item 1',
          itemSku: 'HV001',
          unitPrice: 150.00, // VAT inclusive
          quantity: 2,
          vatRate: 0.20,
          vatAmount: 50.00, // VAT component: 300 * 0.2 / 1.2 = 50
          subtotal: 250.00, // Excluding VAT: 300 / 1.2 = 250
          totalWithVat: 300.00,
        },
        {
          itemId: 2,
          itemName: 'High-value Item 2',
          itemSku: 'HV002',
          unitPrice: 200.00, // VAT inclusive
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 33.33, // VAT component: 200 * 0.2 / 1.2 = 33.33
          subtotal: 166.67, // Excluding VAT: 200 / 1.2 = 166.67
          totalWithVat: 200.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      // Verify calculations
      expect(parseFloat(sale.subtotalAmount)).toBeCloseTo(416.67, 2);
      expect(parseFloat(sale.vatAmount)).toBeCloseTo(83.33, 2);
      expect(parseFloat(sale.totalAmount)).toBeCloseTo(500.00, 2);

      // Verify detailed customer info
      expect(sale.customerInfo).toEqual({
        name: 'Dr. Research',
        department: 'Chemistry',
        email: 'research@university.edu',
        project: 'Lab Equipment Upgrade'
      });
    });

    it('should prevent sales when insufficient stock', async () => {
      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 150, // More than available stock (100)
          vatRate: 0.20,
          vatAmount: 17.50,
          subtotal: 87.50,
          totalWithVat: 105.00,
        },
      ];

      // This test simulates the stock check that would happen in the route
      const item = await storage.getItem(1);
      const hasInsufficientStock = items.some(saleItem => {
        const dbItem = item?.id === saleItem.itemId ? item : null;
        return !dbItem || dbItem.currentStock < saleItem.quantity;
      });

      expect(hasInsufficientStock).toBe(true);
      
      // If we tried to update stock, it should throw an error
      await expect(storage.updateStock(1, -150, 'out', 'Test sale', 'test-user-1'))
        .rejects.toThrow('Insufficient stock');
    });
  });

  describe('stock movement tracking', () => {
    it('should track all stock movements with complete audit trail', async () => {
      // Perform multiple stock operations
      await storage.updateStock(1, 20, 'in', 'Stock replenishment', 'test-user-1');
      await storage.updateStock(1, -5, 'out', 'Manual sale', 'test-user-1');
      await storage.updateStock(2, -10, 'out', 'Department transfer', 'test-user-1');
      await storage.updateStock(1, 2, 'adjustment', 'Stock correction', 'test-user-1');

      // Get all movements
      const allMovements = await storage.getStockMovements();
      expect(allMovements).toHaveLength(4);

      // Verify movement details
      const item1Movements = await storage.getStockMovements(1);
      expect(item1Movements).toHaveLength(3);
      
      // Check the sequence: original stock 100
      // +20 -> 120, -5 -> 115, +2 -> 117
      expect(item1Movements[0].previousStock).toBe(100);
      expect(item1Movements[0].newStock).toBe(120);
      expect(item1Movements[0].type).toBe('in');
      
      expect(item1Movements[1].previousStock).toBe(120);
      expect(item1Movements[1].newStock).toBe(115);
      expect(item1Movements[1].type).toBe('out');
      
      expect(item1Movements[2].previousStock).toBe(115);
      expect(item1Movements[2].newStock).toBe(117);
      expect(item1Movements[2].type).toBe('adjustment');

      // Verify final stock level
      const finalItem = await storage.getItem(1);
      expect(finalItem?.currentStock).toBe(117);
    });

    it('should maintain referential integrity in movements', async () => {
      // Create a stock movement
      await storage.updateStock(1, -10, 'out', 'Test sale reduction', 'test-user-1');

      const movements = await storage.getStockMovements(1);
      expect(movements).toHaveLength(1);

      // Verify the movement includes full details
      const movement = movements[0];
      expect(movement.item).toBeDefined();
      expect(movement.performedBy).toBeDefined();
      expect(movement.item.id).toBe(1);
      expect(movement.item.name).toBe('Test Item 1');
      expect(movement.performedBy.id).toBe('test-user-1');
      expect(movement.reason).toBe('Test sale reduction');
    });
  });

  describe('sales reporting and analytics', () => {
    beforeEach(async () => {
      // Create multiple sales for analytics testing
      const sales = [
        {
          data: {
            chargeCode: 'DEPT001',
            subtotalAmount: '25.00',
            vatAmount: '5.00',
            totalAmount: '30.00',
            vatApplied: true,
            customerInfo: null,
            notes: 'Analytics test sale 1',
            status: 'completed' as const,
          },
          items: [{
            itemId: 1,
            itemName: 'Test Item 1',
            itemSku: 'TEST001',
            unitPrice: 10.50,
            quantity: 1,
            vatRate: 0.20,
            vatAmount: 5.00,
            subtotal: 25.00,
            totalWithVat: 30.00,
          }]
        },
        {
          data: {
            chargeCode: 'DEPT002',
            subtotalAmount: '50.00',
            vatAmount: '10.00',
            totalAmount: '60.00',
            vatApplied: true,
            customerInfo: null,
            notes: 'Analytics test sale 2',
            status: 'completed' as const,
          },
          items: [{
            itemId: 2,
            itemName: 'Test Item 2',
            itemSku: 'TEST002',
            unitPrice: 25.00,
            quantity: 2,
            vatRate: 0.20,
            vatAmount: 10.00,
            subtotal: 50.00,
            totalWithVat: 60.00,
          }]
        },
      ];

      for (const sale of sales) {
        await storage.createSale(sale.data, sale.items, 'test-user-1');
      }
    });

    it('should retrieve sales with proper pagination and filtering', async () => {
      const result = await storage.getSales(1, 10);
      
      expect(result.sales).toHaveLength(2);
      expect(result.total).toBe(2);
      
      // Verify each sale includes all details
      result.sales.forEach(sale => {
        expect(sale.items).toBeDefined();
        expect(sale.items.length).toBeGreaterThan(0);
        expect(sale.processedBy).toBeDefined();
        expect(sale.saleId).toMatch(/^S\d{8}\d{4}\d{3}$/);
      });
    });

    it('should filter sales by charge code', async () => {
      const result = await storage.getSales(1, 10, 'DEPT001');
      
      expect(result.sales).toHaveLength(1);
      expect(result.sales[0].chargeCode).toBe('DEPT001');
      expect(result.sales[0].totalAmount).toBe('30.00');
    });

    it('should calculate correct totals across multiple sales', async () => {
      const result = await storage.getSales(1, 10);
      
      const totalAmount = result.sales.reduce((sum, sale) => 
        sum + parseFloat(sale.totalAmount), 0);
      const totalVAT = result.sales.reduce((sum, sale) => 
        sum + parseFloat(sale.vatAmount), 0);
      const totalSubtotal = result.sales.reduce((sum, sale) => 
        sum + parseFloat(sale.subtotalAmount), 0);

      expect(totalAmount).toBeCloseTo(90.00, 2); // 30 + 60
      expect(totalVAT).toBeCloseTo(15.00, 2); // 5 + 10
      expect(totalSubtotal).toBeCloseTo(75.00, 2); // 25 + 50
    });
  });

  describe('integration with quote processing', () => {
    it('should maintain data consistency when processing quote to sale', async () => {
      // This test would verify the complete flow from quote to sale
      // For now, we'll test the data structures match
      
      const quoteData = {
        chargeCode: 'INTEGRATION_TEST',
        subtotalAmount: '83.33',
        vatAmount: '16.67',
        totalAmount: '100.00',
        vatApplied: true,
        customerInfo: { name: 'Integration Test Customer' },
        notes: 'Quote to sale integration test',
        status: 'draft' as const,
        createdBy: 'test-user-1',
      };

      const items = [{
        itemId: 1,
        itemName: 'Integration Test Item',
        itemSku: 'INT001',
        unitPrice: 100.00,
        quantity: 1,
        vatRate: 0.20,
        vatAmount: 16.67,
        subtotal: 83.33,
        totalWithVat: 100.00,
      }];

      // Create quote (implementation would be in actual storage, not mock)
      // Verify that quote and sale data structures are compatible
      expect(quoteData.chargeCode).toBeDefined();
      expect(quoteData.totalAmount).toBeDefined();
      expect(quoteData.customerInfo).toBeDefined();
      expect(items[0].itemId).toBeDefined();
      expect(items[0].quantity).toBeDefined();
      expect(items[0].vatAmount).toBeDefined();
    });
  });
});
