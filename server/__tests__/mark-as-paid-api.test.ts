// Integration test for mark as paid API endpoint
import request from 'supertest';
import { storage } from '../storage';
import type { InsertSale } from '../../shared/schema';

describe('Mark as Paid API Integration', () => {
  let saleId: number;
  let testItem: any;
  let testCategory: any;
  let testChargeCode: any;

  beforeAll(async () => {
    // Create test user first (required for foreign key references)
    try {
      await storage.upsertUser({
        id: 'test-user-id',
        email: 'test@example.com',
        password_hash: 'test-password-hash', // Add required password hash
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        mustChangePassword: false
      });
    } catch (error) {
      console.error('Test user creation failed, continuing...', error);
      // Continue with tests even if user creation fails
    }

    // Create test category first
    testCategory = await storage.createCategory({
      name: `Test Category ${Date.now()}`,
      description: 'Category for testing',
      icon: 'fas fa-test',
      color: 'blue'
    });

    // Create test item
    testItem = await storage.createItem({
      name: `Test Item ${Date.now()}`,
      sku: `TEST001-${Date.now()}`,
      description: 'Item for testing',
      categoryId: testCategory.id,
      price: '50.00',
      vatRate: '0.20',
      vatIncluded: true,
      currentStock: 100,
      minimumStock: 10,
      isActive: true,
      createdBy: 'test-user-id'
    });

    // Create test charge code
    testChargeCode = await storage.createChargeCode({
      code: `TEST001-${Date.now()}`,
      title: 'Test Charge Code',
      authorisedBy: 'test-user-id',
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31'),
      pin: '1234',
      costCentre: 'TEST-DEPT'
    });

    // Create a test sale
    const saleData: Omit<InsertSale, 'saleId'> = {
      chargeCode: testChargeCode.code,
      subtotalAmount: '50.00',
      vatAmount: '10.00',
      totalAmount: '60.00',
      vatApplied: true,
      customerInfo: { name: 'Test Customer' },
      notesId: undefined, // No note attached initially
      status: 'completed',
    };

    const items = [
      {
        itemId: testItem.id,
        itemName: testItem.name,
        itemSku: testItem.sku,
        unitPrice: 50.00,
        quantity: 1,
        vatRate: 0.20,
        vatAmount: 10.00,
        subtotal: 50.00,
        totalWithVat: 60.00,
      },
    ];

    const sale = await storage.createSale(saleData, items, 'test-user-id');
    saleId = sale.id;
  });

  afterAll(async () => {
    // Clean up test data in the correct order (delete dependencies first)
      // Note: Sales are typically not deleted, just marked as canceled/refunded
      // Focus on cleaning up the supporting data
    
    if (testItem) {
      try {
        await storage.deleteItem(testItem.id);
      } catch (e) {
        console.error('Item cleanup warning:', e);
      }
    }
    
    if (testCategory) {
      try {
        await storage.deleteCategory(testCategory.id);
      } catch (e) {
        console.error('Category cleanup warning:', e);
      }
    }
    
    if (testChargeCode) {
      try {
        await storage.deleteChargeCode(testChargeCode.code);
      } catch (e) {
        console.error('Charge code cleanup warning:', e);
      }
    }
  
  });

  describe('PATCH /api/sales/:id/mark-paid', () => {
    it('should successfully mark a sale as paid via API', async () => {
      // We need to import the app to test the API
      const { app } = await import('./testApp');
      
      const response = await request(app)
        .patch(`/api/sales/${saleId}/mark-paid`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sale marked as paid');
      expect(response.body.sale.id).toBe(saleId);
      expect(response.body.sale.status).toBe('paid');
    });

    it('should return 404 for non-existent sale', async () => {
      const { app } = await import('./testApp');
      
      const response = await request(app)
        .patch('/api/sales/99999/mark-paid')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.message).toBe('Sale not found');
    });

    it('should return 400 for invalid sale ID', async () => {
      const { app } = await import('./testApp');
      
      const response = await request(app)
        .patch('/api/sales/invalid/mark-paid')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.message).toBe('Invalid sale ID format');
    });
  });
});
