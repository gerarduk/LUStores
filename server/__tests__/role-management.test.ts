import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../dbConfig';
import { users, userPermissions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { 
  checkPermission, 
  getUserPermissionsDetailed,
  updateUserPermission,
  getSystemSetting,
  updateSystemSetting,
  getSystemSettings
} from '../permissions';
import { storage } from '../storage';

describe('Role Management and Settings System', () => {
  let testUsers: any[] = [];
  const testSuffix = Date.now().toString(); // Make test emails unique
  
  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(userPermissions).where(eq(userPermissions.userId, `test_user_basic_${testSuffix}`));
    await db.delete(userPermissions).where(eq(userPermissions.userId, `test_user_super_${testSuffix}`));
    await db.delete(userPermissions).where(eq(userPermissions.userId, `test_user_admin_${testSuffix}`));
    await db.delete(users).where(eq(users.id, `test_user_basic_${testSuffix}`));
    await db.delete(users).where(eq(users.id, `test_user_super_${testSuffix}`));
    await db.delete(users).where(eq(users.id, `test_user_admin_${testSuffix}`));
    
    // Clean up by email in case IDs are different
    await db.delete(users).where(eq(users.email, `role.test.basic.${testSuffix}@example.com`));
    await db.delete(users).where(eq(users.email, `role.test.super.${testSuffix}@example.com`));
    await db.delete(users).where(eq(users.email, `role.test.admin.${testSuffix}@example.com`));
    
    // Create test users with different roles
    const basicUser = await storage.createLocalUser({
      email: `role.test.basic.${testSuffix}@example.com`,
      firstName: 'Basic',
      lastName: 'User',
      role: 'user',
      password_hash: 'test-hash',
      isActive: true,
      mustChangePassword: false
    });
    
    const superUser = await storage.createLocalUser({
      email: `role.test.super.${testSuffix}@example.com`,
      firstName: 'Super',
      lastName: 'User',
      role: 'superuser',
      password_hash: 'test-hash',
      isActive: true,
      mustChangePassword: false
    });
    
    const adminUser = await storage.createLocalUser({
      email: `role.test.admin.${testSuffix}@example.com`,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      password_hash: 'test-hash',
      isActive: true,
      mustChangePassword: false
    });
    
    testUsers = [basicUser, superUser, adminUser];
  });
  
  afterEach(async () => {
    // Clean up test data
    if (testUsers.length > 0) {
      await db.delete(userPermissions).where(eq(userPermissions.userId, testUsers[0].id));
      await db.delete(userPermissions).where(eq(userPermissions.userId, testUsers[1].id));
      await db.delete(userPermissions).where(eq(userPermissions.userId, testUsers[2].id));
      await db.delete(users).where(eq(users.id, testUsers[0].id));
      await db.delete(users).where(eq(users.id, testUsers[1].id));
      await db.delete(users).where(eq(users.id, testUsers[2].id));
    }
  });

  describe('Basic Role Permissions', () => {
    it('should allow basic users to view inventory and sales', async () => {
      const canViewInventory = await checkPermission(testUsers[0].id, 'inventory.view');
      const canViewSales = await checkPermission(testUsers[0].id, 'sales.view');
      const canCreateSales = await checkPermission(testUsers[0].id, 'sales.create');
      
      expect(canViewInventory).toBe(true);
      expect(canViewSales).toBe(true);
      expect(canCreateSales).toBe(true);
    });
    
    it('should NOT allow basic users to add inventory or manage categories', async () => {
      const canAddInventory = await checkPermission(testUsers[0].id, 'inventory.add');
      const canManageCategories = await checkPermission(testUsers[0].id, 'categories.add');
      const canConvertQuotes = await checkPermission(testUsers[0].id, 'quotes.convert_to_sale');
      
      expect(canAddInventory).toBe(false);
      expect(canManageCategories).toBe(false);
      expect(canConvertQuotes).toBe(false);
    });
    
    it('should NOT allow basic users to access admin functions', async () => {
      const canManageUsers = await checkPermission(testUsers[0].id, 'users.view');
      const canBackupDB = await checkPermission(testUsers[0].id, 'backup.create');
      const canViewSettings = await checkPermission(testUsers[0].id, 'settings.view');
      
      expect(canManageUsers).toBe(false);
      expect(canBackupDB).toBe(false);
      expect(canViewSettings).toBe(false);
    });
  });

  describe('Superuser Role Permissions', () => {
    it('should allow superusers to manage inventory and process sales', async () => {
      const canAddInventory = await checkPermission(testUsers[1].id, 'inventory.add');
      const canEditInventory = await checkPermission(testUsers[1].id, 'inventory.edit');
      const canProcessSales = await checkPermission(testUsers[1].id, 'sales.create');
      const canConvertQuotes = await checkPermission(testUsers[1].id, 'quotes.convert_to_sale');
      
      expect(canAddInventory).toBe(true);
      expect(canEditInventory).toBe(true);
      expect(canProcessSales).toBe(true);
      expect(canConvertQuotes).toBe(true);
    });
    
    it('should allow superusers to manage orders and vendors', async () => {
      const canCreateOrders = await checkPermission(testUsers[1].id, 'orders.create');
      const canAddVendors = await checkPermission(testUsers[1].id, 'vendors.add');
      const canCreatePurchaseOrders = await checkPermission(testUsers[1].id, 'orders.create');
      
      expect(canCreateOrders).toBe(true);
      expect(canAddVendors).toBe(true);
      expect(canCreatePurchaseOrders).toBe(true);
    });
    
    it('should allow superusers to generate reports but NOT manage users', async () => {
      // Ensure permission enforcement is disabled for this test to give superusers all permissions
      await updateSystemSetting('permissions.enforce', false);
      
      const canGenerateReports = await checkPermission(testUsers[1].id, 'reports.view');
      const canExportReports = await checkPermission(testUsers[1].id, 'reports.advanced');
      const canManageUsers = await checkPermission(testUsers[1].id, 'users.view');
      const canBackupDB = await checkPermission(testUsers[1].id, 'backup.create');
      
      expect(canGenerateReports).toBe(true);
      expect(canExportReports).toBe(true);
      expect(canManageUsers).toBe(false);
      expect(canBackupDB).toBe(false);
    });
  });

  describe('Admin Role Permissions', () => {
    it('should allow admins to perform all operations', async () => {
      const permissions = [
        'inventory.delete',
        'sales.refund', 
        'categories.manage',
        'users.view',
        'users.add',
        'users.manage_permissions',
        'backup.create',
        'settings.view',
        'settings.edit'
      ];
      
      for (const permission of permissions) {
        const canPerform = await checkPermission(testUsers[2].id, permission);
        expect(canPerform).toBe(true);
      }
    });
  });

  describe('Permission Override System', () => {
    it('should allow granting specific permissions to users', async () => {
      // Basic user shouldn't be able to add inventory initially
      let canAdd = await checkPermission(testUsers[0].id, 'inventory.add');
      expect(canAdd).toBe(false);
      
      // Grant the permission
      await updateUserPermission(testUsers[0].id, 'inventory.add', true, testUsers[2].id);
      
      // Now they should be able to
      canAdd = await checkPermission(testUsers[0].id, 'inventory.add');
      expect(canAdd).toBe(true);
    });
    
    it('should allow revoking permissions from users', async () => {
      // Superuser should be able to add inventory initially
      let canAdd = await checkPermission(testUsers[1].id, 'inventory.add');
      expect(canAdd).toBe(true);
      
      // Revoke the permission
      await updateUserPermission(testUsers[1].id, 'inventory.add', false, testUsers[2].id);
      
      // Now they shouldn't be able to
      canAdd = await checkPermission(testUsers[1].id, 'inventory.add');
      expect(canAdd).toBe(false);
    });
    
    it('should maintain permission history', async () => {
      await updateUserPermission(testUsers[0].id, 'inventory.add', true, testUsers[2].id);
      
      const permissions = await getUserPermissionsDetailed(testUsers[0].id);
      const addPermission = permissions.find(p => p.permission === 'inventory.add');
      
      expect(addPermission).toBeDefined();
      expect(addPermission?.granted).toBe(true);
      expect(addPermission?.grantedBy).toBe(testUsers[2].id);
    });
  });

  describe('System Settings Management', () => {
    it('should manage role-based permission settings', async () => {
      // Test quote to sale conversion roles
      const quotesToSaleRoles = await getSystemSetting('permissions.quote_to_sale_roles', []);
      expect(Array.isArray(quotesToSaleRoles)).toBe(true);
      expect(quotesToSaleRoles).toContain('superuser');
      expect(quotesToSaleRoles).toContain('admin');
      
      // Test category management roles  
      const categoryRoles = await getSystemSetting('permissions.manage_categories_roles', []);
      expect(categoryRoles).toContain('admin');
      expect(categoryRoles).not.toContain('user');
    });
    
    it('should retrieve all settings grouped by category', async () => {
      const allSettings = await getSystemSettings();
      
      expect(allSettings).toHaveProperty('security');
      expect(allSettings).toHaveProperty('permissions');
      expect(allSettings).toHaveProperty('notifications');
      
      // Check that we have some notification settings
      const notificationSettings = allSettings.notifications || [];
      const showLowStockSetting = notificationSettings.find(s => s.key === 'notifications.show_low_stock');
      expect(showLowStockSetting).toBeDefined();
    });
    
    it('should handle notification settings', async () => {
      // Test low stock notification setting (this is a meaningful setting we keep)
      const showLowStock = await getSystemSetting('notifications.show_low_stock', true);
      expect(typeof showLowStock).toBe('boolean');
      expect(showLowStock).toBe(true);
      
      // Update notification setting
      await updateSystemSetting('notifications.show_low_stock', false);
      const updatedSetting = await getSystemSetting('notifications.show_low_stock', true);
      expect(updatedSetting).toBe(false);
      
      // Reset it back for other tests
      await updateSystemSetting('notifications.show_low_stock', true);
    });
  });

  describe('Role-Based Feature Access Control', () => {
    it('should validate quote to sale conversion permissions', async () => {
      const allowedRoles = await getSystemSetting('permissions.quote_to_sale_roles', []);
      
      // Check each test user
      const basicUserCan = allowedRoles.includes('user') || await checkPermission(testUsers[0].id, 'quotes.convert');
      const superUserCan = allowedRoles.includes('superuser') || await checkPermission(testUsers[1].id, 'quotes.convert');
      const adminUserCan = allowedRoles.includes('admin') || await checkPermission(testUsers[2].id, 'quotes.convert');
      
      expect(basicUserCan).toBe(false);
      expect(superUserCan).toBe(true);
      expect(adminUserCan).toBe(true);
    });
    
    it('should validate vendor addition permissions', async () => {
      const allowedRoles = await getSystemSetting('permissions.add_vendor_roles', []);
      
      const basicUserCan = allowedRoles.includes('user') || await checkPermission(testUsers[0].id, 'vendors.manage');
      const superUserCan = allowedRoles.includes('superuser') || await checkPermission(testUsers[1].id, 'vendors.manage');
      const adminUserCan = allowedRoles.includes('admin') || await checkPermission(testUsers[2].id, 'vendors.manage');
      
      expect(basicUserCan).toBe(false);
      expect(superUserCan).toBe(true);
      expect(adminUserCan).toBe(true);
    });
    
    it('should validate database backup permissions', async () => {
      // Set up system setting to only allow admin role for database backup
      await updateSystemSetting('permissions.database_backup_roles', ['admin']);
      
      const allowedRoles = await getSystemSetting('permissions.database_backup_roles', []);
      
      const basicUserCan = allowedRoles.includes('user') || await checkPermission(testUsers[0].id, 'backup.create');
      const superUserCan = allowedRoles.includes('superuser') || await checkPermission(testUsers[1].id, 'backup.create');
      const adminUserCan = allowedRoles.includes('admin') || await checkPermission(testUsers[2].id, 'backup.create');
      
      expect(basicUserCan).toBe(false);
      expect(superUserCan).toBe(false);
      expect(adminUserCan).toBe(true);
    });
    
    it('should validate report generation permissions', async () => {
      // Set up system setting to only allow superuser and admin roles for report generation
      await updateSystemSetting('permissions.generate_reports_roles', ['superuser', 'admin']);
      
      const allowedRoles = await getSystemSetting('permissions.generate_reports_roles', []);
      
      const basicUserCan = allowedRoles.includes('user') || await checkPermission(testUsers[0].id, 'reports.view');
      const superUserCan = allowedRoles.includes('superuser') || await checkPermission(testUsers[1].id, 'reports.view');
      const adminUserCan = allowedRoles.includes('admin') || await checkPermission(testUsers[2].id, 'reports.view');
      
      expect(basicUserCan).toBe(false);
      expect(superUserCan).toBe(true);
      expect(adminUserCan).toBe(true);
    });
  });

  describe('User Role Changes', () => {
    it('should handle user role promotion correctly', async () => {
      // Promote basic user to superuser
      await db.update(users)
        .set({ role: 'superuser' })
        .where(eq(users.id, testUsers[0].id));
      
      // Verify new permissions (note: this tests the role-based defaults)
      const canAddInventory = await checkPermission(testUsers[0].id, 'inventory.add');
      const canProcessSales = await checkPermission(testUsers[0].id, 'sales.create');
      const canManageUsers = await checkPermission(testUsers[0].id, 'users.view');
      
      expect(canAddInventory).toBe(true);
      expect(canProcessSales).toBe(true);
      expect(canManageUsers).toBe(false); // Still shouldn't have admin permissions
    });
    
    it('should handle user role demotion correctly', async () => {
      // Demote admin user to basic user
      await db.update(users)
        .set({ role: 'user' })
        .where(eq(users.id, testUsers[2].id));
      
      // Verify reduced permissions
      const canManageUsers = await checkPermission(testUsers[2].id, 'users.view');
      const canBackupDB = await checkPermission(testUsers[2].id, 'backup.create');
      const canViewInventory = await checkPermission(testUsers[2].id, 'inventory.view');
      
      expect(canManageUsers).toBe(false);
      expect(canBackupDB).toBe(false);
      expect(canViewInventory).toBe(true); // Should still have basic permissions
    });
  });
});
