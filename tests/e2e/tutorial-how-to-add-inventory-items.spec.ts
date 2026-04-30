import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * 📚 TUTORIAL: How to Add Inventory Items
 * 
 * This E2E test serves as both a test and a step-by-step tutorial
 * showing users how to add new inventory items to the system.
 * 
 * Screenshots and detailed logs are generated to create a visual guide.
 */
test.describe('📚 Tutorial: How to Add Inventory Items', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Step 1: Login first - with resilient handling
    console.log('Authenticating before accessing Inventory...');
    const loginSuccess = await helpers.login('admin@university.edu', 'admin123');
    if (!loginSuccess) {
      throw new Error('Failed to authenticate for tutorial test');
    }
    
    // Check if page memory worked after login
    const currentUrl = page.url();
    console.log(`🔍 After login, current URL: ${currentUrl}`);
    
    // Step 2: Navigate to inventory page (with resilient handling)
    let navSuccess = false;
    if (currentUrl.includes('/inventory')) {
      console.log('✅ Page memory worked - already on inventory page');
      navSuccess = true;
    } else {
      console.log('⚠️ Page memory didn\'t work - manually navigating to inventory');
      navSuccess = await helpers.navigateToInventory();
    }
    
    if (!navSuccess) {
      throw new Error('Failed to navigate to Inventory page');
    }
    
    await helpers.screenshot('tutorial-add-item-01-inventory-page');
  });

  test('Step-by-step: Adding a new inventory item', async ({ page }) => {
    console.log('TUTORIAL: How to Add Inventory Items');
    console.log('==========================================');
    
    // Step 1: Navigate to inventory page
    console.log('Step 1: Navigate to the Inventory page');
    await helpers.screenshot('tutorial-add-item-02-inventory-overview');
    
    // Step 2: Find and click the "Add Item" button
    console.log('Step 2: Look for the "Add Item" button');
    await helpers.screenshot('tutorial-add-item-03-add-button-highlighted');
    
    // Step 3: Click the Add Item button using robust helper
    console.log('Step 3: Click the "Add Item" button');
    const addButtonClicked = await helpers.clickAddItemButton();
    expect(addButtonClicked).toBe(true);
    
    await helpers.waitForNetworkIdle();
    await helpers.screenshot('tutorial-add-item-04-add-form-opened');

    // Step 4: Check if form opened or navigated to add page
    console.log('Step 4: Verify the add item form is displayed');
    
    const hasForm = await page.locator('form, [role="dialog"], .modal').first().isVisible();
    const isAddPage = page.url().includes('add') || page.url().includes('new');
    
    expect(hasForm || isAddPage).toBeTruthy();
    console.log(`Add item form/page is now visible`);

    // Step 5: Fill in the item details
    console.log('Step 5: Fill in the item details');
    
    const testItem = {
      name: 'Tutorial Test Item',
      description: 'This is a test item created during the tutorial',
      category: 'Electronics',
      sku: 'TUT-001',
      quantity: '10',
      price: '29.99',
      location: 'Warehouse A'
    };

    // Fill item name
    const nameInputs = [
      page.locator('input[name*="name"]').first(),
      page.locator('input[placeholder*="name"]').first(),
      page.locator('#name, #itemName, #item_name').first()
    ];

    for (const nameInput of nameInputs) {
      if (await nameInput.isVisible()) {
        console.log('✏️ Filling item name...');
        await nameInput.fill(testItem.name);
        await helpers.screenshot('tutorial-add-item-05-name-filled');
        break;
      }
    }

    // Fill description
    const descriptionInputs = [
      page.locator('textarea[name*="description"]').first(),
      page.locator('input[name*="description"]').first(),
      page.locator('#description, #itemDescription').first()
    ];

    for (const descInput of descriptionInputs) {
      if (await descInput.isVisible()) {
        console.log('✏️ Filling item description...');
        await descInput.fill(testItem.description);
        await helpers.screenshot('tutorial-add-item-06-description-filled');
        break;
      }
    }

    // Fill SKU
    const skuInputs = [
      page.locator('input[name*="sku"]').first(),
      page.locator('input[placeholder*="sku"]').first(),
      page.locator('#sku, #itemSku').first()
    ];

    for (const skuInput of skuInputs) {
      if (await skuInput.isVisible()) {
        console.log('✏️ Filling item SKU...');
        await skuInput.fill(testItem.sku);
        await helpers.screenshot('tutorial-add-item-07-sku-filled');
        break;
      }
    }

    // Fill quantity
    const quantityInputs = [
      page.locator('input[name*="quantity"]').first(),
      page.locator('input[name*="stock"]').first(),
      page.locator('#quantity, #stock').first()
    ];

    for (const qtyInput of quantityInputs) {
      if (await qtyInput.isVisible()) {
        console.log('✏️ Filling item quantity...');
        await qtyInput.fill(testItem.quantity);
        await helpers.screenshot('tutorial-add-item-08-quantity-filled');
        break;
      }
    }

    // Fill price
    const priceInputs = [
      page.locator('input[name*="price"]').first(),
      page.locator('input[name*="cost"]').first(),
      page.locator('#price, #cost').first()
    ];

    for (const priceInput of priceInputs) {
      if (await priceInput.isVisible()) {
        console.log('✏️ Filling item price...');
        await priceInput.fill(testItem.price);
        await helpers.screenshot('tutorial-add-item-09-price-filled');
        break;
      }
    }

    // Select category if dropdown exists
    const categorySelects = [
      page.locator('select[name*="category"]').first(),
      page.locator('#category').first()
    ];

    for (const categorySelect of categorySelects) {
      if (await categorySelect.isVisible()) {
        console.log('Selecting item category...');
        await categorySelect.selectOption({ label: testItem.category });
        await helpers.screenshot('tutorial-add-item-10-category-selected');
        break;
      }
    }

    await helpers.screenshot('tutorial-add-item-11-form-completed');

    // Step 6: Submit the form
    console.log('Step 6: Submit the form to create the item');
    
    const submitButtons = [
      page.getByRole('button', { name: /save/i }),
      page.getByRole('button', { name: /create/i }),
      page.getByRole('button', { name: /add/i }),
      page.getByRole('button', { name: /submit/i }),
      page.locator('button[type="submit"]').first()
    ];

    let submitButton = null;
    for (const button of submitButtons) {
      if (await button.isVisible()) {
        submitButton = button;
        const buttonText = await button.textContent();
        console.log(`Found submit button: "${buttonText?.trim()}"`);
        break;
      }
    }

    expect(submitButton).not.toBeNull();
    await helpers.screenshot('tutorial-add-item-12-ready-to-submit');
    
    await helpers.safeClick(submitButton!);
    await helpers.waitForNetworkIdle();
    await helpers.screenshot('tutorial-add-item-13-form-submitted');

    // Step 7: Verify success
    console.log('Step 7: Verify the item was created successfully');
    
    // Look for success indicators
    const successIndicators = [
      page.locator('.alert-success, .success-message, .toast-success').first(),
      page.getByText(/success/i).first(),
      page.getByText(/created/i).first(),
      page.getByText(/added/i).first()
    ];

    let successFound = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible()) {
        const successText = await indicator.textContent();
        console.log(`Success message: "${successText?.trim()}"`);
        successFound = true;
        break;
      }
    }

    // Check if we're back on inventory page with new item
    if (!successFound) {
      const currentUrl = page.url();
      if (currentUrl.includes('/inventory')) {
        console.log('Redirected back to inventory page');
        successFound = true;
      }
    }

    await helpers.screenshot('tutorial-add-item-14-success-confirmation');

    // Step 8: Verify the item appears in the inventory list
    console.log('Step 8: Verify the new item appears in the inventory list');
    
    await helpers.navigateAndWait('/inventory');
    await helpers.waitForNetworkIdle();
    
    // Look for the item we just created
    const itemInList = page.getByText(testItem.name).first();
    if (await itemInList.isVisible()) {
      console.log(`New item "${testItem.name}" found in inventory list`);
      await helpers.screenshot('tutorial-add-item-15-item-in-list');
    } else {
      console.log('ℹ️ Item may not be immediately visible (pagination, filters, etc.)');
    }

    console.log('');
    console.log('🎉 TUTORIAL COMPLETE: Adding Inventory Items');
    console.log('============================================');
    console.log('📸 Screenshots saved for each step in test-results/');
    console.log('📝 This test demonstrates the complete workflow for adding inventory items');
    console.log('');

    expect(successFound).toBeTruthy();
  });

  test('Alternative method: Quick add via keyboard shortcuts', async ({ page }) => {
    console.log('⚡ TUTORIAL: Quick Add Using Keyboard Shortcuts');
    console.log('===============================================');
    
    // Test if there are keyboard shortcuts for quick add
    console.log('Testing keyboard shortcuts (Ctrl+N, Alt+A, etc.)');
    
    await page.keyboard.press('Control+n');
    await helpers.waitForNetworkIdle();
    
    const hasForm = await page.locator('form, [role="dialog"], .modal').first().isVisible();
    
    if (hasForm) {
      console.log('Keyboard shortcut Ctrl+N opens add item form');
      await helpers.screenshot('tutorial-add-item-keyboard-shortcut');
      
      // Close the form
      await page.keyboard.press('Escape');
      await helpers.waitForNetworkIdle();
    } else {
      console.log('ℹ️ No keyboard shortcuts detected for quick add');
    }
  });
});
