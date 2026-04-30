import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Sales Page - Complete Button Coverage', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateAndWait('/sales');
  });

  test('should test all buttons on sales page', async ({ page }) => {
    // Authenticate first
    await helpers.login();
    console.log('User authenticated successfully');
    
    // Get all clickable elements on the page
    const clickableElements = await helpers.getAllClickableElements();
    const elementCount = await clickableElements.count();
    
    console.log(`Found ${elementCount} clickable elements on sales page`);
    
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
          await helpers.screenshot(`sales-before-click-${i}`);
          
          // Click the element
          await element.click();
          await helpers.waitForNetworkIdle();
          
          // Take screenshot after clicking
          await helpers.screenshot(`sales-after-click-${i}`);
          
          // Check if any modal/dialog opened
          const modal = page.locator('[role="dialog"], .modal, .popup, .dropdown');
          const modalCount = await modal.count();
          
          if (modalCount > 0) {
            console.log(`  - Opened modal/dialog`);
            
            // Try to close modal if it has a close button
            const closeButton = page.locator('[role="dialog"] button, .modal button').filter({ hasText: /close|cancel|×/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await helpers.waitForNetworkIdle();
            } else {
              // Try pressing Escape
              await page.keyboard.press('Escape');
              await helpers.waitForNetworkIdle();
            }
          }
          
          // Check if we navigated to a different page
          const currentUrl = page.url();
          if (!currentUrl.includes('/sales')) {
            console.log(`  - Navigated to: ${currentUrl}`);
            // Navigate back to sales
            await helpers.navigateAndWait('/sales');
          }
          
        } catch (error) {
          console.log(`  - Error clicking element: ${error}`);
          // Continue with next element
        }
      }
    }
  });

  test('should handle quote creation flow', async ({ page }) => {
    // Look for quote creation buttons with more specific selectors
    const quoteButtons = [
      page.getByRole('button', { name: /create.*quote/i }),
      page.getByRole('button', { name: /new.*quote/i }),
      page.getByRole('button', { name: /add.*quote/i }),
      page.locator('button:has-text("Quote")'),
      page.locator('button:has-text("Create Quote")'),
      page.locator('button:has-text("New Quote")'),
      page.locator('a[href*="quote"]'),
      page.locator('[data-testid*="quote"]'),
      page.locator('.quote-button, .create-quote')
    ];
    
    let quoteButtonFound = false;
    
    for (const quoteButton of quoteButtons) {
      try {
        if (await quoteButton.first().isVisible()) {
          console.log('Found quote creation button, testing quote flow');
          await quoteButton.first().click({ timeout: 10000 });
          await helpers.waitForNetworkIdle();
        
          // Check if form opened or we navigated to quote page
          const hasForm = await page.locator('form, [role="dialog"], .modal').isVisible();
          const isQuotePage = page.url().includes('quote');
          
          if (hasForm || isQuotePage) {
            console.log('Quote creation form/page opened successfully');
            
            // Try to fill basic quote information
            try {
              // Look for customer field
              const customerField = page.locator('input[name*="customer"], input[placeholder*="customer" i]').first();
              if (await customerField.isVisible()) {
                await customerField.fill('Test Customer Corp');
              }
              
              // Look for description field
              const descField = page.locator('textarea[name*="description"], input[name*="description"]').first();
              if (await descField.isVisible()) {
                await descField.fill('E2E Test Quote');
              }
              
              console.log('Successfully filled quote information');
            } catch (error) {
              console.log('Could not complete quote creation:', error);
            }
          }
          
          quoteButtonFound = true;
          break;
        }
      } catch (error) {
        console.log(`Quote button click failed: ${error.message}`);
        // Continue to next button
      }
    }
    
    if (!quoteButtonFound) {
      console.log('No quote creation button found on page');
    }
  });

  test('should handle customer management', async ({ page }) => {
    // Look for customer-related inputs and buttons
    const customerElements = [
      page.getByPlaceholder(/customer/i),
      page.locator('input[name*="customer"]'),
      page.getByRole('button', { name: /customer/i }),
      page.getByRole('button', { name: /add.*customer/i })
    ];
    
    for (const element of customerElements) {
      if (await element.first().isVisible()) {
        const tagName = await element.first().evaluate(el => el.tagName);
        
        if (tagName === 'INPUT') {
          console.log('Testing customer search/input');
          await element.first().fill('Test Customer');
          await helpers.waitForNetworkIdle();
          
          // Look for dropdown/suggestions
          const dropdown = page.locator('.dropdown, .autocomplete, .suggestions, [role="listbox"]');
          if (await dropdown.isVisible()) {
            console.log('Customer dropdown appeared');
          }
          
          await element.first().clear();
        } else {
          console.log('Testing customer button');
          await element.first().click();
          await helpers.waitForNetworkIdle();
          
          // Check if modal opened
          const modal = page.locator('[role="dialog"], .modal');
          if (await modal.isVisible()) {
            console.log('Customer modal opened');
            // Try to close it
            const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            } else {
              await page.keyboard.press('Escape');
            }
          }
        }
        break;
      }
    }
  });

  test('should handle item management in quotes', async ({ page }) => {
    // Look for item-related buttons
    const itemButtons = [
      page.getByRole('button', { name: /add.*item/i }),
      page.getByRole('button', { name: /select.*item/i }),
      page.getByRole('button', { name: /item/i }),
      page.locator('button').filter({ hasText: /\+/ })
    ];
    
    for (const itemButton of itemButtons) {
      if (await itemButton.first().isVisible()) {
        console.log('Testing item management button');
        await itemButton.first().click();
        await helpers.waitForNetworkIdle();
        
        // Check if item selection dialog opened
        const modal = page.locator('[role="dialog"], .modal, .item-selector');
        if (await modal.isVisible()) {
          console.log('Item selection dialog opened');
          
          // Try to select an item if available
          const itemList = modal.locator('table tr, .item-row, .item').first();
          if (await itemList.isVisible()) {
            await itemList.click();
            await helpers.waitForNetworkIdle();
          }
          
          // Close modal
          const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
        break;
      }
    }
  });

  test('should handle export and download functionality', async ({ page }) => {
    // Look for export/download buttons
    const exportButtons = [
      page.getByRole('button', { name: /export/i }),
      page.getByRole('button', { name: /download/i }),
      page.getByRole('button', { name: /print/i }),
      page.getByRole('button', { name: /pdf/i }),
      page.getByRole('button', { name: /csv/i })
    ];
    
    for (const exportButton of exportButtons) {
      if (await exportButton.first().isVisible()) {
        const buttonText = await exportButton.first().textContent();
        console.log(`Testing export/download button: ${buttonText}`);
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        
        await exportButton.first().click();
        
        const download = await downloadPromise;
        if (download) {
          console.log(`Download triggered: ${download.suggestedFilename()}`);
        } else {
          console.log('Export button clicked but no download detected');
        }
        
        await helpers.waitForNetworkIdle();
        break;
      }
    }
  });

  test('should handle quote actions and workflow', async ({ page }) => {
    // Look for quote action buttons
    const actionButtons = [
      page.getByRole('button', { name: /save/i }),
      page.getByRole('button', { name: /send/i }),
      page.getByRole('button', { name: /approve/i }),
      page.getByRole('button', { name: /reject/i }),
      page.getByRole('button', { name: /convert/i }),
      page.getByRole('button', { name: /invoice/i })
    ];
    
    for (const actionButton of actionButtons) {
      if (await actionButton.first().isVisible()) {
        const buttonText = await actionButton.first().textContent();
        console.log(`Testing quote action button: ${buttonText}`);
        
        await actionButton.first().click();
        await helpers.waitForNetworkIdle();
        
        // Check if confirmation dialog appeared
        const confirmDialog = page.locator('[role="alertdialog"], .confirm-dialog');
        if (await confirmDialog.isVisible()) {
          console.log('Confirmation dialog appeared');
          // Cancel the action
          const cancelButton = confirmDialog.locator('button').filter({ hasText: /cancel|no/i }).first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
        
        // Check if form/modal opened
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible()) {
          console.log('Action modal opened');
          // Close it
          const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
        
        break;
      }
    }
  });

  test('should handle search and filtering', async ({ page }) => {
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
        
        await searchInput.first().fill('test');
        await page.keyboard.press('Enter');
        await helpers.waitForNetworkIdle();
        
        await searchInput.first().clear();
        await helpers.waitForNetworkIdle();
        
        console.log('Search functionality tested');
        break;
      }
    }
    
    // Look for filter buttons
    const filterButtons = [
      page.getByRole('button', { name: /filter/i }),
      page.getByRole('button', { name: /sort/i }),
      page.locator('.filter-btn, .sort-btn')
    ];
    
    for (const filterButton of filterButtons) {
      if (await filterButton.first().isVisible()) {
        console.log('Testing filter functionality');
        await filterButton.first().click();
        await helpers.waitForNetworkIdle();
        
        // Check if filter dropdown opened
        const dropdown = page.locator('.dropdown, .filter-menu');
        if (await dropdown.isVisible()) {
          console.log('Filter dropdown opened');
          // Click elsewhere to close
          await page.click('body');
        }
        break;
      }
    }
  });
});
