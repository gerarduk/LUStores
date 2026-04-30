import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Global test timeout for better E2E reliability */
  timeout: 60000, // Reduced from 180000 (3 min) to 60000 (1 min)
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: 'reports/playwright-html-report',
      open: 'never',
      host: 'localhost',
      port: 9323
    }],
    ['junit', { outputFile: 'reports/playwright-results.xml' }],
    ['json', { outputFile: 'reports/playwright-results.json' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_BASE_URL || process.env.E2E_APP_PORT ? `http://localhost:${process.env.E2E_APP_PORT}` : 'http://localhost:5000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot for tutorial tests - enhanced for documentation */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    /* Record video for tutorial documentation */
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    
    /* Enhanced viewport for tutorial screenshots */
    viewport: { width: 1280, height: 720 },
    
    /* Reduced timeouts for faster test execution */
    actionTimeout: 10000, // Reduced from 30000 (30s) to 10000 (10s)
    navigationTimeout: 20000, // Reduced from 60000 (1 min) to 20000 (20s)
  },

  /* Configure projects for major browsers */
  projects: process.env.CI ? [
    // In CI, only run Chromium to avoid hanging issues
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ] : [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

   
  ],

  /* Test against branded browsers. */
  // {
  //   name: 'Microsoft Edge',
  //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
  // },
  // {
  //   name: 'Google Chrome',
  //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  // },

  /* Run full stack with Docker Compose for E2E testing */
  webServer: {
    command: process.env.CI
      ? 'docker compose -p lustores-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --wait app'
      : 'docker compose -p lustores-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --wait app',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    timeout: 120000, // Reduced from 300000 (5 min) to 120000 (2 min) for Docker startup
    stderr: 'pipe',
    stdout: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  },

  /* Global teardown to clean up Docker containers */
  globalTeardown: process.env.CI ? undefined : require.resolve('./tests/e2e/utils/docker-teardown.ts'),
});
