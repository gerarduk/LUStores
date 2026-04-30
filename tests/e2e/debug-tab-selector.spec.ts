import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Debug Tab Selector', () => {
  test('Debug Current Quote tab selector', async ({ page }) => {
    console.log('Starting Debug Tab Selector Test');
    
    // Always start with login to ensure we're authenticated
    const helpers = new TestHelpers(page);
    await helpers.login();
    
    // Check if we're on login page, if so authenticate, then go to sales
    if (page.url().includes('/login') || page.url() === 'http://localhost:5000/') {
      console.log('Not on sales page, logging in first');
      await helpers.login();
    }


    // Navigate to sales page
    await page.goto('/sales');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-initial.png', fullPage: true });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Check if tabs are present
    const tabsList = page.locator('[role="tablist"], .grid.w-full.grid-cols-4');
    await tabsList.waitFor({ timeout: 10000 });
    console.log('Tabs list found');
    
    // Take screenshot after tabs load
    await page.screenshot({ path: 'debug-tabs-loaded.png', fullPage: true });
    
    // List all tab elements
    const allTabs = page.locator('button[role="tab"], [role="tab"]');
    const tabCount = await allTabs.count();
    console.log(`Found ${tabCount} tab elements`);
    
    for (let i = 0; i < tabCount; i++) {
      const tab = allTabs.nth(i);
      const text = await tab.textContent();
      const value = await tab.getAttribute('data-value');
      const role = await tab.getAttribute('role');
      console.log(`Tab ${i}: text="${text}", data-value="${value}", role="${role}"`);
    }
    
    // Try different selectors for Current Quote tab
    const selectors = [
      'button[data-value="quote"]',
      '[role="tab"][data-value="quote"]',
      'button[role="tab"][data-value="quote"]',
      'button:has-text("Current Quote")',
      '[data-value="quote"]',
      'button:has-text("Current Quote") >> visible',
    ];
    
    for (const selector of selectors) {
      try {
        const element = page.locator(selector);
        const count = await element.count();
        const isVisible = count > 0 ? await element.first().isVisible() : false;
        console.log(`Selector "${selector}": count=${count}, visible=${isVisible}`);
        
        if (count > 0 && isVisible) {
          const text = await element.first().textContent();
          console.log(`  Text content: "${text}"`);
        }
      } catch (error) {
        console.log(`Selector "${selector}": ERROR - ${error.message}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-final.png', fullPage: true });
    
    console.log('Debug Tab Selector Test Complete');
  });
});
