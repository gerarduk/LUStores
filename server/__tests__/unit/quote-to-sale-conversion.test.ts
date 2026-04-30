/**
 * Quote-to-Sale Conversion Unit Tests
 * 
 * Tests the core quote-to-sale conversion functionality including:
 * 1. Quote data preservation during conversion
 * 2. VAT rate integrity across conversion
 * 3. Sale ID generation and formatting
 * 4. Stock deduction mechanics
 * 5. Customer information preservation
 * 6. Charge code validation during conversion
 * 7. Atomic transaction behavior
 * 8. Error handling for conversion failures
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock data structures for quote-to-sale testing
 */
interface MockQuoteItem {
  id: number;
  quoteId: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  // Additional metadata for picking list
  unit: string;
  location?: string;
  categoryName?: string;
}

interface MockQuote {
  id: number;
  quoteId: string;
  quoteName?: string;
  chargeCode: string;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatApplied: boolean;
  customerInfo?: any;
  notes?: string;
  status: 'draft' | 'saved' | 'processed';
  createdBy: string;
  createdAt: Date;
  processedAt?: Date;
  items: MockQuoteItem[];
}

interface MockSaleItem {
  id: number;
  saleId: number;
  itemId: number;
  itemName: string; // Snapshot from quote
  itemSku: string;   // Snapshot from quote
  unitPrice: number; // Snapshot from quote
  quantity: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  // Operational data for picking
  unit: string;
  location?: string;
  categoryName?: string;
}

interface MockSale {
  id: number;
  saleId: string; // Unique formatted ID (e.g., S202501291234)
  chargeCode: string;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatApplied: boolean;
  customerInfo?: any;
  notes?: string;
  status: 'completed';
  isPaid: boolean;
  processedBy: string;
  createdAt: Date;
  items: MockSaleItem[];
}

interface MockInventoryItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  price: number;
  vatRate: number;
  vatIncluded: boolean;
  unit: string;
  location?: string;
  categoryId: number;
  categoryName: string;
  isActive: boolean;
}

interface MockChargeCode {
  code: string;
  description: string;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  allowedCategories?: number[]; // If specified, only these categories allowed
  excludedCategories?: number[]; // If specified, these categories are forbidden
}

interface MockStockMovement {
  id: number;
  itemId: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number; // Negative for 'out'
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: string;
  saleId?: string; // Link to sale that caused the movement
  createdAt: Date;
}

/**
 * Mock quote-to-sale conversion service
 */
class MockQuoteToSaleService {
  private quotes: Map<number, MockQuote> = new Map();
  private sales: Map<number, MockSale> = new Map();
  private inventory: Map<number, MockInventoryItem> = new Map();
  private chargeCodes: Map<string, MockChargeCode> = new Map();
  private stockMovements: Map<number, MockStockMovement> = new Map();
  
  private quoteCounter = 0;
  private saleCounter = 0;
  private movementCounter = 0;

  // Helper methods for test setup
  setupInventoryItem(item: Partial<MockInventoryItem>): MockInventoryItem {
    const fullItem: MockInventoryItem = {
      id: item.id || this.inventory.size + 1,
      name: item.name || `Test Item ${this.inventory.size + 1}`,
      sku: item.sku || `TEST-${this.inventory.size + 1}`,
      currentStock: item.currentStock || 100,
      minimumStock: item.minimumStock || 10,
      price: item.price || 50.00,
      vatRate: item.vatRate || 0.20,
      vatIncluded: item.vatIncluded ?? true,
      unit: item.unit || 'pieces',
      location: item.location || 'Warehouse A',
      categoryId: item.categoryId || 1,
      categoryName: item.categoryName || 'General',
      isActive: item.isActive ?? true,
    };
    this.inventory.set(fullItem.id, fullItem);
    return fullItem;
  }

  setupChargeCode(chargeCode: Partial<MockChargeCode>): MockChargeCode {
    const fullChargeCode: MockChargeCode = {
      code: chargeCode.code || 'TEST-001',
      description: chargeCode.description || 'Test charge code',
      validFrom: chargeCode.validFrom || new Date('2024-01-01'),
      validTo: chargeCode.validTo || new Date('2024-12-31'),
      isActive: chargeCode.isActive ?? true,
      allowedCategories: chargeCode.allowedCategories,
      excludedCategories: chargeCode.excludedCategories,
    };
    this.chargeCodes.set(fullChargeCode.code, fullChargeCode);
    return fullChargeCode;
  }

