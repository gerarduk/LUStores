// Database test helper for proper cleanup
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { sales, saleItems, chargecodes, users, quotes } from '../../../shared/schema';

export class DatabaseTestHelper {
  private db: any;
  private pool: Pool;
  private testPrefix: string;

  constructor() {
    this.testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Create connection pool for test database
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/test_inventory',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool);
  }

  async setup(): Promise<void> {
    try {
      // Test database connection
      await this.pool.query('SELECT 1');
      console.log('✅ Database connection established');
      
      // Initialize database schema for tests
      console.log('🔄 Initializing database schema for tests...');
      
      // Direct SQL approach: Add missing notes_id columns if they don't exist
      try {
        // Add notes_id column to items table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE items ADD COLUMN IF NOT EXISTS notes_id VARCHAR(50) DEFAULT NULL;
        `);
        
        // Add notes_id column to chargecodes table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE chargecodes ADD COLUMN IF NOT EXISTS notes_id VARCHAR(50) DEFAULT NULL;
        `);
        
        // Add notes_id column to orders table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes_id VARCHAR(50) DEFAULT NULL;
        `);
        
        // Add notes_id column to quotes table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes_id VARCHAR(50) DEFAULT NULL;
        `);
        
        // Add notes_id column to suppliers table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes_id VARCHAR(50) DEFAULT NULL;
        `);
        
        // Add notes_id column to sales table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes_id VARCHAR(50) DEFAULT NULL;
        `);
        
        // Add is_paid column to sales table if it doesn't exist
        await this.pool.query(`
          ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
        `);
        
        console.log('✅ Database schema updated with notes_id and is_paid columns');
        
        // Also run the full initialization as backup
        const { initializeDatabase } = require('../../dbInit');
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development'; // Force schema creation
        
        try {
          await initializeDatabase();
          console.log('✅ Full database schema initialized for tests');
        } finally {
          process.env.NODE_ENV = originalNodeEnv;
        }
        
      } catch (error) {
        console.error('❌ Database schema update failed:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      
      // Clean up test data in proper order (considering foreign key constraints)
      const cleanupQueries = [
        // Delete dependent records first
        `DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE sale_id LIKE '${this.testPrefix}%')`,
        `DELETE FROM quotes WHERE quote_id LIKE '${this.testPrefix}%'`,
        `DELETE FROM sales WHERE sale_id LIKE '${this.testPrefix}%'`,
        
        // Clean up test users
        `DELETE FROM users WHERE email LIKE '%${this.testPrefix}%' OR id LIKE '${this.testPrefix}%'`,
        
        // Clean up test charge codes
        `DELETE FROM chargecodes WHERE code LIKE '${this.testPrefix}%'`,
        
        // Clean up any test sessions or temporary data
        `DELETE FROM sessions WHERE sid LIKE '${this.testPrefix}%'`,
      ];

      for (const query of cleanupQueries) {
        try {
          const result = await this.pool.query(query);
        } catch (error) {
          // Log but don't fail on cleanup errors (table might not exist)
          console.warn(`⚠️ Cleanup warning: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  async createTestSale(overrides: any = {}): Promise<any> {
    // First ensure we have a test charge code
    const chargeCode = `${this.testPrefix}_DEPT001`;
    
    try {
      const createdChargeCode = await this.createTestChargeCode({ code: chargeCode });
    } catch (error) {
      console.error('❌ Failed to create charge code:', error);
      throw error;
    }

    // Create a test user for processedBy
    let testUserId = 'test-user-id';
    try {
      const testUser = await this.createTestUser({ id: testUserId });
      testUserId = testUser.id;
    } catch (error) {
      console.error('User might already exist, proceeding...');
    }

    const testSale = {
      saleId: `${this.testPrefix}_sale_${Date.now()}`,
      chargeCode: chargeCode,
      subtotalAmount: '10.00',
      vatAmount: '2.00',
      totalAmount: '12.00',
      vatApplied: true,
      customerInfo: { name: `Test Customer ${this.testPrefix}` },
      notesId : null,
      status: 'completed' as const,
      processedBy: testUserId,
      ...overrides,
    };


    try {
      const [createdSale] = await this.db.insert(sales).values(testSale).returning();
      return createdSale;
    } catch (error) {
      console.error('❌ Failed to create test sale:', error);
      console.error('❌ Sale data:', testSale);
      throw error;
    }
  }

  async createTestUser(overrides: any = {}): Promise<any> {
    const testUser = {
      id: `${this.testPrefix}_user_${Date.now()}`,
      email: `${this.testPrefix}_test@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
      isActive: true,
      mustChangePassword: false,
      password_hash: '$2b$10$defaulthash', // Default hash for test users
      ...overrides,
    };

    try {
      const [createdUser] = await this.db.insert(users).values(testUser).onConflictDoNothing().returning();
      if (createdUser) {
        return createdUser;
      } else {
        // User already exists, fetch it
        const existingUser = await this.db.select().from(users).where(eq(users.id, testUser.id)).limit(1);
        if (existingUser.length > 0) {
          return existingUser[0];
        }
        throw new Error('Failed to create or find test user');
      }
    } catch (error) {
      console.error('❌ Failed to create test user:', error);
      throw error;
    }
  }

  async createTestChargeCode(overrides: any = {}): Promise<any> {
    const testChargeCode = {
      code: `${this.testPrefix}_CC001`,
      title: `Test charge code for ${this.testPrefix}`,
      authorisedBy: 'test-user-id',
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31'),
      pin: '1234',
      costCentre: 'TEST-DEPT',
      ...overrides,
    };

    try {
      const [createdChargeCode] = await this.db.insert(chargecodes).values(testChargeCode).onConflictDoNothing().returning();
      if (createdChargeCode) {
        return createdChargeCode;
      } else {
        // Charge code already exists, fetch it
        const existingChargeCode = await this.db.select().from(chargecodes).where(eq(chargecodes.code, testChargeCode.code)).limit(1);
        if (existingChargeCode.length > 0) {
          return existingChargeCode[0];
        }
        throw new Error('Failed to create or find test charge code');
      }
    } catch (error) {
      console.error('❌ Failed to create test charge code:', error);
      throw error;
    }
  }

  getTestPrefix(): string {
    return this.testPrefix;
  }

  getDatabase(): any {
    return this.db;
  }

  async close(): Promise<void> {
    try {
      await this.cleanup();
      await this.pool.end();
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }

  // Transaction support for tests that need rollback
  async withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx: any) => {
      try {
        return await callback(tx);
      } catch (error) {
        console.error('❌ Transaction failed, rolling back:', error);
        throw error;
      }
    });
  }

  // Health check for tests
  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
}

// Global test helper instance
let globalTestHelper: DatabaseTestHelper | null = null;

export function getTestHelper(): DatabaseTestHelper {
  if (!globalTestHelper) {
    globalTestHelper = new DatabaseTestHelper();
  }
  return globalTestHelper;
}

export async function setupGlobalTestHelper(): Promise<void> {
  const helper = getTestHelper();
  await helper.setup();
}

export async function cleanupGlobalTestHelper(): Promise<void> {
  if (globalTestHelper) {
    await globalTestHelper.close();
    globalTestHelper = null;
  }
}
