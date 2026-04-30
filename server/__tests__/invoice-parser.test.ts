// Mock pdf-parse module BEFORE any imports
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation(() => Promise.resolve({
    text: '',
    numpages: 1,
    numrender: 1,
    info: {},
    metadata: null,
    version: undefined
  }));
});

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { parseInvoicePdf, validateParsedInvoice, ParsedInvoice } from '../invoiceParser';
import { Buffer } from 'buffer';
import pdfParse from 'pdf-parse';

const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

// Helper function to create valid PDF parse result
function createMockPdfResult(text: string, numpages: number = 1) {
  return {
    text,
    numpages,
    numrender: numpages,
    info: {},
    metadata: null,
    version: undefined as any
  };
}

describe('Invoice Parser Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseInvoicePdf', () => {
    it('should parse a complete PDF invoice with all fields', async () => {
      const mockPdfText = `
Supplier: ACME Corp Ltd
Phone: +44-123-456-7890
Email: billing@acme.com
Address: 123 Business Street, London, UK

Invoice Number: INV-2025-001
Invoice Date: 15/01/2025
Due Date: 15/02/2025

1   WIDGET-001   Premium Widget     2   £25.00   £50.00
2   GADGET-002   Standard Gadget    1   £15.50   £15.50

Subtotal: £65.50
VAT (20%): £13.10
Total: £78.60
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('fake pdf content'));

      expect(result).toBeDefined();
      expect(result.orderId).toBe('ORD-INV-2025-001');
      expect(result.supplier.name).toBe('ACME Corp Ltd');
      expect(result.supplier.email).toBe('billing@acme.com');
      expect(result.supplier.phone).toBe('+44-123-456-7890');
      expect(result.invoiceNumber).toBe('INV-2025-001');
      expect(result.subtotal).toBe(65.50);
      expect(result.vatAmount).toBe(13.10);
      expect(result.total).toBe(78.60);
      expect(result.vatRate).toBe(0.20);
      expect(result.status).toBe('pending');
      expect(result.notes).toContain('Imported from PDF invoice');
      expect(result.items).toHaveLength(2);
      
      // Check first item
      expect(result.items[0].sku).toBe('WIDGET-001');
      expect(result.items[0].name).toBe('Premium Widget');
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unitCost).toBe(25.00);
      
      // Check second item
      expect(result.items[1].sku).toBe('GADGET-002');
      expect(result.items[1].name).toBe('Standard Gadget');
      expect(result.items[1].quantity).toBe(1);
      expect(result.items[1].unitCost).toBe(15.50);
    });

    it('should parse invoice with minimal information', async () => {
      const mockPdfText = `
Invoice: MIN-001
Total: $100.00

ITEM-001 Basic Item 1 $100.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('minimal pdf'));

      expect(result.orderId).toBe('ORD-MIN-001');
      expect(result.supplier.name).toBe('Unknown Supplier');
      expect(result.total).toBe(100.00);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe('ITEM-001');
    });

    it('should calculate totals from items when not present in PDF', async () => {
      const mockPdfText = `
Supplier: Test Supplier

ITEM-A Product A 2 $50.00
ITEM-B Product B 1 $30.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('calc totals pdf'));

      expect(result.subtotal).toBe(130.00); // (2*50) + (1*30)
      expect(result.vatAmount).toBe(26.00); // 130 * 0.20
      expect(result.total).toBe(156.00); // 130 + 26
      expect(result.vatRate).toBe(0.20);
    });

    it('should generate orderId from timestamp when invoice number not found', async () => {
      const mockPdfText = `
Supplier: No Invoice Number Supplier
Total: $50.00

ITEM-X Product X 1 $50.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const beforeTime = Date.now();
      const result = await parseInvoicePdf(Buffer.from('no invoice number'));
      const afterTime = Date.now();

      expect(result.orderId).toMatch(/^ORD-\d+$/);
      const orderTimestamp = parseInt(result.orderId.replace('ORD-', ''));
      expect(orderTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(orderTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should parse different currency symbols correctly', async () => {
      const mockPdfText = `
Invoice: EUR-001
Subtotal: €85.50
VAT: €17.10
Total: €102.60

ITEM-EUR European Item 1 €85.50 €85.50
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('euro currency'));

      expect(result.subtotal).toBe(85.50);
      expect(result.vatAmount).toBe(17.10);
      expect(result.total).toBe(102.60);
    });

    it('should parse different date formats correctly', async () => {
      const mockPdfText = `
Invoice Number: DATE-TEST-001
Invoice Date: 2025-01-15
Due Date: 28/02/2025
Total: $100.00

ITEM-DATE Date Test Item 1 $100.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('date formats'));

      expect(result.invoiceDate).toBe('2025-01-15T00:00:00.000Z');
      expect(result.dueDate).toBe('2025-02-28T00:00:00.000Z');
    });

    it('should handle supplier information extraction correctly', async () => {
      const mockPdfText = `
From: Complete Supplier Ltd
Phone: +1-555-123-4567
Email: orders@completesupplier.com
Address: 456 Industrial Road
        Suite 789
        Business City, State 12345

Invoice: COMPLETE-001
Total: $200.00

ITEM-COMPLETE Complete Item 1 $200.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('complete supplier'));

      expect(result.supplier.name).toBe('Complete Supplier Ltd');
      expect(result.supplier.phone).toBe('+1-555-123-4567');
      expect(result.supplier.email).toBe('orders@completesupplier.com');
      expect(result.supplier.address).toContain('456 Industrial Road');
    });

    it('should handle custom VAT rates when specified', async () => {
      const mockPdfText = `
Invoice: VAT-CUSTOM-001
Subtotal: £100.00
VAT Rate: 15%
VAT: £15.00
Total: £115.00

CUSTOM-ITEM Custom VAT Item 1 £100.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('custom vat'));

      expect(result.vatRate).toBe(0.15);
      expect(result.vatAmount).toBe(15.00);
    });

    it('should handle alternative item line formats', async () => {
      const mockPdfText = `
Invoice: ALT-FORMAT-001
Total: $150.00

SKU-ALT1 Alternative Format Item 3 $50.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('alt format'));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe('SKU-ALT1');
      expect(result.items[0].name).toBe('Alternative Format Item');
      expect(result.items[0].quantity).toBe(3);
      expect(result.items[0].unitCost).toBe(50.00);
    });

    it('should handle PDF parsing errors gracefully', async () => {
      mockPdfParse.mockRejectedValue(new Error('PDF parsing failed'));

      await expect(parseInvoicePdf(Buffer.from('invalid pdf')))
        .rejects.toThrow('Failed to parse PDF invoice: PDF parsing failed');
    });

    it('should handle empty PDF content', async () => {
      const mockPdfText = '';

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 1));

      const result = await parseInvoicePdf(Buffer.from('empty pdf'));

      expect(result.supplier.name).toBe('Unknown Supplier');
      expect(result.items).toHaveLength(0);
      expect(result.orderId).toMatch(/^ORD-\d+$/);
    });

    it('should handle null or undefined buffer', async () => {
      await expect(parseInvoicePdf(null as any))
        .rejects.toThrow();
      await expect(parseInvoicePdf(undefined as any))
        .rejects.toThrow();
    });

    it('should handle PDF with multiple pages', async () => {
      const mockPdfText = `
Invoice: MULTI-PAGE-001
Total: $500.00

PAGE-1-ITEM Item from page 1 1 $500.00
        `;

      mockPdfParse.mockResolvedValue(createMockPdfResult(mockPdfText, 3));

      const result = await parseInvoicePdf(Buffer.from('multi page pdf'));

      expect(result.notes).toContain('3 pages');
    });
  });

  describe('validateParsedInvoice', () => {
    it('should validate and return a complete valid invoice', () => {
      const validInvoice: ParsedInvoice = {
        orderId: 'ORD-VALID-001',
        supplier: {
          name: 'Valid Supplier Ltd',
          email: 'test@valid.com',
          phone: '+44123456789'
        },
        invoiceNumber: 'INV-VALID-001',
        invoiceDate: '2025-01-15T00:00:00.000Z',
        subtotal: 100.00,
        vatRate: 0.20,
        vatAmount: 20.00,
        total: 120.00,
        status: 'pending',
        items: [
          {
            sku: 'VALID-SKU-001',
            name: 'Valid Item',
            quantity: 2,
            unitCost: 50.00,
            vatRate: 0.20,
            vatAmount: 20.00,
            totalCost: 120.00
          }
        ]
      };

      const result = validateParsedInvoice(validInvoice);

      expect(result.orderId).toBe('ORD-VALID-001');
      expect(result.supplier.name).toBe('Valid Supplier Ltd');
      expect(result.items).toHaveLength(1);
      expect(result.subtotal).toBe(100.00);
      expect(result.total).toBe(120.00);
    });

    it('should generate orderId if missing', () => {
      const invoice: ParsedInvoice = {
        orderId: '',
        supplier: { name: 'Test Supplier' },
        subtotal: 50.00,
        vatRate: 0.20,
        vatAmount: 10.00,
        total: 60.00,
        status: 'pending',
        items: [
          {
            sku: 'TEST-SKU',
            name: 'Test Item',
            quantity: 1,
            unitCost: 50.00,
            vatRate: 0.20,
            vatAmount: 10.00,
            totalCost: 60.00
          }
        ]
      };

      const beforeTime = Date.now();
      const result = validateParsedInvoice(invoice);
      const afterTime = Date.now();

      expect(result.orderId).toMatch(/^ORD-\d+$/);
      const orderTimestamp = parseInt(result.orderId.replace('ORD-', ''));
      expect(orderTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(orderTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should set default supplier name if missing or empty', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-NO-SUPPLIER',
        supplier: { name: '' },
        subtotal: 25.00,
        vatRate: 0.20,
        vatAmount: 5.00,
        total: 30.00,
        status: 'pending',
        items: [
          {
            sku: 'NO-SUPPLIER-SKU',
            name: 'No Supplier Item',
            quantity: 1,
            unitCost: 25.00,
            vatRate: 0.20,
            vatAmount: 5.00,
            totalCost: 30.00
          }
        ]
      };

      const result = validateParsedInvoice(invoice);

      expect(result.supplier.name).toBe('Unknown Supplier');
    });

    it('should throw error if no items are present', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-NO-ITEMS',
        supplier: { name: 'No Items Supplier' },
        subtotal: 0,
        vatRate: 0.20,
        vatAmount: 0,
        total: 0,
        status: 'pending',
        items: []
      };

      expect(() => validateParsedInvoice(invoice))
        .toThrow('No items found in invoice');
    });

    it('should filter out invalid items and keep valid ones', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-MIXED-ITEMS',
        supplier: { name: 'Mixed Items Supplier' },
        subtotal: 100.00,
        vatRate: 0.20,
        vatAmount: 20.00,
        total: 120.00,
        status: 'pending',
        items: [
          {
            sku: '', // Invalid: no SKU
            name: 'Invalid Item 1',
            quantity: 1,
            unitCost: 25.00,
            vatRate: 0.20,
            vatAmount: 5.00,
            totalCost: 30.00
          },
          {
            sku: 'VALID-SKU-2',
            name: '', // Invalid: no name
            quantity: 1,
            unitCost: 25.00,
            vatRate: 0.20,
            vatAmount: 5.00,
            totalCost: 30.00
          },
          {
            sku: 'INVALID-SKU-3',
            name: 'Invalid Item 3',
            quantity: 0, // Invalid: zero quantity
            unitCost: 25.00,
            vatRate: 0.20,
            vatAmount: 5.00,
            totalCost: 30.00
          },
          {
            sku: 'INVALID-SKU-4',
            name: 'Invalid Item 4',
            quantity: 1,
            unitCost: -25.00, // Invalid: negative cost
            vatRate: 0.20,
            vatAmount: 5.00,
            totalCost: 30.00
          },
          {
            sku: 'VALID-SKU-5',
            name: 'Valid Item 5',
            quantity: 2,
            unitCost: 50.00,
            vatRate: 0.20,
            vatAmount: 20.00,
            totalCost: 120.00
          }
        ]
      };

      const result = validateParsedInvoice(invoice);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe('VALID-SKU-5');
      expect(result.items[0].name).toBe('Valid Item 5');
    });

    it('should throw error if all items are invalid after filtering', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-ALL-INVALID',
        supplier: { name: 'All Invalid Supplier' },
        subtotal: 0,
        vatRate: 0.20,
        vatAmount: 0,
        total: 0,
        status: 'pending',
        items: [
          {
            sku: '',
            name: 'Invalid Item',
            quantity: 0,
            unitCost: -10.00,
            vatRate: 0.20,
            vatAmount: 0,
            totalCost: 0
          }
        ]
      };

      expect(() => validateParsedInvoice(invoice))
        .toThrow('No valid items found in invoice after validation');
    });

    it('should recalculate totals if discrepancy is greater than 1%', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-WRONG-TOTALS',
        supplier: { name: 'Wrong Totals Supplier' },
        subtotal: 1000.00, // Should be 150.00 (3*50.00)
        vatRate: 0.20,
        vatAmount: 200.00, // Should be 30.00 (150.00 * 0.20)
        total: 1200.00, // Should be 180.00 (150.00 + 30.00)
        status: 'pending',
        items: [
          {
            sku: 'RECALC-SKU-1',
            name: 'Recalculation Item',
            quantity: 3,
            unitCost: 50.00,
            vatRate: 0.20,
            vatAmount: 30.00,
            totalCost: 180.00
          }
        ]
      };

      const result = validateParsedInvoice(invoice);

      expect(result.subtotal).toBe(150.00); // Recalculated
      expect(result.vatAmount).toBe(30.00); // Recalculated
      expect(result.total).toBe(180.00); // Recalculated
    });

    it('should preserve original totals if discrepancy is within 1%', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-SMALL-DIFF',
        supplier: { name: 'Small Difference Supplier' },
        subtotal: 100.50, // Small difference from calculated 100.00
        vatRate: 0.20,
        vatAmount: 20.10, // Small difference from calculated 20.00
        total: 120.60, // Small difference from calculated 120.00
        status: 'pending',
        items: [
          {
            sku: 'SMALL-DIFF-SKU',
            name: 'Small Difference Item',
            quantity: 2,
            unitCost: 50.00,
            vatRate: 0.20,
            vatAmount: 20.00,
            totalCost: 120.00
          }
        ]
      };

      const result = validateParsedInvoice(invoice);

      // Should preserve original totals
      expect(result.subtotal).toBe(100.50);
      expect(result.vatAmount).toBe(20.10);
      expect(result.total).toBe(120.60);
    });

    it('should handle complex multi-item invoice validation', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-COMPLEX',
        supplier: {
          name: 'Complex Multi-Item Supplier',
          email: 'complex@supplier.com',
          phone: '+1-555-COMPLEX',
          address: '123 Complex Street, Business City'
        },
        invoiceNumber: 'INV-COMPLEX-2025',
        invoiceDate: '2025-01-15T00:00:00.000Z',
        dueDate: '2025-02-15T00:00:00.000Z',
        subtotal: 485.00,
        vatRate: 0.20,
        vatAmount: 97.00,
        total: 582.00,
        status: 'pending',
        receivedDate: '2025-01-16T00:00:00.000Z',
        notes: 'Complex multi-item validation test',
        items: [
          {
            itemId: 1001,
            sku: 'COMPLEX-001',
            name: 'Complex Item 1',
            description: 'First complex item',
            categoryId: 100,
            quantity: 5,
            unitCost: 75.00,
            vatRate: 0.20,
            vatAmount: 75.00,
            totalCost: 450.00
          },
          {
            itemId: 1002,
            sku: 'COMPLEX-002',
            name: 'Complex Item 2',
            description: 'Second complex item',
            categoryId: 200,
            quantity: 1,
            unitCost: 35.00,
            vatRate: 0.20,
            vatAmount: 7.00,
            totalCost: 42.00
          },
          {
            sku: '', // This invalid item should be filtered out
            name: 'Invalid Complex Item',
            quantity: 0,
            unitCost: -10.00,
            vatRate: 0.20,
            vatAmount: 0,
            totalCost: 0
          }
        ]
      };

      const result = validateParsedInvoice(invoice);

      expect(result.items).toHaveLength(2); // Invalid item filtered out
      expect(result.orderId).toBe('ORD-COMPLEX');
      expect(result.supplier.name).toBe('Complex Multi-Item Supplier');
      expect(result.supplier.email).toBe('complex@supplier.com');
      expect(result.invoiceNumber).toBe('INV-COMPLEX-2025');
      expect(result.notes).toBe('Complex multi-item validation test');
      
      // Check that optional fields are preserved
      expect(result.items[0].itemId).toBe(1001);
      expect(result.items[0].description).toBe('First complex item');
      expect(result.items[0].categoryId).toBe(100);
      
      // Totals should be recalculated: (5*75) + (1*35) = 410
      expect(result.subtotal).toBe(410.00);
      expect(result.vatAmount).toBe(82.00); // 410 * 0.20
      expect(result.total).toBe(492.00); // 410 + 82
    });

    it('should handle edge case with zero division in recalculation', () => {
      const invoice: ParsedInvoice = {
        orderId: 'ORD-ZERO-DIV',
        supplier: { name: 'Zero Division Supplier' },
        subtotal: 100.00, // Non-zero but calculated will be zero
        vatRate: 0.20,
        vatAmount: 20.00,
        total: 120.00,
        status: 'pending',
        items: [
          {
            sku: 'ZERO-SKU',
            name: 'Zero Cost Item',
            quantity: 1,
            unitCost: 0.00, // This will make calculated subtotal 0
            vatRate: 0.20,
            vatAmount: 0,
            totalCost: 0
          }
        ]
      };

      const result = validateParsedInvoice(invoice);

      // Should not crash on division by zero and should recalculate
      expect(result.subtotal).toBe(0.00);
      expect(result.vatAmount).toBe(0.00);
      expect(result.total).toBe(0.00);
    });
  });

  describe('ParsedInvoice Interface Compliance', () => {
    it('should support all required properties', () => {
      const completeInvoice: ParsedInvoice = {
        orderId: 'ORD-COMPLETE',
        supplier: {
          name: 'Complete Supplier',
          contact: 'John Doe',
          email: 'john@complete.com',
          phone: '+1-555-COMPLETE',
          address: '123 Complete Street, Complete City'
        },
        invoiceNumber: 'INV-COMPLETE-001',
        invoiceDate: '2025-01-15T00:00:00.000Z',
        dueDate: '2025-02-15T00:00:00.000Z',
        subtotal: 200.00,
        vatRate: 0.175,
        vatAmount: 35.00,
        total: 235.00,
        status: 'processed',
        receivedDate: '2025-01-16T00:00:00.000Z',
        notes: 'Complete invoice with all optional fields',
        items: [
          {
            itemId: 2001,
            sku: 'COMPLETE-SKU-001',
            name: 'Complete Item',
            description: 'Item with all optional fields',
            categoryId: 300,
            quantity: 4,
            unitCost: 50.00,
            vatRate: 0.175,
            vatAmount: 35.00,
            totalCost: 235.00
          }
        ]
      };

      // Should compile and validate without errors
      const result = validateParsedInvoice(completeInvoice);

      expect(result.orderId).toBe('ORD-COMPLETE');
      expect(result.supplier.contact).toBe('John Doe');
      expect(result.invoiceNumber).toBe('INV-COMPLETE-001');
      expect(result.dueDate).toBe('2025-02-15T00:00:00.000Z');
      expect(result.receivedDate).toBe('2025-01-16T00:00:00.000Z');
      expect(result.notes).toBe('Complete invoice with all optional fields');
      expect(result.items[0].itemId).toBe(2001);
      expect(result.items[0].description).toBe('Item with all optional fields');
      expect(result.items[0].categoryId).toBe(300);
    });

    it('should work with minimal required properties only', () => {
      const minimalInvoice: ParsedInvoice = {
        orderId: 'ORD-MINIMAL',
        supplier: {
          name: 'Minimal Supplier'
        },
        subtotal: 100.00,
        vatRate: 0.20,
        vatAmount: 20.00,
        total: 120.00,
        status: 'pending',
        items: [
          {
            sku: 'MINIMAL-SKU',
            name: 'Minimal Item',
            quantity: 1,
            unitCost: 100.00,
            vatRate: 0.20,
            vatAmount: 20.00,
            totalCost: 120.00
          }
        ]
      };

      const result = validateParsedInvoice(minimalInvoice);

      expect(result.orderId).toBe('ORD-MINIMAL');
      expect(result.supplier.name).toBe('Minimal Supplier');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe('MINIMAL-SKU');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed invoice data gracefully', () => {
      const malformedInvoice = {
        orderId: 'ORD-MALFORMED',
        supplier: { name: 'Malformed Supplier' },
        subtotal: 'not a number' as any,
        vatRate: null as any,
        vatAmount: undefined as any,
        total: 100,
        status: 'pending',
        items: [
          {
            sku: 'MALFORMED-SKU',
            name: 'Malformed Item',
            quantity: 1,
            unitCost: 100,
            vatRate: 0.20,
            vatAmount: 20,
            totalCost: 120
          }
        ]
      } as ParsedInvoice;

      // Should not crash even with malformed data
      expect(() => validateParsedInvoice(malformedInvoice)).not.toThrow();
    });

    it('should handle very large invoices', () => {
      const largeInvoice: ParsedInvoice = {
        orderId: 'ORD-LARGE',
        supplier: { name: 'Large Invoice Supplier' },
        subtotal: 100000.00,
        vatRate: 0.20,
        vatAmount: 20000.00,
        total: 120000.00,
        status: 'pending',
        items: Array.from({ length: 1000 }, (_, i) => ({
          sku: `LARGE-SKU-${i + 1}`,
          name: `Large Item ${i + 1}`,
          quantity: 1,
          unitCost: 100.00,
          vatRate: 0.20,
          vatAmount: 20.00,
          totalCost: 120.00
        }))
      };

      const result = validateParsedInvoice(largeInvoice);

      expect(result.items).toHaveLength(1000);
      expect(result.subtotal).toBe(100000.00); // 1000 * 100
    });

    it('should handle invoices with extreme decimal precision', () => {
      const precisionInvoice: ParsedInvoice = {
        orderId: 'ORD-PRECISION',
        supplier: { name: 'Precision Supplier' },
        subtotal: 33.333333,
        vatRate: 0.175,
        vatAmount: 5.833333,
        total: 39.166666,
        status: 'pending',
        items: [
          {
            sku: 'PRECISION-SKU',
            name: 'Precision Item',
            quantity: 3,
            unitCost: 11.111111,
            vatRate: 0.175,
            vatAmount: 5.833333,
            totalCost: 39.166666
          }
        ]
      };

      const result = validateParsedInvoice(precisionInvoice);

      expect(result.items).toHaveLength(1);
      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.total).toBe('number');
    });
  });
});
