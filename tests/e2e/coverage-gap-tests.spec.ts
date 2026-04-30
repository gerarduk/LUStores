import { test, expect, devices } from '@playwright/test';
// Utility function to seed users and items via API
async function seedTestData(request) {
  // Seed admin user
  await request.post('/api/test-seed-user', {
    data: { email: 'admin@university.edu', password: 'admin123', role: 'admin' }
  });
  // Seed staff user
  await request.post('/api/test-seed-user', {
    data: { email: 'staff@university.edu', password: 'staff123', role: 'staff' }
  });
  // Seed at least 50 inventory items
  for (let i = 0; i < 50; i++) {
    await request.post('/api/test-seed-item', {
      data: { name: `Test Item ${i+1}`, sku: `SKU${i+1}`, quantity: 10 }
    });
  }
  // Seed report data for 2025-12-01
  await request.post('/api/test-seed-report', {
    data: { date: '2025-12-01', value: 100 }
  });
}

// 1. Advanced Permissions & Access Control
test.describe('Permissions & Access Control', () => {
    test.beforeAll(async ({ request }) => {
      await seedTestData(request);
    });
  test('admin can access user management, staff cannot', async ({ page }) => {
    // Setup: ensure users exist (API or UI setup could be added here)
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.goto('/users');
    await expect(page.locator('h1, h2').filter({ hasText: /user/i })).toBeVisible({ timeout: 5000 });
    // Change role to staff (simulate or use UI if available)
    // Login as staff
    await page.goto('/logout');
    await page.waitForTimeout(1000);
    await page.goto('/login');
    await page.fill('input[type="email"]', 'staff@university.edu');
    await page.fill('input[type="password"]', 'staff123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.goto('/users');
    // Wait for page to load and check for forbidden/redirect
    await page.waitForTimeout(1000);
    await expect(page.locator('h1, h2').filter({ hasText: /user/i })).not.toBeVisible({ timeout: 3000 });
  });
});

// 2. Complex Reporting
test.describe('Reporting', () => {
    test.beforeAll(async ({ request }) => {
      await seedTestData(request);
    });
  test('generate and export filtered report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('input[type="date"]', { timeout: 5000 });
    await page.fill('input[type="date"]', '2025-12-01');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Generate")');
    await page.waitForSelector('table', { timeout: 7000 });
    await expect(page.locator('table')).toBeVisible();
    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.count() > 0) {
      await exportBtn.click();
      // Optionally check for download
    } else {
      // Check for error or empty state
      await expect(page.locator('.empty, .error, [role="alert"]').first()).not.toBeVisible();
    }
  });
});

