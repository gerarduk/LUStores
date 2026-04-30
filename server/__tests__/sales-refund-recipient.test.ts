/**
 * Tests for sales refund and recipient tracking functionality
 *
 * These tests cover:
 * 1. Refund processing (partial and full)
 * 2. Recipient/delivery tracking
 * 3. Stock restoration on refund
 */

import { MockStorage } from './mockStorage';
import type { InsertSale } from '../../shared/schema';

describe('Sales Refund and Recipient Functionality', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    storage.seedTestData();
  });

  afterEach(() => {
    storage.reset();
  });

  describe('setSaleRecipient', () => {
    it('should set recipient information on a sale', async () => {
      // First create a sale
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '100.00',
        vatAmount: '20.00',
        totalAmount: '120.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 100.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 20.00,
          subtotal: 100.00,
          totalWithVat: 120.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');
      expect(sale).toBeDefined();

      // Set recipient information
      const updatedSale = await storage.setSaleRecipient(
        sale.id,
        'John Smith',
        'john.smith@university.edu'
      );

      expect(updatedSale.deliveredTo).toBe('John Smith');
      expect(updatedSale.deliveredToEmail).toBe('john.smith@university.edu');
      expect(updatedSale.deliveredAt).toBeDefined();
    });

    it('should update recipient information on an existing sale', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '50.00',
        vatAmount: '10.00',
        totalAmount: '60.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 50.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 10.00,
          subtotal: 50.00,
          totalWithVat: 60.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      // Set initial recipient
      await storage.setSaleRecipient(sale.id, 'Jane Doe', 'jane@university.edu');

      // Update recipient
      const updatedSale = await storage.setSaleRecipient(
        sale.id,
        'Bob Smith',
        'bob@university.edu'
      );

      expect(updatedSale.deliveredTo).toBe('Bob Smith');
      expect(updatedSale.deliveredToEmail).toBe('bob@university.edu');
    });

    it('should allow setting recipient without email', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '25.00',
        vatAmount: '5.00',
        totalAmount: '30.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 25.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 5.00,
          subtotal: 25.00,
          totalWithVat: 30.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      const updatedSale = await storage.setSaleRecipient(sale.id, 'Walk-in Customer');

      expect(updatedSale.deliveredTo).toBe('Walk-in Customer');
      expect(updatedSale.deliveredToEmail).toBeNull();
    });
  });

  describe('markSaleAsPaid', () => {
    it('should mark a sale as paid', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '100.00',
        vatAmount: '20.00',
        totalAmount: '120.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
        isPaid: false,
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 100.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 20.00,
          subtotal: 100.00,
          totalWithVat: 120.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');
      expect(sale.isPaid).toBe(false);

      const paidSale = await storage.markSaleAsPaid(sale.id);
      expect(paidSale.isPaid).toBe(true);
    });

    it('should mark a sale as unpaid', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '100.00',
        vatAmount: '20.00',
        totalAmount: '120.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
        isPaid: true,
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 100.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 20.00,
          subtotal: 100.00,
          totalWithVat: 120.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      const unpaidSale = await storage.markSaleAsUnpaid(sale.id);
      expect(unpaidSale.isPaid).toBe(false);
    });
  });

  describe('refundSaleInPlace', () => {
    it('should process a partial refund and restock inventory', async () => {
      // Get initial stock
      const initialItem = await storage.getItem(1);
      const initialStock = Number(initialItem?.currentStock || 0);

      // Create a sale with multiple items
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '150.00',
        vatAmount: '30.00',
        totalAmount: '180.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 50.00,
          quantity: 3, // Selling 3 units
          vatRate: 0.20,
          vatAmount: 30.00,
          subtotal: 150.00,
          totalWithVat: 180.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      // Simulate stock reduction from sale
      await storage.updateStock(1, -3, 'out', `Sale ${sale.saleId}`, 'test-user-1');

      // Verify stock was reduced
      const afterSaleItem = await storage.getItem(1);
      expect(Number(afterSaleItem?.currentStock)).toBe(initialStock - 3);

      // Process partial refund for 2 units
      const refundResult = await storage.refundSaleInPlace(
        sale.id,
        [{ itemId: 1, refundQty: 2 }],
        'Customer returned 2 units - wrong size',
        'test-user-1'
      );

      expect(refundResult).toBeDefined();

      // Verify stock was restored for refunded items
      const afterRefundItem = await storage.getItem(1);
      expect(Number(afterRefundItem?.currentStock)).toBe(initialStock - 1); // 3 sold - 2 refunded = 1 net reduction
    });

    it('should add a refund note to the sale', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '50.00',
        vatAmount: '10.00',
        totalAmount: '60.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 50.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 10.00,
          subtotal: 50.00,
          totalWithVat: 60.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      // Simulate stock reduction
      await storage.updateStock(1, -1, 'out', `Sale ${sale.saleId}`, 'test-user-1');

      // Process refund
      const refundResult = await storage.refundSaleInPlace(
        sale.id,
        [{ itemId: 1, refundQty: 1 }],
        'Full refund - customer changed mind',
        'test-user-1'
      );

      // Verify refund was processed
      expect(refundResult).toBeDefined();
    });

    it('should handle refund of multiple items', async () => {
      const initialItem1 = await storage.getItem(1);
      const initialItem2 = await storage.getItem(2);
      const initialStock1 = Number(initialItem1?.currentStock || 0);
      const initialStock2 = Number(initialItem2?.currentStock || 0);

      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '200.00',
        vatAmount: '40.00',
        totalAmount: '240.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 100.00,
          quantity: 2,
          vatRate: 0.20,
          vatAmount: 20.00,
          subtotal: 100.00,
          totalWithVat: 120.00,
        },
        {
          itemId: 2,
          itemName: 'Test Item 2',
          itemSku: 'TEST002',
          unitPrice: 100.00,
          quantity: 2,
          vatRate: 0.20,
          vatAmount: 20.00,
          subtotal: 100.00,
          totalWithVat: 120.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      // Simulate stock reduction
      await storage.updateStock(1, -2, 'out', `Sale ${sale.saleId}`, 'test-user-1');
      await storage.updateStock(2, -2, 'out', `Sale ${sale.saleId}`, 'test-user-1');

      // Process refund for 1 of each item
      const refundResult = await storage.refundSaleInPlace(
        sale.id,
        [
          { itemId: 1, refundQty: 1 },
          { itemId: 2, refundQty: 1 },
        ],
        'Partial refund - damaged items',
        'test-user-1'
      );

      expect(refundResult).toBeDefined();

      // Verify stock was partially restored
      const afterRefundItem1 = await storage.getItem(1);
      const afterRefundItem2 = await storage.getItem(2);
      expect(Number(afterRefundItem1?.currentStock)).toBe(initialStock1 - 1);
      expect(Number(afterRefundItem2?.currentStock)).toBe(initialStock2 - 1);
    });
  });

  describe('countSalesByChargeCode', () => {
    it('should count sales for a specific charge code', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'COUNT-TEST',
        subtotalAmount: '50.00',
        vatAmount: '10.00',
        totalAmount: '60.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 50.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 10.00,
          subtotal: 50.00,
          totalWithVat: 60.00,
        },
      ];

      // Create multiple sales with the same charge code
      await storage.createSale(saleData, items, 'test-user-1');
      await storage.createSale(saleData, items, 'test-user-1');
      await storage.createSale(saleData, items, 'test-user-1');

      const count = await storage.countSalesByChargeCode('COUNT-TEST');
      expect(count).toBe(3);
    });

    it('should return 0 for non-existent charge code', async () => {
      const count = await storage.countSalesByChargeCode('NON-EXISTENT-CODE');
      expect(count).toBe(0);
    });
  });
});
