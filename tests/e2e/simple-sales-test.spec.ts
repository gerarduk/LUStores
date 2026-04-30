import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Simple Sales Page Test', () => {
  test('Navigate to sales page and find tabs', async ({ page }) => {
    console.log('Starting Simple Sales Page Test');
    
    const helpers = new TestHelpers(page);
    
    // Authenticate user first - with resilient handling
    await helpers.login();
    
    // Check if page memory worked after login
    const currentUrl = page.url();
    console.log(`🔍 After login, current URL: ${currentUrl}`);
    
    // Navigate to sales page using proper navigation helper (with resilient handling)
    let navigationSuccess = false;
    if (currentUrl.includes('/sales')) {
      console.log('✅ Page memory worked - already on sales page');
      navigationSuccess = true;
    } else {
      console.log('⚠️ Page memory didn\'t work - manually navigating to sales page');
      console.log('Navigating to Sales page...');
      navigationSuccess = await helpers.navigateToSales();
    }
    
    if (!navigationSuccess) {
      console.log('Failed to navigate to Sales page');
      throw new Error('Navigation to Sales page failed');
    }
    console.log('Successfully navigated to Sales page');
    
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'simple-sales-page.png', fullPage: true });
    console.log('Screenshot taken');
    
    // Check what's actually on the page
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    const url = page.url();
    console.log(`Current URL: ${url}`);
    
    // Check for any error messages
    const errorMessages = page.locator('text=/error|Error|ERROR/');
    const errorCount = await errorMessages.count();
    if (errorCount > 0) {
      console.log(`Found ${errorCount} error messages on page`);
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent();
        console.log(`Error ${i}: ${errorText}`);
      }
    }
    
    // Check for loading indicators
    const loadingIndicators = page.locator('text=/loading|Loading|LOADING/');
    const loadingCount = await loadingIndicators.count();
    console.log(`Found ${loadingCount} loading indicators`);
    
    // Wait a bit more for any async loading
    await page.waitForTimeout(1000);
    
    // Check for tabs with different selectors
    const tabSelectors = [
      '[role="tablist"]',
      '.grid.w-full.grid-cols-4',
      'button[role="tab"]',
      '[role="tab"]',
      'button:has-text("Browse Items")',
      'button:has-text("Current Quote")',
    ];
    
    for (const selector of tabSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      console.log(`Selector "${selector}": found ${count} elements`);
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          try {
            const text = await elements.nth(i).textContent();
            const isVisible = await elements.nth(i).isVisible();
            console.log(`  Element ${i}: text="${text}", visible=${isVisible}`);
          } catch (error) {
            console.log(`  Element ${i}: Error getting text - ${error.message}`);
          }
        }
      }
    }
    
    // Check if we're actually on the sales page by looking for sales-specific content
    const salesIndicators = [
      'text="Browse Items"',
      'text="Current Quote"',
      'text="Saved Quotes"',
      'text="Stock Check"',
      'text="Search items"',
    ];
    
    console.log('Checking for sales page indicators:');
    for (const indicator of salesIndicators) {
      const elements = page.locator(indicator);
      const count = await elements.count();
      console.log(`  "${indicator}": ${count} found`);
    }
    
    console.log('Simple Sales Page Test Complete');
  });
});