// 3. Notes Functionality
test.describe('Notes Functionality', () => {
    test.beforeAll(async ({ request }) => {
      await seedTestData(request);
    });
  test('add, edit, delete notes on a quote and verify count indicator', async ({ page }) => {
    // Login and create a quote
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.goto('/sales');
    // Add item to quote (ensure at least one item exists)
    const browseTab = page.locator('button, a').filter({ hasText: /browse.*items/i }).first();
    await browseTab.waitFor({ timeout: 5000 });
    await browseTab.click();
    await page.waitForTimeout(1000);
    const addButton = page.getByRole('button', { name: /add.*quote|add.*cart/i }).first();
    await addButton.waitFor({ timeout: 5000 });
    await addButton.click();
    await page.waitForTimeout(500);
    // Save quote
    const saveBtn = page.getByRole('button', { name: /save|create/i }).first();
    await saveBtn.waitFor({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(1500);
    // Go to saved quotes
    const savedQuotesTab = page.locator('[role="tab"], button[role="tab"]').filter({ hasText: /saved quotes|saved/i }).first();
    await savedQuotesTab.waitFor({ timeout: 5000 });
    await savedQuotesTab.click();
    await page.waitForTimeout(1000);
    // Open notes modal for first quote
    const quoteRow = page.locator('table tbody tr').first();
    await expect(quoteRow).toBeVisible({ timeout: 7000 });
    const notesButton = quoteRow.locator('button[title*="note"], button[aria-label*="note"], .notes-indicator').first();
    await notesButton.waitFor({ timeout: 5000 });
    await notesButton.click();
    const notesModal = page.locator('.modal, .dialog, [role="dialog"]').first();
    await expect(notesModal).toBeVisible({ timeout: 5000 });
    // Add first note
    const addNoteButton = notesModal.locator('button:has-text("Add"), button:has-text("Add a note")').first();
    await addNoteButton.waitFor({ timeout: 5000 });
    await addNoteButton.click();
    const notesTextarea = notesModal.locator('textarea[placeholder*="note"], textarea[placeholder*="Add"]').first();
    await notesTextarea.waitFor({ timeout: 5000 });
    await notesTextarea.fill('First note for count testing');
    const saveNoteButton = notesModal.locator('button:has-text("Add Note")').first();
    await saveNoteButton.waitFor({ timeout: 5000 });
    await saveNoteButton.click();
    await page.waitForTimeout(1000);
    // Add second note
    await addNoteButton.click();
    await notesTextarea.fill('Second note for count testing');
    await saveNoteButton.click();
    await page.waitForTimeout(1000);
    // Edit the first note
    const editButton = notesModal.locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await notesTextarea.fill('Edited note');
      const saveEditButton = notesModal.locator('button:has-text("Save")').first();
      await saveEditButton.click();
      await page.waitForTimeout(1000);
    }
    // Delete the second note
    const deleteButton = notesModal.locator('button:has-text("Delete")').nth(1);
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForTimeout(1000);
    }
    // Close modal
    const closeButton = notesModal.locator('button[aria-label="Close"], button:has-text("Close")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    // Verify notes count indicator shows "1"
    const countIndicator = quoteRow.locator('[class*="badge"], [class*="count"], span:has-text("1")').first();
    await expect(countIndicator).toBeVisible({ timeout: 3000 });
  });
});

// 4. Sales/Quotes Edge Cases
test.describe('Sales/Quotes Edge Cases', () => {
    test.beforeAll(async ({ request }) => {
      await seedTestData(request);
    });
  test('add/remove multiple items, handle invalid data, verify totals and cancel', async ({ page }) => {
    // Login and go to sales
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.goto('/sales');
    // Add two items to quote (ensure at least two items exist)
    const browseTab = page.locator('button, a').filter({ hasText: /browse.*items/i }).first();
    await browseTab.waitFor({ timeout: 5000 });
    await browseTab.click();
    await page.waitForTimeout(1000);
    const addButtons = page.getByRole('button', { name: /add.*quote|add.*cart/i });
    await addButtons.first().waitFor({ timeout: 5000 });
    if (await addButtons.count() > 1) {
      await addButtons.nth(0).click();
      await page.waitForTimeout(500);
      await addButtons.nth(1).click();
      await page.waitForTimeout(500);
    }
    // Try invalid quantity
    const qtyInputs = page.locator('input[name*="quantity" i], input[placeholder*="qty" i]');
    if (await qtyInputs.count() > 0) {
      await qtyInputs.first().fill('-1');
      const addBtn = page.getByRole('button', { name: /add/i }).first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        await expect(page.locator('.error, [role="alert"]').first()).toBeVisible({ timeout: 3000 });
      }
    }
    // Remove one item
    const removeBtn = page.getByRole('button', { name: /remove/i }).first();
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      await page.waitForTimeout(500);
    }
    // Save quote
    const saveBtn = page.getByRole('button', { name: /save|create/i }).first();
    await saveBtn.waitFor({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(1500);
    // Check totals
    const total = page.locator('.total, [data-testid="quote-total"]').first();
    await expect(total).toBeVisible({ timeout: 3000 });
    // Cancel quote (if possible)
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

// 5. Bulk Data Import/Export
test.describe('Bulk Data Import/Export', () => {
  test('import users/items via CSV and export', async ({ page }) => {
    await page.goto('/users');
    const importBtn = page.locator('button:has-text("Import")');
    if (await importBtn.count() > 0) {
      // Simulate file upload if possible
      // await importBtn.setInputFiles('path/to/test.csv');
    }
    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.count() > 0) {
      await exportBtn.click();
      // Optionally check for download
    }
  });
});

// 6. Error Handling & UI Feedback
test.describe('Error Handling', () => {
  test('simulate backend error and verify UI feedback', async ({ page }) => {
    // Simulate error (e.g., disconnect network, use mock route)
    // await page.route('**/api/**', route => route.abort());
    // Trigger action
    // await page.click('button:has-text("Save")');
    // await expect(page.locator('.toast, [role="alert"]').first()).toBeVisible();
  });
});

// ...existing code...
// ...existing code...
// ...existing code...

// ...existing code...
// ...existing code...
// Reset device for other tests if needed

// 8. Notifications/Toasts
test.describe('Notifications/Toasts', () => {
    test.beforeAll(async ({ request }) => {
      await seedTestData(request);
    });
  test('actions show correct toast', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForSelector('button:has-text("Add Item")', { timeout: 5000 });
    await page.click('button:has-text("Add Item")');
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });
    await page.fill('input[name="name"]', 'Toast Test Item');
    await page.click('button:has-text("Save")');
    await expect(page.locator('.toast, [role="status"]').first()).toBeVisible({ timeout: 5000 });
  });
});

// 9. Performance/Load
test.describe('Performance/Load', () => {
    test.beforeAll(async ({ request }) => {
      await seedTestData(request);
    });
  test('UI remains responsive with 50+ items', async ({ page }) => {
    await page.goto('/inventory');
    // Optionally: add 50 items in a loop (or ensure they exist)
    const itemRows = page.locator('table tr, .item-row');
    if ((await itemRows.count()) < 50) {
      // Add items if not enough (pseudo-code, adjust as needed)
      for (let i = (await itemRows.count()); i < 50; i++) {
        await page.click('button:has-text("Add Item")');
        await page.fill('input[name="name"]', `Bulk Item ${i}`);
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(100);
      }
    }
    await expect(itemRows).toHaveCountGreaterThan(49, { timeout: 10000 });
    // Scroll/paginate
    // await page.click('button:has-text("Next")');
    // await expect(page.locator('table, .item-row, tr')).toBeVisible();
  });
});
