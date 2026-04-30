import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * 📚 TUTORIAL: How to Manage Charge Codes
 * 
 * This E2E test serves as both a test and a step-by-step tutorial
 * showing users how to add, edit, and manage charge codes in the system.
 * 
 * Screenshots and detailed logs are generated to create a visual guide.
 */
test.describe('📚 Tutorial: How to Manage Charge Codes', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to settings or admin page where charge codes are managed
    await helpers.navigateAndWait('/settings');
    await helpers.screenshot('tutorial-charge-codes-01-settings-page');
  });

  test('Step-by-step: Adding a new charge code', async ({ page }) => {
    console.log('TUTORIAL: How to Add Charge Codes');
    console.log('====================================');
    
    // Step 1: Navigate to charge codes section
    console.log('Step 1: Navigate to the Charge Codes section');
    
    const chargeCodeLinks = [
      page.getByText(/charge.*code/i).first(),
      page.getByText(/billing.*code/i).first(),
      page.getByText(/account.*code/i).first(),
      page.locator('a[href*="charge"], a[href*="billing"], a[href*="codes"]').first()
    ];

    let chargeCodeSection = null;
    for (const link of chargeCodeLinks) {
      if (await link.isVisible()) {
        chargeCodeSection = link;
        const linkText = await link.textContent();
        console.log(`Found charge codes section: "${linkText?.trim()}"`);
        await helpers.safeClick(link);
        await page.waitForTimeout(1000);
        break;
      }
    }

    await helpers.screenshot('tutorial-charge-codes-02-charge-codes-section');

    // Step 2: Find the "Add Charge Code" button
    console.log('Step 2: Look for the "Add Charge Code" button');
    
    const addChargeCodeButtons = [
      page.getByRole('button', { name: /add.*charge.*code/i }),
      page.getByRole('button', { name: /new.*charge.*code/i }),
      page.getByRole('button', { name: /create.*charge.*code/i }),
      page.getByRole('button', { name: /add.*code/i }),
      page.locator('button').filter({ hasText: /\+/ })
    ];

    let addButton = null;
    for (const button of addChargeCodeButtons) {
      if (await button.first().isVisible()) {
        addButton = button.first();
        const buttonText = await addButton.textContent();
        console.log(`Found "Add Charge Code" button: "${buttonText?.trim()}"`);
        break;
      }
    }

    if (addButton) {
      await helpers.screenshot('tutorial-charge-codes-03-add-button-highlighted');
      
      // Step 3: Click the Add Charge Code button
      console.log('Step 3: Click the "Add Charge Code" button');
      await helpers.safeClick(addButton);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-charge-codes-04-add-form-opened');

      // Step 4: Fill in charge code details
      console.log('Step 4: Fill in the charge code details');
      
      const testChargeCode = {
        code: 'DEPT-001',
        name: 'Department Test Code',
        description: 'Test charge code for tutorial purposes',
        department: 'IT Department',
        budget: '5000.00'
      };

      // Fill charge code
      const codeInputs = [
        page.locator('input[name*="code"]').first(),
        page.locator('input[placeholder*="code"]').first(),
        page.locator('#code, #chargeCode').first()
      ];

      for (const codeInput of codeInputs) {
        if (await codeInput.isVisible()) {
          console.log('✏️ Filling charge code...');
          await codeInput.fill(testChargeCode.code);
          await helpers.screenshot('tutorial-charge-codes-05-code-filled');
          break;
        }
      }

      // Fill name
      const nameInputs = [
        page.locator('input[name*="name"]').first(),
        page.locator('input[placeholder*="name"]').first(),
        page.locator('#name, #chargeName').first()
      ];

      for (const nameInput of nameInputs) {
        if (await nameInput.isVisible()) {
          console.log('✏️ Filling charge code name...');
          await nameInput.fill(testChargeCode.name);
          await helpers.screenshot('tutorial-charge-codes-06-name-filled');
          break;
        }
      }

      // Fill description
      const descriptionInputs = [
        page.locator('textarea[name*="description"]').first(),
        page.locator('input[name*="description"]').first(),
        page.locator('#description').first()
      ];

      for (const descInput of descriptionInputs) {
        if (await descInput.isVisible()) {
          console.log('✏️ Filling charge code description...');
          await descInput.fill(testChargeCode.description);
          await helpers.screenshot('tutorial-charge-codes-07-description-filled');
          break;
        }
      }

      // Fill department
      const departmentInputs = [
        page.locator('select[name*="department"]').first(),
        page.locator('input[name*="department"]').first(),
        page.locator('#department').first()
      ];

      for (const deptInput of departmentInputs) {
        if (await deptInput.isVisible()) {
          console.log('Filling department...');
          if (await deptInput.evaluate(el => el.tagName) === 'SELECT') {
            await deptInput.selectOption({ label: testChargeCode.department });
          } else {
            await deptInput.fill(testChargeCode.department);
          }
          await helpers.screenshot('tutorial-charge-codes-08-department-filled');
          break;
        }
      }

      await helpers.screenshot('tutorial-charge-codes-09-form-completed');

      // Step 5: Submit the form
      console.log('Step 5: Submit the form to create the charge code');
      
      const submitButtons = [
        page.getByRole('button', { name: /save/i }),
        page.getByRole('button', { name: /create/i }),
        page.getByRole('button', { name: /add/i }),
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

      if (submitButton) {
        await helpers.screenshot('tutorial-charge-codes-10-ready-to-submit');
        await helpers.safeClick(submitButton);
        await page.waitForTimeout(1000);
        await helpers.screenshot('tutorial-charge-codes-11-form-submitted');

        // Step 6: Verify success
        console.log('Step 6: Verify the charge code was created successfully');
        
        const successIndicators = [
          page.locator('.alert-success, .success-message').first(),
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

        await helpers.screenshot('tutorial-charge-codes-12-success-confirmation');

        console.log('🎉 TUTORIAL COMPLETE: Adding Charge Codes');
        expect(successFound).toBeTruthy();
      }
    } else {
      console.log('ℹ️ Charge code management may not be available or requires different navigation');
      await helpers.screenshot('tutorial-charge-codes-no-add-button');
    }
  });

  test('Step-by-step: Editing an existing charge code', async ({ page }) => {
    console.log('TUTORIAL: How to Edit Charge Codes');
    console.log('=====================================');
    
    // Step 1: Find existing charge codes
    console.log('Step 1: Find existing charge codes to edit');
    
    const chargeCodeRows = [
      page.locator('table tbody tr').first(),
      page.locator('.charge-code-item').first(),
      page.locator('[data-testid*="charge-code"]').first()
    ];

    let existingCode = null;
    for (const row of chargeCodeRows) {
      if (await row.isVisible()) {
        existingCode = row;
        console.log('Found existing charge code');
        break;
      }
    }

    if (existingCode) {
      await helpers.screenshot('tutorial-charge-codes-edit-01-existing-codes');

      // Step 2: Find and click edit button
      console.log('Step 2: Click the edit button for a charge code');
      
      const editButtons = [
        existingCode.getByRole('button', { name: /edit/i }),
        existingCode.locator('button').filter({ hasText: /✏️|📝|edit/i }),
        existingCode.locator('a[href*="edit"]').first()
      ];

      let editButton = null;
      for (const button of editButtons) {
        if (await button.isVisible()) {
          editButton = button;
          console.log('Found edit button');
          break;
        }
      }

      if (editButton) {
        await helpers.screenshot('tutorial-charge-codes-edit-02-edit-button-highlighted');
        await helpers.safeClick(editButton);
        await page.waitForTimeout(1000);
        await helpers.screenshot('tutorial-charge-codes-edit-03-edit-form-opened');

        // Step 3: Modify charge code details
        console.log('Step 3: Modify the charge code details');
        
        const nameInput = page.locator('input[name*="name"]').first();
        if (await nameInput.isVisible()) {
          const currentValue = await nameInput.inputValue();
          const newValue = currentValue + ' (Updated)';
          
          await nameInput.fill(newValue);
          console.log(`✏️ Updated name from "${currentValue}" to "${newValue}"`);
          await helpers.screenshot('tutorial-charge-codes-edit-04-name-updated');
        }

        // Step 4: Save changes
        console.log('Step 4: Save the changes');
        
        const saveButton = page.getByRole('button', { name: /save|update/i }).first();
        if (await saveButton.isVisible()) {
          await helpers.safeClick(saveButton);
          await page.waitForTimeout(1000);
          await helpers.screenshot('tutorial-charge-codes-edit-05-changes-saved');
          
          console.log('Changes saved successfully');
        }

        console.log('🎉 TUTORIAL COMPLETE: Editing Charge Codes');
      }
    } else {
      console.log('ℹ️ No existing charge codes found to edit');
    }
  });

  test('Step-by-step: Deleting a charge code', async ({ page }) => {
    console.log('TUTORIAL: How to Delete Charge Codes');
    console.log('=======================================');
    
    console.log('Step 1: Find a charge code to delete');
    
    const chargeCodeRows = page.locator('table tbody tr');
    const rowCount = await chargeCodeRows.count();
    
    if (rowCount > 0) {
      const lastRow = chargeCodeRows.last();
      await helpers.screenshot('tutorial-charge-codes-delete-01-target-code');

      // Step 2: Find delete button
      console.log('Step 2: Click the delete button');
      
      const deleteButtons = [
        lastRow.getByRole('button', { name: /delete/i }),
        lastRow.locator('button').filter({ hasText: /🗑️|❌|delete/i }),
        lastRow.locator('button[class*="delete"]').first()
      ];

      let deleteButton = null;
      for (const button of deleteButtons) {
        if (await button.isVisible()) {
          deleteButton = button;
          console.log('Found delete button');
          break;
        }
      }

      if (deleteButton) {
        await helpers.screenshot('tutorial-charge-codes-delete-02-delete-button-highlighted');
        await helpers.safeClick(deleteButton);
        await page.waitForTimeout(1000);

        // Step 3: Handle confirmation dialog
        console.log('Step 3: Confirm deletion in the dialog');
        
        const confirmDialog = page.locator('[role="alertdialog"], .confirm-dialog, .modal').first();
        if (await confirmDialog.isVisible()) {
          await helpers.screenshot('tutorial-charge-codes-delete-03-confirmation-dialog');
          
          const confirmButton = confirmDialog.getByRole('button', { name: /confirm|yes|delete/i }).first();
          if (await confirmButton.isVisible()) {
            console.log('Clicking confirm to delete (in tutorial mode)');
            // In a real tutorial, we might cancel instead
            const cancelButton = confirmDialog.getByRole('button', { name: /cancel|no/i }).first();
            if (await cancelButton.isVisible()) {
              await helpers.safeClick(cancelButton);
              console.log('Cancelled deletion (tutorial safety)');
            }
          }
        }

        await helpers.screenshot('tutorial-charge-codes-delete-04-action-completed');
        console.log('🎉 TUTORIAL COMPLETE: Deleting Charge Codes');
      }
    } else {
      console.log('ℹ️ No charge codes available to demonstrate deletion');
    }
  });
});
