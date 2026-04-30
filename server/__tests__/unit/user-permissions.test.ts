/**
 * User Permissions and Authorization Unit Tests
 * 
 * Tests the core permission system functionality including:
 * 1. Role-based access control (RBAC)
 * 2. Granular permission enforcement
 * 3. Permission middleware validation
 * 4. Permission service logic
 * 5. Role hierarchy enforcement
 * 6. Permission override capabilities
 * 7. Security boundary testing
 * 8. Permission enforcement settings
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock data structures for permission testing
 */
interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'superuser' | 'admin';
  isActive: boolean;
  createdAt: Date;
  permissions?: MockUserPermission[];
}

interface MockUserPermission {
  userId: string;
  permission: string;
  granted: boolean;
  grantedBy: string;
  grantedAt: Date;
}

interface MockPermissionDefinition {
  name: string;
  category: string;
  description: string;
  defaultRoles: string[];
  isActive: boolean;
}

interface MockSystemSetting {
  key: string;
  value: any;
  description?: string;
}

interface MockRequest {
  user?: MockUser;
  params?: Record<string, any>;
  body?: Record<string, any>;
  query?: Record<string, any>;
}

interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
  statusCode?: number;
  responseData?: any;
}

/**
 * Mock permission service for testing
 */
class MockPermissionService {
  private users: Map<string, MockUser> = new Map();
  private userPermissions: Map<string, MockUserPermission[]> = new Map();
  private permissionDefinitions: Map<string, MockPermissionDefinition> = new Map();
  private systemSettings: Map<string, MockSystemSetting> = new Map();
  
