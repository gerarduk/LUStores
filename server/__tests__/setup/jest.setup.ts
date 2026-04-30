import { waitForDatabase } from './testDatabaseSetup';

// This runs before each test file
beforeAll(async () => {
  // Ensure database is available
  await waitForDatabase();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DEV_ADMIN_OVERRIDE = 'true';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.SESSION_SECRET = 'test-session-secret';
});
