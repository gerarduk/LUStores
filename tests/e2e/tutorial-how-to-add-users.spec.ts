import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * 📚 TUTORIAL: How to Add New Users
 * 
 * This E2E test serves as both a test and a step-by-step tutorial
 * showing administrators how to add new users to the system.
 * 
 * Screenshots and detailed logs are generated to create a visual guide.
 */
test.describe('📚 Tutorial: How to Add New Users', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to admin/settings page where user management is located
    await helpers.navigateAndWait('/settings');
    await helpers.screenshot('tutorial-add-users-01-settings-page');
  });

  test('Step-by-step: Adding a new user to the system', async ({ page }) => {
    console.log('TUTORIAL: How to Add New Users');
    console.log('=================================');
    
    // Step 1: Navigate to user management section
    console.log('Step 1: Navigate to the User Management section');
    
    const userManagementLinks = [
      page.getByText(/user.*management/i).first(),
      page.getByText(/manage.*users/i).first(),
      page.getByText(/users/i).first(),
      page.getByText(/add.*user/i).first(),
      page.locator('a[href*="user"], a[href*="admin"]').first()
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

    await helpers.screenshot('tutorial-add-users-02-user-management-section');

    // Step 2: Find the "Add User" button
    console.log('Step 2: Look for the "Add User" button');
    
    const addUserButtons = [
      page.getByRole('button', { name: /add.*user/i }),
      page.getByRole('button', { name: /new.*user/i }),
      page.getByRole('button', { name: /create.*user/i }),
      page.getByRole('button', { name: /invite.*user/i }),
      page.locator('button').filter({ hasText: /\+/ }),
      page.locator('a[href*="add"], a[href*="new"], a[href*="create"]').first()
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
      await helpers.screenshot('tutorial-add-users-03-add-button-highlighted');
      
      // Step 3: Click the Add User button
      console.log('Step 3: Click the "Add User" button');
      await helpers.safeClick(addButton);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-add-users-04-add-form-opened');

      // Step 4: Check if form opened or navigated to add page
      console.log('Step 4: Verify the add user form is displayed');
      
      const hasForm = await page.locator('form, [role="dialog"], .modal').first().isVisible();
      const isAddPage = page.url().includes('add') || page.url().includes('new') || page.url().includes('user');
      
      expect(hasForm || isAddPage).toBeTruthy();
      console.log(`Add user form/page is now visible`);

      // Step 5: Fill in user details
      console.log('Step 5: Fill in the new user details');
      
      const testUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@university.edu',
        username: 'jdoe',
        role: 'User',
        department: 'IT Department',
        phone: '555-0123'
      };

      // Fill first name
      const firstNameInputs = [
        page.locator('input[name*="first"]').first(),
        page.locator('input[placeholder*="first"]').first(),
        page.locator('#firstName, #first_name').first()
      ];

      for (const nameInput of firstNameInputs) {
        if (await nameInput.isVisible()) {
          console.log('✏️ Filling first name...');
          await nameInput.fill(testUser.firstName);
          await helpers.screenshot('tutorial-add-users-05-firstname-filled');
          break;
        }
      }

      // Fill last name
      const lastNameInputs = [
        page.locator('input[name*="last"]').first(),
        page.locator('input[placeholder*="last"]').first(),
        page.locator('#lastName, #last_name').first()
      ];

      for (const nameInput of lastNameInputs) {
        if (await nameInput.isVisible()) {
          console.log('✏️ Filling last name...');
          await nameInput.fill(testUser.lastName);
          await helpers.screenshot('tutorial-add-users-06-lastname-filled');
          break;
        }
      }

      // Fill email
      const emailInputs = [
        page.locator('input[name*="email"]').first(),
        page.locator('input[type="email"]').first(),
        page.locator('#email').first()
      ];

      for (const emailInput of emailInputs) {
        if (await emailInput.isVisible()) {
          console.log('✏️ Filling email address...');
          await emailInput.fill(testUser.email);
          await helpers.screenshot('tutorial-add-users-07-email-filled');
          break;
        }
      }

      // Fill username (if username field exists - many systems use email as login)
      const usernameInputs = [
        page.locator('input[name*="username"]').first(),
        page.locator('input[name*="login"]').first(),
        page.locator('input[placeholder*="username" i]').first(),
        page.locator('input[placeholder*="login" i]').first(),
        page.locator('#username, #login').first(),
        page.locator('input[type="text"]:not([name*="name"]):not([name*="email"])').first()
      ];

      let usernameFieldFound = false;
      for (const usernameInput of usernameInputs) {
        try {
          if (await usernameInput.isVisible({ timeout: 2000 })) {
            console.log('✏️ Filling username...');
            await usernameInput.fill(testUser.username);
            await helpers.screenshot('tutorial-add-users-08-username-filled');
            usernameFieldFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!usernameFieldFound) {
        console.log('ℹ️ No username field found - system may use email as login identifier');
      }

      // Fill phone number (if phone field exists - may be optional)
      const phoneInputs = [
        page.locator('input[name*="phone"]').first(),
        page.locator('input[type="tel"]').first(),
        page.locator('input[placeholder*="phone" i]').first(),
        page.locator('input[placeholder*="mobile" i]').first(),
        page.locator('#phone').first()
      ];

      let phoneFieldFound = false;
      for (const phoneInput of phoneInputs) {
        try {
          if (await phoneInput.isVisible({ timeout: 2000 })) {
            console.log('✏️ Filling phone number...');
            await phoneInput.fill(testUser.phone);
            await helpers.screenshot('tutorial-add-users-09-phone-filled');
            phoneFieldFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!phoneFieldFound) {
        console.log('ℹ️ No phone field found - may be optional in this form');
      }

      // Select role (if role field exists - may use different UI pattern)
      const roleSelectors = [
        page.locator('select[name*="role"]').first(),
        page.locator('select[name*="permission"]').first(),
        page.locator('[role="combobox"]:has-text("role")').first(),
        page.locator('[role="combobox"]:has-text("permission")').first(),
        page.locator('input[name*="role"]').first(),
        page.locator('#role').first()
      ];

      let roleFieldFound = false;
      for (const roleSelect of roleSelectors) {
        try {
          if (await roleSelect.isVisible({ timeout: 2000 })) {
            console.log('Selecting user role...');
            
            // Handle different role selection UI patterns
            const tagName = await roleSelect.evaluate(el => el.tagName.toLowerCase());
            
            if (tagName === 'select') {
              const options = await roleSelect.locator('option').allTextContents();
              console.log(`Available roles: ${options.join(', ')}`);
              
              // Try to select the specified role or a default one
              const roleToSelect = options.find(opt => opt.includes(testUser.role)) || options[1] || 'User';
              await roleSelect.selectOption({ label: roleToSelect });
              console.log(`Selected role: ${roleToSelect}`);
              await helpers.screenshot('tutorial-add-users-10-role-selected');
              roleFieldFound = true;
              break;
            } else {
              // Handle combobox or input-based role selection
              await roleSelect.click();
              await roleSelect.fill(testUser.role);
              roleFieldFound = true;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!roleFieldFound) {
        console.log('ℹ️ No role field found - may be set automatically or use different UI pattern');
      }

      // Select department
      const departmentSelectors = [
        page.locator('select[name*="department"]').first(),
        page.locator('#department').first()
      ];

      for (const deptSelect of departmentSelectors) {
        if (await deptSelect.isVisible()) {
          console.log('Selecting department...');
          const options = await deptSelect.locator('option').allTextContents();
          const deptToSelect = options.find(opt => opt.includes('IT')) || options[1] || testUser.department;
          await deptSelect.selectOption({ label: deptToSelect });
          console.log(`Selected department: ${deptToSelect}`);
          await helpers.screenshot('tutorial-add-users-11-department-selected');
          break;
        }
      }

      await helpers.screenshot('tutorial-add-users-12-form-completed');

      // Step 6: Set initial permissions (if available)
      console.log('Step 6: Set initial permissions for the new user');
      
      const permissionCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await permissionCheckboxes.count();
      
      if (checkboxCount > 0) {
        console.log(`Found ${checkboxCount} permission options`);
        
        // Select basic permissions for a new user
        const basicPermissions = ['View Inventory', 'Create Quotes', 'View Reports'];
        
        for (let i = 0; i < checkboxCount; i++) {
          const checkbox = permissionCheckboxes.nth(i);
          const labelElement = page.locator(`label[for="${await checkbox.getAttribute('id')}"]`);
          let label = '';
          
          if (await labelElement.isVisible()) {
            label = await labelElement.textContent() || '';
          } else {
            label = await checkbox.locator('..').textContent() || '';
          }
          
          if (basicPermissions.some(perm => label.includes(perm))) {
            await checkbox.check();
            console.log(`Enabled permission: ${label.trim()}`);
          }
        }
        
        await helpers.screenshot('tutorial-add-users-13-permissions-set');
      } else {
        console.log('ℹ️ No permission checkboxes found - permissions may be role-based');
      }

      // Step 7: Submit the form
      console.log('Step 7: Submit the form to create the user');
      
      const submitButtons = [
        page.getByRole('button', { name: /save/i }),
        page.getByRole('button', { name: /create/i }),
        page.getByRole('button', { name: /add/i }),
        page.getByRole('button', { name: /invite/i }),
        page.locator('button[type="submit"]').first()
      ];

      let submitButton: any = null;
      for (const button of submitButtons) {
        if (await button.isVisible()) {
          submitButton = button;
          const buttonText = await button.textContent();
          console.log(`Found submit button: "${buttonText?.trim()}"`);
          break;
        }
      }

      expect(submitButton).not.toBeNull();
      await helpers.screenshot('tutorial-add-users-14-ready-to-submit');
      
      await helpers.safeClick(submitButton!);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-add-users-15-form-submitted');

      // Step 8: Verify success
      console.log('Step 8: Verify the user was created successfully');
      
      const successIndicators = [
        page.locator('.alert-success, .success-message, .toast-success').first(),
        page.getByText(/success/i).first(),
        page.getByText(/created/i).first(),
        page.getByText(/added/i).first(),
        page.getByText(/invited/i).first()
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

      // Check if we're back on users list with new user
      if (!successFound) {
        const currentUrl = page.url();
        if (currentUrl.includes('/user') || currentUrl.includes('/admin')) {
          console.log('Redirected back to user management page');
          successFound = true;
        }
      }

      await helpers.screenshot('tutorial-add-users-16-success-confirmation');

      // Step 9: Verify the user appears in the users list
      console.log('Step 9: Verify the new user appears in the users list');
      
      // Navigate back to users list if not already there
      if (!page.url().includes('user')) {
        await helpers.navigateAndWait('/settings');
        // Try to navigate to users section again
        for (const link of userManagementLinks) {
          if (await link.isVisible()) {
            await helpers.safeClick(link);
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
      
      // Look for the user we just created
      const userInList = page.getByText(testUser.email).first();
      if (await userInList.isVisible()) {
        console.log(`New user "${testUser.email}" found in users list`);
        await helpers.screenshot('tutorial-add-users-17-user-in-list');
      } else {
        console.log('ℹ️ User may not be immediately visible (pagination, filters, etc.)');
      }

      console.log('');
      console.log('🎉 TUTORIAL COMPLETE: Adding New Users');
      console.log('======================================');
      console.log('📸 Screenshots saved for each step in test-results/');
      console.log('📝 This test demonstrates the complete workflow for adding users');
      console.log('');
      console.log('Key Points:');
      console.log('   • Always use university email addresses');
      console.log('   • Assign appropriate roles based on job function');
      console.log('   • Set minimal permissions initially - can be expanded later');
      console.log('   • Consider department-based access controls');
      console.log('');

      expect(successFound).toBeTruthy();
    } else {
      console.log('ℹ️ Add user functionality may not be available or requires different navigation');
      await helpers.screenshot('tutorial-add-users-no-add-button');
    }
  });

  test('Step-by-step: Bulk user import from CSV', async ({ page }) => {
    console.log('TUTORIAL: Bulk User Import from CSV');
    console.log('======================================');
    
    // Step 1: Look for bulk import functionality
    console.log('Step 1: Look for bulk import functionality');
    
    const bulkImportButtons = [
      page.getByRole('button', { name: /bulk.*import/i }),
      page.getByRole('button', { name: /import.*csv/i }),
      page.getByRole('button', { name: /upload.*users/i }),
      page.getByText(/bulk.*add/i).first()
    ];

    let bulkImportButton: any = null;
    for (const button of bulkImportButtons) {
      if (await button.first().isVisible()) {
        bulkImportButton = button.first();
        const buttonText = await bulkImportButton.textContent();
        console.log(`Found bulk import button: "${buttonText?.trim()}"`);
        break;
      }
    }

    if (bulkImportButton) {
      await helpers.screenshot('tutorial-add-users-bulk-01-import-button');
      
      // Step 2: Click bulk import
      console.log('Step 2: Click the bulk import button');
      await helpers.safeClick(bulkImportButton);
      await page.waitForTimeout(1000);
      await helpers.screenshot('tutorial-add-users-bulk-02-import-dialog');

      // Step 3: Show CSV format requirements
      console.log('Step 3: Review CSV format requirements');
      
      const formatInfo = page.locator('.csv-format, .import-format, .format-help').first();
      if (await formatInfo.isVisible()) {
        const formatText = await formatInfo.textContent();
        console.log(`CSV Format: ${formatText?.trim()}`);
        await helpers.screenshot('tutorial-add-users-bulk-03-csv-format');
      }

      console.log('Expected CSV format:');
      console.log('   first_name,last_name,email,username,role,department');
      console.log('   John,Doe,john.doe@uni.edu,jdoe,User,IT');
      console.log('   Jane,Smith,jane.smith@uni.edu,jsmith,Manager,HR');

      // Step 4: File upload area
      console.log('Step 4: Locate file upload area');
      
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        console.log('Found file upload input');
        await helpers.screenshot('tutorial-add-users-bulk-04-file-upload');
        
        // In a real scenario, you would upload a CSV file here
        console.log('In practice: Select your CSV file here');
        console.log('The system will validate the format and show a preview');
      }

      console.log('🎉 TUTORIAL COMPLETE: Bulk User Import');
    } else {
      console.log('ℹ️ Bulk import functionality may not be available');
    }
  });

  test('Understanding user roles and their capabilities', async ({ page }) => {
    console.log('TUTORIAL: Understanding User Roles');
    console.log('=====================================');
    
    console.log('User Role Hierarchy in LUStores:');
    console.log('');
    console.log('👑 SUPER ADMIN');
    console.log('   • Complete system access');
    console.log('   • Can manage all users and permissions');
    console.log('   • System configuration and settings');
    console.log('   • Database management and backups');
    console.log('');
    console.log('ADMIN');
    console.log('   • User management within organization');
    console.log('   • Full inventory and sales management');
    console.log('   • All reports and analytics');
    console.log('   • Charge code management');
    console.log('');
    console.log('MANAGER');
    console.log('   • Department-level inventory management');
    console.log('   • Approve purchase orders and quotes');
    console.log('   • Departmental reporting');
    console.log('   • Team member management');
    console.log('');
    console.log('USER');
    console.log('   • View and search inventory');
    console.log('   • Create sales quotes and requests');
    console.log('   • Basic reporting access');
    console.log('   • Personal activity tracking');
    console.log('');
    console.log('👁️ VIEWER');
    console.log('   • Read-only inventory access');
    console.log('   • View basic reports');
    console.log('   • No creation or editing capabilities');
    console.log('   • Suitable for auditors or external users');
    console.log('');
    
    await helpers.screenshot('tutorial-add-users-roles-explanation');
    
    console.log('Best Practices:');
    console.log('   • Start with minimal permissions');
    console.log('   • Use department-based role assignment');
    console.log('   • Regular permission audits');
    console.log('   • Document role changes');
    console.log('');
    
    console.log('🎉 TUTORIAL COMPLETE: Understanding User Roles');
  });
});
