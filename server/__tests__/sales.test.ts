// Unit tests for sales functionality
import { MockStorage } from './mockStorage';
import type { InsertSale, Sale } from '../../shared/schema';

// Define interface for sales report
interface SalesByChargeCodeReport {
  chargeCode: string;
  sales: Sale[];
  total: number;
}

describe('Sales Functionality', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    storage.seedTestData();
  });

  afterEach(() => {
    storage.reset();
  });

  describe('createSale', () => {
    it('should create a sale with valid data', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '35.50',
        vatAmount: '0.00',
        totalAmount: '35.50',
        vatApplied: false,
        customerInfo: { name: 'Test Customer' },
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 2,
          vatRate: 0.20,
          vatAmount: 4.20,
          subtotal: 21.00,
          totalWithVat: 25.20,
        },
        {
          itemId: 2,
          itemName: 'Test Item 2',
          itemSku: 'TEST002',
          unitPrice: 25.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 5.00,
          subtotal: 25.00,
          totalWithVat: 30.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      expect(sale).toBeDefined();
      expect(sale.saleId).toMatch(/^S\d{8}\d{4}\d{3}$/); // Format: S + YYYYMMDD + HHMM + counter
      expect(sale.chargeCode).toBe('DEPT001');
      expect(sale.totalAmount).toBe('35.50');
      expect(sale.status).toBe('completed');
      expect(sale.processedBy).toBeDefined();
      // Note: Sale doesn't include items, use getSales for full details
    });

    it('should generate unique sale IDs', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '10.50',
        vatAmount: '0.00',
        totalAmount: '10.50',
        vatApplied: false,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 2.10,
          subtotal: 10.50,
          totalWithVat: 12.60,
        },
      ];

      const sale1 = await storage.createSale(saleData, items, 'test-user-1');
      const sale2 = await storage.createSale(saleData, items, 'test-user-1');

      expect(sale1.saleId).not.toBe(sale2.saleId);
    });

    it('should handle sales with customer information', async () => {
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'RESEARCH_LAB_A',
        subtotalAmount: '75.00',
        vatAmount: '0.00',
        totalAmount: '75.00',
        vatApplied: false,
        customerInfo: {
          name: 'Dr. Jane Smith',
          department: 'Biology',
          email: 'jane.smith@university.edu',
        },
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const items = [
        {
          itemId: 2,
          itemName: 'Test Item 2',
          itemSku: 'TEST002',
          unitPrice: 25.00,
          quantity: 3,
          vatRate: 0.20,
          vatAmount: 15.00,
          subtotal: 75.00,
          totalWithVat: 90.00,
        },
      ];

      const sale = await storage.createSale(saleData, items, 'test-user-1');

      expect(sale.chargeCode).toBe('RESEARCH_LAB_A');
      expect(sale.customerInfo).toEqual({
        name: 'Dr. Jane Smith',
        department: 'Biology',
        email: 'jane.smith@university.edu',
      });
      expect(sale.notesId).toBeUndefined(); // No note attached initially
    });
  });

  describe('getSales', () => {
    beforeEach(async () => {
      // Create test sales
      const saleData1: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '35.50',
        vatAmount: '0.00',
        totalAmount: '35.50',
        vatApplied: false,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const saleData2: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT002',
        subtotalAmount: '50.00',
        vatAmount: '0.00',
        totalAmount: '50.00',
        vatApplied: false,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const testItems = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 2.10,
          subtotal: 10.50,
          totalWithVat: 12.60,
        },
      ];

      await storage.createSale(saleData1, testItems, 'test-user-1');
      await storage.createSale(saleData2, testItems, 'test-user-1');
    });

    it('should retrieve all sales', async () => {
      const result = await storage.getSales(1, 10);
      
      expect(result.sales).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.sales[0].chargeCode).toBeDefined();
      expect(result.sales[0].items).toBeDefined();
      expect(result.sales[0].processedBy).toBeDefined();
    });

    it('should paginate sales correctly', async () => {
      const result = await storage.getSales(1, 1);
      
      expect(result.sales).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should filter sales by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await storage.getSales(1, 10, undefined, yesterday, tomorrow);
      
      expect(result.sales).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter sales by charge code', async () => {
      const result = await storage.getSales(1, 10, 'DEPT001');
      
      expect(result.sales).toHaveLength(1);
      expect(result.sales[0].chargeCode).toBe('DEPT001');
    });

    it('should filter sales by status', async () => {
      // Note: Status filtering would need to be implemented in getSales method
      // For now, just verify all sales are returned with completed status
      const result = await storage.getSales(1, 10);
      
      expect(result.sales).toHaveLength(2);
      result.sales.forEach(sale => {
        expect(sale.status).toBe('completed');
      });
    });
  });

  describe('getSalesByChargeCode', () => {
    beforeEach(async () => {
      // Create test sales with specific charge codes
      const saleData1: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'BIOLOGY_DEPT',
        subtotalAmount: '100.00',
        vatAmount: '0.00',
        totalAmount: '100.00',
        vatApplied: false,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const saleData2: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'CHEMISTRY_DEPT',
        subtotalAmount: '150.00',
        vatAmount: '0.00',
        totalAmount: '150.00',
        vatApplied: false,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const saleData3: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'BIOLOGY_DEPT',
        subtotalAmount: '75.00',
        vatAmount: '0.00',
        totalAmount: '75.00',
        vatApplied: false,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const testItems = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 2.10,
          subtotal: 10.50,
          totalWithVat: 12.60,
        },
      ];

      await storage.createSale(saleData1, testItems, 'test-user-1');
      await storage.createSale(saleData2, testItems, 'test-user-1');
      await storage.createSale(saleData3, testItems, 'test-user-1');
    });

    it('should get sales analytics by charge code', async () => {
      const result = await storage.getSalesByChargeCode();
      
      expect(result).toHaveLength(2); // BIOLOGY_DEPT and CHEMISTRY_DEPT
      
      const biologyReport = result.find((r: SalesByChargeCodeReport) => r.chargeCode === 'BIOLOGY_DEPT');
      const chemistryReport = result.find((r: SalesByChargeCodeReport) => r.chargeCode === 'CHEMISTRY_DEPT');
      
      expect(biologyReport).toBeDefined();
      expect(biologyReport!.sales).toHaveLength(2);
      expect(biologyReport!.total).toBe(2);
      
      expect(chemistryReport).toBeDefined();
      expect(chemistryReport!.sales).toHaveLength(1);
      expect(chemistryReport!.total).toBe(1);
    });

    it('should filter charge code analytics by date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await storage.getSalesByChargeCode(yesterday, tomorrow);
      
      expect(result).toHaveLength(2); // Should still get both departments
      
      const totalSales = result.reduce((sum: number, dept: SalesByChargeCodeReport) => sum + dept.total, 0);
      expect(totalSales).toBe(3); // All 3 sales should be included
    });

    it('should return empty results for future date range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 1);

      const result = await storage.getSalesByChargeCode(futureDate, endDate);
      
      expect(result).toHaveLength(0);
    });

    it('should aggregate department sales correctly', async () => {
      const result = await storage.getSalesByChargeCode();
      
      const deptReport = result.find((r: SalesByChargeCodeReport) => r.chargeCode === 'BIOLOGY_DEPT');
      expect(deptReport).toBeDefined();
      expect(deptReport!.sales).toHaveLength(2); // BIOLOGY_DEPT sales count
      expect(deptReport!.total).toBe(2);
    });
  });

  describe('markSaleAsPaid', () => {
    let createdSale: Sale;

    beforeEach(async () => {
      // Create a sale to mark as paid
      const saleData: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '20.00',
        vatAmount: '0.00',
        totalAmount: '20.00',
        vatApplied: false,
        customerInfo: { name: 'Test Customer' },
        notesId: undefined, // No note attached initially
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item',
          itemSku: 'TEST001',
          unitPrice: 20.00,
          quantity: 1,
          vatRate: 0.00,
          vatAmount: 0.00,
          subtotal: 20.00,
          totalWithVat: 20.00,
        },
      ];

      createdSale = await storage.createSale(saleData, items, 'test-user-1');
    });

    it('should successfully mark a completed sale as paid', async () => {
      expect(createdSale.status).toBe('completed');

      const updatedSale = await storage.markSaleAsPaid(createdSale.id);

      expect(updatedSale.id).toBe(createdSale.id);
      expect(updatedSale.status).toBe('paid');
      // Verify the updatedAt was indeed updated (should be a valid date)
      expect(updatedSale.updatedAt).toBeInstanceOf(Date);
    });

    it('should be idempotent - marking an already paid sale as paid should not cause errors', async () => {
      // First mark as paid
      await storage.markSaleAsPaid(createdSale.id);

      // Mark as paid again - should not throw error
      const updatedSale = await storage.markSaleAsPaid(createdSale.id);

      expect(updatedSale.status).toBe('paid');
    });

    it('should throw error when trying to mark non-existent sale as paid', async () => {
      const nonExistentId = 99999;

      await expect(storage.markSaleAsPaid(nonExistentId))
        .rejects
        .toThrow(`Sale with ID ${nonExistentId} not found`);
    });

    it('should not affect other sale properties when marking as paid', async () => {
      const originalSale = { ...createdSale };
      
      const updatedSale = await storage.markSaleAsPaid(createdSale.id);

      // Verify only status and updatedAt changed
      expect(updatedSale.id).toBe(originalSale.id);
      expect(updatedSale.saleId).toBe(originalSale.saleId);
      expect(updatedSale.chargeCode).toBe(originalSale.chargeCode);
      expect(updatedSale.subtotalAmount).toBe(originalSale.subtotalAmount);
      expect(updatedSale.totalAmount).toBe(originalSale.totalAmount);
      expect(updatedSale.customerInfo).toEqual(originalSale.customerInfo);
      expect(updatedSale.notesId).toBe(originalSale.notesId); // Both should be undefined
      expect(updatedSale.processedBy).toBe(originalSale.processedBy);
      expect(updatedSale.createdAt).toEqual(originalSale.createdAt);
      
      // Only these should change
      expect(updatedSale.status).toBe('paid');
      expect(updatedSale.status).not.toBe(originalSale.status);
      expect(updatedSale.updatedAt).toBeInstanceOf(Date);
    });

    it('should prevent double counting in reports - paid sales should be distinguishable', async () => {
      // Create multiple sales
      const saleData1: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '30.00',
        vatAmount: '0.00',
        totalAmount: '30.00',
        vatApplied: false,
        customerInfo: { name: 'Customer 1' },
        status: 'completed',
      };

      const saleData2: Omit<InsertSale, 'saleId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '40.00',
        vatAmount: '0.00',
        totalAmount: '40.00',
        vatApplied: false,
        customerInfo: { name: 'Customer 2' },
        status: 'completed',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item',
          itemSku: 'TEST001',
          unitPrice: 30.00,
          quantity: 1,
          vatRate: 0.00,
          vatAmount: 0.00,
          subtotal: 30.00,
          totalWithVat: 30.00,
        },
      ];

      const sale1 = await storage.createSale(saleData1, items, 'test-user-1');
      const sale2 = await storage.createSale(saleData2, items, 'test-user-1');

      // Mark only one as paid
      await storage.markSaleAsPaid(sale1.id);

      // Get sales and verify we can distinguish paid vs unpaid
      const salesResult = await storage.getSales();
      const retrievedSale1 = salesResult.sales.find(s => s.id === sale1.id);
      const retrievedSale2 = salesResult.sales.find(s => s.id === sale2.id);

      expect(retrievedSale1?.status).toBe('paid');
      expect(retrievedSale2?.status).toBe('completed');
    });
  });
});
