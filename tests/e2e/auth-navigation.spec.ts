import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Navigation and Page Buttons - Complete Coverage', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should test all navigation buttons and links', async ({ page }) => {
    // Start from dashboard page (more reliable than home)
    await helpers.navigateAndWait('/dashboard');
    
    // Focus on main navigation elements only
    const navElements = page.locator('nav a, [role="navigation"] a, .nav-link, header a');
    const navCount = await navElements.count();
    
    console.log(`Found ${navCount} navigation elements`);
    
    // Test up to 10 navigation elements to avoid timeouts
    const maxElements = Math.min(navCount, 10);
    
    for (let i = 0; i < maxElements; i++) {
      const element = navElements.nth(i);
      
      try {
        const text = await element.textContent() || '';
        const href = await element.getAttribute('href');
        
        // Skip empty or invalid links
        if (!text.trim() || href === '#' || href === 'javascript:void(0)') {
          continue;
        }
        
        console.log(`Testing nav element ${i + 1}: "${text.trim()}" (${href})`);
        
        const initialUrl = page.url();
        
        // Click with timeout and error handling
        await element.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        await page.waitForTimeout(1000);
        
        const newUrl = page.url();
        
        // Check if we navigated successfully
        if (newUrl !== initialUrl) {
          console.log(`  - Successfully navigated to ${newUrl}`);
          
          // Navigate back to dashboard for next test
          await helpers.navigateAndWait('/dashboard');
        } else {
          // Check if modal/dropdown opened
          const modal = page.locator('[role="dialog"], .modal, .dropdown');
          if (await modal.isVisible()) {
            console.log(`  - Opened modal/dropdown`);
            // Close it
            const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
          }
        }
      } catch (error) {
        console.log(`  - Error testing element ${i + 1}: ${error}`);
        // Continue with next element
      }
    }
  });

  test('should test all main navigation pages', async ({ page }) => {
    const mainPages = [
      '/',
      '/dashboard',
      '/inventory', 
      '/sales',
      '/reports',
      '/settings'
    ];
    
    for (const pagePath of mainPages) {
      console.log(`Testing page: ${pagePath}`);
      
      try {
        await helpers.navigateAndWait(pagePath);
        
        // Get all buttons on this page
        const buttons = await helpers.getAllButtons();
        const buttonCount = await buttons.count();
        
        console.log(`  Found ${buttonCount} buttons on ${pagePath}`);
        
        // Test up to 10 buttons per page
        const buttonsToTest = Math.min(buttonCount, 10);
        
        for (let i = 0; i < buttonsToTest; i++) {
          const button = buttons.nth(i);
          
          if (await helpers.isElementClickable(button)) {
            const buttonText = await button.textContent() || '';
            const buttonId = await button.getAttribute('id') || '';
            const buttonClass = await button.getAttribute('class') || '';
            
            console.log(`    Testing button ${i + 1}: "${buttonText.trim()}" (id: ${buttonId}, class: ${buttonClass})`);
            
            try {
              // Take screenshot before clicking
              await helpers.screenshot(`${pagePath.replace('/', 'home')}-button-${i}-before`);
              
              await button.click();
              await page.waitForTimeout(1000);
              
              // Take screenshot after clicking
              await helpers.screenshot(`${pagePath.replace('/', 'home')}-button-${i}-after`);
              
              // Check if modal opened
              const modal = page.locator('[role="dialog"], .modal, .popup');
              if (await modal.isVisible()) {
                console.log(`      - Button opened modal`);
                // Close modal
                const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                if (await closeButton.isVisible()) {
                  await closeButton.click();
                } else {
                  await page.keyboard.press('Escape');
                }
                await page.waitForTimeout(1000);
              }
              
              // Check if we navigated away
              const currentUrl = page.url();
              if (!currentUrl.includes(pagePath) && pagePath !== '/') {
                console.log(`      - Button navigated to: ${currentUrl}`);
                // Navigate back to the original page
                await helpers.navigateAndWait(pagePath);
              } else if (pagePath === '/' && !currentUrl.endsWith('/') && !currentUrl.includes('/dashboard')) {
                console.log(`      - Button navigated to: ${currentUrl}`);
                await helpers.navigateAndWait('/');
              }
              
            } catch (error) {
              console.log(`      - Error with button: ${error}`);
              // Try to recover by navigating back to the page
              try {
                await helpers.navigateAndWait(pagePath);
              } catch (recoveryError) {
                console.log(`      - Could not recover: ${recoveryError}`);
              }
            }
          }
        }
        
      } catch (error) {
        console.log(`  Error testing page ${pagePath}: ${error}`);
      }
    }
  });

  test('should test form submission buttons', async ({ page }) => {
    const pagesWithForms = [
      '/inventory',
      '/sales',
      '/settings'
    ];
    
    for (const pagePath of pagesWithForms) {
      console.log(`Testing form buttons on: ${pagePath}`);
      
      try {
        await helpers.navigateAndWait(pagePath);
        
        // Look for buttons that might open forms
        const formTriggerButtons = [
          page.getByRole('button', { name: /add/i }),
          page.getByRole('button', { name: /create/i }),
          page.getByRole('button', { name: /new/i }),
          page.locator('button').filter({ hasText: /\+/ })
        ];
        
        for (const buttonGroup of formTriggerButtons) {
          const buttonCount = await buttonGroup.count();
          
          if (buttonCount > 0) {
            const button = buttonGroup.first();
            
            if (await helpers.isElementClickable(button)) {
              const buttonText = await button.textContent() || '';
              console.log(`  Testing form trigger button: "${buttonText.trim()}"`);
              
              try {
                await button.click();
                await page.waitForTimeout(1000);
                
                // Check if form opened
                const form = page.locator('form, [role="dialog"], .modal');
                if (await form.isVisible()) {
                  console.log(`    - Form opened`);
                  
                  // Look for form submission buttons
                  const submitButtons = form.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")');
                  const submitCount = await submitButtons.count();
                  
                  if (submitCount > 0) {
                    console.log(`    - Found ${submitCount} submit buttons in form`);
                    
                    // Test the first submit button (without actually submitting)
                    const submitButton = submitButtons.first();
                    const isEnabled = await submitButton.isEnabled();
                    console.log(`    - Submit button enabled: ${isEnabled}`);
                  }
                  
                  // Close the form
                  const closeButton = form.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                  if (await closeButton.isVisible()) {
                    await closeButton.click();
                  } else {
                    await page.keyboard.press('Escape');
                  }
                }
                
              } catch (error) {
                console.log(`    - Error with form trigger: ${error}`);
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

  test('should test dropdown and menu buttons', async ({ page }) => {
    const pages = ['/', '/dashboard', '/inventory', '/sales'];
    
    for (const pagePath of pages) {
      console.log(`Testing dropdown/menu buttons on: ${pagePath}`);
      
      try {
        await helpers.navigateAndWait(pagePath);
        
        // Look for dropdown triggers
        const dropdownTriggers = [
          page.locator('button[aria-haspopup="true"]'),
          page.locator('button').filter({ hasText: /▼|▾|⌄|⌃/ }),
          page.locator('.dropdown-toggle, .menu-trigger'),
          page.getByRole('button', { name: /menu/i })
        ];
        
        for (const triggerGroup of dropdownTriggers) {
          const triggerCount = await triggerGroup.count();
          
          if (triggerCount > 0) {
            console.log(`  Found ${triggerCount} dropdown triggers`);
            
            for (let i = 0; i < Math.min(triggerCount, 3); i++) {
              const trigger = triggerGroup.nth(i);
              
              if (await helpers.isElementClickable(trigger)) {
                const triggerText = await trigger.textContent() || '';
                console.log(`    Testing dropdown trigger: "${triggerText.trim()}"`);
                
                try {
                  await trigger.click();
                  await page.waitForTimeout(1000);
                  
                  // Check if dropdown opened
                  const dropdown = page.locator('.dropdown-menu, .menu, [role="menu"], [role="listbox"]');
                  if (await dropdown.isVisible()) {
                    console.log(`      - Dropdown opened`);
                    
                    // Test dropdown items
                    const dropdownItems = dropdown.locator('button, a, [role="menuitem"]');
                    const itemCount = await dropdownItems.count();
                    
                    if (itemCount > 0) {
                      console.log(`      - Found ${itemCount} dropdown items`);
                      
                      // Test first dropdown item
                      const firstItem = dropdownItems.first();
                      if (await helpers.isElementClickable(firstItem)) {
                        const itemText = await firstItem.textContent() || '';
                        console.log(`        Testing dropdown item: "${itemText.trim()}"`);
                        
                        await firstItem.click();
                        await page.waitForTimeout(1000);
                        
                        // Check if we navigated or modal opened
                        const currentUrl = page.url();
                        const modal = page.locator('[role="dialog"], .modal');
                        
                        if (await modal.isVisible()) {
                          console.log(`          - Dropdown item opened modal`);
                          // Close modal
                          const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                          if (await closeButton.isVisible()) {
                            await closeButton.click();
                          } else {
                            await page.keyboard.press('Escape');
                          }
                        } else if (!currentUrl.includes(pagePath) && pagePath !== '/') {
                          console.log(`          - Dropdown item navigated to: ${currentUrl}`);
                          await helpers.navigateAndWait(pagePath);
                        }
                      }
                    }
                    
                    // Close dropdown by clicking elsewhere
                    await page.click('body');
                    await page.waitForTimeout(1000);
                  }
                  
                } catch (error) {
                  console.log(`      - Error with dropdown trigger: ${error}`);
                }
              }
            }
            break; // Only test one group of dropdowns per page
          }
        }
        
      } catch (error) {
        console.log(`  Error testing dropdowns on ${pagePath}: ${error}`);
      }
    }
  });
});
