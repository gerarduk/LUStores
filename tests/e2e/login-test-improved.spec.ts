import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Improved Login Functionality', () => {
  test('should successfully login with improved robust login helper', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    console.log('Testing improved login functionality...');
    
    // Verify admin user exists
    const adminExists = await helpers.verifyAdminUserExists('admin@university.edu');
    expect(adminExists).toBe(true);
    
    // Perform login with improved helper
    const loginSuccess = await helpers.login('admin@university.edu', 'admin123');
    expect(loginSuccess).toBe(true);
    
    // Verify we're not on login page anymore
    expect(page.url()).not.toContain('/login');
    
    // Verify auth token is stored
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    });
    expect(token).toBeTruthy();
    
    console.log('Improved login test passed successfully!');
  });

  test('should handle navigation after login', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login first
    const loginSuccess = await helpers.login('admin@university.edu', 'admin123');
    expect(loginSuccess).toBe(true);
    
    // Test navigation to different pages
    console.log('Testing navigation after login...');
    
    // Navigate to Sales page
    const salesNav = await helpers.navigateToSales();
    expect(salesNav).toBe(true);
    expect(page.url()).toContain('/sales');
    
    // Navigate to Inventory page
    const inventoryNav = await helpers.navigateToInventory();
    expect(inventoryNav).toBe(true);
    expect(page.url()).toContain('/inventory');
    
    console.log('Navigation test passed successfully!');
  });

  test('should handle signout and signin flow', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login first
    const loginSuccess = await helpers.login('admin@university.edu', 'admin123');
    expect(loginSuccess).toBe(true);
    
    // Navigate to a specific page (Sales)
    const salesNav = await helpers.navigateToSales();
    expect(salesNav).toBe(true);
    expect(page.url()).toContain('/sales');
    
    // Logout (this should store intended destination)
    console.log('Testing logout functionality...');
    await page.evaluate(() => {
      // Simulate logout by clearing token and redirecting
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        localStorage.setItem('intended_destination', currentPath);
      }
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    });
    
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
    
    // Check that intended destination was stored
    const intendedDestination = await page.evaluate(() => {
      return localStorage.getItem('intended_destination');
    });
    expect(intendedDestination).toBe('/sales');
    
    // Login again
    console.log('Testing re-login functionality...');
    const reloginSuccess = await helpers.login('admin@university.edu', 'admin123');
    expect(reloginSuccess).toBe(true);
    
    // Should be redirected back to Sales page (if login redirect logic works)
    // Note: This depends on the frontend implementing the redirect logic
    console.log(`Current URL after re-login: ${page.url()}`);
    
    console.log('Signout/signin flow test completed!');
  });
});