  /**
   * Create a quote with items for testing
   */
  async createQuote(quoteData: {
    quoteName?: string;
    chargeCode: string;
    customerInfo?: any;
    notes?: string;
    items: Array<{
      itemId: number;
      quantity: number;
      unitPrice?: number; // Override price if needed
      vatRate?: number;   // Override VAT rate if needed
    }>;
    createdBy: string;
    status?: 'draft' | 'saved';
  }): Promise<{ success: boolean; quote?: MockQuote; error?: string }> {
    try {
      // Validate items exist in inventory
      for (const itemSpec of quoteData.items) {
        const inventoryItem = this.inventory.get(itemSpec.itemId);
        if (!inventoryItem) {
          return { 
            success: false, 
            error: `Item with ID ${itemSpec.itemId} not found in inventory` 
          };
        }
        if (!inventoryItem.isActive) {
          return { 
            success: false, 
            error: `Item ${inventoryItem.name} is inactive` 
          };
        }
      }

      const quoteId = ++this.quoteCounter;
      const now = new Date();

      // Create quote items with calculations
      const quoteItems: MockQuoteItem[] = quoteData.items.map((itemSpec, index) => {
        const inventoryItem = this.inventory.get(itemSpec.itemId)!;
        
        // Use overrides or inventory defaults
        const unitPrice = itemSpec.unitPrice ?? inventoryItem.price;
        const vatRate = itemSpec.vatRate ?? inventoryItem.vatRate;
        const quantity = itemSpec.quantity;

        // Calculate line totals
        const subtotal = unitPrice * quantity;
        const vatAmount = inventoryItem.vatIncluded 
          ? subtotal - (subtotal / (1 + vatRate))
          : subtotal * vatRate;
        const totalWithVat = inventoryItem.vatIncluded 
          ? subtotal 
          : subtotal + vatAmount;

        return {
          id: index + 1,
          quoteId,
          itemId: itemSpec.itemId,
          itemName: inventoryItem.name,
          itemSku: inventoryItem.sku,
          unitPrice,
          quantity,
          subtotal,
          vatRate,
          vatAmount: parseFloat(vatAmount.toFixed(2)),
          totalWithVat: parseFloat(totalWithVat.toFixed(2)),
          unit: inventoryItem.unit,
          location: inventoryItem.location,
          categoryName: inventoryItem.categoryName,
        };
      });

      // Calculate quote totals
      const subtotalAmount = parseFloat(
        quoteItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
      );
      const vatAmount = parseFloat(
        quoteItems.reduce((sum, item) => sum + item.vatAmount, 0).toFixed(2)
      );
      const totalAmount = parseFloat(
        quoteItems.reduce((sum, item) => sum + item.totalWithVat, 0).toFixed(2)
      );

      const quote: MockQuote = {
        id: quoteId,
        quoteId: `Q${Date.now()}${Math.random().toString(36).substr(2, 3)}`,
        quoteName: quoteData.quoteName,
        chargeCode: quoteData.chargeCode,
        subtotalAmount,
        vatAmount,
        totalAmount,
        vatApplied: true,
        customerInfo: quoteData.customerInfo,
        notes: quoteData.notes,
        status: quoteData.status || 'draft',
        createdBy: quoteData.createdBy,
        createdAt: now,
        items: quoteItems,
      };

      this.quotes.set(quoteId, quote);
      return { success: true, quote };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Validate charge code for quote processing
   */
  private validateChargeCode(chargeCode: string, items: MockQuoteItem[]): {
    valid: boolean;
    error?: string;
  } {
    const charge = this.chargeCodes.get(chargeCode);
    if (!charge) {
      return { valid: false, error: `Charge code '${chargeCode}' not found` };
    }

    if (!charge.isActive) {
      return { valid: false, error: `Charge code '${chargeCode}' is inactive` };
    }

    const now = new Date();
    if (now < charge.validFrom || now > charge.validTo) {
      return { 
        valid: false, 
        error: `Charge code '${chargeCode}' is not valid for current date` 
      };
    }

    // Check category restrictions
    if (charge.allowedCategories && charge.allowedCategories.length > 0) {
      const restrictedItems = items.filter(item => {
        const inventoryItem = this.inventory.get(item.itemId);
        return inventoryItem && 
               !charge.allowedCategories!.includes(inventoryItem.categoryId);
      });

      if (restrictedItems.length > 0) {
        return {
          valid: false,
          error: `Charge code '${chargeCode}' cannot be used for items in categories: ` +
                 restrictedItems.map(item => item.categoryName).join(', ')
        };
      }
    }

    if (charge.excludedCategories && charge.excludedCategories.length > 0) {
      const excludedItems = items.filter(item => {
        const inventoryItem = this.inventory.get(item.itemId);
        return inventoryItem && 
               charge.excludedCategories!.includes(inventoryItem.categoryId);
      });

      if (excludedItems.length > 0) {
        return {
          valid: false,
          error: `Charge code '${chargeCode}' cannot be used for items in categories: ` +
                 excludedItems.map(item => item.categoryName).join(', ')
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check stock availability for all items in quote
   */
  private validateStockAvailability(items: MockQuoteItem[]): {
    valid: boolean;
    shortages?: Array<{
      itemName: string;
      requested: number;
      available: number;
      shortfall: number;
    }>;
  } {
    const shortages: Array<{
      itemName: string;
      requested: number;
      available: number;
      shortfall: number;
    }> = [];

    for (const quoteItem of items) {
      const inventoryItem = this.inventory.get(quoteItem.itemId);
      if (inventoryItem) {
        const available = inventoryItem.currentStock;
        const requested = quoteItem.quantity;

        if (available < requested) {
          shortages.push({
            itemName: quoteItem.itemName,
            requested,
            available,
            shortfall: requested - available,
          });
        }
      }
    }

    return {
      valid: shortages.length === 0,
      shortages: shortages.length > 0 ? shortages : undefined,
    };
  }

  /**
   * Process quote to create sale (atomic operation)
   */
  async processQuote(
    quoteId: number, 
    processedBy: string,
    processDate?: Date
  ): Promise<{ success: boolean; sale?: MockSale; error?: string }> {
    try {
      const quote = this.quotes.get(quoteId);
      if (!quote) {
        return { success: false, error: 'Quote not found' };
      }

      if (quote.status === 'processed') {
        return { success: false, error: 'Quote has already been processed' };
      }

      // Step 1: Validate charge code
      const chargeValidation = this.validateChargeCode(quote.chargeCode, quote.items);
      if (!chargeValidation.valid) {
        return { success: false, error: chargeValidation.error };
      }

      // Step 2: Validate stock availability
      const stockValidation = this.validateStockAvailability(quote.items);
      if (!stockValidation.valid) {
        const shortageDetails = stockValidation.shortages!
          .map(s => `${s.itemName}: need ${s.requested}, only ${s.available} available (short ${s.shortfall})`)
          .join('; ');
        return { 
          success: false, 
          error: `Insufficient stock: ${shortageDetails}` 
        };
      }

      // ATOMIC TRANSACTION SIMULATION
      // In real implementation, all following steps would be in a database transaction

      // Step 3: Generate sale ID and create sale record
      const saleId = `S${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
      const saleDbId = ++this.saleCounter;
      const now = processDate || new Date();

      const saleItems: MockSaleItem[] = quote.items.map((quoteItem, index) => ({
        id: index + 1,
        saleId: saleDbId,
        itemId: quoteItem.itemId,
        itemName: quoteItem.itemName,   // Snapshot
        itemSku: quoteItem.itemSku,     // Snapshot
        unitPrice: quoteItem.unitPrice,  // Snapshot
        quantity: quoteItem.quantity,
        subtotal: quoteItem.subtotal,
        vatRate: quoteItem.vatRate,
        vatAmount: quoteItem.vatAmount,
        totalWithVat: quoteItem.totalWithVat,
        unit: quoteItem.unit,
        location: quoteItem.location,
        categoryName: quoteItem.categoryName,
      }));

      const sale: MockSale = {
        id: saleDbId,
        saleId,
        chargeCode: quote.chargeCode,
        subtotalAmount: quote.subtotalAmount,
        vatAmount: quote.vatAmount,
        totalAmount: quote.totalAmount,
        vatApplied: quote.vatApplied,
        customerInfo: quote.customerInfo,
        notes: quote.notes,
        status: 'completed',
        isPaid: false, // Payment reconciliation comes later
        processedBy,
        createdAt: now,
        items: saleItems,
      };

      this.sales.set(saleDbId, sale);

      // Step 4: Deduct stock and create movement records
      for (const quoteItem of quote.items) {
        const inventoryItem = this.inventory.get(quoteItem.itemId)!;
        const previousStock = inventoryItem.currentStock;
        const newStock = previousStock - quoteItem.quantity;

        // Update inventory
        inventoryItem.currentStock = newStock;
        this.inventory.set(inventoryItem.id, inventoryItem);

        // Create stock movement
        const movement: MockStockMovement = {
          id: ++this.movementCounter,
          itemId: quoteItem.itemId,
          type: 'out',
          quantity: -quoteItem.quantity, // Negative for stock out
          previousStock,
          newStock,
          reason: `Sale ${saleId}`,
          performedBy: processedBy,
          saleId,
          createdAt: now,
        };
        this.stockMovements.set(movement.id, movement);
      }

      // Step 5: Update quote status
      quote.status = 'processed';
      quote.processedAt = now;
      this.quotes.set(quoteId, quote);

      return { success: true, sale };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during processing' 
      };
    }
  }

  /**
   * Get quote by ID
   */
  getQuote(id: number): MockQuote | undefined {
    return this.quotes.get(id);
  }

  /**
   * Get sale by ID
   */
  getSale(id: number): MockSale | undefined {
    return this.sales.get(id);
  }

  /**
   * Get stock movements for an item
   */
  getStockMovements(itemId: number): MockStockMovement[] {
    return Array.from(this.stockMovements.values())
      .filter(movement => movement.itemId === itemId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get current inventory item
   */
  getInventoryItem(id: number): MockInventoryItem | undefined {
    return this.inventory.get(id);
  }

  /**
   * Get all sales
   */
  getAllSales(): MockSale[] {
    return Array.from(this.sales.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Simulate conversion rollback (for error testing)
   */
  simulateTransactionFailure = false;

  reset(): void {
    this.quotes.clear();
    this.sales.clear();
    this.inventory.clear();
    this.chargeCodes.clear();
    this.stockMovements.clear();
    this.quoteCounter = 0;
    this.saleCounter = 0;
    this.movementCounter = 0;
    this.simulateTransactionFailure = false;
  }
}

describe('Quote-to-Sale Conversion Unit Tests', () => {
  let service: MockQuoteToSaleService;
  let testInventoryItems: MockInventoryItem[];
  let testChargeCode: MockChargeCode;

  beforeEach(() => {
    service = new MockQuoteToSaleService();

    // Setup test inventory
    testInventoryItems = [
      service.setupInventoryItem({
        id: 1,
        name: 'Office Chair',
        sku: 'CHAIR-001',
        currentStock: 50,
        minimumStock: 5,
        price: 199.99,
        vatRate: 0.20,
        vatIncluded: true,
        unit: 'pieces',
        categoryId: 1,
        categoryName: 'Office Furniture',
      }),
      service.setupInventoryItem({
        id: 2,
        name: 'Laptop Computer',
        sku: 'LAPTOP-001',
        currentStock: 15,
        minimumStock: 3,
        price: 999.99,
        vatRate: 0.20,
        vatIncluded: false, // Price excludes VAT
        unit: 'pieces',
        categoryId: 2,
        categoryName: 'Electronics',
      }),
      service.setupInventoryItem({
        id: 3,
        name: 'Paper A4 Ream',
        sku: 'PAPER-001',
        currentStock: 200,
        minimumStock: 20,
        price: 4.99,
        vatRate: 0.0, // Zero VAT
        vatIncluded: true,
        unit: 'reams',
        categoryId: 3,
        categoryName: 'Stationery',
      }),
    ];

    // Setup test charge code
    testChargeCode = service.setupChargeCode({
      code: 'CS-2025-Q1',
      description: 'Computer Science Department Q1 2025',
      validFrom: new Date('2025-01-01'),
      validTo: new Date('2025-03-31'),
      isActive: true,
    });
  });

  afterEach(() => {
    service.reset();
  });

  describe('Quote Creation and Data Preservation', () => {

    it('should create quote with accurate VAT calculations', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        quoteName: 'Test Mixed VAT Quote',
        items: [
          { itemId: 1, quantity: 5 },    // VAT included: 5 × £199.99
          { itemId: 2, quantity: 1 },    // VAT excluded: 1 × £999.99 + VAT
          { itemId: 3, quantity: 10 },   // Zero VAT: 10 × £4.99
        ],
        customerInfo: { name: 'Test Customer', email: 'test@example.com' },
        notes: 'Mixed VAT rate testing',
        createdBy: 'test-user',
        status: 'draft',
      });

      expect(quoteResult.success).toBe(true);
      expect(quoteResult.quote).toBeTruthy();

      const quote = quoteResult.quote!;

      // Verify quote structure
      expect(quote.quoteId).toMatch(/^Q\d+[a-z0-9]{3}$/);
      expect(quote.quoteName).toBe('Test Mixed VAT Quote');
      expect(quote.chargeCode).toBe(testChargeCode.code);
      expect(quote.status).toBe('draft');
      expect(quote.items).toHaveLength(3);

      // Verify item 1 (VAT included)
      const item1 = quote.items[0];
      expect(item1.itemName).toBe('Office Chair');
      expect(item1.unitPrice).toBe(199.99);
      expect(item1.quantity).toBe(5);
      expect(item1.subtotal).toBe(999.95); // 5 × 199.99
      expect(item1.vatRate).toBe(0.20);
      // VAT included: VAT = subtotal - (subtotal / (1 + vatRate))
      expect(item1.vatAmount).toBeCloseTo(166.63, 2); // 999.95 - (999.95 / 1.20)
      expect(item1.totalWithVat).toBe(999.95); // Same as subtotal for VAT included

      // Verify item 2 (VAT excluded)
      const item2 = quote.items[1];
      expect(item2.itemName).toBe('Laptop Computer');
      expect(item2.unitPrice).toBe(999.99);
      expect(item2.quantity).toBe(1);
      expect(item2.subtotal).toBe(999.99);
      expect(item2.vatRate).toBe(0.20);
      // VAT excluded: VAT = subtotal * vatRate
      expect(item2.vatAmount).toBe(200.00); // 999.99 × 0.20
      expect(item2.totalWithVat).toBe(1199.99); // 999.99 + 200.00

      // Verify item 3 (Zero VAT)
      const item3 = quote.items[2];
      expect(item3.itemName).toBe('Paper A4 Ream');
      expect(item3.unitPrice).toBe(4.99);
      expect(item3.quantity).toBe(10);
      expect(item3.subtotal).toBe(49.90);
      expect(item3.vatRate).toBe(0.0);
      expect(item3.vatAmount).toBe(0.00);
      expect(item3.totalWithVat).toBe(49.90);

      // Verify quote totals
      expect(quote.subtotalAmount).toBeCloseTo(2049.84, 2); // 999.95 + 999.99 + 49.90
      expect(quote.vatAmount).toBeCloseTo(366.63, 2); // 166.63 + 200.00 + 0.00
      expect(quote.totalAmount).toBeCloseTo(2249.84, 2); // 999.95 + 1199.99 + 49.90
    });

    it('should preserve customer information and notes', async () => {
      const customerInfo = {
        name: 'Dr. Jane Smith',
        department: 'Computer Science',
        email: 'j.smith@university.edu',
        phone: '+44 123 456 7890',
        deliveryAddress: 'Room 201, CS Building',
      };

      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 2 }],
        customerInfo,
        notes: 'Urgent delivery required for conference setup',
        createdBy: 'test-user',
      });

      expect(quoteResult.success).toBe(true);
      const quote = quoteResult.quote!;

      expect(quote.customerInfo).toEqual(customerInfo);
      expect(quote.notes).toBe('Urgent delivery required for conference setup');
    });

    it('should handle price and VAT rate overrides', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          {
            itemId: 1,
            quantity: 3,
            unitPrice: 150.00,  // Override: normally £199.99
            vatRate: 0.05,      // Override: normally 0.20 (20%)
          },
        ],
        createdBy: 'test-user',
      });

      expect(quoteResult.success).toBe(true);
      const quote = quoteResult.quote!;
      const item = quote.items[0];

      expect(item.unitPrice).toBe(150.00); // Overridden price
      expect(item.vatRate).toBe(0.05);     // Overridden VAT rate
      expect(item.subtotal).toBe(450.00);  // 3 × 150.00

      // Since original item has vatIncluded=true, VAT calculated as included
      const expectedVat = 450.00 - (450.00 / (1 + 0.05)); // VAT included calculation
      expect(item.vatAmount).toBeCloseTo(expectedVat, 2);
    });
  });

  describe('Charge Code Validation', () => {

    it('should validate active charge codes with valid dates', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(true);
      expect(processResult.sale).toBeTruthy();
    });

    it('should reject inactive charge codes', async () => {
      // Create inactive charge code
      const inactiveChargeCode = service.setupChargeCode({
        code: 'INACTIVE-001',
        description: 'Inactive charge code',
        isActive: false,
      });

      const quoteResult = await service.createQuote({
        chargeCode: inactiveChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toContain('inactive');
    });

    it('should reject expired charge codes', async () => {
      // Create expired charge code
      const expiredChargeCode = service.setupChargeCode({
        code: 'EXPIRED-001',
        description: 'Expired charge code',
        validFrom: new Date('2023-01-01'),
        validTo: new Date('2023-12-31'), // Expired
        isActive: true,
      });

      const quoteResult = await service.createQuote({
        chargeCode: expiredChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toContain('not valid for current date');
    });

    it('should enforce category restrictions', async () => {
      // Create restricted charge code (only Electronics allowed)
      const restrictedChargeCode = service.setupChargeCode({
        code: 'ELEC-ONLY',
        description: 'Electronics only',
        allowedCategories: [2], // Only Electronics (categoryId: 2)
      });

      const quoteResult = await service.createQuote({
        chargeCode: restrictedChargeCode.code,
        items: [
          { itemId: 1, quantity: 1 }, // Office Furniture (not allowed)
          { itemId: 2, quantity: 1 }, // Electronics (allowed)
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toContain('cannot be used for items in categories');
      expect(processResult.error).toContain('Office Furniture');
    });

    it('should enforce category exclusions', async () => {
      // Create charge code excluding Stationery
      const excludingChargeCode = service.setupChargeCode({
        code: 'NO-STATIONERY',
        description: 'No stationery items',
        excludedCategories: [3], // No Stationery (categoryId: 3)
      });

      const quoteResult = await service.createQuote({
        chargeCode: excludingChargeCode.code,
        items: [
          { itemId: 1, quantity: 1 }, // Office Furniture (allowed)
          { itemId: 3, quantity: 1 }, // Stationery (excluded)
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toContain('cannot be used for items in categories');
      expect(processResult.error).toContain('Stationery');
    });

    it('should accept valid category combinations', async () => {
      // Create charge code allowing Office Furniture and Electronics
      const multiCategoryChargeCode = service.setupChargeCode({
        code: 'OFFICE-TECH',
        description: 'Office and tech items',
        allowedCategories: [1, 2], // Office Furniture and Electronics
      });

      const quoteResult = await service.createQuote({
        chargeCode: multiCategoryChargeCode.code,
        items: [
          { itemId: 1, quantity: 2 }, // Office Furniture
          { itemId: 2, quantity: 1 }, // Electronics
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(true);
      expect(processResult.sale).toBeTruthy();
    });
  });

  describe('Stock Availability and Management', () => {

    it('should validate sufficient stock before processing', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          { itemId: 1, quantity: 10 }, // 10 chairs (50 available)
          { itemId: 2, quantity: 5 },  // 5 laptops (15 available)
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(true);
      expect(processResult.sale).toBeTruthy();

      // Check stock was deducted
      const chair = service.getInventoryItem(1);
      const laptop = service.getInventoryItem(2);
      
      expect(chair!.currentStock).toBe(40); // 50 - 10
      expect(laptop!.currentStock).toBe(10); // 15 - 5
    });

    it('should reject processing when stock is insufficient', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          { itemId: 1, quantity: 60 }, // 60 chairs (only 50 available)
          { itemId: 2, quantity: 5 },  // 5 laptops (15 available)
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toContain('Insufficient stock');
      expect(processResult.error).toContain('Office Chair: need 60, only 50 available (short 10)');

      // Verify stock wasn't changed
      const chair = service.getInventoryItem(1);
      const laptop = service.getInventoryItem(2);
      
      expect(chair!.currentStock).toBe(50); // Unchanged
      expect(laptop!.currentStock).toBe(15); // Unchanged
    });

    it('should handle multiple stock shortages in error message', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          { itemId: 1, quantity: 55 }, // 55 chairs (50 available, short 5)
          { itemId: 2, quantity: 20 }, // 20 laptops (15 available, short 5)
          { itemId: 3, quantity: 100 }, // 100 reams (200 available, OK)
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toContain('Insufficient stock');
      expect(processResult.error).toContain('Office Chair: need 55, only 50 available (short 5)');
      expect(processResult.error).toContain('Laptop Computer: need 20, only 15 available (short 5)');
      expect(processResult.error).not.toContain('Paper A4 Ream'); // Should not mention items with sufficient stock
    });

    it('should create accurate stock movement records', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          { itemId: 1, quantity: 7 },
          { itemId: 3, quantity: 25 },
        ],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(true);
      const sale = processResult.sale!;

      // Verify stock movements were created
      const chairMovements = service.getStockMovements(1);
      const paperMovements = service.getStockMovements(3);

      expect(chairMovements).toHaveLength(1);
      expect(paperMovements).toHaveLength(1);

      // Check chair movement
      const chairMovement = chairMovements[0];
      expect(chairMovement.type).toBe('out');
      expect(chairMovement.quantity).toBe(-7); // Negative for stock out
      expect(chairMovement.previousStock).toBe(50);
      expect(chairMovement.newStock).toBe(43); // 50 - 7
      expect(chairMovement.reason).toBe(`Sale ${sale.saleId}`);
      expect(chairMovement.performedBy).toBe('test-user');
      expect(chairMovement.saleId).toBe(sale.saleId);

      // Check paper movement
      const paperMovement = paperMovements[0];
      expect(paperMovement.type).toBe('out');
      expect(paperMovement.quantity).toBe(-25);
      expect(paperMovement.previousStock).toBe(200);
      expect(paperMovement.newStock).toBe(175); // 200 - 25
    });
  });

  describe('Sale Creation and Data Integrity', () => {

    it('should generate unique formatted sale IDs', async () => {
      const quoteResult1 = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      const quoteResult2 = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 2, quantity: 1 }],
        createdBy: 'test-user',
      });

      const processResult1 = await service.processQuote(quoteResult1.quote!.id, 'test-user');
      const processResult2 = await service.processQuote(quoteResult2.quote!.id, 'test-user');

      expect(processResult1.success).toBe(true);
      expect(processResult2.success).toBe(true);

      const sale1 = processResult1.sale!;
      const sale2 = processResult2.sale!;

      // Verify sale ID format (S + timestamp + random)
      expect(sale1.saleId).toMatch(/^S\d+[a-z0-9]{4}$/);
      expect(sale2.saleId).toMatch(/^S\d+[a-z0-9]{4}$/);
      expect(sale1.saleId).not.toBe(sale2.saleId); // Must be unique
    });

    it('should preserve all data from quote to sale', async () => {
      const customerInfo = { name: 'Dr. Smith', department: 'Physics' };
      const notes = 'Special handling required';

      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        quoteName: 'Physics Equipment Order',
        items: [
          { itemId: 1, quantity: 3, unitPrice: 180.00 }, // Custom price
          { itemId: 2, quantity: 1 },
        ],
        customerInfo,
        notes,
        createdBy: 'test-user',
      });

      const processDate = new Date('2025-01-15T10:30:00Z');
      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'manager-user',
        processDate
      );

      expect(processResult.success).toBe(true);
      const sale = processResult.sale!;
      const quote = quoteResult.quote!;

      // Verify sale data preservation
      expect(sale.chargeCode).toBe(quote.chargeCode);
      expect(sale.subtotalAmount).toBe(quote.subtotalAmount);
      expect(sale.vatAmount).toBe(quote.vatAmount);
      expect(sale.totalAmount).toBe(quote.totalAmount);
      expect(sale.vatApplied).toBe(quote.vatApplied);
      expect(sale.customerInfo).toEqual(customerInfo);
      expect(sale.notes).toBe(notes);
      expect(sale.status).toBe('completed');
      expect(sale.isPaid).toBe(false);
      expect(sale.processedBy).toBe('manager-user');
      expect(sale.createdAt).toEqual(processDate);

      // Verify sale items are snapshots from quote
      expect(sale.items).toHaveLength(2);
      
      const saleItem1 = sale.items[0];
      const quoteItem1 = quote.items[0];
      
      expect(saleItem1.itemId).toBe(quoteItem1.itemId);
      expect(saleItem1.itemName).toBe(quoteItem1.itemName); // Snapshot
      expect(saleItem1.itemSku).toBe(quoteItem1.itemSku);   // Snapshot
      expect(saleItem1.unitPrice).toBe(180.00);             // Custom price preserved
      expect(saleItem1.quantity).toBe(quoteItem1.quantity);
      expect(saleItem1.vatRate).toBe(quoteItem1.vatRate);
      expect(saleItem1.unit).toBe(quoteItem1.unit);
      expect(saleItem1.location).toBe(quoteItem1.location);
    });

    it('should set sale status and payment flags correctly', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(true);
      const sale = processResult.sale!;

      expect(sale.status).toBe('completed');
      expect(sale.isPaid).toBe(false); // Payment reconciliation comes later
    });

    it('should update quote status after processing', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
        status: 'saved',
      });

      expect(quoteResult.quote!.status).toBe('saved');
      expect(quoteResult.quote!.processedAt).toBeUndefined();

      const processDate = new Date();
      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user',
        processDate
      );

      expect(processResult.success).toBe(true);

      // Check quote was updated
      const updatedQuote = service.getQuote(quoteResult.quote!.id);
      expect(updatedQuote!.status).toBe('processed');
      expect(updatedQuote!.processedAt).toEqual(processDate);
    });

    it('should prevent processing of already processed quotes', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      // Process quote first time
      const firstProcessResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );
      expect(firstProcessResult.success).toBe(true);

      // Try to process again
      const secondProcessResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );
      expect(secondProcessResult.success).toBe(false);
      expect(secondProcessResult.error).toBe('Quote has already been processed');
    });
  });

  describe('Fractional Quantities and Complex Scenarios', () => {

    beforeEach(() => {
      // Add item that supports fractional quantities
      service.setupInventoryItem({
        id: 4,
        name: 'Cable by Meter',
        sku: 'CABLE-001',
        currentStock: 100.5,
        minimumStock: 10.0,
        price: 2.50,
        vatRate: 0.20,
        vatIncluded: true,
        unit: 'meters',
        categoryId: 2,
        categoryName: 'Electronics',
      });
    });

    it('should handle fractional quantities in quotes and sales', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          { itemId: 4, quantity: 12.75 }, // 12.75 meters of cable
          { itemId: 3, quantity: 2.5 },   // 2.5 reams of paper
        ],
        createdBy: 'test-user',
      });

      expect(quoteResult.success).toBe(true);
      const quote = quoteResult.quote!;

      // Verify fractional calculations
      const cableItem = quote.items[0];
      expect(cableItem.quantity).toBe(12.75);
      expect(cableItem.subtotal).toBe(31.88); // 12.75 × 2.50

      const paperItem = quote.items[1];
      expect(paperItem.quantity).toBe(2.5);
      expect(paperItem.subtotal).toBe(12.48); // 2.5 × 4.99

      const processResult = await service.processQuote(quote.id, 'test-user');
      expect(processResult.success).toBe(true);

      // Verify fractional stock deduction
      const cableInventory = service.getInventoryItem(4);
      const paperInventory = service.getInventoryItem(3);

      expect(cableInventory!.currentStock).toBe(87.75); // 100.5 - 12.75
      expect(paperInventory!.currentStock).toBe(197.5); // 200 - 2.5
    });

    it('should handle zero quantity items gracefully', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [
          { itemId: 1, quantity: 0 }, // Zero quantity should be valid but unusual
          { itemId: 2, quantity: 1 },
        ],
        createdBy: 'test-user',
      });

      expect(quoteResult.success).toBe(true);
      const quote = quoteResult.quote!;

      const zeroItem = quote.items[0];
      expect(zeroItem.quantity).toBe(0);
      expect(zeroItem.subtotal).toBe(0);
      expect(zeroItem.vatAmount).toBe(0);
      expect(zeroItem.totalWithVat).toBe(0);

      const processResult = await service.processQuote(quote.id, 'test-user');
      expect(processResult.success).toBe(true);

      // Verify no stock deduction for zero quantity
      const chairInventory = service.getInventoryItem(1);
      expect(chairInventory!.currentStock).toBe(50); // Unchanged
    });
  });

  describe('Error Handling and Edge Cases', () => {

    it('should handle non-existent quote processing', async () => {
      const processResult = await service.processQuote(99999, 'test-user');

      expect(processResult.success).toBe(false);
      expect(processResult.error).toBe('Quote not found');
    });

    it('should handle non-existent charge codes during processing', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: 'NONEXISTENT-CODE',
        items: [{ itemId: 1, quantity: 1 }],
        createdBy: 'test-user',
      });

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);
      expect(processResult.error).toBe("Charge code 'NONEXISTENT-CODE' not found");
    });

    it('should maintain data consistency during processing failures', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 100 }], // Too many chairs
        createdBy: 'test-user',
      });

      // Record initial state
      const initialChairStock = service.getInventoryItem(1)!.currentStock;
      const initialMovements = service.getStockMovements(1).length;
      const initialSales = service.getAllSales().length;

      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(false);

      // Verify no changes were made (atomic transaction behavior)
      expect(service.getInventoryItem(1)!.currentStock).toBe(initialChairStock);
      expect(service.getStockMovements(1)).toHaveLength(initialMovements);
      expect(service.getAllSales()).toHaveLength(initialSales);

      // Quote should remain unprocessed
      const quote = service.getQuote(quoteResult.quote!.id);
      expect(quote!.status).not.toBe('processed');
      expect(quote!.processedAt).toBeUndefined();
    });

    it('should handle items that become inactive between quote creation and processing', async () => {
      const quoteResult = await service.createQuote({
        chargeCode: testChargeCode.code,
        items: [{ itemId: 1, quantity: 5 }],
        createdBy: 'test-user',
      });

      // Deactivate item after quote creation but before processing
      const inventoryItem = service.getInventoryItem(1)!;
      inventoryItem.isActive = false;

      // Processing should still work since quote was created when item was active
      // and we have a snapshot of the item data
      const processResult = await service.processQuote(
        quoteResult.quote!.id,
        'test-user'
      );

      expect(processResult.success).toBe(true);
      expect(processResult.sale).toBeTruthy();
    });
  });
});