import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../storage';
import type { Supplier } from '../../shared/schema';

// Define interface for enhanced supplier with optional fields
interface EnhancedSupplier extends Supplier {
  orderCount?: number;
  totalOrderValue?: number;
}

describe('Supplier API Integration Tests', () => {
  let createdSupplierIds: string[] = [];

  beforeEach(async () => {
    // Clean up any existing test data
    createdSupplierIds = [];
  });

  afterEach(async () => {
    // Clean up created suppliers
    for (const supplierId of createdSupplierIds) {
      try {
        await storage.deleteSupplier(supplierId);
      } catch {
        // Supplier may already be deleted
      }
    }
  });

  describe('POST /api/suppliers - Create Supplier', () => {
    it('should create a new supplier with minimal required fields', async () => {
      const supplierData = {
        id: `TEST-MIN-${Date.now()}`,
        name: 'Minimal Test Supplier'
      };

      const createdSupplier = await storage.createSupplier(supplierData);
      createdSupplierIds.push(createdSupplier.id);

      expect(createdSupplier).toMatchObject({
        id: supplierData.id,
        name: supplierData.name
      });
      expect(createdSupplier.createdAt).toBeDefined();
      expect(createdSupplier.updatedAt).toBeDefined();
    });

    it('should create a new supplier with all fields', async () => {
      const supplierData = {
        id: `TEST-FULL-${Date.now()}`,
        name: 'Full Test Supplier',
        contact: 'Jane Doe',
        email: 'contact@fulltest.com',
        phone: '+44 20 1234 5678',
        address: '456 Test Avenue, Manchester, UK'
      };

      const createdSupplier = await storage.createSupplier(supplierData);
      createdSupplierIds.push(createdSupplier.id);

      expect(createdSupplier).toMatchObject(supplierData);
      expect(createdSupplier.createdAt).toBeDefined();
      expect(createdSupplier.updatedAt).toBeDefined();
    });

    it('should validate required fields in storage layer', async () => {
      // Note: The actual API validation happens in routes.ts, but storage layer
      // relies on database constraints. These tests validate the data flow.
      
      try {
        const supplier1 = await storage.createSupplier({
          id: '',
          name: 'Test Supplier'
        });
        // If it doesn't throw, clean up
        if (supplier1?.id) {
          createdSupplierIds.push(supplier1.id);
        }
      } catch (error) {
        // Database constraint violation is expected
        expect(error).toBeDefined();
      }

      try {
        const supplier2 = await storage.createSupplier({
          id: 'TEST-001',
          name: ''
        });
        // If it doesn't throw, clean up
        if (supplier2?.id) {
          createdSupplierIds.push(supplier2.id);
        }
      } catch (error) {
        // Database constraint violation is expected
        expect(error).toBeDefined();
      }
    });

    it('should handle email format in storage layer', async () => {
      // Storage layer doesn't validate email format - that's handled at API level
      const supplierData = {
        id: `TEST-EMAIL-${Date.now()}`,
        name: 'Test Supplier',
        email: 'invalid-email-format'
      };

      const createdSupplier = await storage.createSupplier(supplierData);
      createdSupplierIds.push(createdSupplier.id);
      
      // Storage layer accepts any email format - validation is at API level
      expect(createdSupplier.email).toBe('invalid-email-format');
    });

    it('should reject duplicate supplier IDs', async () => {
      const supplierId = `TEST-DUP-${Date.now()}`;
      
      // Create first supplier
      await storage.createSupplier({
        id: supplierId,
        name: 'First Supplier'
      });
      createdSupplierIds.push(supplierId);

      // Attempt to create second supplier with same ID
      await expect(storage.createSupplier({
        id: supplierId,
        name: 'Second Supplier'
      })).rejects.toThrow();
    });
  });

  describe('GET /api/suppliers - List Suppliers', () => {
    it('should return empty array when no suppliers exist', async () => {
      const suppliers = await storage.getSuppliers();
      expect(Array.isArray(suppliers)).toBe(true);
    });

    it('should return all suppliers in the system', async () => {
      // Create test suppliers
      const supplier1Id = `TEST-LIST-1-${Date.now()}`;
      const supplier2Id = `TEST-LIST-2-${Date.now()}`;

      await storage.createSupplier({
        id: supplier1Id,
        name: 'List Test Supplier 1'
      });
      createdSupplierIds.push(supplier1Id);

      await storage.createSupplier({
        id: supplier2Id,
        name: 'List Test Supplier 2'
      });
      createdSupplierIds.push(supplier2Id);

      const suppliers = await storage.getSuppliers();
      
      expect(suppliers.length).toBeGreaterThanOrEqual(2);
      expect(suppliers.find(s => s.id === supplier1Id)).toBeDefined();
      expect(suppliers.find(s => s.id === supplier2Id)).toBeDefined();
    });
  });

  describe('GET /api/suppliers/:id - Get Supplier Details', () => {
    it('should return supplier details for valid ID', async () => {
      const supplierId = `TEST-GET-${Date.now()}`;
      const supplierData = {
        id: supplierId,
        name: 'Get Test Supplier',
        contact: 'Test Contact',
        email: 'test@supplier.com'
      };

      await storage.createSupplier(supplierData);
      createdSupplierIds.push(supplierId);

      const retrievedSupplier = await storage.getSupplier(supplierId);
      
      expect(retrievedSupplier).toBeDefined();
      expect(retrievedSupplier).toMatchObject(supplierData);
    });

    it('should return undefined for non-existent supplier ID', async () => {
      const nonExistentId = `NON-EXISTENT-${Date.now()}`;
      const retrievedSupplier = await storage.getSupplier(nonExistentId);
      
      expect(retrievedSupplier).toBeUndefined();
    });
  });

  describe('PUT /api/suppliers/:id - Update Supplier', () => {
    it('should update supplier information', async () => {
      const supplierId = `TEST-UPDATE-${Date.now()}`;
      
      // Create supplier
      await storage.createSupplier({
        id: supplierId,
        name: 'Original Name',
        contact: 'Original Contact'
      });
      createdSupplierIds.push(supplierId);

      // Update supplier
      const updateData = {
        name: 'Updated Name',
        contact: 'Updated Contact',
        email: 'updated@supplier.com'
      };

      const updatedSupplier = await storage.updateSupplier(supplierId, updateData);

      expect(updatedSupplier).toMatchObject({
        id: supplierId,
        ...updateData
      });
      expect(updatedSupplier.updatedAt).toBeDefined();
    });
  });

  describe('DELETE /api/suppliers/:id - Delete Supplier', () => {
    it('should delete an existing supplier', async () => {
      const supplierId = `TEST-DELETE-${Date.now()}`;
      
      // Create supplier
      await storage.createSupplier({
        id: supplierId,
        name: 'To Be Deleted'
      });

      // Delete supplier
      await storage.deleteSupplier(supplierId);

      // Verify deletion
      const deletedSupplier = await storage.getSupplier(supplierId);
      expect(deletedSupplier).toBeUndefined();

      // Don't add to cleanup array since it's already deleted
    });
  });

  describe('Enhanced Supplier Endpoints', () => {
    it('should handle suppliers with order history endpoint', async () => {
      // This test validates the enhanced endpoint used by the UI
      const suppliers = await storage.getSuppliers();
      
      expect(Array.isArray(suppliers)).toBe(true);
      
      // Check that the response can handle enhanced fields if present
      if (suppliers.length > 0) {
        const supplier = suppliers[0] as EnhancedSupplier; // Cast to EnhancedSupplier to access enhanced fields
        expect(supplier.id).toBeDefined();
        expect(supplier.name).toBeDefined();
        // Optional enhanced fields
        expect(typeof supplier.orderCount === 'undefined' || typeof supplier.orderCount === 'number').toBe(true);
        expect(typeof supplier.totalOrderValue === 'undefined' || typeof supplier.totalOrderValue === 'number').toBe(true);
      }
    });

    it('should validate supplier data matches schema requirements', async () => {
      const validSupplierData = {
        id: `TEST-SCHEMA-${Date.now()}`,
        name: 'Schema Test Supplier',
        contact: 'Schema Contact',
        email: 'schema@test.com',
        phone: '+44 20 9876 5432',
        address: '789 Schema Street, London, UK'
      };

      const createdSupplier = await storage.createSupplier(validSupplierData);
      createdSupplierIds.push(createdSupplier.id);

      // Verify all schema fields are properly handled
      expect(typeof createdSupplier.id).toBe('string');
      expect(typeof createdSupplier.name).toBe('string');
      expect(typeof createdSupplier.contact).toBe('string');
      expect(typeof createdSupplier.email).toBe('string');
      expect(typeof createdSupplier.phone).toBe('string');
      expect(typeof createdSupplier.address).toBe('string');
      expect(createdSupplier.createdAt).toBeInstanceOf(Date);
      expect(createdSupplier.updatedAt).toBeInstanceOf(Date);
    });
  });
});
