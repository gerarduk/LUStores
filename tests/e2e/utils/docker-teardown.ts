import { execSync } from 'child_process';

/**
 * Global teardown function for Playwright E2E tests
 * Cleans up Docker containers after test completion
 */
async function globalTeardown() {
  console.log('🧹 Cleaning up Docker containers after E2E tests...');

  try {
    // Stop and remove E2E Docker containers using a separate project name
    // This prevents affecting production containers running under the default 'lustores' project
    execSync('docker compose -p lustores-e2e -f docker-compose.yml -f docker-compose.e2e.yml down --volumes --remove-orphans', {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('✅ Docker containers cleaned up successfully');
  } catch (error) {
    console.warn('⚠️ Warning: Failed to clean up Docker containers:', error);
    // Don't fail the test run if cleanup fails
  }
}

export default globalTeardown;