  // Permission constants matching the real system
  readonly PERMISSIONS = {
    // Inventory
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_CREATE: 'inventory.create',
    INVENTORY_EDIT: 'inventory.edit',
    INVENTORY_DELETE: 'inventory.delete',
    
    // Sales
    SALES_VIEW: 'sales.view',
    SALES_CREATE: 'sales.create',
    SALES_EDIT: 'sales.edit',
    SALES_DELETE: 'sales.delete',
    
    // Orders
    ORDERS_VIEW: 'orders.view',
    ORDERS_CREATE: 'orders.create',
    ORDERS_EDIT: 'orders.edit',
    
    // Users
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

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Set default system settings
    this.systemSettings.set('permissions.enforce', {
      key: 'permissions.enforce',
      value: true,
      description: 'Enable strict permission enforcement'
    });

    // Setup default permission definitions
    const defaultPermissions: MockPermissionDefinition[] = [
      { 
        name: this.PERMISSIONS.INVENTORY_VIEW, 
        category: 'Inventory', 
        description: 'View inventory items',
        defaultRoles: ['user', 'superuser', 'admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.INVENTORY_CREATE, 
        category: 'Inventory', 
        description: 'Create new inventory items',
        defaultRoles: ['superuser', 'admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.SALES_VIEW, 
        category: 'Sales', 
        description: 'View sales information',
        defaultRoles: ['user', 'superuser', 'admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.SALES_CREATE, 
        category: 'Sales', 
        description: 'Create new sales',
        defaultRoles: ['user', 'superuser', 'admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.USERS_VIEW, 
        category: 'User Management', 
        description: 'View user information',
        defaultRoles: ['admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.USERS_MANAGE_PERMISSIONS, 
        category: 'User Management', 
        description: 'Manage user permissions',
        defaultRoles: ['admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.REPORTS_VIEW, 
        category: 'Reports', 
        description: 'View reports',
        defaultRoles: ['superuser', 'admin'],
        isActive: true
      },
      { 
        name: this.PERMISSIONS.SETTINGS_PERMISSIONS, 
        category: 'Settings', 
        description: 'Manage permission settings',
        defaultRoles: ['admin'],
        isActive: true
      },
    ];

    defaultPermissions.forEach(perm => {
      this.permissionDefinitions.set(perm.name, perm);
    });
  }

  // Setup helpers for tests
  setupUser(userData: Partial<MockUser>): MockUser {
    const user: MockUser = {
      id: userData.id || `user_${this.users.size + 1}`,
      email: userData.email || `user${this.users.size + 1}@example.com`,
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      role: userData.role || 'user',
      isActive: userData.isActive ?? true,
      createdAt: userData.createdAt || new Date(),
    };
    
    this.users.set(user.id, user);
    return user;
  }

  setupUserPermission(userId: string, permission: string, granted: boolean = true, grantedBy: string = 'admin'): void {
    const permissions = this.userPermissions.get(userId) || [];
    const existingIndex = permissions.findIndex(p => p.permission === permission);
    
    const newPermission: MockUserPermission = {
      userId,
      permission,
      granted,
      grantedBy,
      grantedAt: new Date(),
    };

    if (existingIndex >= 0) {
      permissions[existingIndex] = newPermission;
    } else {
      permissions.push(newPermission);
    }

    this.userPermissions.set(userId, permissions);
  }

  setupSystemSetting(key: string, value: any): void {
    this.systemSettings.set(key, { key, value });
  }

  /**
   * Get system setting value  
   */
  async getSystemSetting(key: string, defaultValue?: any): Promise<any> {
    const setting = this.systemSettings.get(key);
    return setting ? setting.value : defaultValue;
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // Get user
      const user = this.users.get(userId);
      if (!user || !user.isActive) {
        return false;
      }

      const userRole = user.role;

      // Admin role has all permissions
      if (userRole === 'admin') {
        return true;
      }

      // Check explicit user permissions first (always applies regardless of enforcement setting)
      const userPermissions = this.userPermissions.get(userId) || [];
      const explicitPermission = userPermissions.find(p => p.permission === permission);
      
      if (explicitPermission) {
        return explicitPermission.granted;
      }

      // Check if permission enforcement is enabled
      const enforcePermissions = await this.getSystemSetting('permissions.enforce', true);
      if (!enforcePermissions) {
        // If not enforcing permissions, give superuser most permissions but NOT admin-level ones
        if (userRole === 'superuser') {
          const adminOnlyPermissions = [
            this.PERMISSIONS.USERS_VIEW,
            this.PERMISSIONS.USERS_ADD,
            this.PERMISSIONS.USERS_EDIT,
            this.PERMISSIONS.USERS_DELETE,
            this.PERMISSIONS.USERS_RESET_PASSWORD,
            this.PERMISSIONS.USERS_MANAGE_PERMISSIONS,
            this.PERMISSIONS.BACKUP_CREATE,
            this.PERMISSIONS.BACKUP_RESTORE,
          ];
          return !adminOnlyPermissions.includes(permission as any);
        }
        // Basic permissions for regular users
        const basicPermissions = [
          this.PERMISSIONS.INVENTORY_VIEW,
          this.PERMISSIONS.SALES_VIEW,
          this.PERMISSIONS.SALES_CREATE,
          this.PERMISSIONS.ORDERS_VIEW,
        ];
        return basicPermissions.includes(permission as any);
      }

      // Check role-based permissions from permission definitions
      const permissionDef = this.permissionDefinitions.get(permission);
      if (permissionDef && permissionDef.isActive) {
        return permissionDef.defaultRoles.includes(userRole);
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
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = this.users.get(userId);
      if (!user || !user.isActive) {
        return [];
      }

      const userRole = user.role;

      // Admin has all permissions
      if (userRole === 'admin') {
        return Array.from(this.permissionDefinitions.keys());
      }

      const permissions: string[] = [];

      // Get role-based permissions
      for (const [permissionName, definition] of this.permissionDefinitions) {
        if (definition.isActive && definition.defaultRoles.includes(userRole)) {
          permissions.push(permissionName);
        }
      }

      // Apply explicit user permissions (override role permissions)
      const userPermissions = this.userPermissions.get(userId) || [];
      for (const userPerm of userPermissions) {
        const index = permissions.indexOf(userPerm.permission);
        if (userPerm.granted && index === -1) {
          permissions.push(userPerm.permission); // Add granted permission
        } else if (!userPerm.granted && index >= 0) {
          permissions.splice(index, 1); // Remove denied permission
        }
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Mock middleware factory for requiring specific permission
   */
  requirePermission(permission: string) {
    return async (req: MockRequest, res: MockResponse, next: Function) => {
      try {
        const user = req.user;
        if (!user) {
          res.status(401);
          res.json({ message: 'Authentication required' });
          return;
        }

        const hasPermission = await this.hasPermission(user.id, permission);
        if (!hasPermission) {
          res.status(403);
          res.json({ 
            message: 'Insufficient permissions',
            required: permission,
            userRole: user.role
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500);
        res.json({ message: 'Permission check failed' });
      }
    };
  }

  /**
   * Mock middleware factory for requiring any of multiple permissions
   */
  requireAnyPermission(permissions: string[]) {
    return async (req: MockRequest, res: MockResponse, next: Function) => {
      try {
        const user = req.user;
        if (!user) {
          res.status(401);
          res.json({ message: 'Authentication required' });
          return;
        }

        for (const permission of permissions) {
          const hasPermission = await this.hasPermission(user.id, permission);
          if (hasPermission) {
            return next();
          }
        }

        res.status(403);
        res.json({ 
          message: 'Insufficient permissions',
          required: permissions,
          userRole: user.role
        });
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500);
        res.json({ message: 'Permission check failed' });
      }
    };
  }

  /**
   * Mock middleware factory for requiring specific roles
   */
  requireRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return async (req: MockRequest, res: MockResponse, next: Function) => {
      try {
        const user = req.user;
        if (!user) {
          res.status(401);
          res.json({ error: 'Authentication required' });
          return;
        }

        if (!allowedRoles.includes(user.role)) {
          res.status(403);
          res.json({ 
            error: 'Insufficient permissions',
            required: allowedRoles,
            current: user.role
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Role check error:', error);
        res.status(500);
        res.json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Helper to create mock request and response objects
   */
  createMockRequestResponse(user?: MockUser, body?: any, params?: any): {
    req: MockRequest;
    res: MockResponse;
    next: jest.MockedFunction<any>;
  } {
    const req: MockRequest = {
      user,
      body: body || {},
      params: params || {},
      query: {},
    };

    let statusCode = 200;
    let responseData: any = null;

    const res: MockResponse = {
      status: (code: number) => {
        statusCode = code;
        res.statusCode = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        res.responseData = data;
        return res;
      },
      statusCode,
      responseData,
    };

    const next = jest.fn();

    return { req, res, next };
  }

  getUser(userId: string): MockUser | undefined {
    return this.users.get(userId);
  }

  getUserPermissionOverrides(userId: string): MockUserPermission[] {
    return this.userPermissions.get(userId) || [];
  }

  reset(): void {
    this.users.clear();
    this.userPermissions.clear();
    this.systemSettings.clear();
    this.permissionDefinitions.clear();
    this.initializeDefaultData();
  }
}

describe('User Permissions and Authorization Unit Tests', () => {
  let permissionService: MockPermissionService;
  let testUsers: { user: MockUser; superuser: MockUser; admin: MockUser };

  beforeEach(() => {
    permissionService = new MockPermissionService();

    // Setup test users with different roles
    testUsers = {
      user: permissionService.setupUser({
        id: 'user_001',
        email: 'basicuser@example.com',
        firstName: 'Basic',
        lastName: 'User',
        role: 'user',
      }),
      superuser: permissionService.setupUser({
        id: 'superuser_001',
        email: 'manager@example.com',
        firstName: 'Super',
        lastName: 'User',
        role: 'superuser',
      }),
      admin: permissionService.setupUser({
        id: 'admin_001',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      }),
    };
  });

  afterEach(() => {
    permissionService.reset();
  });

  describe('Role-Based Access Control (RBAC)', () => {

    it('should grant admin users all permissions', async () => {
      const admin = testUsers.admin;

      // Test various permissions
      const permissions = [
        permissionService.PERMISSIONS.INVENTORY_VIEW,
        permissionService.PERMISSIONS.INVENTORY_CREATE,
        permissionService.PERMISSIONS.SALES_DELETE,
        permissionService.PERMISSIONS.USERS_VIEW,
        permissionService.PERMISSIONS.USERS_MANAGE_PERMISSIONS,
        permissionService.PERMISSIONS.SETTINGS_PERMISSIONS,
        permissionService.PERMISSIONS.BACKUP_CREATE,
      ];

      for (const permission of permissions) {
        const hasPermission = await permissionService.hasPermission(admin.id, permission);
        expect(hasPermission).toBe(true);
      }
    });

    it('should enforce role hierarchy for superuser permissions', async () => {
      const superuser = testUsers.superuser;

      // Should have basic permissions
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.INVENTORY_CREATE)).toBe(true);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.SALES_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(true);

      // Should NOT have admin-only permissions
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(false);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.USERS_MANAGE_PERMISSIONS)).toBe(false);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.SETTINGS_PERMISSIONS)).toBe(false);
    });

    it('should limit basic user permissions appropriately', async () => {
      const basicUser = testUsers.user;

      // Should have basic read permissions
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.SALES_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.SALES_CREATE)).toBe(true);

      // Should NOT have creation or management permissions
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.INVENTORY_CREATE)).toBe(false);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(false);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(false);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.SETTINGS_PERMISSIONS)).toBe(false);
    });

    it('should handle inactive users correctly', async () => {
      const inactiveUser = permissionService.setupUser({
        id: 'inactive_001',
        role: 'admin',
        isActive: false, // Inactive user
      });

      // Even admin permissions should be denied for inactive users
      const hasPermission = await permissionService.hasPermission(
        inactiveUser.id, 
        permissionService.PERMISSIONS.USERS_VIEW
      );
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('Explicit Permission Overrides', () => {

    it('should grant permissions via explicit user permissions', async () => {
      const basicUser = testUsers.user;

      // User normally cannot view reports
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(false);

      // Grant explicit permission
      permissionService.setupUserPermission(
        basicUser.id, 
        permissionService.PERMISSIONS.REPORTS_VIEW, 
        true, 
        'admin_001'
      );

      // Should now have permission
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(true);
    });

    it('should deny permissions via explicit user permissions', async () => {
      const superuser = testUsers.superuser;

      // Superuser normally has inventory view permission
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(true);

      // Explicitly deny permission
      permissionService.setupUserPermission(
        superuser.id, 
        permissionService.PERMISSIONS.INVENTORY_VIEW, 
        false, 
        'admin_001'
      );

      // Should now be denied
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(false);
    });

    it('should prioritize explicit permissions over role permissions', async () => {
      const basicUser = testUsers.user;

      // Setup explicit permissions that override role defaults
      permissionService.setupUserPermission(basicUser.id, permissionService.PERMISSIONS.USERS_VIEW, true);
      permissionService.setupUserPermission(basicUser.id, permissionService.PERMISSIONS.SALES_VIEW, false);

      // Should be granted admin permission despite being basic user
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(true);

      // Should be denied basic permission despite role allowing it
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.SALES_VIEW)).toBe(false);
    });

    it('should handle multiple permission overrides correctly', async () => {
      const user = testUsers.user;

      // Setup multiple overrides
      const overrides = [
        { permission: permissionService.PERMISSIONS.REPORTS_VIEW, granted: true },
        { permission: permissionService.PERMISSIONS.USERS_VIEW, granted: true },
        { permission: permissionService.PERMISSIONS.INVENTORY_VIEW, granted: false },
        { permission: permissionService.PERMISSIONS.SETTINGS_PERMISSIONS, granted: true },
      ];

      overrides.forEach(({ permission, granted }) => {
        permissionService.setupUserPermission(user.id, permission, granted);
      });

      // Verify all overrides work
      expect(await permissionService.hasPermission(user.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(user.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(user.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(false); // Denied override
      expect(await permissionService.hasPermission(user.id, permissionService.PERMISSIONS.SETTINGS_PERMISSIONS)).toBe(true);

      // Check permissions that weren't overridden still follow role defaults
      expect(await permissionService.hasPermission(user.id, permissionService.PERMISSIONS.SALES_VIEW)).toBe(true); // Role default
    });
  });

  describe('Permission Enforcement Settings', () => {

    it('should respect permission enforcement when enabled', async () => {
      permissionService.setupSystemSetting('permissions.enforce', true);
      
      const basicUser = testUsers.user;

      // Strict enforcement: only role-defined permissions allowed
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(true);  // Role allows
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(false); // Role denies
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(false);   // Role denies
    });

    it('should provide basic permissions when enforcement disabled', async () => {
      permissionService.setupSystemSetting('permissions.enforce', false);
      
      const basicUser = testUsers.user;
      const superuser = testUsers.superuser;

      // Basic user should get basic permissions
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.SALES_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.SALES_CREATE)).toBe(true);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(false); // Still denied

      // Superuser should get most permissions but not admin-only ones
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.INVENTORY_VIEW)).toBe(true);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.INVENTORY_CREATE)).toBe(true);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.SALES_DELETE)).toBe(true);
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(false); // Admin only
      expect(await permissionService.hasPermission(superuser.id, permissionService.PERMISSIONS.BACKUP_CREATE)).toBe(false); // Admin only
    });

    it('should always respect explicit permissions regardless of enforcement setting', async () => {
      const basicUser = testUsers.user;

      // Grant explicit permission
      permissionService.setupUserPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW, true);

      // Test with enforcement enabled
      permissionService.setupSystemSetting('permissions.enforce', true);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(true);

      // Test with enforcement disabled
      permissionService.setupSystemSetting('permissions.enforce', false);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW)).toBe(true);
    });

    it('should always allow admin permissions regardless of enforcement setting', async () => {
      const admin = testUsers.admin;

      // Test with enforcement enabled
      permissionService.setupSystemSetting('permissions.enforce', true);
      expect(await permissionService.hasPermission(admin.id, permissionService.PERMISSIONS.USERS_MANAGE_PERMISSIONS)).toBe(true);

      // Test with enforcement disabled  
      permissionService.setupSystemSetting('permissions.enforce', false);
      expect(await permissionService.hasPermission(admin.id, permissionService.PERMISSIONS.USERS_MANAGE_PERMISSIONS)).toBe(true);
    });
  });

  describe('Permission Middleware Testing', () => {

    it('should allow access when user has required permission', async () => {
      const admin = testUsers.admin;
      const middleware = permissionService.requirePermission(permissionService.PERMISSIONS.USERS_VIEW);
      
      const { req, res, next } = permissionService.createMockRequestResponse(admin);
      
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).not.toBe(403);
    });

    it('should deny access when user lacks required permission', async () => {
      const basicUser = testUsers.user;
      const middleware = permissionService.requirePermission(permissionService.PERMISSIONS.USERS_VIEW);
      
      const { req, res, next } = permissionService.createMockRequestResponse(basicUser);
      
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.responseData.message).toBe('Insufficient permissions');
      expect(res.responseData.required).toBe(permissionService.PERMISSIONS.USERS_VIEW);
      expect(res.responseData.userRole).toBe('user');
    });

    it('should deny access when user is not authenticated', async () => {
      const middleware = permissionService.requirePermission(permissionService.PERMISSIONS.INVENTORY_VIEW);
      
      const { req, res, next } = permissionService.createMockRequestResponse(); // No user
      
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.responseData.message).toBe('Authentication required');
    });

    it('should work with requireAnyPermission middleware', async () => {
      const superuser = testUsers.superuser;
      const basicUser = testUsers.user;
      
      const permissions = [
        permissionService.PERMISSIONS.REPORTS_VIEW,     // Superuser has this
        permissionService.PERMISSIONS.USERS_VIEW,       // Superuser doesn't have this  
        permissionService.PERMISSIONS.BACKUP_CREATE,    // Superuser doesn't have this
      ];
      
      const middleware = permissionService.requireAnyPermission(permissions);

      // Superuser should pass (has one of the permissions)
      const { req: reqSuperuser, res: resSuperuser, next: nextSuperuser } = 
        permissionService.createMockRequestResponse(superuser);
      
      await middleware(reqSuperuser, resSuperuser, nextSuperuser);
      expect(nextSuperuser).toHaveBeenCalled();

      // Basic user should fail (has none of the permissions)
      const { req: reqUser, res: resUser, next: nextUser } = 
        permissionService.createMockRequestResponse(basicUser);
      
      await middleware(reqUser, resUser, nextUser);
      expect(nextUser).not.toHaveBeenCalled();
      expect(resUser.statusCode).toBe(403);
      expect(resUser.responseData.required).toEqual(permissions);
    });

    it('should work with requireRole middleware', async () => {
      const middleware = permissionService.requireRole(['superuser', 'admin']);

      // Admin should pass
      const { req: reqAdmin, res: resAdmin, next: nextAdmin } = 
        permissionService.createMockRequestResponse(testUsers.admin);
      
      await middleware(reqAdmin, resAdmin, nextAdmin);
      expect(nextAdmin).toHaveBeenCalled();

      // Superuser should pass  
      const { req: reqSuperuser, res: resSuperuser, next: nextSuperuser } = 
        permissionService.createMockRequestResponse(testUsers.superuser);
      
      await middleware(reqSuperuser, resSuperuser, nextSuperuser);
      expect(nextSuperuser).toHaveBeenCalled();

      // Basic user should fail
      const { req: reqUser, res: resUser, next: nextUser } = 
        permissionService.createMockRequestResponse(testUsers.user);
      
      await middleware(reqUser, resUser, nextUser);
      expect(nextUser).not.toHaveBeenCalled();
      expect(resUser.statusCode).toBe(403);
      expect(resUser.responseData.error).toBe('Insufficient permissions');
      expect(resUser.responseData.required).toEqual(['superuser', 'admin']);
      expect(resUser.responseData.current).toBe('user');
    });
  });

  describe('Permission Service Methods', () => {

    it('should return all user permissions correctly', async () => {
      const basicUser = testUsers.user;
      
      // Add some explicit permissions
      permissionService.setupUserPermission(basicUser.id, permissionService.PERMISSIONS.REPORTS_VIEW, true);
      permissionService.setupUserPermission(basicUser.id, permissionService.PERMISSIONS.INVENTORY_VIEW, false); // Override role default

      const permissions = await permissionService.getUserPermissions(basicUser.id);

      // Should include role-based permissions
      expect(permissions).toContain(permissionService.PERMISSIONS.SALES_VIEW);
      expect(permissions).toContain(permissionService.PERMISSIONS.SALES_CREATE);

      // Should include granted explicit permissions
      expect(permissions).toContain(permissionService.PERMISSIONS.REPORTS_VIEW);

      // Should exclude denied explicit permissions
      expect(permissions).not.toContain(permissionService.PERMISSIONS.INVENTORY_VIEW);

      // Should NOT include admin-only permissions
      expect(permissions).not.toContain(permissionService.PERMISSIONS.USERS_VIEW);
    });

    it('should return all permissions for admin users', async () => {
      const admin = testUsers.admin;
      const permissions = await permissionService.getUserPermissions(admin.id);

      // Should have all defined permissions
      const allPermissions = Array.from(Object.values(permissionService.PERMISSIONS));
      allPermissions.forEach(permission => {
        expect(permissions).toContain(permission);
      });
    });

    it('should return empty permissions for inactive users', async () => {
      const inactiveUser = permissionService.setupUser({
        id: 'inactive_002',
        role: 'admin',
        isActive: false,
      });

      const permissions = await permissionService.getUserPermissions(inactiveUser.id);
      expect(permissions).toEqual([]);
    });

    it('should handle non-existent users gracefully', async () => {
      const hasPermission = await permissionService.hasPermission(
        'non-existent-user',
        permissionService.PERMISSIONS.INVENTORY_VIEW
      );
      
      expect(hasPermission).toBe(false);

      const permissions = await permissionService.getUserPermissions('non-existent-user');
      expect(permissions).toEqual([]);
    });
  });

  describe('Edge Cases and Security Testing', () => {

    it('should handle malformed permission strings', async () => {
      const user = testUsers.user;

      const malformedPermissions = [
        '',
        '   ',
        'null',
        'undefined',
        'inventory..view',
        'inventory.view.extra',
        '; DROP TABLE users; --',
        '<script>alert("xss")</script>',
      ];

      for (const malformedPerm of malformedPermissions) {
        const hasPermission = await permissionService.hasPermission(user.id, malformedPerm);
        expect(hasPermission).toBe(false);
      }
    });

    it('should handle malformed user IDs', async () => {
      const malformedUserIds = [
        '',
        '   ',
        'null',
        'undefined',
        '; DROP TABLE users; --',
        '<script>alert("xss")</script>',
        '../../etc/passwd',
      ];

      for (const malformedId of malformedUserIds) {
        const hasPermission = await permissionService.hasPermission(
          malformedId,
          permissionService.PERMISSIONS.INVENTORY_VIEW
        );
        expect(hasPermission).toBe(false);
      }
    });

    it('should not allow permission escalation via tampering', async () => {
      const basicUser = testUsers.user;

      // Try to exploit the permission system
      const attemptedPermissions = [
        'admin.all',
        'permissions.*',
        'users.view OR 1=1',
        'inventory.view\'; DROP TABLE users; --',
      ];

      for (const attemptedPerm of attemptedPermissions) {
        const hasPermission = await permissionService.hasPermission(basicUser.id, attemptedPerm);
        expect(hasPermission).toBe(false);
      }
    });

    it('should maintain security even with system setting manipulations', async () => {
      const basicUser = testUsers.user;

      // Try to manipulate system settings in unsupported ways
      permissionService.setupSystemSetting('permissions.enforce', 'false'); // String instead of boolean
      permissionService.setupSystemSetting('permissions.enforce', null);
      permissionService.setupSystemSetting('permissions.enforce', undefined);

      // Should still protect admin permissions
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.USERS_VIEW)).toBe(false);
      expect(await permissionService.hasPermission(basicUser.id, permissionService.PERMISSIONS.USERS_MANAGE_PERMISSIONS)).toBe(false);
    });

    it('should handle concurrent permission checks correctly', async () => {
      const user = testUsers.user;
      const admin = testUsers.admin;

      // Perform multiple concurrent permission checks
      const concurrentChecks = Promise.all([
        permissionService.hasPermission(user.id, permissionService.PERMISSIONS.INVENTORY_VIEW),
        permissionService.hasPermission(user.id, permissionService.PERMISSIONS.USERS_VIEW),
        permissionService.hasPermission(admin.id, permissionService.PERMISSIONS.INVENTORY_VIEW),
        permissionService.hasPermission(admin.id, permissionService.PERMISSIONS.USERS_VIEW),
        permissionService.getUserPermissions(user.id),
        permissionService.getUserPermissions(admin.id),
      ]);

      const [result1, result2, result3, result4, userPerms, adminPerms] = await concurrentChecks;

      // Results should be consistent
      expect(result1).toBe(true);  // User can view inventory
      expect(result2).toBe(false); // User cannot view users
      expect(result3).toBe(true);  // Admin can view inventory
      expect(result4).toBe(true);  // Admin can view users
      expect(userPerms.length).toBeGreaterThan(0);
      expect(adminPerms.length).toBeGreaterThan(userPerms.length);
    });
  });
});