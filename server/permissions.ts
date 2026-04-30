import { db } from './dbConfig';
import { 
  users, 
  userPermissions, 
  permissionDefinitions, 
  systemSettings,
  items,
  type User,
  type UserPermission,
  type PermissionDefinition,
  type SystemSetting 
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
// Helper function to retry database operations with exponential backoff
const retryDatabaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error that we should retry
      if (error instanceof Error && 
          (error.message.includes('EAI_AGAIN') || 
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('getaddrinfo'))) {
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Database operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-connection errors or if we've exhausted retries, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
};import type { RequestHandler } from 'express';

// Permission categories
export const PERMISSION_CATEGORIES = {
  INVENTORY: 'Inventory',
  SALES: 'Sales',
  ORDERS: 'Orders',
  SUPPLIERS: 'Suppliers',
  CATEGORIES: 'Categories',
  USER_MANAGEMENT: 'User Management',
  REPORTS: 'Reports',
  SETTINGS: 'Settings',
} as const;

// Common permissions
export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADD: 'inventory.add',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_DELETE: 'inventory.delete',
  INVENTORY_STOCK_ADD: 'inventory.stock.add',
  INVENTORY_STOCK_REMOVE: 'inventory.stock.remove',
  INVENTORY_STOCK_ADJUST: 'inventory.stock.adjust',
  
  // Sales
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_PROCESS: 'sales.process',
  SALES_REFUND: 'sales.refund',
  
  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_RECEIVE: 'orders.receive',
  ORDERS_CANCEL: 'orders.cancel',
  
  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_ADD: 'suppliers.add',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',
  
  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_ADD: 'categories.add',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',
  
  // User Management
  USERS_VIEW: 'users.view',
  USERS_ADD: 'users.add',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset_password',
  USERS_MANAGE_PERMISSIONS: 'users.manage_permissions',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_ADVANCED: 'reports.advanced',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_PERMISSIONS: 'settings.permissions',
  
  // Backup
  BACKUP_CREATE: 'backup.create',
  BACKUP_RESTORE: 'backup.restore',
} as const;

export class PermissionService {
  
  /**
   * Check if a user has a specific permission
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // Get user with role
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) return false;
      
      const userRole = user[0].role;
      
      // Admin role has all permissions
      if (userRole === 'admin') return true;
      
      // Check explicit user permissions first (always, regardless of enforcement setting)
      const userPerm = await db
        .select()
        .from(userPermissions)
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permission, permission)
        ))
        .limit(1);
      
      if (userPerm.length > 0) {
        return userPerm[0].granted;
      }
      
      // Check if permission enforcement is enabled
      const enforcePermissions = await PermissionService.getSystemSetting('permissions.enforce', true);
      if (!enforcePermissions) {
        // If not enforcing permissions, give superuser most permissions but NOT admin-level ones
        if (userRole === 'superuser') {
          const adminOnlyPermissions = [
            PERMISSIONS.USERS_VIEW,
            PERMISSIONS.USERS_ADD,
            PERMISSIONS.USERS_EDIT,
            PERMISSIONS.USERS_DELETE,
            PERMISSIONS.USERS_RESET_PASSWORD,
            PERMISSIONS.USERS_MANAGE_PERMISSIONS,
            PERMISSIONS.BACKUP_CREATE,
            PERMISSIONS.BACKUP_RESTORE,
          ];
          return !adminOnlyPermissions.includes(permission as any);
        }
        // Basic permissions for regular users (excluding reports which require explicit permission)
        const basicPermissions = [
          PERMISSIONS.INVENTORY_VIEW,
          PERMISSIONS.SALES_VIEW,
          PERMISSIONS.SALES_CREATE,
          PERMISSIONS.ORDERS_VIEW,
          PERMISSIONS.SUPPLIERS_VIEW,
          PERMISSIONS.CATEGORIES_VIEW,
        ];
        return basicPermissions.includes(permission as any);
      }
      
      // When enforcement is enabled, check role-based permissions from permission definitions
      
      // Check role-based permissions from permission definitions
      const permDef = await db
        .select()
        .from(permissionDefinitions)
        .where(eq(permissionDefinitions.name, permission))
        .limit(1);
      
      if (permDef.length > 0) {
        const defaultRoles = permDef[0].defaultRoles as string[];
        return defaultRoles.includes(userRole);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }
  
  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) return [];
      
      const userRole = user[0].role;
      
      // Admin has all permissions
      if (userRole === 'admin') {
        const allPerms = await db.select().from(permissionDefinitions);
        return allPerms.map((p: PermissionDefinition) => p.name);
      }
      
      const permissions: string[] = [];
      
      // Get role-based permissions
      const roleDefs = await db.select().from(permissionDefinitions);
      for (const def of roleDefs) {
        const defaultRoles = def.defaultRoles as string[];
        if (defaultRoles.includes(userRole)) {
          permissions.push(def.name);
        }
      }
      
      // Get explicit user permissions (can override role permissions)
      const userPerms = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId));
      
      for (const perm of userPerms) {
        if (perm.granted && !permissions.includes(perm.permission)) {
          permissions.push(perm.permission);
        } else if (!perm.granted) {
          // Remove permission if explicitly denied
          const index = permissions.indexOf(perm.permission);
          if (index > -1) {
            permissions.splice(index, 1);
          }
        }
      }
      
      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }
  
  /**
   * Grant or revoke a permission for a user
   */
  static async setUserPermission(
    userId: string, 
    permission: string, 
    granted: boolean, 
    grantedBy: string
  ): Promise<void> {
    try {
      await db
        .insert(userPermissions)
        .values({
          userId,
          permission,
          granted,
          grantedBy
        })
        .onConflictDoUpdate({
          target: [userPermissions.userId, userPermissions.permission],
          set: {
            granted,
            grantedBy,
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('Error setting user permission:', error);
      throw error;
    }
  }
  
  /**
   * Get all permission definitions grouped by category
   */
  static async getPermissionDefinitions(): Promise<Record<string, PermissionDefinition[]>> {
    try {
      const definitions = await db.select().from(permissionDefinitions);
      const grouped: Record<string, PermissionDefinition[]> = {};
      
      for (const def of definitions) {
        if (!grouped[def.category]) {
          grouped[def.category] = [];
        }
        grouped[def.category].push(def);
      }
      
      return grouped;
    } catch (error) {
      console.error('Error getting permission definitions:', error);
      return {};
    }
  }
  
  /**
   * Get all system settings grouped by category
   */
  static async getAllSystemSettings(): Promise<Record<string, any[]>> {
    try {
      const allSettings = await db.select().from(systemSettings);
      
      const grouped = allSettings.reduce((acc: Record<string, any[]>, setting: any) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        
        let parsedValue;
        if (typeof setting.value === 'string') {
          try {
            parsedValue = JSON.parse(setting.value);
          } catch {
            parsedValue = setting.value;
          }
        } else if (typeof setting.value === 'object' && setting.value !== null) {
          parsedValue = setting.value;
        } else {
          parsedValue = setting.value;
        }
        
        acc[setting.category].push({
          ...setting,
          value: parsedValue
        });
        return acc;
      }, {});
      
      return grouped;
    } catch (error) {
      console.error('Error getting all system settings:', error);
      return {};
    }
  }
  
  /**
   * Get system setting value
   */
  static async getSystemSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      const setting = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (setting.length > 0) {
        const value = setting[0].value;
        // Try to parse JSON first (for arrays, objects, etc.)
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            // If JSON parsing fails, handle as simple value
            if (value === 'true') return true;
            if (value === 'false') return false;
            if (!isNaN(Number(value))) return Number(value);
            return value;
          }
        }
        return value;
      }

