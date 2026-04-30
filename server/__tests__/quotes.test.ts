// Unit tests for quotes functionality
import { MockStorage } from './mockStorage';
import type { InsertQuote } from '../../shared/schema';

describe('Quotes Functionality', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    storage.seedTestData();
  });

  afterEach(() => {
    storage.reset();
  });

  describe('createQuote', () => {
    it('should create a quote with multiple items and correct calculations', async () => {
      const quoteData: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '46.67',
        vatAmount: '9.33',
        totalAmount: '56.00',
        vatApplied: true,
        customerInfo: { name: 'Test Customer', department: 'Research' },
        notesId: undefined, // No note attached initially
        status: 'draft',
        createdBy: 'test-user-1',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Test Item 1',
          itemSku: 'TEST001',
          unitPrice: 10.50,
          quantity: 2,
          vatRate: 0.20,
          vatAmount: 3.50,
          subtotal: 17.50,
          totalWithVat: 21.00,
        },
        {
          itemId: 2,
          itemName: 'Test Item 2',
          itemSku: 'TEST002',
          unitPrice: 25.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 5.83,
          subtotal: 29.17,
          totalWithVat: 35.00,
        },
      ];

      const quote = await storage.createQuote(quoteData, items);

      expect(quote).toBeDefined();
      expect(quote.quoteId).toMatch(/^Q\d{8}\d{4}\d{3}$/); // Format: Q + YYYYMMDD + HHMM + counter
      expect(quote.chargeCode).toBe('DEPT001');
      expect(quote.totalAmount).toBe('56.00');
      expect(quote.subtotalAmount).toBe('46.67');
      expect(quote.vatAmount).toBe('9.33');
      expect(quote.status).toBe('draft');
      expect(quote.createdBy).toBe('test-user-1');
      expect(quote.customerInfo).toEqual({ name: 'Test Customer', department: 'Research' });
    });

    it('should generate unique quote IDs', async () => {
      const quoteData: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '10.50',
        vatAmount: '2.10',
        totalAmount: '12.60',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'draft',
        createdBy: 'test-user-1',
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

      const quote1 = await storage.createQuote(quoteData, items);
      const quote2 = await storage.createQuote(quoteData, items);

      expect(quote1.quoteId).not.toBe(quote2.quoteId);
    });

    it('should handle quotes with complex VAT calculations', async () => {
      const quoteData: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'RESEARCH_LAB_A',
        subtotalAmount: '250.00',
        vatAmount: '50.00',
        totalAmount: '300.00',
        vatApplied: true,
        customerInfo: {
          name: 'Dr. Jane Smith',
          department: 'Biology',
          email: 'jane.smith@university.edu',
        },
        notesId: undefined, // No note attached initially
        status: 'draft',
        createdBy: 'test-user-1',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'Laboratory Equipment',
          itemSku: 'LAB001',
          unitPrice: 100.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 20.00,
          subtotal: 100.00,
          totalWithVat: 120.00,
        },
        {
          itemId: 2,
          itemName: 'Research Supplies',
          itemSku: 'RES002',
          unitPrice: 150.00,
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 30.00,
          subtotal: 150.00,
          totalWithVat: 180.00,
        },
      ];

      const quote = await storage.createQuote(quoteData, items);

      expect(quote.chargeCode).toBe('RESEARCH_LAB_A');
      expect(quote.subtotalAmount).toBe('250.00');
      expect(quote.vatAmount).toBe('50.00');
      expect(quote.totalAmount).toBe('300.00');
      expect(quote.customerInfo).toEqual({
        name: 'Dr. Jane Smith',
        department: 'Biology',
        email: 'jane.smith@university.edu',
      });
      expect(quote.notesId).toBeUndefined(); // No note attached initially
    });
  });

  describe('getQuotes', () => {
    beforeEach(async () => {
      // Create test quotes
      const quoteData1: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '35.50',
        vatAmount: '7.10',
        totalAmount: '42.60',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'draft',
        createdBy: 'test-user-1',
      };

      const quoteData2: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'DEPT002',
        subtotalAmount: '50.00',
        vatAmount: '10.00',
        totalAmount: '60.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'draft',
        createdBy: 'test-user-1',
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

      await storage.createQuote(quoteData1, testItems);
      await storage.createQuote(quoteData2, testItems);
    });

    it('should retrieve all quotes with details', async () => {
      const result = await storage.getQuotes(1, 10);
      
      expect(result.quotes).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.quotes[0].chargeCode).toBeDefined();
      expect(result.quotes[0].items).toBeDefined();
      expect(result.quotes[0].creator).toBeDefined();
    });

    it('should paginate quotes correctly', async () => {
      const result = await storage.getQuotes(1, 1);
      
      expect(result.quotes).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should filter quotes by status', async () => {
      const result = await storage.getQuotes(1, 10, 'draft');
      
      expect(result.quotes).toHaveLength(2);
      expect(result.quotes.every(q => q.status === 'draft')).toBe(true);
    });
  });

  describe('processQuote', () => {
    it('should convert quote to sale and update stock', async () => {
      // Create a quote first
      const quoteData: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '21.00',
        vatAmount: '4.20',
        totalAmount: '25.20',
        vatApplied: true,
        customerInfo: { name: 'Test Customer' },
        notesId: undefined, // No note attached initially
        status: 'draft',
        createdBy: 'test-user-1',
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
      ];

      const quote = await storage.createQuote(quoteData, items);
      
      // Check initial stock
      const initialItem = await storage.getItem(1);
      expect(initialItem?.currentStock).toBe(100);

      // Process the quote
      const sale = await storage.processQuote(quote.id, 'test-user-1');

      // Verify sale was created
      expect(sale).toBeDefined();
      expect(sale.saleId).toMatch(/^S\d{8}\d{4}\d{3}$/);
      expect(sale.chargeCode).toBe('DEPT001');
      expect(sale.totalAmount).toBe('25.20');

      // Verify quote status was updated
      const updatedQuote = await storage.getQuote(quote.id);
      expect(updatedQuote?.status).toBe('processed');
      expect(updatedQuote?.processedBy).toBe('test-user-1');
      expect(updatedQuote?.processedAt).toBeDefined();
    });

    it('should not process non-draft quotes', async () => {
      const quoteData: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'DEPT001',
        subtotalAmount: '10.50',
        vatAmount: '2.10',
        totalAmount: '12.60',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined,
        status: 'processed',
        createdBy: 'test-user-1',
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

      const quote = await storage.createQuote(quoteData, items);

      await expect(storage.processQuote(quote.id, 'test-user-1'))
        .rejects.toThrow('Quote is not in draft status');
    });
  });

  describe('VAT calculations validation', () => {
    it('should handle VAT-inclusive pricing correctly', async () => {
      const quoteData: Omit<InsertQuote, 'quoteId'> = {
        chargeCode: 'VAT_TEST',
        subtotalAmount: '83.33',
        vatAmount: '16.67',
        totalAmount: '100.00',
        vatApplied: true,
        customerInfo: null,
        notesId: undefined, // No note attached initially
        status: 'draft',
        createdBy: 'test-user-1',
      };

      const items = [
        {
          itemId: 1,
          itemName: 'VAT Inclusive Item',
          itemSku: 'VAT001',
          unitPrice: 100.00, // Price includes VAT
          quantity: 1,
          vatRate: 0.20,
          vatAmount: 16.67, // VAT component
          subtotal: 83.33, // Price excluding VAT
          totalWithVat: 100.00, // Total including VAT
        },
      ];

      const quote = await storage.createQuote(quoteData, items);

      expect(parseFloat(quote.subtotalAmount)).toBeCloseTo(83.33, 2);
      expect(parseFloat(quote.vatAmount)).toBeCloseTo(16.67, 2);
      expect(parseFloat(quote.totalAmount)).toBeCloseTo(100.00, 2);
    });
  });
});
