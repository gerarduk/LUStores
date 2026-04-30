/**
 * Supplier Management Unit Tests
 * 
 * Tests core supplier management functionality including:
 * 1. Supplier CRUD operations validation
 * 2. Supplier data validation and sanitization
 * 3. Email and field format validation
 * 4. Duplicate ID prevention
 * 5. Required field enforcement
 * 6. Optional field handling
 * 7. String trimming and null conversion
 * 8. Supplier schema compliance
 * 9. Edge case handling
 * 10. Input sanitization security
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

interface MockSupplier {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  accountNumber?: string | null;
  notesId?: number | null;
  createdAt: Date;
  updatedAt?: Date;
}

interface MockInsertSupplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  accountNumber?: string;
  notesId?: number;
}

interface MockSource {
  id: number;
  itemId: number;
  supplierId: string;
  price?: string | null;
  notesId?: number | null;
  createdAt: Date;
}

interface MockInsertSource {
  itemId: number;
  supplierId: string;
  price?: string;
  notesId?: number;
}

/**
 * Mock supplier service for testing
 */
class MockSupplierService {
  private suppliers: Map<string, MockSupplier> = new Map();
  private sources: Map<number, MockSource> = new Map();
  private sourceIdCounter = 1;

  constructor() {
    this.reset();
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Clean supplier data by trimming strings and converting empty strings to null
   */
  private cleanSupplierData(data: MockInsertSupplier): MockInsertSupplier {
    return {
      id: data.id.trim(),
      name: data.name.trim(),
      contact: data.contact?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      accountNumber: data.accountNumber?.trim() || undefined,
      notesId: data.notesId,
    };
  }

  /**
   * Validate supplier data
   */
  private validateSupplierData(data: MockInsertSupplier): void {
    // Required fields
    if (!data.id || !data.id.trim()) {
      throw new Error('Supplier ID is required');
    }

    if (!data.name || !data.name.trim()) {
      throw new Error('Supplier name is required');
    }

    // Email validation (if provided)
    if (data.email && data.email.trim() && !this.isValidEmail(data.email.trim())) {
      throw new Error('Invalid email format');
    }

    // Account number length validation
    if (data.accountNumber && data.accountNumber.trim().length > 25) {
      throw new Error('Account number cannot exceed 25 characters');
    }

    // ID format validation (basic alphanumeric with hyphens)
    const idPattern = /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$|^[A-Z0-9]$/;
    if (!idPattern.test(data.id.trim())) {
      throw new Error('Supplier ID must contain only uppercase letters, numbers, and hyphens, and cannot start or end with a hyphen');
    }
  }

  /**
   * Get all suppliers
   */
  async getSuppliers(): Promise<MockSupplier[]> {
    return Array.from(this.suppliers.values());
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(id: string): Promise<MockSupplier | undefined> {
    return this.suppliers.get(id);
  }

  /**
   * Create new supplier
   */
  async createSupplier(supplierData: MockInsertSupplier): Promise<MockSupplier> {
    try {
      // Check for duplicate ID
      if (this.suppliers.has(supplierData.id)) {
        throw new Error(`Supplier with ID '${supplierData.id}' already exists`);
      }

      // Validate data
      this.validateSupplierData(supplierData);

      // Clean data
      const cleanedData = this.cleanSupplierData(supplierData);

      // Create supplier
      const supplier: MockSupplier = {
        id: cleanedData.id,
        name: cleanedData.name,
        contact: cleanedData.contact || null,
        email: cleanedData.email || null,
        phone: cleanedData.phone || null,
        address: cleanedData.address || null,
        accountNumber: cleanedData.accountNumber || null,
        notesId: cleanedData.notesId || null,
        createdAt: new Date(),
      };

      this.suppliers.set(supplier.id, supplier);
      return supplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(id: string, supplierData: Partial<MockInsertSupplier>): Promise<MockSupplier> {
    try {
      const existingSupplier = this.suppliers.get(id);
      if (!existingSupplier) {
        throw new Error(`Supplier with ID '${id}' not found`);
      }

      // Create full data object for validation
      const fullData = {
        id: existingSupplier.id,
        name: supplierData.name || existingSupplier.name || '',
        contact: supplierData.contact,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        accountNumber: supplierData.accountNumber,
        notesId: supplierData.notesId,
      };

      // Validate updated data
      this.validateSupplierData(fullData);

      // Clean data
      const cleanedData = this.cleanSupplierData(fullData);

      // Update supplier
      const updatedSupplier: MockSupplier = {
        ...existingSupplier,
        name: cleanedData.name,
        contact: cleanedData.contact || null,
        email: cleanedData.email || null,
        phone: cleanedData.phone || null,
        address: cleanedData.address || null,
        accountNumber: cleanedData.accountNumber || null,
        notesId: cleanedData.notesId || null,
        updatedAt: new Date(),
      };

      this.suppliers.set(id, updatedSupplier);
      return updatedSupplier;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(id: string): Promise<void> {
    try {
      const supplier = this.suppliers.get(id);
      if (!supplier) {
        throw new Error(`Supplier with ID '${id}' not found`);
      }

      // Check for dependencies
      const supplierSources = Array.from(this.sources.values()).filter(source => source.supplierId === id);
      if (supplierSources.length > 0) {
        throw new Error(`Cannot delete supplier '${id}' because it has ${supplierSources.length} item relationships. Remove all item relationships first.`);
      }

      this.suppliers.delete(id);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  /**
   * Check if supplier can be safely deleted
   */
  async checkSupplierDeletion(id: string): Promise<{
    canDelete: boolean;
    blockers: string[];
    itemCount: number;
    orderCount: number;
    totalOrderValue: number;
  }> {
    try {
      const supplier = this.suppliers.get(id);
      if (!supplier) {
        throw new Error(`Supplier with ID '${id}' not found`);
      }

      const supplierSources = Array.from(this.sources.values()).filter(source => source.supplierId === id);
      const blockers: string[] = [];

      if (supplierSources.length > 0) {
        blockers.push(`${supplierSources.length} item relationships`);
      }

      return {
        canDelete: blockers.length === 0,
        blockers,
        itemCount: supplierSources.length,
        orderCount: 0, // Mock value
        totalOrderValue: 0, // Mock value
      };
    } catch (error) {
      console.error('Error checking supplier deletion:', error);
      throw error;
    }
  }

  /**
   * Safe delete supplier (with checks)
   */
  async safeDeleteSupplier(id: string): Promise<void> {
    try {
      const deletionCheck = await this.checkSupplierDeletion(id);
      
      if (!deletionCheck.canDelete) {
        throw new Error(`Cannot delete supplier: ${deletionCheck.blockers.join(', ')}`);
      }

      await this.deleteSupplier(id);
    } catch (error) {
      console.error('Error safely deleting supplier:', error);
      throw error;
    }
  }

  /**
   * Create source (item-supplier relationship)
   */
  async createSource(sourceData: MockInsertSource): Promise<MockSource> {
    try {
      // Validate supplier exists
      const supplier = this.suppliers.get(sourceData.supplierId);
      if (!supplier) {
        throw new Error(`Supplier with ID '${sourceData.supplierId}' not found`);
      }

      // Validate itemId
      if (!sourceData.itemId || sourceData.itemId <= 0) {
        throw new Error('Valid item ID is required');
      }

      // Check for duplicate source relationship
      const existingSource = Array.from(this.sources.values()).find(
        source => source.itemId === sourceData.itemId && source.supplierId === sourceData.supplierId
      );
      if (existingSource) {
        throw new Error(`Relationship already exists between item ${sourceData.itemId} and supplier ${sourceData.supplierId}`);
      }

      // Validate price format (if provided)
      if (sourceData.price) {
        const priceNum = parseFloat(sourceData.price);
        if (isNaN(priceNum) || priceNum < 0) {
          throw new Error('Price must be a valid positive number');
        }
      }

      const source: MockSource = {
        id: this.sourceIdCounter++,
        itemId: sourceData.itemId,
        supplierId: sourceData.supplierId,
        price: sourceData.price || null,
        notesId: sourceData.notesId || null,
        createdAt: new Date(),
      };

      this.sources.set(source.id, source);
      return source;
    } catch (error) {
      console.error('Error creating source:', error);
      throw error;
    }
  }

  /**
   * Delete source
   */
  async deleteSource(id: number): Promise<void> {
    try {
      const source = this.sources.get(id);
      if (!source) {
        throw new Error(`Source with ID '${id}' not found`);
      }

      this.sources.delete(id);
    } catch (error) {
      console.error('Error deleting source:', error);
      throw error;
    }
  }

  /**
   * Get sources by supplier
   */
  async getSourcesBySupplier(supplierId: string): Promise<MockSource[]> {
    return Array.from(this.sources.values()).filter(source => source.supplierId === supplierId);
  }

  /**
   * Get sources by item
   */
  async getSourcesByItem(itemId: number): Promise<MockSource[]> {
    return Array.from(this.sources.values()).filter(source => source.itemId === itemId);
  }

  /**
   * Reset mock data
   */
  reset(): void {
    this.suppliers.clear();
    this.sources.clear();
    this.sourceIdCounter = 1;

    // Add some default test data
    this.suppliers.set('TEST-DEFAULT-001', {
      id: 'TEST-DEFAULT-001',
      name: 'Default Test Supplier',
      contact: 'Test Contact',
      email: 'test@example.com',
      phone: '+44 123 456 7890',
      address: '123 Test Street, Test City',
      accountNumber: 'ACC001',
      notesId: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });
  }

  /**
   * Get supplier count
   */
  getSupplierCount(): number {
    return this.suppliers.size;
  }

  /**
   * Get source count
   */
  getSourceCount(): number {
    return this.sources.size;
  }
}

describe('Supplier Management Unit Tests', () => {
  let supplierService: MockSupplierService;

  beforeEach(() => {
    supplierService = new MockSupplierService();
  });

  afterEach(() => {
    supplierService.reset();
  });

  describe('Supplier CRUD Operations', () => {

    it('should create a supplier with all required fields', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'CREATE-TEST-001',
        name: 'Complete Test Supplier',
        contact: 'John Smith',
        email: 'john@testsupplier.com',
        phone: '+44 20 7946 0958',
        address: '456 Business Park, London, UK',
        accountNumber: 'ACC123456',
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.id).toBe('CREATE-TEST-001');
      expect(supplier.name).toBe('Complete Test Supplier');
      expect(supplier.contact).toBe('John Smith');
      expect(supplier.email).toBe('john@testsupplier.com');
      expect(supplier.phone).toBe('+44 20 7946 0958');
      expect(supplier.address).toBe('456 Business Park, London, UK');
      expect(supplier.accountNumber).toBe('ACC123456');
      expect(supplier.createdAt).toBeInstanceOf(Date);
    });

    it('should create a supplier with only required fields', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'MINIMAL-001',
        name: 'Minimal Test Supplier',
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.id).toBe('MINIMAL-001');
      expect(supplier.name).toBe('Minimal Test Supplier');
      expect(supplier.contact).toBeNull();
      expect(supplier.email).toBeNull();
      expect(supplier.phone).toBeNull();
      expect(supplier.address).toBeNull();
      expect(supplier.accountNumber).toBeNull();
      expect(supplier.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve all suppliers', async () => {
      const suppliers = await supplierService.getSuppliers();

      expect(suppliers).toHaveLength(1); // Default test supplier
      expect(suppliers[0].id).toBe('TEST-DEFAULT-001');
    });

    it('should retrieve a specific supplier by ID', async () => {
      const supplier = await supplierService.getSupplier('TEST-DEFAULT-001');

      expect(supplier).toBeDefined();
      expect(supplier!.id).toBe('TEST-DEFAULT-001');
      expect(supplier!.name).toBe('Default Test Supplier');
    });

    it('should return undefined for non-existent supplier', async () => {
      const supplier = await supplierService.getSupplier('NON-EXISTENT');

      expect(supplier).toBeUndefined();
    });

    it('should update an existing supplier', async () => {
      const updateData: Partial<MockInsertSupplier> = {
        name: 'Updated Test Supplier',
        contact: 'Updated Contact',
        email: 'updated@example.com',
        phone: '+44 987 654 3210',
      };

      const updatedSupplier = await supplierService.updateSupplier('TEST-DEFAULT-001', updateData);

      expect(updatedSupplier.id).toBe('TEST-DEFAULT-001');
      expect(updatedSupplier.name).toBe('Updated Test Supplier');
      expect(updatedSupplier.contact).toBe('Updated Contact');
      expect(updatedSupplier.email).toBe('updated@example.com');
      expect(updatedSupplier.phone).toBe('+44 987 654 3210');
      expect(updatedSupplier.address).toBe('123 Test Street, Test City'); // Unchanged
      expect(updatedSupplier.updatedAt).toBeInstanceOf(Date);
    });

    it('should delete an existing supplier', async () => {
      const beforeCount = supplierService.getSupplierCount();

      await supplierService.deleteSupplier('TEST-DEFAULT-001');

      const afterCount = supplierService.getSupplierCount();
      expect(afterCount).toBe(beforeCount - 1);

      const deletedSupplier = await supplierService.getSupplier('TEST-DEFAULT-001');
      expect(deletedSupplier).toBeUndefined();
    });
  });

  describe('Supplier Data Validation', () => {

    it('should reject supplier creation without ID', async () => {
      const supplierData: MockInsertSupplier = {
        id: '', // Empty ID
        name: 'Test Supplier',
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Supplier ID is required');
    });

    it('should reject supplier creation without name', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'NO-NAME-001',
        name: '', // Empty name
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Supplier name is required');
    });

    it('should reject supplier creation with invalid email', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'INVALID-EMAIL-001',
        name: 'Test Supplier',
        email: 'invalid-email-format',
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Invalid email format');
    });

    it('should reject supplier creation with account number too long', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'LONG-ACCOUNT-001',
        name: 'Test Supplier',
        accountNumber: '1234567890123456789012345678901', // 31 characters, max is 25
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Account number cannot exceed 25 characters');
    });

    it('should reject supplier creation with invalid ID format', async () => {
      const invalidIds = [
        '-STARTS-WITH-HYPHEN',
        'ENDS-WITH-HYPHEN-',
        'contains-lowercase',
        'CONTAINS@SYMBOLS',
        'CONTAINS SPACES',
        'CONTAINS.DOTS',
      ];

      for (const invalidId of invalidIds) {
        const supplierData: MockInsertSupplier = {
          id: invalidId,
          name: 'Test Supplier',
        };

        await expect(supplierService.createSupplier(supplierData)).rejects.toThrow(/Supplier ID must contain only uppercase letters/);
      }
    });

    it('should accept valid ID formats', async () => {
      const validIds = [
        'A',
        'ABC123',
        'TEST-001',
        'SUPPLIER-ABC-123',
        'A1B2C3',
      ];

      for (const validId of validIds) {
        const supplierData: MockInsertSupplier = {
          id: validId,
          name: `Test Supplier ${validId}`,
        };

        const supplier = await supplierService.createSupplier(supplierData);
        expect(supplier.id).toBe(validId);
      }
    });

    it('should prevent duplicate supplier IDs', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'DUPLICATE-001',
        name: 'First Supplier',
      };

      await supplierService.createSupplier(supplierData);

      const duplicateSupplierData: MockInsertSupplier = {
        id: 'DUPLICATE-001', // Same ID
        name: 'Second Supplier',
      };

      await expect(supplierService.createSupplier(duplicateSupplierData)).rejects.toThrow('Supplier with ID \'DUPLICATE-001\' already exists');
    });

    it('should validate email formats correctly', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first.last+tag@example.org',
        'test123@test-domain.com',
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'test@',
        'test.test',
        'test@domain',
        'test space@domain.com',
      ];

      // Test valid emails
      for (const email of validEmails) {
        const supplierData: MockInsertSupplier = {
          id: `VALID-EMAIL-${validEmails.indexOf(email)}`,
          name: 'Test Supplier',
          email,
        };

        const supplier = await supplierService.createSupplier(supplierData);
        expect(supplier.email).toBe(email);
      }

      // Test invalid emails
      for (const email of invalidEmails) {
        const supplierData: MockInsertSupplier = {
          id: `INVALID-EMAIL-${invalidEmails.indexOf(email)}`,
          name: 'Test Supplier',
          email,
        };

        await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Invalid email format');
      }
    });
  });