      return defaultValue;
    } catch (error) {
      console.error('Error getting system setting:', error);
      return defaultValue;
    }
  }
  
  /**
   * Set system setting value
   */
  static async setSystemSetting(key: string, value: any, description?: string): Promise<void> {
    try {
      await db
        .insert(systemSettings)
        .values({
          key,
          value: JSON.stringify(value),
          description
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: JSON.stringify(value),
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('Error setting system setting:', error);
      throw error;
    }
  }
  
  /**
   * Get detailed user permissions including explicit grants/denials
   */
  static async getUserPermissionsDetailed(userId: string): Promise<Array<{
    permission: string;
    granted: boolean;
    grantedBy: string;
    source: 'role' | 'explicit';
  }>> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) return [];
      
      const userRole = user[0].role;
      const permissions: Array<{
        permission: string;
        granted: boolean;
        grantedBy: string;
        source: 'role' | 'explicit';
      }> = [];
      
      // Get role-based permissions
      const roleDefs = await db.select().from(permissionDefinitions);
      for (const def of roleDefs) {
        const defaultRoles = def.defaultRoles as string[];
        if (defaultRoles.includes(userRole)) {
          permissions.push({
            permission: def.name,
            granted: true,
            grantedBy: 'system',
            source: 'role'
          });
        }
      }
      
      // Get explicit user permissions (can override role permissions)
      const userPerms = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId));
      
      for (const perm of userPerms) {
        const existingIndex = permissions.findIndex(p => p.permission === perm.permission);
        const explicitPerm = {
          permission: perm.permission,
          granted: perm.granted,
          grantedBy: perm.grantedBy,
          source: 'explicit' as const
        };
        
        if (existingIndex >= 0) {
          // Override role-based permission
          permissions[existingIndex] = explicitPerm;
        } else {
          // Add new explicit permission
          permissions.push(explicitPerm);
        }
      }
      
      return permissions;
    } catch (error) {
      console.error('Error getting detailed user permissions:', error);
      return [];
    }
  }
}

