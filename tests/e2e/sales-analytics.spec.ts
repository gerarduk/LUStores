import { test, expect } from '@playwright/test';

// Smoke tests for Sales Analytics page
test.describe('Sales Analytics page', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state and are logged in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    // Wait for redirect to dashboard
    await page.waitForURL('/');
  });

  test('loads and shows filters + charts', async ({ page }) => {
    await page.goto('/analytics');
    // Page header
    await expect(page.locator('text=Sales Analytics')).toBeVisible();

    // Filters present
    await expect(page.locator('label:has-text("Time Period")')).toBeVisible();
    await expect(page.locator('label:has-text("Category")')).toBeVisible();
    await expect(page.locator('label:has-text("Charge Code")')).toBeVisible();
    await expect(page.locator('label:has-text("Vendor")')).toBeVisible();

    // Wait for any data requests
    await page.waitForTimeout(500);

    // Dropdowns contain "All" options
    await expect(page.locator('text=All Charge Codes')).toBeVisible();
    await expect(page.locator('text=All Vendors')).toBeVisible();

    // Charts should render (check that SVG elements are present)
    await expect(page.locator('svg')).toHaveCountGreaterThan(0);

    // Change time period and ensure charts update
    await page.click('text=Last 30 Days');
    await page.waitForTimeout(500);
    await expect(page.locator('svg')).toHaveCountGreaterThan(0);
  });

  test('charge code and vendor dropdowns list values', async ({ page }) => {
    await page.goto('/analytics');

    // Open Charge Code select and assert at least one code exists (excluding "All")
    await page.click('label:has-text("Charge Code") + div button');
    await expect(page.locator('text=All Charge Codes')).toBeVisible();
    // pick a non-all item if present
    const chargeItems = await page.locator('role=listitem').filter({ hasText: /[A-Z0-9\-]/ }).all();
    expect(chargeItems.length).toBeGreaterThan(0);

    // Open Vendor select
    await page.click('label:has-text("Vendor") + div button');
    await expect(page.locator('text=All Vendors')).toBeVisible();
    const vendorItems = await page.locator('role=listitem').filter({ hasText: /./ }).all();
    expect(vendorItems.length).toBeGreaterThan(0);
  });
});
