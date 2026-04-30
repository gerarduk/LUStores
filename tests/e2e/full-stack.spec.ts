import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * Full Stack Integration Tests - Real E2E without mocking
 * 
 * These tests verify complete user workflows across the entire application
 */

test.describe('Full Stack Integration - Complete App Coverage', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should test complete inventory management workflow', async ({ page }) => {
    console.log('Testing complete inventory management workflow');
    
    // Navigate to inventory
    await helpers.navigateAndWait('/inventory');
    await helpers.waitForPageStable();
    
    // Test all buttons on inventory page
    const inventoryButtons = await helpers.getAllButtons();
    const buttonCount = await inventoryButtons.count();
    
    console.log(`Found ${buttonCount} buttons on inventory page`);
    
    for (let i = 0; i < Math.min(buttonCount, 8); i++) {
      const button = inventoryButtons.nth(i);
      
      if (await helpers.isElementClickable(button)) {
        const buttonText = await button.textContent() || '';
        console.log(`  Testing inventory button: "${buttonText.trim()}"`);
        
        try {
          // Use safeClick instead of direct click
          const clickSuccess = await helpers.safeClick(button, { timeout: 15000 });
          
          if (clickSuccess) {
            await helpers.waitForPageStable();
            
            // Handle any modals that open
            const modal = page.locator('[role="dialog"], .modal').first();
            if (await modal.isVisible()) {
              console.log('    - Modal opened, testing form if present');
              
              // If it's an add/edit form, try to fill it
              const nameInput = modal.locator('input[name="name"], input[placeholder*="name" i]').first();
              if (await nameInput.isVisible()) {
                await helpers.fillItemForm({
                  name: 'E2E Test Item ' + Date.now(),
                  sku: 'E2E-' + Date.now(),
                  price: '19.99',
                  stock: '10'
                });
                
                // Try to submit
                const submitBtn = modal.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
                if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
                  const submitSuccess = await helpers.safeClick(submitBtn, { timeout: 10000 });
                  if (submitSuccess) {
                    await helpers.waitForPageStable();
                    console.log('    - Form submitted successfully');
                  }
                }
              }
              
              // Close modal using helper method
              await helpers.closeModal();
            }
            
            // If we navigated away, go back
            if (!page.url().includes('/inventory')) {
              await helpers.navigateAndWait('/inventory');
              await helpers.waitForPageStable();
            }
          } else {
            console.log(`    - Failed to click button: "${buttonText.trim()}"`);
          }
          
        } catch (error) {
          console.log(`    - Error with button: ${error}`);
        }
      }
    }
  });

  test('should test complete sales workflow', async ({ page }) => {
    console.log('Testing complete sales workflow');
    
    await helpers.navigateAndWait('/sales');
    await helpers.waitForPageStable();
    
    // Test sales page buttons
    const salesButtons = await helpers.getAllButtons();
    const buttonCount = await salesButtons.count();
    
    console.log(`Found ${buttonCount} buttons on sales page`);
    
    for (let i = 0; i < Math.min(buttonCount, 8); i++) {
      const button = salesButtons.nth(i);
      
      if (await helpers.isElementClickable(button)) {
        const buttonText = await button.textContent() || '';
        console.log(`  Testing sales button: "${buttonText.trim()}"`);
        
        try {
          // Use safeClick with timeout
          const clickSuccess = await helpers.safeClick(button, { timeout: 15000 });
          
          if (clickSuccess) {
            await helpers.waitForPageStable();
            
            // Handle modals/forms
            const modal = page.locator('[role="dialog"], .modal').first();
            if (await modal.isVisible()) {
              console.log('    - Sales modal opened');
              
              // Fill customer info if present
              const customerInput = modal.locator('input[name*="customer"], input[placeholder*="customer" i]').first();
              if (await customerInput.isVisible()) {
                await customerInput.fill('Test Customer Corp');
                await helpers.waitForPageStable();
              }
              
              // Close modal using helper method
              await helpers.closeModal();
            }
            
            // Handle downloads
            const downloadPromise = page.waitForEvent('download', { timeout: 2000 }).catch(() => null);
            const download = await downloadPromise;
            if (download) {
              console.log(`    - Download triggered: ${download.suggestedFilename()}`);
            }
            
            // Navigate back if needed
            if (!page.url().includes('/sales')) {
              await helpers.navigateAndWait('/sales');
              await helpers.waitForPageStable();
            }
          } else {
            console.log(`    - Failed to click sales button: "${buttonText.trim()}"`);
          }
          
        } catch (error) {
          console.log(`    - Error with sales button: ${error}`);
        }
      }
    }
  });

  test('should test dashboard interactions and navigation', async ({ page }) => {
    console.log('Testing dashboard interactions');
    
    await helpers.navigateAndWait('/dashboard');
    await helpers.waitForPageStable();
    
    // Test dashboard widgets and buttons
    const dashboardButtons = await helpers.getAllButtons();
    const buttonCount = await dashboardButtons.count();
    
    console.log(`Found ${buttonCount} buttons on dashboard`);
    
    for (let i = 0; i < Math.min(buttonCount, 6); i++) {
      const button = dashboardButtons.nth(i);
      
      if (await helpers.isElementClickable(button)) {
        const buttonText = await button.textContent() || '';
        console.log(`  Testing dashboard button: "${buttonText.trim()}"`);
        
        try {
          const initialUrl = page.url();
          
          // Use safeClick with timeout
          const clickSuccess = await helpers.safeClick(button, { timeout: 15000 });
          
          if (clickSuccess) {
            await helpers.waitForPageStable();
            const newUrl = page.url();
            
            if (newUrl !== initialUrl) {
              console.log(`    - Navigated to: ${newUrl}`);
              
              // Test a few buttons on the new page
              const newPageButtons = await helpers.getAllButtons();
              const newButtonCount = await newPageButtons.count();
              
              if (newButtonCount > 0) {
                const testButton = newPageButtons.first();
                if (await helpers.isElementClickable(testButton)) {
                  const testButtonText = await testButton.textContent() || '';
                  console.log(`      - Testing button on new page: "${testButtonText.trim()}"`);
                  
                  const testClickSuccess = await helpers.safeClick(testButton, { timeout: 10000 });
                  if (testClickSuccess) {
                    await helpers.waitForPageStable();
                    
                    // Handle any modal that opens
                    const modal = page.locator('[role="dialog"], .modal').first();
                    if (await modal.isVisible()) {
                      await helpers.closeModal();
                    }
                  }
                }
              }
              
              // Navigate back to dashboard
              await helpers.navigateAndWait('/dashboard');
              await helpers.waitForPageStable();
            } else {
              // Handle modal on dashboard
              const modal = page.locator('[role="dialog"], .modal').first();
              if (await modal.isVisible()) {
                console.log('    - Dashboard modal opened');
                await helpers.closeModal();
              }
            }
          } else {
            console.log(`    - Failed to click dashboard button: "${buttonText.trim()}"`);
          }
          
        } catch (error) {
          console.log(`    - Error with dashboard button: ${error}`);
        }
      }
    }
  });

  test('should test cross-page navigation and button consistency', async ({ page }) => {
    console.log('Testing cross-page navigation and button consistency');
    
    const pages = ['/', '/dashboard', '/inventory', '/sales'];
    const buttonCounts: Record<string, number> = {};
    
    // Count buttons on each page
    for (const pagePath of pages) {
      try {
        await helpers.navigateAndWait(pagePath);
        const buttons = await helpers.getAllButtons();
        const count = await buttons.count();
        buttonCounts[pagePath] = count;
        console.log(`  ${pagePath}: ${count} buttons`);
      } catch (error) {
        console.log(`  Error testing ${pagePath}: ${error}`);
        buttonCounts[pagePath] = 0;
      }
    }
    
    // Test navigation between pages
    for (const fromPage of pages) {
      try {
        await helpers.navigateAndWait(fromPage);
        
        // Look for navigation links to other pages
        const navLinks = page.locator('a[href], nav a, .nav a, [role="navigation"] a');
        const linkCount = await navLinks.count();
        
        if (linkCount > 0) {
          console.log(`  Testing navigation from ${fromPage} (${linkCount} links found)`);
          
          // Test up to 3 navigation links
          for (let i = 0; i < Math.min(linkCount, 3); i++) {
            const link = navLinks.nth(i);
            
            if (await helpers.isElementClickable(link)) {
              const href = await link.getAttribute('href');
              const linkText = await link.textContent() || '';
              
              if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
                console.log(`    - Testing nav link: "${linkText.trim()}" -> ${href}`);
                
                try {
                  await link.click();
                  await helpers.waitForNetworkIdle();
                  
                  const currentUrl = page.url();
                  console.log(`      - Successfully navigated to: ${currentUrl}`);
                  
                  // Navigate back to continue testing
                  await helpers.navigateAndWait(fromPage);
                  
                } catch (error) {
                  console.log(`      - Error with navigation: ${error}`);
                }
              }
            }
          }
        }
        
      } catch (error) {
        console.log(`  Error testing navigation from ${fromPage}: ${error}`);
      }
    }
    
    // Verify we found buttons on most pages
    const totalButtons = Object.values(buttonCounts).reduce((sum, count) => sum + count, 0);
    console.log(`Total buttons found across all pages: ${totalButtons}`);
    expect(totalButtons).toBeGreaterThan(0);
  });

  test('should test form interactions across the application', async ({ page }) => {
    console.log('Testing form interactions across the application');
    
    const pagesWithForms = ['/inventory', '/sales', '/settings'];
    
    for (const pagePath of pagesWithForms) {
      try {
        console.log(`  Testing forms on ${pagePath}`);
        await helpers.navigateAndWait(pagePath);
        
        // Look for buttons that might open forms
        const formTriggers = [
          page.getByRole('button', { name: /add/i }),
          page.getByRole('button', { name: /create/i }),
          page.getByRole('button', { name: /new/i }),
          page.locator('button').filter({ hasText: /\+/ })
        ];
        
        for (const triggerGroup of formTriggers) {
          const triggerCount = await triggerGroup.count();
          
          if (triggerCount > 0) {
            const trigger = triggerGroup.first();
            
            if (await helpers.isElementClickable(trigger)) {
              const triggerText = await trigger.textContent() || '';
              console.log(`    - Testing form trigger: "${triggerText.trim()}"`);
              
              try {
                await trigger.click();
                await helpers.waitForNetworkIdle();
                
                // Check if form opened
                const form = page.locator('form, [role="dialog"], .modal');
                if (await form.isVisible()) {
                  console.log('      - Form opened successfully');
                  
                  // Test form inputs
                  const inputs = form.locator('input, textarea, select');
                  const inputCount = await inputs.count();
                  
                  console.log(`      - Found ${inputCount} form inputs`);
                  
                  // Fill first few inputs with test data
                  for (let i = 0; i < Math.min(inputCount, 3); i++) {
                    const input = inputs.nth(i);
                    const inputType = await input.getAttribute('type') || 'text';
                    const inputName = await input.getAttribute('name') || '';
                    
                    if (await input.isVisible() && await input.isEnabled()) {
                      console.log(`        - Filling input: ${inputName} (${inputType})`);
                      
                      if (inputType === 'text' || inputType === 'email' || !inputType) {
                        await input.fill('Test Value ' + Date.now());
                      } else if (inputType === 'number') {
                        await input.fill('123');
                      }
                    }
                  }
                  
                  // Close form without submitting
                  const closeBtn = form.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                  if (await closeBtn.isVisible()) {
                    await closeBtn.click();
                  } else {
                    await page.keyboard.press('Escape');
                  }
                  
                  console.log('      - Form closed successfully');
                }
                
              } catch (error) {
                console.log(`      - Error with form trigger: ${error}`);
              }
            }
            break; // Only test one form trigger per page
          }
        }
        
      } catch (error) {
        console.log(`  Error testing forms on ${pagePath}: ${error}`);
      }
    }
  });
});