  describe('Data Sanitization and Cleaning', () => {

    it('should trim whitespace from string fields', async () => {
      const supplierData: MockInsertSupplier = {
        id: '  TRIM-TEST-001  ',
        name: '  Supplier with spaces  ',
        contact: '  Contact Person  ',
        email: '  test@example.com  ',
        phone: '  +44 123 456 789  ',
        address: '  123 Street Name  ',
        accountNumber: '  ACC123  ',
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.id).toBe('TRIM-TEST-001');
      expect(supplier.name).toBe('Supplier with spaces');
      expect(supplier.contact).toBe('Contact Person');
      expect(supplier.email).toBe('test@example.com');
      expect(supplier.phone).toBe('+44 123 456 789');
      expect(supplier.address).toBe('123 Street Name');
      expect(supplier.accountNumber).toBe('ACC123');
    });

    it('should convert empty strings to null for optional fields', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'EMPTY-STRINGS-001',
        name: 'Test Supplier',
        contact: '',
        email: '',
        phone: '',
        address: '',
        accountNumber: '',
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.contact).toBeNull();
      expect(supplier.email).toBeNull();
      expect(supplier.phone).toBeNull();
      expect(supplier.address).toBeNull();
      expect(supplier.accountNumber).toBeNull();
    });

    it('should handle undefined optional fields', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'UNDEFINED-FIELDS-001',
        name: 'Test Supplier',
        // All other fields undefined
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.contact).toBeNull();
      expect(supplier.email).toBeNull();
      expect(supplier.phone).toBeNull();
      expect(supplier.address).toBeNull();
      expect(supplier.accountNumber).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {

    it('should handle updating non-existent supplier', async () => {
      const updateData: Partial<MockInsertSupplier> = {
        name: 'Updated Name',
      };

      await expect(supplierService.updateSupplier('NON-EXISTENT', updateData)).rejects.toThrow('Supplier with ID \'NON-EXISTENT\' not found');
    });

    it('should handle deleting non-existent supplier', async () => {
      await expect(supplierService.deleteSupplier('NON-EXISTENT')).rejects.toThrow('Supplier with ID \'NON-EXISTENT\' not found');
    });

    it('should validate required fields on update', async () => {
      const updateData: Partial<MockInsertSupplier> = {
        name: '', // Empty name should fail
      };

      await expect(supplierService.updateSupplier('TEST-DEFAULT-001', updateData)).rejects.toThrow('Supplier name is required');
    });

    it('should validate email format on update', async () => {
      const updateData: Partial<MockInsertSupplier> = {
        email: 'invalid-email-format',
      };

      await expect(supplierService.updateSupplier('TEST-DEFAULT-001', updateData)).rejects.toThrow('Invalid email format');
    });

    it('should handle special characters in supplier data', async () => {
      const supplierData: MockInsertSupplier = {
        id: 'SPECIAL-CHARS-001',
        name: 'Supplier & Co. Ltd.',
        contact: 'José María García',
        email: 'test@example.co.uk',
        phone: '+44 (0)20 7946 0958',
        address: '123 O\'Reilly Street, Unit #5, London, UK',
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.name).toBe('Supplier & Co. Ltd.');
      expect(supplier.contact).toBe('José María García');
      expect(supplier.phone).toBe('+44 (0)20 7946 0958');
      expect(supplier.address).toBe('123 O\'Reilly Street, Unit #5, London, UK');
    });

    it('should handle very long field values within limits', async () => {
      const longName = 'A'.repeat(255); // Assuming reasonable name length limit
      const maxAccountNumber = '1'.repeat(25); // Max account number length

      const supplierData: MockInsertSupplier = {
        id: 'LONG-FIELDS-001',
        name: longName,
        accountNumber: maxAccountNumber,
      };

      const supplier = await supplierService.createSupplier(supplierData);

      expect(supplier.name).toBe(longName);
      expect(supplier.accountNumber).toBe(maxAccountNumber);
    });
  });

  describe('Supplier Safety and Deletion Checks', () => {

    it('should check supplier deletion safety with no dependencies', async () => {
      const deletionCheck = await supplierService.checkSupplierDeletion('TEST-DEFAULT-001');

      expect(deletionCheck.canDelete).toBe(true);
      expect(deletionCheck.blockers).toHaveLength(0);
      expect(deletionCheck.itemCount).toBe(0);
    });

    it('should prevent deletion when supplier has item relationships', async () => {
      // Create a source relationship
      const sourceData: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '99.99',
      };

      await supplierService.createSource(sourceData);

      const deletionCheck = await supplierService.checkSupplierDeletion('TEST-DEFAULT-001');

      expect(deletionCheck.canDelete).toBe(false);
      expect(deletionCheck.blockers).toContain('1 item relationships');
      expect(deletionCheck.itemCount).toBe(1);
    });

    it('should perform safe deletion when no blockers exist', async () => {
      const beforeCount = supplierService.getSupplierCount();

      await supplierService.safeDeleteSupplier('TEST-DEFAULT-001');

      const afterCount = supplierService.getSupplierCount();
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should prevent safe deletion when blockers exist', async () => {
      // Create a source relationship
      const sourceData: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '99.99',
      };

      await supplierService.createSource(sourceData);

      await expect(supplierService.safeDeleteSupplier('TEST-DEFAULT-001')).rejects.toThrow('Cannot delete supplier: 1 item relationships');
    });
  });

  describe('Source Management (Supplier-Item Relationships)', () => {

    it('should create a source relationship with price', async () => {
      const sourceData: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '49.99',
        notesId: 1,
      };

      const source = await supplierService.createSource(sourceData);

      expect(source.id).toBeGreaterThan(0);
      expect(source.itemId).toBe(1);
      expect(source.supplierId).toBe('TEST-DEFAULT-001');
      expect(source.price).toBe('49.99');
      expect(source.notesId).toBe(1);
      expect(source.createdAt).toBeInstanceOf(Date);
    });

    it('should create a source relationship without price', async () => {
      const sourceData: MockInsertSource = {
        itemId: 2,
        supplierId: 'TEST-DEFAULT-001',
      };

      const source = await supplierService.createSource(sourceData);

      expect(source.itemId).toBe(2);
      expect(source.supplierId).toBe('TEST-DEFAULT-001');
      expect(source.price).toBeNull();
      expect(source.notesId).toBeNull();
    });

    it('should prevent duplicate source relationships', async () => {
      const sourceData: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '25.00',
      };

      await supplierService.createSource(sourceData);

      // Try to create the same relationship again
      await expect(supplierService.createSource(sourceData)).rejects.toThrow('Relationship already exists between item 1 and supplier TEST-DEFAULT-001');
    });

    it('should validate source data', async () => {
      // Test invalid supplier ID
      const invalidSupplierSource: MockInsertSource = {
        itemId: 1,
        supplierId: 'NON-EXISTENT',
        price: '10.00',
      };

      await expect(supplierService.createSource(invalidSupplierSource)).rejects.toThrow('Supplier with ID \'NON-EXISTENT\' not found');

      // Test invalid item ID
      const invalidItemSource: MockInsertSource = {
        itemId: 0, // Invalid item ID
        supplierId: 'TEST-DEFAULT-001',
        price: '10.00',
      };

      await expect(supplierService.createSource(invalidItemSource)).rejects.toThrow('Valid item ID is required');

      // Test invalid price
      const invalidPriceSource: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: 'invalid-price',
      };

      await expect(supplierService.createSource(invalidPriceSource)).rejects.toThrow('Price must be a valid positive number');

      // Test negative price
      const negativePriceSource: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '-10.00',
      };

      await expect(supplierService.createSource(negativePriceSource)).rejects.toThrow('Price must be a valid positive number');
    });

    it('should delete source relationships', async () => {
      const sourceData: MockInsertSource = {
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '30.00',
      };

      const source = await supplierService.createSource(sourceData);
      const beforeCount = supplierService.getSourceCount();

      await supplierService.deleteSource(source.id);

      const afterCount = supplierService.getSourceCount();
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should handle deleting non-existent source', async () => {
      await expect(supplierService.deleteSource(99999)).rejects.toThrow('Source with ID \'99999\' not found');
    });

    it('should get sources by supplier', async () => {
      // Create multiple sources for the same supplier
      await supplierService.createSource({
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '10.00',
      });

      await supplierService.createSource({
        itemId: 2,
        supplierId: 'TEST-DEFAULT-001',
        price: '20.00',
      });

      const sources = await supplierService.getSourcesBySupplier('TEST-DEFAULT-001');

      expect(sources).toHaveLength(2);
      expect(sources.every(source => source.supplierId === 'TEST-DEFAULT-001')).toBe(true);
    });

    it('should get sources by item', async () => {
      // Create multiple suppliers for different items
      const supplier2Data: MockInsertSupplier = {
        id: 'TEST-SUPPLIER-002',
        name: 'Second Test Supplier',
      };

      await supplierService.createSupplier(supplier2Data);

      await supplierService.createSource({
        itemId: 1,
        supplierId: 'TEST-DEFAULT-001',
        price: '15.00',
      });

      await supplierService.createSource({
        itemId: 1,
        supplierId: 'TEST-SUPPLIER-002',
        price: '18.00',
      });

      const sources = await supplierService.getSourcesByItem(1);

      expect(sources).toHaveLength(2);
      expect(sources.every(source => source.itemId === 1)).toBe(true);
    });
  });
});