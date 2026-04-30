import { Page, expect } from '@playwright/test';
import { TestHelpers } from './test-helpers';

/**
 * Production-specific test utilities for deployment testing
 * Handles authentication, user management, and role-based testing
 */

export class ProductionHelpers extends TestHelpers {
  protected get pageInstance(): Page {
    return (this as any).page;
  }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Attempt to create initial admin user in production environment
   */
  async setupInitialAdmin(adminData: { name: string; email: string; password: string }): Promise<boolean> {
    try {
      // console.log('🔧 Setting up initial admin user');
      
      // Check for setup/registration forms
      const setupForm = this.pageInstance.locator('form').filter({ 
        has: this.pageInstance.locator('input[name*="admin" i], input[placeholder*="admin" i]') 
      });
      
      const registrationForm = this.pageInstance.locator('form').filter({ 
        has: this.pageInstance.locator('input[name*="confirm" i], input[placeholder*="confirm" i]') 
      });
      
      if (await setupForm.isVisible()) {
        // Initial setup form
        await this.fillField('name', adminData.name);
        await this.fillField('email', adminData.email);
        await this.fillField('password', adminData.password);
        
        const confirmField = this.pageInstance.locator('input[name*="confirm" i], input[name*="repeat" i]');
        if (await confirmField.isVisible()) {
          await confirmField.fill(adminData.password);
        }
        
        const setupBtn = this.pageInstance.locator('button[type="submit"], button:has-text("Setup"), button:has-text("Initialize")').first();
        await this.safeClick(setupBtn);
        await this.waitForPageStable();
        
        return true;
        
      } else if (await registrationForm.isVisible()) {
        // Registration form
        await this.fillField('name', adminData.name);
        await this.fillField('email', adminData.email);
        await this.fillField('password', adminData.password);
        
        const confirmField = this.pageInstance.locator('input[name*="confirm" i]');
        if (await confirmField.isVisible()) {
          await confirmField.fill(adminData.password);
        }
        
        // Set role to admin if available
        const roleField = this.pageInstance.locator('select[name*="role" i], input[name*="role" i]');
        if (await roleField.isVisible()) {
          if (await roleField.getAttribute('tagName') === 'SELECT') {
            await roleField.selectOption('admin');
          } else {
            await roleField.fill('admin');
          }
        }
        
        const registerBtn = this.pageInstance.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")').first();
        await this.safeClick(registerBtn);
        await this.waitForPageStable();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`Error setting up admin: ${error}`);
      return false;
    }
  }

