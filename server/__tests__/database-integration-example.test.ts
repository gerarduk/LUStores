// Example test using DatabaseTestHelper for proper cleanup
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { sales as salesTable } from '../../shared/schema';
import { DatabaseTestHelper } from './helpers/databaseTestHelper';

describe('Sales Database Integration Test', () => {
  let testHelper: DatabaseTestHelper;

  beforeEach(async () => {
    testHelper = new DatabaseTestHelper();
    await testHelper.setup();
  });

  afterEach(async () => {
    await testHelper.cleanup();
    await testHelper.close();
  });

  it('should create and retrieve a sale with proper cleanup', async () => {
    // Create test charge code first
    const testChargeCode = await testHelper.createTestChargeCode({
      code: `${testHelper.getTestPrefix()}_TEST_CC`,
      title: 'Test charge code',
    });

    // Create test sale
    const testSale = await testHelper.createTestSale({
      chargeCode: testChargeCode.code,
      subtotalAmount: '25.00',
      vatAmount: '5.00',
      totalAmount: '30.00',
    });

    expect(testSale).toBeDefined();
    expect(testSale.saleId).toContain(testHelper.getTestPrefix());
    expect(testSale.chargeCode).toBe(testChargeCode.code);
    expect(testSale.totalAmount).toBe('30.00');

    // Verify the sale can be retrieved from database
    const db = testHelper.getDatabase();
    const salesResults = await db.select().from(salesTable).where(eq(salesTable.saleId, testSale.saleId));
    
    expect(salesResults).toHaveLength(1);
    expect(salesResults[0].saleId).toBe(testSale.saleId);
    
    // Cleanup will happen automatically in afterEach
  });

  it('should handle database transactions properly', async () => {
    const testPrefix = testHelper.getTestPrefix();
    
    await testHelper.withTransaction(async (_tx) => {
      // Create test data within transaction
      const chargeCode = await testHelper.createTestChargeCode({
        code: `${testPrefix}_TX_CC`,
      });
      
      const sale = await testHelper.createTestSale({
        chargeCode: chargeCode.code,
      });
      
      expect(sale.saleId).toContain(testPrefix);
      
      // If this test fails, transaction will rollback automatically
      expect(sale.chargeCode).toBe(chargeCode.code);
    });
  });

  it('should verify database health before tests', async () => {
    const isHealthy = await testHelper.isHealthy();
    expect(isHealthy).toBe(true);
  });
});
