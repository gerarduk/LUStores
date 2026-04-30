import { storage } from '../storage';
import { referentialIntegrity } from '../referentialIntegrity';

describe('Referential Integrity Manager', () => {
  let testUser: any;
  let testCategory: any;
  let testItem: any;

  beforeAll(async () => {
    // Create test entities
    try {
      testUser = await storage.upsertUser({
        id: 'ref-test-user',
        email: 'reftest@example.com',
        password_hash: 'test-password-hash', // Add required password hash
        firstName: 'Ref',
        lastName: 'Test',
        role: 'user',
        isActive: true,
        mustChangePassword: false
      });
      // console.log('Test user created:', testUser);
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }

    testCategory = await storage.createCategory({
      name: `Ref Test Category ${Date.now()}`,
      description: 'For referential integrity testing',
      icon: 'fas fa-test',
      color: 'blue'
    });

    testItem = await storage.createItem({
      name: `Ref Test Item ${Date.now()}`,
      sku: `REF-${Date.now()}`,
      description: 'For referential integrity testing',
      categoryId: testCategory.id,
      price: '10.00',
      vatRate: '0.20',
      vatIncluded: true,
      currentStock: 5,
      minimumStock: 1,
      isActive: true,
      createdBy: testUser.id
    });
  });

  afterAll(async () => {
    // Clean up in correct order
    try {
      if (testItem) {
        const check = await storage.checkItemDeletion(testItem.id);
        if (check.canDelete) {
          await storage.safeDeleteItem(testItem.id);
        }
      }
      if (testCategory) {
        const check = await storage.checkCategoryDeletion(testCategory.id);
        if (check.canDelete) {
          await storage.safeDeleteCategory(testCategory.id);
        }
      }
      if (testUser) {
        await storage.safeDeleteUser(testUser.id);
      }
    } catch (error) {
      console.error('Cleanup error (expected):', error);
    }
  });

  describe('User Deletion Checks', () => {
    it('should identify user dependencies correctly', async () => {
      const check = await referentialIntegrity.checkUserDeletion(testUser.id);
      
      expect(check).toBeDefined();
      expect(check.warnings).toBeDefined();
      
      // Should have warnings about the item created by this user
      const itemWarning = check.warnings.find(w => w.table === 'items');
      expect(itemWarning).toBeDefined();
      expect(itemWarning?.count).toBeGreaterThan(0);
      expect(itemWarning?.action).toBe('nullify');
    });

    it('should safely delete user by nullifying references', async () => {
      // First, verify the item has the user as creator
      const itemBefore = await storage.getItem(testItem.id);
      expect(itemBefore?.createdBy).toBe(testUser.id);

      // Safely delete the user
      await referentialIntegrity.safeDeleteUser(testUser.id);

      // Verify the item still exists but creator is nullified
      const itemAfter = await storage.getItem(testItem.id);
      expect(itemAfter).toBeDefined();
      expect(itemAfter?.createdBy).toBeNull();

      // Verify user is deleted
      const userAfter = await storage.getUser(testUser.id);
      expect(userAfter).toBeUndefined();
    });
  });

  describe('Category Deletion Checks', () => {
    it('should block category deletion when items exist', async () => {
      const check = await referentialIntegrity.checkCategoryDeletion(testCategory.id);
      
      expect(check.canDelete).toBe(false);
      expect(check.blockedBy).toHaveLength(1);
      expect(check.blockedBy[0].table).toBe('items');
      expect(check.blockedBy[0].count).toBeGreaterThan(0);
    });
  });

  describe('Item Deletion Checks', () => {
    it('should allow item deletion after user is deleted', async () => {
      const check = await referentialIntegrity.checkItemDeletion(testItem.id);
      
      expect(check.canDelete).toBe(true);
      expect(check.blockedBy).toHaveLength(0);
    });
  });

  describe('Quote Deletion Checks', () => {
    let testQuote: any;

    beforeAll(async () => {
      // Create a test quote with items
      try {
        // console.log('Creating quote with user ID:', testUser.id);
        // Verify user exists before creating quote
        await storage.getUser(testUser.id); // Ensure user exists
        // console.log('User exists check:', userExists ? 'YES' : 'NO');
        
        testQuote = await storage.createQuote({
          chargeCode: 'TEST-CHARGE-REF',
          subtotalAmount: '100.00',
          vatAmount: '20.00',
          totalAmount: '120.00',
          vatApplied: true,
          status: 'draft',
          createdBy: null // Use null to avoid foreign key constraint issues
        }, [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku,
          unitPrice: 10,
          quantity: 2
        }]);
      } catch (error) {
        console.error('Failed to create test quote:', error);
        throw error;
      }
    });

    afterAll(async () => {
      // Clean up quote if it still exists
      try {
        await storage.safeDeleteQuote(testQuote.id);
      } catch {
        // Quote may already be deleted in tests
      }
    });

    it('should check quote deletion correctly', async () => {
      const check = await referentialIntegrity.checkQuoteDeletion(testQuote.id);
      
      expect(check.canDelete).toBe(true);
      expect(check.blockedBy).toHaveLength(0);
      expect(check.warnings).toHaveLength(1);
      expect(check.warnings[0].table).toBe('quoteItems');
      expect(check.warnings[0].action).toBe('cascade');
    });

    it('should safely delete quote and all related records', async () => {
      // Verify quote exists first
      const quote = await storage.getQuote(testQuote.id);
      expect(quote).toBeDefined();

      // Delete safely
      await referentialIntegrity.safeDeleteQuote(testQuote.id);

      // Verify quote is deleted
      const deletedQuote = await storage.getQuote(testQuote.id);
      expect(deletedQuote).toBeUndefined();
    });
  });
});
