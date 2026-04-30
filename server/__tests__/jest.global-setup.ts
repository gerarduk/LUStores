// Global Jest setup for database tests
import { setupGlobalTestHelper } from './helpers/databaseTestHelper';

export default async function globalSetup() {
//   console.log('🚀 Starting global Jest setup...');
  
  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/test_inventory';
    process.env.SESSION_SECRET = 'test-secret-key';
    
    // Initialize global test helper
    await setupGlobalTestHelper();
    
    // console.log('✅ Global Jest setup completed');
  } catch (error) {
    console.error('❌ Global Jest setup failed:', error);
    throw error;
  }
}