// Export individual functions for easier use
export const checkPermission = PermissionService.hasPermission;
export const getUserPermissions = PermissionService.getUserPermissions;
export const getUserPermissionsDetailed = PermissionService.getUserPermissionsDetailed;
export const updateUserPermission = PermissionService.setUserPermission;
export const getSystemSettings = PermissionService.getAllSystemSettings;
export const updateSystemSetting = PermissionService.setSystemSetting;
export const getSystemSetting = PermissionService.getSystemSetting;

/**
 * Middleware to require a specific permission
 */
export function requirePermission(permission: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasPermission = await PermissionService.hasPermission(user.id, permission);
      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: permission,
          userRole: user.role
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to require any of multiple permissions (OR logic)
 */
export function requireAnyPermission(permissions: string[]): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      for (const permission of permissions) {
        const hasPermission = await PermissionService.hasPermission(user.id, permission);
        if (hasPermission) {
          return next();
        }
      }
      
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: permissions,
        userRole: user.role
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
}

/**
 * Update VAT rate and cascade changes to all items using that rate
 * When a VAT rate changes, all items with that rate get their price recalculated
 * while keeping the price exc VAT constant
 *
 * @param oldRate - The current VAT rate to find items with
 * @param newRate - The new VAT rate to apply
 */
export async function updateVatRateWithCascade(oldRate: number, newRate: number): Promise<{ updated: number }> {
  try {
    // Find all items with the OLD VAT rate (convert to string with 4 decimal places for DB match)
    const oldRateStr = oldRate.toFixed(4);
    const itemsToUpdate = await db
      .select()
      .from(items)
      .where(eq(items.vatRate, oldRateStr));

    if (itemsToUpdate.length === 0) {
      return { updated: 0 };
    }

    // For each item, recalculate price while keeping the price exc VAT constant
    for (const item of itemsToUpdate) {
      const currentPrice = parseFloat(item.price.toString());
      const currentVatRate = parseFloat(item.vatRate.toString());

      let newPrice: number;

      if (item.vatIncluded) {
        // Price includes VAT - extract ex-VAT base, then apply new rate
        const priceExcVat = currentPrice / (1 + currentVatRate);
        newPrice = priceExcVat * (1 + newRate);
      } else {
        // Price excludes VAT - price stays the same, only the rate changes
        newPrice = currentPrice;
      }

      // Update the item with new VAT rate (and recalculated price if VAT included)
      await db
        .update(items)
        .set({
          price: newPrice.toFixed(2),
          vatRate: newRate.toFixed(4)
        })
        .where(eq(items.id, item.id));
    }

    return { updated: itemsToUpdate.length };
  } catch (error) {
    console.error('Error cascading VAT rate update:', error);
    throw error;
  }
}

/**
 * Initialize default system settings if they don't exist
 */
export async function initializeDefaultSettings() {
  try {
    const defaultSettings = [
      { key: 'permissions.quote_to_sale_roles', value: '["superuser", "admin"]', description: 'Roles allowed to convert quotes to sales', category: 'permissions', isSystem: true },
      { key: 'permissions.manage_categories_roles', value: '["admin"]', description: 'Roles allowed to manage categories', category: 'permissions', isSystem: true },
      { key: 'permissions.add_vendor_roles', value: '["superuser", "admin"]', description: 'Roles allowed to add vendors', category: 'permissions', isSystem: true },
      { key: 'permissions.database_backup_roles', value: '["admin"]', description: 'Roles allowed to create database backups', category: 'permissions', isSystem: true },
      { key: 'permissions.generate_reports_roles', value: '["superuser", "admin"]', description: 'Roles allowed to generate reports', category: 'permissions', isSystem: true },
      { key: 'permissions.enforce', value: 'true', description: 'Whether to enforce permission checks', category: 'permissions', isSystem: true },
      { key: 'security.password_min_length', value: '8', description: 'Minimum password length', category: 'security', isSystem: true },
      { key: 'security.session_secure', value: 'true', description: 'Require secure session cookies', category: 'security', isSystem: true },
      { key: 'security.login_attempts_max', value: '5', description: 'Maximum failed login attempts before lockout', category: 'security', isSystem: true },
      { key: 'notifications.show_low_stock', value: 'true', description: 'Show low stock notifications', category: 'notifications', isSystem: true },
      { key: 'notifications.email_enabled', value: 'false', description: 'Enable email notifications', category: 'notifications', isSystem: true },
      { key: 'vat_rates', value: '[{"id":"standard","name":"Standard","rate":0.20,"isDefault":true}]', description: 'Available VAT rates', category: 'general', isSystem: true },
    ];

    for (const setting of defaultSettings) {
      const existing = await retryDatabaseOperation(() => db.select().from(systemSettings).where(eq(systemSettings.key, setting.key)).limit(1));
      if (existing.length === 0) {
        await retryDatabaseOperation(() => db.insert(systemSettings).values(setting));
        console.log(`✓ Default setting created: ${setting.key}`);
      }
    }
  } catch (error) {
    console.error('Error initializing default settings:', error);
  }
}
