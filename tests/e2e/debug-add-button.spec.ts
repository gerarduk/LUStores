import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Debug Add Button', () => {
  test('Debug Add button click and quantity input', async ({ page }) => {
    console.log('Starting Debug Add Button Test');
    
    const helpers = new TestHelpers(page);
    
    // Authenticate user
    await helpers.login();
    
    // Use proper navigation helper to navigate to Sales Browse Items
    const navigationSuccess = await helpers.navigateToSalesBrowseItems();
    if (!navigationSuccess) {
      console.log('Failed to navigate to Sales Browse Items');
      throw new Error('Navigation to Sales Browse Items failed');
    }
    
    
    await page.waitForTimeout(2000);
    
    // Find first item row with improved selectors
    const itemRowSelectors = [
      'tbody tr',
      'table tr:not(:first-child)', // Skip header row
      '[role="row"]:not([role="columnheader"])',
      'tr[data-testid*="item"]',
      '.item-row',
      'tr:has(td)' // Rows that have td elements
    ];
    
    let firstRow: any = null;
    for (const selector of itemRowSelectors) {
      try {
        const rows = page.locator(selector);
        if (await rows.count() > 0) {
          firstRow = rows.first();
          await firstRow.waitFor({ timeout: 5000 });
          console.log(`Found item rows using selector: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`Failed to find rows with selector ${selector}: ${error.message}`);
        // Continue to next selector
      }
    }
    
    if (!firstRow) {
      console.log('No item rows found, test may fail');
      return; // Exit early if no rows found
    }
    
    // Get the item name with multiple fallback selectors
    let itemName = 'Unknown Item';
    const itemNameSelectors = [
      'td:first-child div.font-medium',
      'td:first-child div',
      'td:first-child span',
      'td:first-child',
      'td div.font-medium',
      'td div',
      'td span'
    ];
    
    for (const selector of itemNameSelectors) {
      try {
        const element = firstRow.locator(selector).first();
        if (await element.isVisible()) {
          const text = await element.textContent();
          if (text && text.trim()) {
            itemName = text.trim();
            break;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    console.log(`Testing with item: ${itemName}`);
    
    // Find the quantity input for this item
    const itemId = await firstRow.getAttribute('data-item-id') || '1';
    const quantityInput = page.locator(`#qty-${itemId}`);
    
    // Check if quantity input exists
    const quantityInputCount = await quantityInput.count();
    console.log(`Quantity input found: ${quantityInputCount}`);
    
    if (quantityInputCount > 0) {
      // Set quantity value
      await quantityInput.fill('2');
      const quantityValue = await quantityInput.inputValue();
      console.log(`Quantity input value set to: ${quantityValue}`);
    }
    
    // Take screenshot before clicking Add
    await page.screenshot({ path: 'debug-before-add-detailed.png', fullPage: true });
    
    // Find and examine the Add button
    const addButton = firstRow.locator('button:has-text("Add")');
    const addButtonCount = await addButton.count();
    console.log(`Add button found: ${addButtonCount}`);
    
    if (addButtonCount > 0) {
      const isEnabled = await addButton.isEnabled();
      const isVisible = await addButton.isVisible();
      console.log(`Add button enabled: ${isEnabled}, visible: ${isVisible}`);
      
      // Listen for console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`Browser console error: ${msg.text()}`);
        }
      });
      
      // Listen for page errors
      page.on('pageerror', error => {
        console.log(`Page error: ${error.message}`);
      });
      
      // Click the Add button
      console.log('Clicking Add button...');
      await addButton.click();
      console.log('Add button clicked');
      
      // Wait for any immediate effects
      await page.waitForTimeout(2000);
      
      // Take screenshot after clicking Add
      await page.screenshot({ path: 'debug-after-add-detailed.png', fullPage: true });
      
      // Check if tabs are still present
      const tabsAfterAdd = page.locator('[role="tablist"]');
      const tabsCount = await tabsAfterAdd.count();
      console.log(`Tabs found after Add click: ${tabsCount}`);
      
      // Check if Current Quote tab exists and what its text is
      const currentQuoteTab = page.locator('button:has-text("Current Quote")');
      const currentQuoteCount = await currentQuoteTab.count();
      console.log(`Current Quote tab found: ${currentQuoteCount}`);
      
      if (currentQuoteCount > 0) {
        const tabText = await currentQuoteTab.textContent();
        console.log(`Current Quote tab text: "${tabText}"`);
      }
    }
    
    console.log('Debug Add Button Test Complete');
  });
});
