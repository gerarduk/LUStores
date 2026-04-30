import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * 📚 TUTORIAL: How to Create Sales Quotes
 * 
 * This E2E test serves as both a test and a step-by-step tutorial
 * showing users how to create sales quotes for customers.
 * 
 * Screenshots and detailed logs are generated to create a visual guide.
 */
test.describe('📚 Tutorial: How to Create Sales Quotes', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Authenticate user first - with resilient handling
    await helpers.login();
    
    // Check if page memory worked after login
    const currentUrl = page.url();
    console.log(`🔍 After login, current URL: ${currentUrl}`);
    
    // Navigate to sales page (with resilient handling)
    if (!currentUrl.includes('/sales')) {
      console.log('⚠️ Page memory didn\'t work - manually navigating to sales page');
      await helpers.navigateToSales();
    } else {
      console.log('✅ Page memory worked - already on sales page');
    }
    
    await helpers.screenshot('tutorial-quotes-01-sales-page');
  });

  test('Step-by-step: Creating a new sales quote', async ({ page }) => {
    console.log('TUTORIAL: How to Create Sales Quotes');
    console.log('======================================');
    
    // Step 1: Navigate to sales quotes section
    console.log('Step 1: Navigate to the Sales Quotes section');
    await helpers.screenshot('tutorial-quotes-02-sales-overview');
    
    // Step 2: Navigate to Browse Items tab to add items to quote
    console.log('Step 2: Navigate to Browse Items tab to add items to quote');
    
    // Use proper navigation helper to navigate to Browse Items tab
    const browseItemsSuccess = await helpers.navigateToSalesBrowseItems();
    if (!browseItemsSuccess) {
      console.log('Failed to navigate to Browse Items tab');
      throw new Error('Navigation to Browse Items failed');
    }
    console.log('Successfully navigated to Browse Items tab');
    await helpers.screenshot('tutorial-quotes-03-browse-items-tab');
    
    // Step 3: Add items to quote (tutorial will show item selection)
    console.log('Step 3: Add items to quote');
    await page.waitForTimeout(1000);
    await helpers.screenshot('tutorial-quotes-04-items-available');

    // Step 4: Fill in customer information
    console.log('Step 4: Fill in customer information');
    
    const testQuote = {
      customerName: 'University IT Department',
      customerEmail: 'it-dept@university.edu',
      customerPhone: '555-0100',
      projectName: 'Lab Equipment Upgrade',
      notes: 'Equipment needed for computer lab renovation'
    };

    // Fill customer name
    const customerNameInputs = [
      page.locator('input[name*="customer"]').first(),
      page.locator('input[placeholder*="customer"]').first(),
      page.locator('#customerName, #customer_name').first()
    ];

    for (const nameInput of customerNameInputs) {
      if (await nameInput.isVisible()) {
        console.log('✏️ Filling customer name...');
        await nameInput.fill(testQuote.customerName);
        await helpers.screenshot('tutorial-quotes-05-customer-name-filled');
        break;
      }
    }

    // Fill customer email
    const emailInputs = [
      page.locator('input[name*="email"]').first(),
      page.locator('input[type="email"]').first(),
      page.locator('#customerEmail').first()
    ];

    for (const emailInput of emailInputs) {
      if (await emailInput.isVisible()) {
        console.log('✏️ Filling customer email...');
        await emailInput.fill(testQuote.customerEmail);
        await helpers.screenshot('tutorial-quotes-06-customer-email-filled');
        break;
      }
    }

    // Fill project name
    const projectInputs = [
      page.locator('input[name*="project"]').first(),
      page.locator('input[placeholder*="project"]').first(),
      page.locator('#projectName').first()
    ];

    for (const projectInput of projectInputs) {
      if (await projectInput.isVisible()) {
        console.log('✏️ Filling project name...');
        await projectInput.fill(testQuote.projectName);
        await helpers.screenshot('tutorial-quotes-07-project-name-filled');
        break;
      }
    }

    // Step 5: Add items to the quote
    console.log('Step 5: Add items to the quote');
    
    const addItemButtons = [
      page.getByRole('button', { name: /add.*item/i }),
      page.getByRole('button', { name: /select.*item/i }),
      page.locator('button').filter({ hasText: /\+.*item/i })
    ];

    let addItemButton: any = null;
    for (const button of addItemButtons) {
      if (await button.first().isVisible()) {
        addItemButton = button.first();
        console.log('Found "Add Item" button');
        break;
      }
    }

    if (addItemButton) {
      await helpers.screenshot('tutorial-quotes-08-add-item-button');
      await helpers.safeClick(addItemButton);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-quotes-09-item-selection-opened');

      // Step 6: Select items from inventory
      console.log('Step 6: Select items from inventory');
      
      // Look for item selection interface
      const itemCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await itemCheckboxes.count();
      
      if (checkboxCount > 0) {
        console.log(`Found ${checkboxCount} items available for selection`);
        
        // Select first few items
        const itemsToSelect = Math.min(3, checkboxCount);
        for (let i = 0; i < itemsToSelect; i++) {
          const checkbox = itemCheckboxes.nth(i);
          const itemRow = checkbox.locator('..');
          const itemName = await itemRow.textContent();
          
          await checkbox.check();
          console.log(`Selected item: ${itemName?.trim()}`);
        }
        
        await helpers.screenshot('tutorial-quotes-10-items-selected');
        
        // Confirm item selection
        const confirmButton = page.getByRole('button', { name: /confirm|add|select/i }).first();
        if (await confirmButton.isVisible()) {
          await helpers.safeClick(confirmButton);
          await page.waitForTimeout(1000);
          await helpers.screenshot('tutorial-quotes-11-items-added-to-quote');
        }
      }
    }

    // Step 7: Set quantities and pricing
    console.log('Step 7: Set quantities and pricing for selected items');
    
    const quantityInputs = page.locator('input[name*="quantity"], input[type="number"]');
    const quantityCount = await quantityInputs.count();
    
    if (quantityCount > 0) {
      console.log(`Found ${quantityCount} quantity inputs`);
      
      for (let i = 0; i < quantityCount; i++) {
        const qtyInput = quantityInputs.nth(i);
        if (await qtyInput.isVisible()) {
          await qtyInput.fill('2');
          console.log(`✏️ Set quantity to 2 for item ${i + 1}`);
        }
      }
      
      await helpers.screenshot('tutorial-quotes-12-quantities-set');
    }

    // Step 8: Add notes and special instructions
    console.log('Step 8: Add notes and special instructions');
    
    const notesInputs = [
      page.locator('textarea[name*="notes"]').first(),
      page.locator('textarea[name*="comment"]').first(),
      page.locator('#notes, #comments').first()
    ];

    for (const notesInput of notesInputs) {
      if (await notesInput.isVisible()) {
        console.log('✏️ Adding notes to quote...');
        await notesInput.fill(testQuote.notes);
        await helpers.screenshot('tutorial-quotes-13-notes-added');
        break;
      }
    }

    // Step 9: Review quote totals
    console.log('Step 9: Review quote totals and pricing');
    
    const totalElements = [
      page.locator('.total, .quote-total').first(),
      page.getByText(/total/i).first(),
      page.locator('[data-testid*="total"]').first()
    ];

    for (const totalElement of totalElements) {
      if (await totalElement.isVisible()) {
        const totalText = await totalElement.textContent();
        console.log(`Quote total: ${totalText?.trim()}`);
        await helpers.screenshot('tutorial-quotes-14-quote-totals');
        break;
      }
    }

    // Step 10: Save or send the quote
    console.log('Step 10: Save or send the quote');
    
    const saveButtons = [
      page.getByRole('button', { name: /save.*quote/i }),
      page.getByRole('button', { name: /create.*quote/i }),
      page.getByRole('button', { name: /send.*quote/i }),
      page.locator('button[type="submit"]').first()
    ];

    let saveButton: any = null;
    for (const button of saveButtons) {
      if (await button.isVisible()) {
        saveButton = button;
        const buttonText = await button.textContent();
        console.log(`Found save button: "${buttonText?.trim()}"`);
        break;
      }
    }

    if (saveButton) {
      await helpers.screenshot('tutorial-quotes-15-ready-to-save');
      await helpers.safeClick(saveButton);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-quotes-16-quote-saved');

      // Step 11: Verify success
      console.log('Step 11: Verify the quote was created successfully');
      
      const successIndicators = [
        page.locator('.alert-success, .success-message').first(),
        page.getByText(/success/i).first(),
        page.getByText(/created/i).first(),
        page.getByText(/saved/i).first()
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

      await helpers.screenshot('tutorial-quotes-17-success-confirmation');

      console.log('');
      console.log('🎉 TUTORIAL COMPLETE: Creating Sales Quotes');
      console.log('===========================================');
      console.log('📸 Screenshots saved for each step in test-results/');
      console.log('📝 This test demonstrates the complete workflow for creating sales quotes');
      console.log('');
      console.log('Key Points:');
      console.log('   • Always include complete customer information');
      console.log('   • Double-check quantities and pricing');
      console.log('   • Add detailed notes for special requirements');
      console.log('   • Review totals before saving');
      console.log('');

      expect(successFound).toBeTruthy();
    }
  });

  test('Step-by-step: Converting a quote to an order', async ({ page }) => {
    console.log('TUTORIAL: Converting Quotes to Orders');
    console.log('========================================');
    
    // Step 1: Find existing quotes
    console.log('Step 1: Find existing quotes to convert');
    
    const quoteRows = page.locator('table tbody tr, .quote-item');
    const rowCount = await quoteRows.count();
    
    if (rowCount > 0) {
      const firstQuote = quoteRows.first();
      await helpers.screenshot('tutorial-quotes-convert-01-existing-quotes');

      // Step 2: Find convert button
      console.log('Step 2: Click the convert to order button');
      
      const convertButtons = [
        firstQuote.getByRole('button', { name: /convert/i }),
        firstQuote.getByRole('button', { name: /order/i }),
        firstQuote.locator('button').filter({ hasText: /→|convert/i })
      ];

      let convertButton: any = null;
      for (const button of convertButtons) {
        if (await button.isVisible()) {
          convertButton = button;
          console.log('Found convert button');
          break;
        }
      }

      if (convertButton) {
        await helpers.screenshot('tutorial-quotes-convert-02-convert-button');
        await helpers.safeClick(convertButton);
        await page.waitForTimeout(1000);
        await helpers.screenshot('tutorial-quotes-convert-03-conversion-dialog');

        // Step 3: Confirm conversion
        console.log('Step 3: Confirm the conversion');
        
        const confirmButton = page.getByRole('button', { name: /confirm|yes|convert/i }).first();
        if (await confirmButton.isVisible()) {
          await helpers.safeClick(confirmButton);
          await page.waitForTimeout(1000);
          await helpers.screenshot('tutorial-quotes-convert-04-order-created');
          
          console.log('Quote successfully converted to order');
        }

        console.log('🎉 TUTORIAL COMPLETE: Converting Quotes to Orders');
      }
    } else {
      console.log('ℹ️ No existing quotes found to demonstrate conversion');
    }
  });
});
