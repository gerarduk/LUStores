// Global Jest teardown for database cleanup
import { cleanupGlobalTestHelper } from './helpers/databaseTestHelper';

export default async function globalTeardown() {
//   console.log('🧹 Starting global Jest teardown...');
  
  try {
    // Clean up global test helper and database connections
    await cleanupGlobalTestHelper();
    
    // console.log('✅ Global Jest teardown completed');
  } catch (error) {
    console.error('❌ Global Jest teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}
