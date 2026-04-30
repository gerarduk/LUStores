import { test, expect } from '@playwright/test';

test.describe('Users password reset flow', () => {
  test('admin can reset user password and modal shows temporary password', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@university.edu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Go to users page
    await page.goto('/users');

    // Add a new test user via the UI
    await page.click('text=Add User');
    await page.fill('input[name="email"]', `e2e-reset-${Date.now()}@example.com`);
    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'Reset');
    await page.fill('input[name="password"]', 'Temporary1');
    await page.selectOption('select[name="role"]', 'user');
    await page.click('text=Create User');

    // Wait for the new user to appear in the list
    const email = await page.locator('text=Reset').first().textContent();
    await page.waitForTimeout(500);

    // Find the created user row and click Reset
    const userRow = page.locator(`tr:has-text("e2e-reset-")`).first();
    await expect(userRow).toBeVisible();

    const resetButton = userRow.locator('button:has-text("Reset")');
    await resetButton.click();

    // The password reset modal should display the temporary password
    const modal = page.locator('text=Password Reset Successful').first();
    await expect(modal).toBeVisible();

    const tempPassword = page.locator('p.text-xl.font-mono');
    await expect(tempPassword).toBeVisible();

    const passwordText = (await tempPassword.textContent()) || '';
    expect(passwordText.length).toBeGreaterThan(0);
    expect(passwordText).not.toContain('Check server logs');

    // Close modal
    await page.click('text=I Have Copied the Password');
  });
});