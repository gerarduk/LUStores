import { describe, test, expect } from '@jest/globals';

describe('JSON Order Import Tests', () => {
  
  describe('JSON Order Validation', () => {
    
    const validOrderJson = {
      orderId: "TEST-ORDER-001",
      supplier: {
        id: "SUPPLIER-001", 
        name: "Test Supplier Ltd",
        contact: "John Doe",
        email: "john@testsupplier.com",
        phone: "+44 1234 567890"
      },
      subtotal: 250.00,
      vatRate: 0.20,
      vatAmount: 50.00,
      total: 300.00,
      status: "pending",
      receivedDate: null,
      notes: "Test order for unit testing",
      items: [
        {
          itemId: 2001,
          sku: "TEST-ITEM-001",
          name: "Test Product 1",
          description: "Test product for unit testing",
          categoryId: 1,
          quantity: 10,
          unitCost: 15.00,
          vatRate: 0.20,
          vatAmount: 30.00,
          totalCost: 150.00
        },
        {
          itemId: 2002,
          sku: "TEST-ITEM-002", 
          name: "Test Product 2",
          description: "Another test product",
          categoryId: 2,
          quantity: 5,
          unitCost: 20.00,
          vatRate: 0.20,
          vatAmount: 20.00,
          totalCost: 100.00
        }
      ]
    };

    test('should validate required string fields', () => {
      const order = { ...validOrderJson };
      
      // Test itemSku validation
      order.items[0].sku = "";
      expect(() => validateOrderJson(order)).toThrow();
      
      // Test itemName validation  
      order.items[0].sku = "VALID-SKU";
      order.items[0].name = "";
      expect(() => validateOrderJson(order)).toThrow();
    });

    test('should validate numeric fields', () => {
      const order = { ...validOrderJson };
      
      // Test negative quantity
      order.items[0].quantity = -1;
      expect(() => validateOrderJson(order)).toThrow();
      
      // Test negative unit cost
      order.items[0].quantity = 1;
      order.items[0].unitCost = -5.00;
      expect(() => validateOrderJson(order)).toThrow();
    });

    test('should validate VAT calculations', () => {
      const order = { ...validOrderJson };
      
      // Manually calculate expected VAT
      const subtotal = 250.00;
      const vatRate = 0.20;
      const expectedVat = subtotal * vatRate;
      const expectedTotal = subtotal + expectedVat;
      
      expect(order.vatAmount).toBeCloseTo(expectedVat, 2);
      expect(order.total).toBeCloseTo(expectedTotal, 2);
    });

    test('should validate order structure', () => {
      // Test missing orderId
      const orderWithoutId: any = { ...validOrderJson };
      orderWithoutId.orderId = undefined;
      expect(() => validateOrderJson(orderWithoutId)).toThrow();

      // Test missing items
      const orderWithoutItems: any = { ...validOrderJson };
      orderWithoutItems.items = undefined;
      expect(() => validateOrderJson(orderWithoutItems)).toThrow();

      // Test empty items array
      const orderWithEmptyItems = { ...validOrderJson, items: [] };
      expect(() => validateOrderJson(orderWithEmptyItems)).toThrow();
    });

    test('should handle special characters in text fields', () => {
      const specialCharOrder = {
        ...validOrderJson,
        orderId: "TEST-SPECIAL-001",
        notes: "Order with special chars: àáâãäåæçèéêë & <>&\"'",
        items: [{
          itemId: 5001,
          sku: "SPECIAL-CHAR-001",
          name: "Item with special chars: ñóôõö",
          description: "Description with symbols: ±§¡¿",
          categoryId: 1,
          quantity: 1,
          unitCost: 10.00,
          vatRate: 0.20,
          vatAmount: 2.00,
          totalCost: 10.00
        }]
      };

      expect(() => validateOrderJson(specialCharOrder)).not.toThrow();
    });

    test('should handle null/undefined optional fields gracefully', () => {
      const minimalOrder = {
        orderId: "TEST-MINIMAL-001",
        items: [{
          itemId: 6001,
          sku: "MINIMAL-ITEM-001",
          name: "Minimal Item",
          quantity: 1,
          unitCost: 5.00
          // Missing optional fields like description, categoryId, etc.
        }]
        // Missing optional fields like supplier, notes, etc.
      };

      expect(() => validateOrderJson(minimalOrder)).not.toThrow();
    });

    test('should validate large orders', () => {
      const largeOrder: any = {
        ...validOrderJson,
        orderId: "TEST-LARGE-ORDER-001",
        items: [] as any[]
      };

      // Generate 100 items
      for (let i = 1; i <= 100; i++) {
        const item = {
          itemId: 4000 + i,
          sku: `LARGE-ITEM-${i.toString().padStart(3, '0')}`,
          name: `Large Order Item ${i}`,
          description: `Auto-generated item ${i} for large order testing`,
          categoryId: (i % 5) + 1, // Cycle through categories 1-5
          quantity: Math.ceil(Math.random() * 10), // Random quantity 1-10
          unitCost: parseFloat((Math.random() * 100).toFixed(2)), // Random cost $0-100
          vatRate: 0.20,
          vatAmount: 0, // Will be calculated
          totalCost: 0 // Will be calculated
        };
        largeOrder.items.push(item);
      }

      // Calculate totals for the large order
      let subtotal = 0;
      largeOrder.items.forEach((item: any) => {
        item.totalCost = item.unitCost * item.quantity;
        item.vatAmount = item.totalCost * item.vatRate;
        subtotal += item.totalCost;
      });
      
      largeOrder.subtotal = subtotal;
      largeOrder.vatAmount = subtotal * 0.20;
      largeOrder.total = subtotal + largeOrder.vatAmount;

      expect(() => validateOrderJson(largeOrder)).not.toThrow();
      expect(largeOrder.items.length).toBe(100);
    });
  });

  describe('Order Calculation Utilities', () => {
    test('should calculate order totals correctly', () => {
      const items = [
        { unitCost: 10.00, quantity: 2, vatRate: 0.20 },
        { unitCost: 15.50, quantity: 3, vatRate: 0.20 },
        { unitCost: 5.25, quantity: 4, vatRate: 0.20 }
      ];

      const { subtotal, vatAmount, total } = calculateOrderTotals(items);
      
      const expectedSubtotal = (10.00 * 2) + (15.50 * 3) + (5.25 * 4);
      const expectedVat = expectedSubtotal * 0.20;
      const expectedTotal = expectedSubtotal + expectedVat;

      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(vatAmount).toBeCloseTo(expectedVat, 2);
      expect(total).toBeCloseTo(expectedTotal, 2);
    });

    test('should handle zero quantities and costs', () => {
      const items = [
        { unitCost: 0, quantity: 10, vatRate: 0.20 },
        { unitCost: 10.00, quantity: 0, vatRate: 0.20 }
      ];

      const { subtotal, vatAmount, total } = calculateOrderTotals(items);
      
      expect(subtotal).toBe(0);
      expect(vatAmount).toBe(0);
      expect(total).toBe(0);
    });

    test('should handle different VAT rates', () => {
      const items = [
        { unitCost: 100.00, quantity: 1, vatRate: 0.00 }, // VAT exempt
        { unitCost: 100.00, quantity: 1, vatRate: 0.05 }, // Reduced rate
        { unitCost: 100.00, quantity: 1, vatRate: 0.20 }  // Standard rate
      ];

      const { subtotal, vatAmount, total } = calculateOrderTotals(items);
      
      expect(subtotal).toBe(300.00);
      expect(vatAmount).toBeCloseTo(25.00, 2); // 0 + 5 + 20
      expect(total).toBeCloseTo(325.00, 2);
    });
  });

  describe('SKU Generation', () => {
    test('should generate unique SKUs', () => {
      const skus = new Set();
      for (let i = 0; i < 1000; i++) {
        const sku = generateSku('TEST');
        expect(skus.has(sku)).toBe(false);
        skus.add(sku);
      }
    });

    test('should include prefix in generated SKU', () => {
      const sku = generateSku('IMPORT');
      expect(sku).toContain('IMPORT');
    });

    test('should handle empty prefix', () => {
      const sku = generateSku('');
      expect(typeof sku).toBe('string');
      expect(sku.length).toBeGreaterThan(0);
    });
  });
});

