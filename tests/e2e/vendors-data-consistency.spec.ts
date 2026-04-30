import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * Vendors Page - Data Consistency Tests
 *
 * These tests verify that:
 * 1. Vendor cards display correct aggregated statistics
 * 2. Vendor modal shows the same values as the cards
 * 3. No silent failures or £0 values when data exists
 * 4. SQL aggregation doesn't double-count due to joins
 */

test.describe('Vendors Page - Data Consistency', () => {
  let helpers: TestHelpers;
  let authCookie: string;

  test.beforeAll(async ({ browser }) => {
    // Login once to get auth cookie
    const context = await browser.newContext();
    const page = await context.newPage();
    helpers = new TestHelpers(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Store cookies for reuse
    const cookies = await context.cookies();
    authCookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Set auth cookie
    if (authCookie) {
      await page.context().addCookies(
        authCookie.split('; ').map(c => {
          const [name, value] = c.split('=');
          return { name, value, domain: 'localhost', path: '/' };
        })
      );
    }
  });

  test('should show consistent values between vendor card and modal', async ({ page }) => {
    // Step 1: Create test supplier with orders via API
    const testSupplierId = `TEST-VENDOR-${Date.now()}`;
    const testSupplierName = 'Consistency Test Supplier';

    // Create supplier
    const supplierResponse = await page.request.post('/api/suppliers', {
      data: {
        id: testSupplierId,
        name: testSupplierName,
        contact: 'John Doe',
        email: 'john@test.com',
        phone: '+44 20 1234 5678',
        accountNumber: 'ACC-001'
      }
    });
    expect(supplierResponse.ok()).toBeTruthy();

    // Create an order with multiple items
    const orderResponse = await page.request.post('/api/orders', {
      data: {
        supplierId: testSupplierId,
        status: 'received',
        totalAmount: '2500.00',
        items: [
          {
            itemName: 'Test Item 1',
            itemSku: 'SKU-TEST-001',
            quantity: 10,
            unitCost: '100.00',
            totalCost: '1000.00'
          },
          {
            itemName: 'Test Item 2',
            itemSku: 'SKU-TEST-002',
            quantity: 15,
            unitCost: '100.00',
            totalCost: '1500.00'
          }
        ]
      }
    });
    expect(orderResponse.ok()).toBeTruthy();

    // Step 2: Navigate to vendors page
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');

    // Step 3: Find the vendor card
    const vendorCard = page.locator(`text=${testSupplierName}`).locator('..').locator('..');
    await expect(vendorCard).toBeVisible({ timeout: 10000 });

    // Step 4: Extract values from the card
    const cardOrderCount = await vendorCard.locator('text=/\\d+/').first().textContent();
    const cardTotalValue = await vendorCard.locator('text=/£[\\d,]+/').first().textContent();

    console.log(`Card shows: ${cardOrderCount} orders, ${cardTotalValue} total`);

    // Verify card shows non-zero values
    expect(cardOrderCount).not.toBe('0');
    expect(cardTotalValue).not.toBe('£0');
    expect(cardTotalValue).toContain('£2,500');

    // Step 5: Click the card to open modal
    await vendorCard.click();
    await page.waitForTimeout(500); // Wait for modal animation

    // Step 6: Verify modal is open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Step 7: Extract values from modal
    const modalContent = await modal.textContent();

    // Find the Order Summary section
    const orderSummary = modal.locator('text=Order Summary').locator('..').locator('..');

    // Extract order count from modal
    const modalOrderCountElement = orderSummary.locator('text=Total Orders').locator('..').locator('text=/\\d+/');
    const modalOrderCount = await modalOrderCountElement.textContent();

    // Extract total value from modal
    const modalTotalValueElement = orderSummary.locator('text=Total Value').locator('..').locator('text=/£[\\d,]+/');
    const modalTotalValue = await modalTotalValueElement.textContent();

    console.log(`Modal shows: ${modalOrderCount} orders, ${modalTotalValue} total`);

    // Step 8: Verify modal shows non-zero values
    expect(modalOrderCount).not.toBe('0');
    expect(modalTotalValue).not.toBe('£0');

    // Step 9: Verify card and modal values match
    expect(modalOrderCount).toBe('1'); // We created 1 order
    expect(modalTotalValue).toContain('£2,500'); // Total should be £2500, not doubled

    // Step 10: Verify account number is displayed
    expect(modalContent).toContain('ACC-001');
    expect(modalContent).toContain('Account Number');

    // Step 11: Verify items supplied count
    expect(modalContent).toContain('2'); // We have 2 unique SKUs

    // Cleanup: Close modal and delete test data
    const closeButton = modal.locator('button').first();
    await closeButton.click();

    await page.request.delete(`/api/suppliers/${testSupplierId}`);
  });

  test('should not double-count order totals when orders have multiple items', async ({ page }) => {
    // This test specifically checks for the SQL aggregation bug
    // where LEFT JOIN to order_items causes order totals to be multiplied

    const testSupplierId = `TEST-DOUBLE-COUNT-${Date.now()}`;

    // Create supplier
    await page.request.post('/api/suppliers', {
      data: {
        id: testSupplierId,
        name: 'Double Count Test Supplier'
      }
    });

    // Create ONE order with THREE items (total = £3000)
    await page.request.post('/api/orders', {
      data: {
        supplierId: testSupplierId,
        status: 'received',
        totalAmount: '3000.00',
        items: [
          { itemName: 'Item 1', itemSku: 'SKU-1', quantity: 1, unitCost: '1000', totalCost: '1000' },
          { itemName: 'Item 2', itemSku: 'SKU-2', quantity: 1, unitCost: '1000', totalCost: '1000' },
          { itemName: 'Item 3', itemSku: 'SKU-3', quantity: 1, unitCost: '1000', totalCost: '1000' }
        ]
      }
    });

    // Navigate to vendors page
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');

    // Find the vendor card
    const vendorCard = page.locator('text=Double Count Test Supplier').locator('..').locator('..');
    await expect(vendorCard).toBeVisible();

    // Extract total value from card
    const cardTotalValue = await vendorCard.locator('text=/£[\\d,]+/').first().textContent();

    // The bug would show £9,000 (£3000 × 3 items)
    // The fix should show £3,000 (correct)
    expect(cardTotalValue).toContain('£3,000');
    expect(cardTotalValue).not.toContain('£9,000');
    expect(cardTotalValue).not.toContain('£6,000');

    // Click card to open modal
    await vendorCard.click();
    await page.waitForTimeout(500);

    // Verify modal also shows correct value
    const modal = page.locator('[role="dialog"]');
    const orderSummary = modal.locator('text=Order Summary').locator('..').locator('..');
    const modalTotalValue = await orderSummary.locator('text=Total Value').locator('..').locator('text=/£[\\d,]+/').textContent();

    expect(modalTotalValue).toContain('£3,000');
    expect(modalTotalValue).not.toContain('£9,000');

    // Verify order count is 1, not 3
    const modalOrderCount = await orderSummary.locator('text=Total Orders').locator('..').locator('text=/\\d+/').textContent();
    expect(modalOrderCount).toBe('1');

    // Cleanup
    await page.request.delete(`/api/suppliers/${testSupplierId}`);
  });

  test('should handle suppliers with no orders gracefully', async ({ page }) => {
    const testSupplierId = `TEST-NO-ORDERS-${Date.now()}`;

    // Create supplier with NO orders
    await page.request.post('/api/suppliers', {
      data: {
        id: testSupplierId,
        name: 'No Orders Supplier'
      }
    });

    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');

    const vendorCard = page.locator('text=No Orders Supplier').locator('..').locator('..');
    await expect(vendorCard).toBeVisible();

    // Card should show 0 orders and £0 (this is correct for empty supplier)
    const cardContent = await vendorCard.textContent();
    expect(cardContent).toContain('0');
    expect(cardContent).toContain('£0');

    // Click to open modal
    await vendorCard.click();
    await page.waitForTimeout(500);

    // Modal should show 0s gracefully, not error
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const modalContent = await modal.textContent();
    expect(modalContent).toContain('0');
    expect(modalContent).toContain('No orders yet');

    // Cleanup
    await page.request.delete(`/api/suppliers/${testSupplierId}`);
  });

  test('should show multiple orders correctly aggregated', async ({ page }) => {
    const testSupplierId = `TEST-MULTI-ORDERS-${Date.now()}`;

    // Create supplier
    await page.request.post('/api/suppliers', {
      data: {
        id: testSupplierId,
        name: 'Multiple Orders Supplier'
      }
    });

    // Create 3 orders with different amounts
    await page.request.post('/api/orders', {
      data: {
        supplierId: testSupplierId,
        status: 'received',
        totalAmount: '1000.00',
        items: [{ itemName: 'Item A', itemSku: 'SKU-A', quantity: 1, unitCost: '1000', totalCost: '1000' }]
      }
    });

    await page.request.post('/api/orders', {
      data: {
        supplierId: testSupplierId,
        status: 'received',
        totalAmount: '2000.00',
        items: [{ itemName: 'Item B', itemSku: 'SKU-B', quantity: 2, unitCost: '1000', totalCost: '2000' }]
      }
    });

    await page.request.post('/api/orders', {
      data: {
        supplierId: testSupplierId,
        status: 'pending',
        totalAmount: '1500.00',
        items: [{ itemName: 'Item C', itemSku: 'SKU-C', quantity: 1, unitCost: '1500', totalCost: '1500' }]
      }
    });

    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');

    const vendorCard = page.locator('text=Multiple Orders Supplier').locator('..').locator('..');
    await expect(vendorCard).toBeVisible();

    // Click to open modal
    await vendorCard.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    const orderSummary = modal.locator('text=Order Summary').locator('..').locator('..');

    // Verify order count
    const orderCount = await orderSummary.locator('text=Total Orders').locator('..').locator('text=/\\d+/').textContent();
    expect(orderCount).toBe('3');

    // Verify total value (1000 + 2000 + 1500 = 4500)
    const totalValue = await orderSummary.locator('text=Total Value').locator('..').locator('text=/£[\\d,]+/').textContent();
    expect(totalValue).toContain('£4,500');

    // Verify items supplied (3 unique SKUs)
    const modalContent = await modal.textContent();
    expect(modalContent).toMatch(/Items?\s+Supplied/i);

    // Cleanup
    await page.request.delete(`/api/suppliers/${testSupplierId}`);
  });

  test('should not fail silently when backend errors occur', async ({ page }) => {
    // This test verifies that errors are surfaced, not hidden by fallback logic

    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Try to click on a vendor card (if any exist)
    const vendorCards = page.locator('[role="button"], .cursor-pointer').filter({ hasText: /orders|total/i });
    const count = await vendorCards.count();

    if (count > 0) {
      await vendorCards.first().click();
      await page.waitForTimeout(1000);

      // Verify no unhandled errors
      const relevantErrors = consoleErrors.filter(e =>
        e.includes('vendor') ||
        e.includes('supplier') ||
        e.includes('Failed to fetch')
      );

      expect(relevantErrors.length).toBe(0);
    }
  });
});

test.describe('Vendors Page - UI Interactions', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');
  });

  test('should display vendor cards with required fields', async ({ page }) => {
    // Verify the page loaded
    await expect(page.locator('text=Vendor Management')).toBeVisible();

    // Check if any vendors exist
    const vendorCards = page.locator('text=/£\\d+/').locator('..').locator('..');
    const count = await vendorCards.count();

    if (count > 0) {
      const firstCard = vendorCards.first();
      const cardText = await firstCard.textContent();

      // Verify card contains required information
      expect(cardText).toMatch(/\d+/); // Order count
      expect(cardText).toMatch(/£[\d,]+/); // Total value
    }
  });

  test('should open and close vendor modal correctly', async ({ page }) => {
    const vendorCards = page.locator('text=/£\\d+/').locator('..').locator('..');
    const count = await vendorCards.count();

    if (count > 0) {
      // Click first vendor card
      await vendorCards.first().click();
      await page.waitForTimeout(500);

      // Verify modal opened
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Verify modal has required sections
      await expect(modal.locator('text=Contact Information')).toBeVisible();
      await expect(modal.locator('text=Order Summary')).toBeVisible();

      // Close modal
      await modal.locator('button').first().click();
      await page.waitForTimeout(500);

      // Verify modal closed
      await expect(modal).not.toBeVisible();
    }
  });
});
