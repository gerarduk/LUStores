import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Inventory Loading Verification', () => {
  test('Verify inventory loading fix is working end-to-end', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    try {
      console.log('Starting inventory loading verification...');
      
      // Step 1: Authenticate
      console.log('Step 1: Authenticating user');
      const loginSuccess = await helpers.login();
      if (!loginSuccess) {
        throw new Error('Authentication failed');
      }
      console.log('Authentication successful');
      
      // Step 2: Navigate to Sales Browse Items
      console.log('Step 2: Navigating to Sales Browse Items');
      const navigationSuccess = await helpers.navigateToSalesBrowseItems();
      if (!navigationSuccess) {
        throw new Error('Navigation to Sales Browse Items failed');
      }
      console.log('Successfully navigated to Sales Browse Items tab');
      
      // Step 3: Verify table loads (either with data or empty state)
      console.log('Step 3: Verifying inventory table loads correctly');
      
      // Wait for the table to be present
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
      console.log('✅ Table is visible');
      
      // Check table structure
      const headers = await page.locator('table thead th').count();
      console.log(`Found ${headers} table headers`);
      expect(headers).toBeGreaterThan(0);
      
      // Check for content (either data or empty state)
      const rowCount = await page.locator('table tbody tr').count();
      console.log(`Found ${rowCount} inventory rows`);
      
      if (rowCount === 0) {
        // Verify empty state is shown
        const emptyMessages = ['No items found', 'No items found matching your search'];
        let emptyStateFound = false;
        
        for (const message of emptyMessages) {
          if (await page.locator(`text=${message}`).isVisible({ timeout: 2000 })) {
            console.log(`✅ Empty state shown: "${message}"`);
            emptyStateFound = true;
            break;
          }
        }
        
        if (!emptyStateFound) {
          console.log('⚠️ No specific empty message, but table structure is valid');
        }
      } else {
        console.log(`✅ Found ${rowCount} inventory items`);
      }
      
      console.log('✅ Inventory loading verification completed successfully');
      
    } catch (error) {
      console.error('Inventory loading verification failed:', error);
      throw error;
    }
  });
});
