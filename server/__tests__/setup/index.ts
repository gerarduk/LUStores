import { setupTestDatabase, cleanupTestDatabase } from './testDatabaseSetup';

export { setupTestDatabase, cleanupTestDatabase };

// Global test setup that runs once before all tests
export async function globalSetup() {
  console.log('🚀 Running global test setup...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DEV_ADMIN_OVERRIDE = 'true';
  
  // Wait for and setup database
  await setupTestDatabase();
  
  console.log('✅ Global test setup completed');
}

// Global test teardown that runs once after all tests
export async function globalTeardown() {
  console.log('🧹 Running global test teardown...');
  
  // Cleanup test data
  await cleanupTestDatabase();
  
  console.log('✅ Global test teardown completed');
}