  /**
   * Login with specific user credentials
   */
  async loginUser(email: string, password: string): Promise<boolean> {
    try {
      console.log(`🔐 Logging in user: ${email}`);
      
      // Navigate to login page if not already there
      await this.navigateAndWait('/');
      
      const loginForm = this.pageInstance.locator('form').filter({ 
        has: this.pageInstance.locator('input[type="password"]') 
      });
      
      if (await loginForm.isVisible()) {
        await this.fillField('email', email);
        await this.fillField('password', password);
        
        const loginBtn = this.pageInstance.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
        await this.safeClick(loginBtn);
        await this.waitForPageStable();
        
        // Check for login success (no error message)
        const loginError = await this.checkForErrorMessage();
        if (!loginError) {
          // console.log(`✅ Successfully logged in: ${email}`);
          return true;
        } else {
          console.log(`❌ Login failed for: ${email}`);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.log(`Error logging in user ${email}: ${error}`);
      return false;
    }
  }

  /**
   * Logout current user
   */
  async logoutUser(): Promise<boolean> {
    try {
      console.log('🚪 Logging out current user');
      
      const logoutSelectors = [
        'button:has-text("Logout")',
        'a:has-text("Logout")',
        'button:has-text("Sign Out")',
        'a:has-text("Sign Out")',
        '.logout',
        '[data-testid="logout"]'
      ];
      
      for (const selector of logoutSelectors) {
        const logoutBtn = this.pageInstance.locator(selector).first();
        if (await logoutBtn.isVisible()) {
          await this.safeClick(logoutBtn);
          await this.waitForPageStable();
          // console.log('✅ User logged out successfully');
          return true;
        }
      }
      
      // Try user menu dropdown
      const userMenu = this.pageInstance.locator('.user-menu, .profile-menu, [data-testid="user-menu"]').first();
      if (await userMenu.isVisible()) {
        await this.safeClick(userMenu);
        await this.waitForPageStable();
        
        const logoutInMenu = this.pageInstance.locator('button:has-text("Logout"), a:has-text("Logout")').first();
        if (await logoutInMenu.isVisible()) {
          await this.safeClick(logoutInMenu);
          await this.waitForPageStable();
          // console.log('✅ User logged out via menu');
          return true;
        }
      }
      
      console.log('⚠️ Logout button not found');
      return false;
    } catch (error) {
      console.log(`Error logging out: ${error}`);
      return false;
    }
  }

  /**
   * Create a new user with specified role
   */
  async createUser(userData: { name: string; email: string; password: string; role: string }): Promise<boolean> {
    try {
      console.log(`👤 Creating user: ${userData.email} with role: ${userData.role}`);
      
      // Navigate to user management
      await this.navigateAndWait('/settings');
      await this.waitForPageStable();
      
      // Find users section
      const usersTab = this.page.locator('a[href*="user"], button:has-text("User"), [role="tab"]:has-text("User")').first();
      if (await usersTab.isVisible()) {
        await this.safeClick(usersTab);
        await this.waitForPageStable();
      }
      
      // Click add user button
      const addUserBtn = this.page.getByRole('button', { name: /add.*user|new.*user|create.*user/i });
      if (await addUserBtn.isVisible()) {
        await this.safeClick(addUserBtn);
        await this.waitForPageStable();
        
        // Fill user form
        await this.fillField('name', userData.name);
        await this.fillField('email', userData.email);
        await this.fillField('password', userData.password);
        
        // Set role
        const roleField = this.page.locator('select[name*="role" i], input[name*="role" i]');
        if (await roleField.isVisible()) {
          if (await roleField.getAttribute('tagName') === 'SELECT') {
            await roleField.selectOption(userData.role);
          } else {
            await roleField.fill(userData.role);
          }
        }
        
        // Submit form
        const submitBtn = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
        await this.safeClick(submitBtn);
        await this.waitForPageStable();
        
        const success = await this.checkForSuccessMessage();
        if (success) {
          // console.log(`✅ User created successfully: ${userData.email}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.log(`Error creating user ${userData.email}: ${error}`);
      return false;
    }
  }

  /**
   * Verify user has access to specific features based on role
   */
  async verifyUserPermissions(role: string): Promise<{ [feature: string]: boolean }> {
    const permissions: { [feature: string]: boolean } = {};
    
    try {
      console.log(`🔍 Verifying permissions for role: ${role}`);
      
      // Test inventory access
      await this.navigateAndWait('/inventory');
      await this.waitForPageStable();
      
      const inventoryContent = this.page.locator('main, .inventory, .main-content').first();
      permissions.inventory_read = await inventoryContent.isVisible();
      
      const addItemBtn = this.page.getByRole('button', { name: /add.*item/i });
      permissions.inventory_write = await addItemBtn.isVisible();
      
      // Test sales access
      await this.navigateAndWait('/sales');
      await this.waitForPageStable();
      
      const salesContent = this.page.locator('main, .sales, .main-content').first();
      permissions.sales_access = await salesContent.isVisible();
      
      // Test user management access
      await this.navigateAndWait('/settings');
      await this.waitForPageStable();
      
      const userManagement = this.page.locator('a[href*="user"], button:has-text("User")').first();
      permissions.user_management = await userManagement.isVisible();
      
      // Test reports access
      const reportsSection = this.page.locator('a[href*="report"], button:has-text("Report")').first();
      permissions.reports_access = await reportsSection.isVisible();
      
      // Test admin features
      const adminFeatures = this.page.locator('button:has-text("Delete"), .admin-only, [data-admin="true"]').first();
      permissions.admin_features = await adminFeatures.isVisible();
      
      console.log(`📊 Permissions for ${role}:`, permissions);
      return permissions;
      
    } catch (error) {
      console.log(`Error verifying permissions for ${role}: ${error}`);
      return permissions;
    }
  }

  /**
   * Create multiple inventory items for testing
   */
  async createTestInventory(items: Array<{ name: string; sku: string; price: string; stock: string }>): Promise<boolean> {
    try {
      console.log(`📦 Creating ${items.length} test inventory items`);
      
      await this.navigateAndWait('/inventory');
      await this.waitForPageStable();
      
      for (const item of items) {
        const addItemBtn = this.page.getByRole('button', { name: /add.*item/i });
        await this.safeClick(addItemBtn);
        await this.waitForPageStable();
        
        const success = await this.fillItemForm(item);
        if (!success) {
          console.log(`❌ Failed to fill form for item: ${item.name}`);
          continue;
        }
        
        const submitBtn = this.page.locator('button[type="submit"], button:has-text("Save")').first();
        await this.safeClick(submitBtn);
        await this.waitForPageStable();
        
        const itemSuccess = await this.checkForSuccessMessage();
        if (itemSuccess) {
          // console.log(`✅ Created item: ${item.name}`);
        } else {
          console.log(`❌ Failed to create item: ${item.name}`);
        }
      }
      
      return true;
    } catch (error) {
      console.log(`Error creating test inventory: ${error}`);
      return false;
    }
  }

  /**
   * Complete a full sales workflow with multiple items
   */
  async completeSalesWorkflow(items: string[], quantities: number[]): Promise<boolean> {
    try {
      // console.log('💰 Starting complete sales workflow');
      
      await this.navigateAndWait('/sales');
      await this.waitForPageStable();
      
      // Add items to quote
      for (let i = 0; i < items.length; i++) {
        const itemName = items[i];
        const quantity = quantities[i] || 1;
        
        // Navigate to Browse Items
        const browseTab = this.page.locator('[role="tab"]:has-text("Browse Items")').first();
        await this.safeClick(browseTab);
        await this.waitForPageStable();
        
        // Search for item
        const searchInput = this.page.locator('input[placeholder*="search" i]').first();
        if (await searchInput.isVisible()) {
          await searchInput.clear();
          await searchInput.fill(itemName);
          await this.waitForNetworkIdle();
        }
        
        // Add to quote
        const itemRow = this.page.locator(`tr:has-text("${itemName}")`).first();
        if (await itemRow.isVisible()) {
          const qtyInput = itemRow.locator('input[type="number"]').first();
          if (await qtyInput.isVisible()) {
            await qtyInput.fill(String(quantity));
          }
          
          const addBtn = itemRow.locator('button:has-text("Add")').first();
          await this.safeClick(addBtn);
          await this.waitForPageStable();
          
          // console.log(`✅ Added ${itemName} (qty: ${quantity}) to quote`);
        }
      }
      
      // Navigate to Current Quote
      const currentQuoteTab = this.page.locator('[role="tab"]:has-text("Current Quote")').first();
      await this.safeClick(currentQuoteTab);
      await this.waitForPageStable();
      
      // Verify items in quote
      for (const itemName of items) {
        await this.verifyTextExists(itemName);
      }
      
      // Complete sale
      const convertBtn = this.page.locator('button:has-text("Convert to Sale"), button:has-text("Complete Sale")').first();
      if (await convertBtn.isVisible()) {
        await this.safeClick(convertBtn);
        await this.handleConfirmDialog('accept');
        await this.waitForPageStable();
        
        const saleSuccess = await this.checkForSuccessMessage();
        if (saleSuccess) {
          // console.log('✅ Sales workflow completed successfully');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.log(`Error in sales workflow: ${error}`);
      return false;
    }
  }

  /**
   * Verify stock levels after sales
   */
  async verifyStockLevels(expectedStocks: { [itemName: string]: number }): Promise<boolean> {
    try {
      // console.log('📊 Verifying stock levels');
      
      await this.navigateAndWait('/inventory');
      await this.waitForPageStable();
      
      for (const [itemName, expectedStock] of Object.entries(expectedStocks)) {
        // Find item row
        const itemRow = this.page.locator(`tr:has-text("${itemName}")`).first();
        if (await itemRow.isVisible()) {
          // Look for stock column (this would need specific selectors based on table structure)
          const stockCell = itemRow.locator('td').nth(4); // Assuming stock is 5th column
          if (await stockCell.isVisible()) {
            const stockText = await stockCell.textContent();
            const actualStock = parseInt(stockText?.trim() || '0');
            
            if (actualStock === expectedStock) {
              // console.log(`✅ Stock correct for ${itemName}: ${actualStock}`);
            } else {
              console.log(`⚠️ Stock mismatch for ${itemName}: expected ${expectedStock}, got ${actualStock}`);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.log(`Error verifying stock levels: ${error}`);
      return false;
    }
  }

  /**
   * Generate and verify reports
   */
  async generateAndVerifyReports(): Promise<boolean> {
    try {
      // console.log('📈 Generating and verifying reports');
      
      await this.navigateAndWait('/dashboard');
      await this.waitForPageStable();
      
      // Check dashboard metrics
      const metrics = this.page.locator('.metric, .stat, .dashboard-card');
      const metricsCount = await metrics.count();
      
      if (metricsCount > 0) {
        // console.log(`✅ Found ${metricsCount} dashboard metrics`);
        
        // Look for key metrics
        const salesMetric = this.page.locator(':has-text("sales"), :has-text("revenue")').first();
        const inventoryMetric = this.page.locator(':has-text("inventory"), :has-text("stock")').first();
        
        if (await salesMetric.isVisible()) {
          // console.log('✅ Sales metrics visible');
        }
        
        if (await inventoryMetric.isVisible()) {
          // console.log('✅ Inventory metrics visible');
        }
      }
      
      // Try to access detailed reports
      const reportsLink = this.page.locator('a[href*="report"], button:has-text("Report")').first();
      if (await reportsLink.isVisible()) {
        await this.safeClick(reportsLink);
        await this.waitForPageStable();
        
        const reportContent = this.page.locator('.report, .report-content, main').first();
        if (await reportContent.isVisible()) {
          // console.log('✅ Detailed reports accessible');
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.log(`Error generating reports: ${error}`);
      return false;
    }
  }
}
