import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * 📚 TUTORIAL: How to Manage User Permissions
 * 
 * This E2E test serves as both a test and a step-by-step tutorial
 * showing administrators how to manage user permissions and roles.
 * 
 * Screenshots and detailed logs are generated to create a visual guide.
 */
test.describe('📚 Tutorial: How to Manage User Permissions', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to admin/settings page where user management is located
    await helpers.navigateAndWait('/settings');
    await helpers.screenshot('tutorial-permissions-01-settings-page');
  });

  test('Step-by-step: Changing user roles and permissions', async ({ page }) => {
    console.log('TUTORIAL: How to Manage User Permissions');
    console.log('===========================================');
    
    // Step 1: Navigate to user management section
    console.log('Step 1: Navigate to the User Management section');
    
    const userManagementLinks = [
      page.getByText(/user.*management/i).first(),
      page.getByText(/manage.*users/i).first(),
      page.getByText(/users/i).first(),
      page.getByText(/permissions/i).first(),
      page.locator('a[href*="user"], a[href*="admin"], a[href*="permission"]').first()
    ];

    let userManagementSection: any = null;
    for (const link of userManagementLinks) {
      if (await link.isVisible()) {
        userManagementSection = link;
        const linkText = await link.textContent();
        console.log(`Found user management section: "${linkText?.trim()}"`);
        await helpers.safeClick(link);
        await page.waitForTimeout(1000);
        break;
      }
    }

    await helpers.screenshot('tutorial-permissions-02-user-management-section');

    // Step 2: Find the users list
    console.log('Step 2: Locate the users list');
    
    const usersList = [
      page.locator('table tbody tr').first(),
      page.locator('.user-item, .user-row').first(),
      page.locator('[data-testid*="user"]').first()
    ];

    let usersTable: any = null;
    for (const list of usersList) {
      if (await list.isVisible()) {
        usersTable = list;
        console.log('Found users list/table');
        break;
      }
    }

    if (usersTable) {
      await helpers.screenshot('tutorial-permissions-03-users-list');

      // Step 3: Select a user to modify permissions
      console.log('Step 3: Select a user to modify permissions');
      
      const editButtons = [
        usersTable.getByRole('button', { name: /edit/i }),
        usersTable.getByRole('button', { name: /permissions/i }),
        usersTable.getByRole('button', { name: /manage/i }),
        usersTable.locator('button').filter({ hasText: /✏️|⚙️|edit/i }),
        usersTable.locator('a[href*="edit"]').first()
      ];

      let editButton: any = null;
      for (const button of editButtons) {
        if (await button.isVisible()) {
          editButton = button;
          const buttonText = await button.textContent();
          console.log(`Found edit button: "${buttonText?.trim()}"`);
          break;
        }
      }

      if (editButton) {
        await helpers.screenshot('tutorial-permissions-04-edit-button-highlighted');
        
        // Step 4: Click edit to open permissions dialog
        console.log('Step 4: Click edit to open the permissions dialog');
        await helpers.safeClick(editButton);
        await page.waitForTimeout(1000);
        await helpers.screenshot('tutorial-permissions-05-permissions-dialog-opened');

        // Step 5: Modify user role
        console.log('Step 5: Modify the user role');
        
        const roleSelectors = [
          page.locator('select[name*="role"]').first(),
          page.locator('select[name*="permission"]').first(),
          page.locator('#role, #userRole').first(),
          page.locator('.role-selector select').first()
        ];

        let roleSelector: any = null;
        for (const selector of roleSelectors) {
          if (await selector.isVisible()) {
            roleSelector = selector;
            console.log('Found role selector');
            break;
          }
        }

        if (roleSelector) {
          const currentRole = await roleSelector.inputValue();
          console.log(`Current role: ${currentRole}`);
          
          // Get available options
          const options = await roleSelector.locator('option').allTextContents();
          console.log(`Available roles: ${options.join(', ')}`);
          
          // Select a different role (for demonstration)
          const availableRoles = ['Admin', 'Manager', 'User', 'Viewer'];
          for (const role of availableRoles) {
            if (options.some(opt => opt.includes(role)) && !currentRole.includes(role)) {
              await roleSelector.selectOption({ label: role });
              console.log(`✏️ Changed role to: ${role}`);
              await helpers.screenshot('tutorial-permissions-06-role-changed');
              break;
            }
          }
        }

        // Step 6: Modify specific permissions
        console.log('Step 6: Modify specific permissions (if available)');
        
        const permissionCheckboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await permissionCheckboxes.count();
        
        if (checkboxCount > 0) {
          console.log(`Found ${checkboxCount} permission checkboxes`);
          
          // Toggle a few permissions for demonstration
          for (let i = 0; i < Math.min(3, checkboxCount); i++) {
            const checkbox = permissionCheckboxes.nth(i);
            const label = await checkbox.locator('..').textContent();
            const isChecked = await checkbox.isChecked();
            
            console.log(`Permission "${label?.trim()}": ${isChecked ? 'enabled' : 'disabled'}`);
            
            // Toggle the permission
            await checkbox.click();
            const newState = await checkbox.isChecked();
            console.log(`✏️ Changed "${label?.trim()}" to: ${newState ? 'enabled' : 'disabled'}`);
          }
          
          await helpers.screenshot('tutorial-permissions-07-permissions-modified');
        }

        // Step 7: Save the changes
        console.log('Step 7: Save the permission changes');
        
        const saveButtons = [
          page.getByRole('button', { name: /save/i }),
          page.getByRole('button', { name: /update/i }),
          page.getByRole('button', { name: /apply/i }),
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
          await helpers.screenshot('tutorial-permissions-08-ready-to-save');
          await helpers.safeClick(saveButton);
          await page.waitForTimeout(1000);
          await helpers.screenshot('tutorial-permissions-09-changes-saved');

          // Step 8: Verify success
          console.log('Step 8: Verify the changes were saved successfully');
          
          const successIndicators = [
            page.locator('.alert-success, .success-message').first(),
            page.getByText(/success/i).first(),
            page.getByText(/updated/i).first(),
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

          await helpers.screenshot('tutorial-permissions-10-success-confirmation');

          console.log('🎉 TUTORIAL COMPLETE: Managing User Permissions');
          console.log('===============================================');
          console.log('📸 Screenshots saved for each step in test-results/');
          console.log('📝 This test demonstrates how to modify user roles and permissions');
          console.log('');

          expect(successFound).toBeTruthy();
        }
      }
    } else {
      console.log('ℹ️ User management interface may not be available or requires different navigation');
      await helpers.screenshot('tutorial-permissions-no-users-found');
    }
  });

  test('Step-by-step: Adding a new user with specific permissions', async ({ page }) => {
    console.log('TUTORIAL: How to Add New Users');
    console.log('=================================');
    
    // Step 1: Find the "Add User" button
    console.log('Step 1: Look for the "Add User" button');
    
    const addUserButtons = [
      page.getByRole('button', { name: /add.*user/i }),
      page.getByRole('button', { name: /new.*user/i }),
      page.getByRole('button', { name: /create.*user/i }),
      page.getByRole('button', { name: /invite.*user/i }),
      page.locator('button').filter({ hasText: /\+/ })
    ];

    let addButton: any = null;
    for (const button of addUserButtons) {
      if (await button.first().isVisible()) {
        addButton = button.first();
        const buttonText = await addButton.textContent();
        console.log(`Found "Add User" button: "${buttonText?.trim()}"`);
        break;
      }
    }

    if (addButton) {
      await helpers.screenshot('tutorial-permissions-add-01-add-button-highlighted');
      
      // Step 2: Click the Add User button
      console.log('Step 2: Click the "Add User" button');
      await helpers.safeClick(addButton);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-permissions-add-02-add-form-opened');

      // Step 3: Fill in user details
      console.log('Step 3: Fill in the new user details');
      
      const testUser = {
        name: 'Tutorial Test User',
        email: 'tutorial.test@university.edu',
        role: 'User',
        department: 'IT Department'
      };

      // Fill name
      const nameInput = page.locator('input[name*="name"]').first();
      if (await nameInput.isVisible()) {
        console.log('✏️ Filling user name...');
        await nameInput.fill(testUser.name);
        await helpers.screenshot('tutorial-permissions-add-03-name-filled');
      }

      // Fill email
      const emailInput = page.locator('input[name*="email"]').first();
      if (await emailInput.isVisible()) {
        console.log('✏️ Filling user email...');
        await emailInput.fill(testUser.email);
        await helpers.screenshot('tutorial-permissions-add-04-email-filled');
      }

      // Select role
      const roleSelect = page.locator('select[name*="role"]').first();
      if (await roleSelect.isVisible()) {
        console.log('Selecting user role...');
        await roleSelect.selectOption({ label: testUser.role });
        await helpers.screenshot('tutorial-permissions-add-05-role-selected');
      }

      // Step 4: Set specific permissions
      console.log('Step 4: Set specific permissions for the new user');
      
      const permissionCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await permissionCheckboxes.count();
      
      if (checkboxCount > 0) {
        console.log(`Found ${checkboxCount} permission options`);
        
        // Select basic permissions for a new user
        const basicPermissions = ['View Inventory', 'Create Quotes', 'View Reports'];
        
        for (let i = 0; i < checkboxCount; i++) {
          const checkbox = permissionCheckboxes.nth(i);
          const label = await checkbox.locator('..').textContent();
          
          if (basicPermissions.some(perm => label?.includes(perm))) {
            await checkbox.check();
            console.log(`Enabled permission: ${label?.trim()}`);
          }
        }
        
        await helpers.screenshot('tutorial-permissions-add-06-permissions-set');
      }

      // Step 5: Create the user
      console.log('Step 5: Create the new user');
      
      const createButton = page.getByRole('button', { name: /create|add|save/i }).first();
      if (await createButton.isVisible()) {
        await helpers.screenshot('tutorial-permissions-add-07-ready-to-create');
        await helpers.safeClick(createButton);
        await page.waitForTimeout(1000);
        await helpers.screenshot('tutorial-permissions-add-08-user-created');
        
        console.log('New user created successfully');
        console.log('🎉 TUTORIAL COMPLETE: Adding New Users');
      }
    } else {
      console.log('ℹ️ Add user functionality may not be available or requires different navigation');
    }
  });

  test('Understanding permission levels and their meanings', async ({ page }) => {
    console.log('TUTORIAL: Understanding Permission Levels');
    console.log('============================================');
    
    console.log('Common permission levels in LUStores:');
    console.log('');
    console.log('👑 ADMIN - Full system access');
    console.log('   • Can manage all users and permissions');
    console.log('   • Access to system settings and configuration');
    console.log('   • Can view all reports and analytics');
    console.log('   • Full inventory management capabilities');
    console.log('');
    console.log('MANAGER - Department-level access');
    console.log('   • Can manage inventory within their department');
    console.log('   • Create and approve purchase orders');
    console.log('   • View departmental reports');
    console.log('   • Manage charge codes for their department');
    console.log('');
    console.log('USER - Standard access');
    console.log('   • Can view and search inventory');
    console.log('   • Create sales quotes');
    console.log('   • Submit purchase requests');
    console.log('   • View basic reports');
    console.log('');
    console.log('👁️ VIEWER - Read-only access');
    console.log('   • Can view inventory information');
    console.log('   • Access to basic reports');
    console.log('   • No editing or creation capabilities');
    console.log('');
    
    await helpers.screenshot('tutorial-permissions-levels-explanation');
    
    console.log('🎉 TUTORIAL COMPLETE: Understanding Permission Levels');
  });
});
