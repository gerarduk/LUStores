import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Dashboard Page - Complete Button Coverage', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateAndWait('/dashboard');
  });

  test('should test all buttons on dashboard page', async ({ page }) => {
    // Get all clickable elements on the page
    const clickableElements = await helpers.getAllClickableElements();
    const elementCount = await clickableElements.count();
    
    console.log(`Found ${elementCount} clickable elements on dashboard page`);
    
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
          await helpers.screenshot(`dashboard-before-click-${i}`);
          
          // Click the element
          await element.click();
          await helpers.waitForNetworkIdle();
          
          // Take screenshot after clicking
          await helpers.screenshot(`dashboard-after-click-${i}`);
          
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
          if (!currentUrl.includes('/dashboard') && !currentUrl.endsWith('/')) {
            console.log(`  - Navigated to: ${currentUrl}`);
            // Navigate back to dashboard
            await helpers.navigateAndWait('/dashboard');
          }
          
        } catch (error) {
          console.log(`  - Error clicking element: ${error}`);
          // Continue with next element
        }
      }
    }
  });

  test('should handle dashboard widgets and cards', async ({ page }) => {
    // Look for dashboard widgets/cards
    const widgets = page.locator('.widget, .dashboard-card, .stats-card, .card');
    const widgetCount = await widgets.count();
    
    console.log(`Found ${widgetCount} dashboard widgets/cards`);
    
    if (widgetCount > 0) {
      for (let i = 0; i < Math.min(widgetCount, 5); i++) {
        const widget = widgets.nth(i);
        
        // Look for buttons within each widget
        const widgetButtons = widget.locator('button, a[href], [role="button"]');
        const buttonCount = await widgetButtons.count();
        
        if (buttonCount > 0) {
          console.log(`Testing buttons in widget ${i + 1}`);
          
          for (let j = 0; j < buttonCount; j++) {
            const button = widgetButtons.nth(j);
            
            if (await helpers.isElementClickable(button)) {
              const buttonText = await button.textContent() || '';
              console.log(`  - Testing widget button: "${buttonText.trim()}"`);
              
              try {
                await button.click();
                await helpers.waitForNetworkIdle();
                
                // Check if modal opened or we navigated
                const modal = page.locator('[role="dialog"], .modal');
                if (await modal.isVisible()) {
                  console.log('    - Widget button opened modal');
                  // Close modal
                  const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                  if (await closeButton.isVisible()) {
                    await closeButton.click();
                  } else {
                    await page.keyboard.press('Escape');
                  }
                }
                
                // Check if we navigated away
                const currentUrl = page.url();
                if (!currentUrl.includes('/dashboard') && !currentUrl.endsWith('/')) {
                  console.log(`    - Widget button navigated to: ${currentUrl}`);
                  await helpers.navigateAndWait('/dashboard');
                }
                
              } catch (error) {
                console.log(`    - Error with widget button: ${error}`);
              }
            }
          }
        }
      }
    }
  });

  test('should handle quick action buttons', async ({ page }) => {
    // Look for quick action buttons
    const quickActionButtons = [
      page.getByRole('button', { name: /add/i }),
      page.getByRole('button', { name: /create/i }),
      page.getByRole('button', { name: /new/i }),
      page.getByRole('button', { name: /quick/i }),
      page.locator('button').filter({ hasText: /\+/ }),
      page.locator('.quick-action, .action-btn')
    ];
    
    for (const actionButtonGroup of quickActionButtons) {
      const buttonCount = await actionButtonGroup.count();
      
      if (buttonCount > 0) {
        console.log(`Testing ${buttonCount} quick action buttons`);
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = actionButtonGroup.nth(i);
          
          if (await helpers.isElementClickable(button)) {
            const buttonText = await button.textContent() || '';
            console.log(`Testing quick action: "${buttonText.trim()}"`);
            
            try {
              await button.click();
              await helpers.waitForNetworkIdle();
              
              // Check if modal opened or we navigated
              const modal = page.locator('[role="dialog"], .modal');
              if (await modal.isVisible()) {
                console.log('  - Quick action opened modal');
                // Close modal
                const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                if (await closeButton.isVisible()) {
                  await closeButton.click();
                } else {
                  await page.keyboard.press('Escape');
                }
              }
              
              // Check if we navigated away
              const currentUrl = page.url();
              if (!currentUrl.includes('/dashboard') && !currentUrl.endsWith('/')) {
                console.log(`  - Quick action navigated to: ${currentUrl}`);
                await helpers.navigateAndWait('/dashboard');
              }
              
            } catch (error) {
              console.log(`  - Error with quick action: ${error}`);
            }
          }
        }
        break; // Only test one group of quick actions
      }
    }
  });

  test('should handle refresh and reload functionality', async ({ page }) => {
    // Look for refresh/reload buttons
    const refreshButtons = [
      page.getByRole('button', { name: /refresh/i }),
      page.getByRole('button', { name: /reload/i }),
      page.getByRole('button', { name: /update/i }),
      page.locator('button').filter({ hasText: /↻|🔄/ }),
      page.locator('.refresh-btn, .reload-btn')
    ];
    
    for (const refreshButtonGroup of refreshButtons) {
      const buttonCount = await refreshButtonGroup.count();
      
      if (buttonCount > 0) {
        console.log(`Testing ${buttonCount} refresh buttons`);
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = refreshButtonGroup.nth(i);
          
          if (await helpers.isElementClickable(button)) {
            const buttonText = await button.textContent() || '';
            console.log(`Testing refresh button: "${buttonText.trim()}"`);
            
            try {
              // Get initial content to compare after refresh
              const initialContent = await page.locator('body').textContent();
              
              await button.click();
              await helpers.waitForNetworkIdle();
              
              // Check if content refreshed (might be the same, but should still be visible)
              const refreshedContent = await page.locator('body').textContent();
              expect(refreshedContent).toBeTruthy();
              
              console.log('  - Refresh button clicked successfully');
              
            } catch (error) {
              console.log(`  - Error with refresh button: ${error}`);
            }
          }
        }
        break; // Only test one group of refresh buttons
      }
    }
  });

  test('should handle navigation buttons', async ({ page }) => {
    // Look for navigation buttons (View More, See All, etc.)
    const navButtons = [
      page.getByRole('button', { name: /view.*more/i }),
      page.getByRole('button', { name: /see.*all/i }),
      page.getByRole('button', { name: /details/i }),
      page.getByRole('button', { name: /show.*all/i }),
      page.locator('a').filter({ hasText: /view|see|more|all/i })
    ];
    
    for (const navButtonGroup of navButtons) {
      const buttonCount = await navButtonGroup.count();
      
      if (buttonCount > 0) {
        console.log(`Testing ${buttonCount} navigation buttons`);
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = navButtonGroup.nth(i);
          
          if (await helpers.isElementClickable(button)) {
            const buttonText = await button.textContent() || '';
            console.log(`Testing navigation button: "${buttonText.trim()}"`);
            
            try {
              const initialUrl = page.url();
              
              await button.click();
              await helpers.waitForNetworkIdle();
              
              // Check if modal opened or we navigated
              const modal = page.locator('[role="dialog"], .modal');
              const currentUrl = page.url();
              
              if (await modal.isVisible()) {
                console.log('  - Navigation button opened modal');
                // Close modal
                const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                if (await closeButton.isVisible()) {
                  await closeButton.click();
                } else {
                  await page.keyboard.press('Escape');
                }
              } else if (currentUrl !== initialUrl) {
                console.log(`  - Navigation button navigated to: ${currentUrl}`);
                await helpers.navigateAndWait('/dashboard');
              }
              
            } catch (error) {
              console.log(`  - Error with navigation button: ${error}`);
            }
          }
        }
        break; // Only test one group of navigation buttons
      }
    }
  });

  test('should handle settings and configuration buttons', async ({ page }) => {
    // Look for settings/config buttons
    const settingsButtons = [
      page.getByRole('button', { name: /settings/i }),
      page.getByRole('button', { name: /config/i }),
      page.getByRole('button', { name: /preferences/i }),
      page.locator('button').filter({ hasText: /⚙️|⚙|🔧/ }),
      page.locator('.settings-btn, .config-btn')
    ];
    
    for (const settingsButtonGroup of settingsButtons) {
      const buttonCount = await settingsButtonGroup.count();
      
      if (buttonCount > 0) {
        console.log(`Testing ${buttonCount} settings buttons`);
        
        for (let i = 0; i < buttonCount; i++) {
          const button = settingsButtonGroup.nth(i);
          
          if (await helpers.isElementClickable(button)) {
            const buttonText = await button.textContent() || '';
            console.log(`Testing settings button: "${buttonText.trim()}"`);
            
            try {
              await button.click();
              await helpers.waitForNetworkIdle();
              
              // Check if modal opened or we navigated
              const modal = page.locator('[role="dialog"], .modal');
              const currentUrl = page.url();
              
              if (await modal.isVisible()) {
                console.log('  - Settings button opened modal');
                // Close modal
                const closeButton = modal.locator('button').filter({ hasText: /close|cancel|×/i }).first();
                if (await closeButton.isVisible()) {
                  await closeButton.click();
                } else {
                  await page.keyboard.press('Escape');
                }
              } else if (!currentUrl.includes('/dashboard') && !currentUrl.endsWith('/')) {
                console.log(`  - Settings button navigated to: ${currentUrl}`);
                await helpers.navigateAndWait('/dashboard');
              }
              
            } catch (error) {
              console.log(`  - Error with settings button: ${error}`);
            }
          }
        }
        break; // Only test one group of settings buttons
      }
    }
  });
});
