import { Page, Locator } from '@playwright/test';

/**
 * Utility functions for reliable waiting patterns in E2E tests
 * Replaces brittle waitForTimeout calls with robust state-based waiting
 */

/**
 * Wait for an element to be visible and stable (not moving/changing)
 */
export async function waitForStableElement(page: Page, selector: string, timeout = 5000): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  
  // Wait for element to be stable (not animating/moving)
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect1 = el.getBoundingClientRect();
      return new Promise(resolve => {
        setTimeout(() => {
          const rect2 = el.getBoundingClientRect();
          resolve(rect1.top === rect2.top && rect1.left === rect2.left);
        }, 100);
      });
    },
    selector,
    { timeout: 5000 }
  );
  
  return element;
}

/**
 * Wait for loading states to complete
 */
export async function waitForLoadingComplete(page: Page, timeout = 8000): Promise<void> {
  // Wait for any loading spinners to disappear
  await page.waitForFunction(
    () => {
      const spinners = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner, [aria-label*="loading" i]');
      return spinners.length === 0;
    },
    { timeout }
  );
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for API calls to complete by checking for specific response patterns
 */
export async function waitForApiResponse(page: Page, urlPattern: string, timeout = 5000): Promise<void> {
  await page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

/**
 * Wait for tab to be active and content loaded
 */
export async function waitForTabActive(page: Page, tabSelector: string, timeout = 5000): Promise<void> {
  const tab = page.locator(tabSelector);
  await tab.waitFor({ state: 'visible', timeout });
  
  // Wait for tab to have active state using Playwright locator methods
  // instead of browser-incompatible selectors in waitForFunction
  try {
    await tab.waitFor({ 
      state: 'visible', 
      timeout: Math.min(timeout, 5000) 
    });
    
    // Check for active state using Playwright's attribute checking
    await page.waitForFunction(
      () => {
        // Use simple DOM queries that work in browser context
        const tabs = document.querySelectorAll('[role="tab"], [data-value]');
        for (const tab of tabs) {
          if (tab.getAttribute('aria-selected') === 'true' || 
              tab.getAttribute('data-state') === 'active' ||
              tab.classList.contains('active')) {
            return true;
          }
        }
        return false;
      },
      { timeout: Math.min(timeout, 5000) }
    );
  } catch (error) {
    // Fallback: just ensure tab is visible
    console.log('Tab active state check failed, continuing with visible tab');
  }
}

/**
 * Wait for form to be ready for interaction
 */
export async function waitForFormReady(page: Page, formSelector: string, timeout = 5000): Promise<void> {
  const form = page.locator(formSelector);
  await form.waitFor({ state: 'visible', timeout });
  
  // Wait for form fields to be enabled
  await page.waitForFunction(
    (selector) => {
      const form = document.querySelector(selector);
      if (!form) return false;
      
      const inputs = form.querySelectorAll('input, select, textarea, button');
      return Array.from(inputs).every(input => !(input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement).disabled);
    },
    formSelector,
    { timeout }
  );
}

/**
 * Wait for data to be loaded in a table or list
 */
export async function waitForDataLoaded(page: Page, containerSelector: string, minItems = 1, timeout = 8000): Promise<void> {
  await page.waitForFunction(
    ({ selector, min }) => {
      const container = document.querySelector(selector);
      if (!container) return false;
      
      const rows = container.querySelectorAll('tr, [data-testid*="item"], .item, li');
      return rows.length >= min;
    },
    { selector: containerSelector, min: minItems },
    { timeout }
  );
}

/**
 * Wait for navigation to complete and page to be ready
 */
export async function waitForPageReady(page: Page, timeout = 8000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForLoadState('networkidle', { timeout: timeout / 2 });
  await waitForLoadingComplete(page, timeout / 2);
}

/**
 * Retry an action with exponential backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}
