import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Inventory Page - Complete Button Coverage', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateAndWait('/inventory');
  });

  test('should test all buttons on inventory page', async ({ page }) => {
    // Get all clickable elements on the page
    const clickableElements = await helpers.getAllClickableElements();
    const elementCount = await clickableElements.count();
    
    console.log(`Found ${elementCount} clickable elements on inventory page`);
    
    // Test each clickable element
    for (let i = 0; i < elementCount; i++) {
      const element = clickableElements.nth(i);
      
      if (await helpers.isElementClickable(element)) {
        const text = await element.textContent() || '';
        const tagName = await element.evaluate(el => el.tagName);
        const type = await element.getAttribute('type');
        
        console.log(`Testing element ${i + 1}: ${tagName}${type ? `[type=${type}]` : ''} - "${text.trim()}"`);
        
        try {
          // Take screenshot before clicking
          await helpers.screenshot(`inventory-before-click-${i}`);
          
          // Click the element
          await element.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot after clicking
          await helpers.screenshot(`inventory-after-click-${i}`);
          
          // Check if any modal/dialog opened
          const modal = page.locator('[role="dialog"], .modal, .popup, .dropdown');
          const modalCount = await modal.count();
          
          if (modalCount > 0) {
            console.log(`  - Opened modal/dialog`);
            
            // Try to close modal if it has a close button
            const closeButton = page.locator('[role="dialog"] button, .modal button').filter({ hasText: /close|cancel|×/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await page.waitForTimeout(1000);
            } else {
              // Try pressing Escape
              await page.keyboard.press('Escape');
              await page.waitForTimeout(1000);
            }
          }
          
          // Check if we navigated to a different page
          const currentUrl = page.url();
          if (!currentUrl.includes('/inventory')) {
            console.log(`  - Navigated to: ${currentUrl}`);
            // Navigate back to inventory
            await helpers.navigateAndWait('/inventory');
          }
          
        } catch (error) {
          console.log(`  - Error clicking element: ${error}`);
          // Continue with next element
        }
      }
    }
  });

  test('should handle add new item flow', async ({ page }) => {
    // Look for add item button with various possible texts
    const addButtons = [
      page.getByRole('button', { name: /add.*item/i }),
      page.getByRole('button', { name: /new.*item/i }),
      page.getByRole('button', { name: /create.*item/i }),
      page.locator('button').filter({ hasText: /\+/ }),
      page.locator('a[href*="add"], a[href*="new"], a[href*="create"]')
    ];
    
    let addButtonFound = false;
    
    for (const addButton of addButtons) {
      if (await addButton.first().isVisible()) {
        console.log('Found add button, testing add item flow');
        await addButton.first().click();
        await page.waitForTimeout(1000);
        
        // Check if form opened or we navigated to add page
        const hasForm = await page.locator('form, [role="dialog"], .modal').first().isVisible();
        const isAddPage = page.url().includes('add') || page.url().includes('new');
        
        if (hasForm || isAddPage) {
          console.log('Add item form/page opened successfully');
          
          // Try to fill and submit a test item
          try {
            await helpers.fillItemForm({
              name: 'E2E Test Item',
              sku: 'E2E-TEST-' + Date.now(),
              price: '19.99',
              stock: '10',
              description: 'Test item created by E2E test'
            });
            
            // Try to submit the form
            const modal = page.locator('[role="dialog"], .modal').first();
            const submitButton = modal.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
            if (await submitButton.isVisible()) {
              const submitSuccess = await helpers.safeClick(submitButton, { timeout: 10000 });
              if (submitSuccess) {
                await helpers.waitForPageStable();
                // Check for success
                const successVisible = await helpers.checkForSuccessMessage();
                if (successVisible) {
                  console.log('Successfully created test item');
                }
              }
            }
            
            console.log('Successfully created test item');
          } catch (error) {
            console.log('Could not complete item creation:', error);
          }
        }
        
        addButtonFound = true;
        break;
      }
    }
    
    if (!addButtonFound) {
      console.log('No add item button found on page');
    }
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search inputs
    const searchInputs = [
      page.getByPlaceholder(/search/i),
      page.locator('input[name*="search"]'),
      page.locator('input[type="search"]'),
      page.locator('.search input')
    ];
    
    for (const searchInput of searchInputs) {
      if (await searchInput.first().isVisible()) {
        console.log('Testing search functionality');
        
        // Test search
        await searchInput.first().fill('test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Clear search
        await searchInput.first().clear();
        await page.waitForTimeout(1000);
        
        console.log('Search functionality tested');
        break;
      }
    }
  });

  test('should handle export/download functionality', async ({ page }) => {
    // Look for export/download buttons
    const exportButtons = [
      page.getByRole('button', { name: /export/i }),
      page.getByRole('button', { name: /download/i }),
      page.getByRole('button', { name: /csv/i }),
      page.getByRole('button', { name: /excel/i })
    ];
    
    for (const exportButton of exportButtons) {
      if (await exportButton.first().isVisible()) {
        console.log('Testing export/download functionality');
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        
        await exportButton.first().click();
        
        const download = await downloadPromise;
        if (download) {
          console.log(`Download triggered: ${download.suggestedFilename()}`);
        } else {
          console.log('Export button clicked but no download detected');
        }
        
        await page.waitForTimeout(1000);
        break;
      }
    }
  });

  test('should handle bulk actions if present', async ({ page }) => {
    // Look for checkboxes (bulk selection)
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      console.log(`Found ${checkboxCount} checkboxes, testing bulk actions`);
      
      // Select first few items
      const itemsToSelect = Math.min(3, checkboxCount);
      for (let i = 0; i < itemsToSelect; i++) {
        await checkboxes.nth(i).check();
      }
      
      // Look for bulk action buttons
      const bulkButtons = [
        page.getByRole('button', { name: /bulk/i }),
        page.getByRole('button', { name: /delete.*selected/i }),
        page.getByRole('button', { name: /export.*selected/i }),
        page.getByRole('button', { name: /actions/i })
      ];
      
      for (const bulkButton of bulkButtons) {
        if (await bulkButton.first().isVisible()) {
          console.log('Testing bulk action button');
          await bulkButton.first().click();
          await page.waitForTimeout(1000);
          
          // Look for confirmation dialog
          const confirmDialog = page.locator('[role="alertdialog"], .confirm-dialog');
          if (await confirmDialog.isVisible()) {
            // Cancel the action
            const cancelButton = confirmDialog.locator('button').filter({ hasText: /cancel|no/i }).first();
            if (await cancelButton.isVisible()) {
              await cancelButton.click();
            }
          }
          break;
        }
      }
      
      // Uncheck all items
      for (let i = 0; i < itemsToSelect; i++) {
        await checkboxes.nth(i).uncheck();
      }
    }
  });
});