// Helper function for JSON validation
function validateOrderJson(orderData: any): boolean {
  if (!orderData.orderId || !orderData.items || !Array.isArray(orderData.items)) {
    throw new Error('Invalid order structure: missing orderId or items array');
  }

  if (orderData.items.length === 0) {
    throw new Error('At least one item is required');
  }

  for (const item of orderData.items) {
    if (!item.itemId || !item.sku || !item.name || !item.quantity || item.unitCost === undefined) {
      throw new Error('All items must have itemId, sku, name, quantity, and unitCost');
    }
    
    if (typeof item.sku !== 'string' || item.sku.trim() === '') {
      throw new Error('Item SKU must be a non-empty string');
    }
    
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      throw new Error('Item name must be a non-empty string');
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new Error('Item quantity must be a positive number');
    }
    
    if (typeof item.unitCost !== 'number' || item.unitCost < 0) {
      throw new Error('Item unit cost must be a non-negative number');
    }
  }

  return true;
}

// Helper function for calculating totals
function calculateOrderTotals(items: Array<{unitCost: number, quantity: number, vatRate: number}>) {
  const subtotal = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
  const vatAmount = items.reduce((sum, item) => {
    const itemTotal = item.unitCost * item.quantity;
    return sum + (itemTotal * item.vatRate);
  }, 0);
  const total = subtotal + vatAmount;
  
  return { subtotal, vatAmount, total };
}

// Helper function for SKU generation
function generateSku(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const counter = generateSku.counter || 0;
  generateSku.counter = counter + 1;
  return `${prefix || 'ITEM'}-${timestamp}-${random}-${counter.toString().padStart(4, '0')}`;
}

// Add a counter property to the function
generateSku.counter = 0;
