/**
 * Role Utilities
 *
 * Provides user-friendly display names for user roles and helper functions
 */

export type UserRole = 'user' | 'superuser' | 'admin';

export interface RoleDisplayInfo {
  value: UserRole;
  label: string;
  description: string;
  color: string;
}

/**
 * Map database role values to user-friendly display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  user: 'User',
  superuser: 'Manager',
  admin: 'System Admin',
};

/**
 * Detailed role information for dropdowns and displays
 */
export const ROLE_INFO: Record<UserRole, RoleDisplayInfo> = {
  user: {
    value: 'user',
    label: 'User',
    description: 'Basic user - can create sales with assigned charge codes',
    color: 'bg-blue-100 text-blue-800',
  },
  superuser: {
    value: 'superuser',
    label: 'Manager',
    description: 'Manager - full operations access except user management',
    color: 'bg-purple-100 text-purple-800',
  },
  admin: {
    value: 'admin',
    label: 'System Admin',
    description: 'Administrator - full system access and user management',
    color: 'bg-red-100 text-red-800',
  },
};

/**
 * Get user-friendly display name for a role
 */
export function getRoleDisplayName(role: UserRole | string): string {
  return ROLE_DISPLAY_NAMES[role as UserRole] || role;
}

/**
 * Get role information for display
 */
export function getRoleInfo(role: UserRole | string): RoleDisplayInfo {
  return ROLE_INFO[role as UserRole] || {
    value: role as UserRole,
    label: role,
    description: 'Unknown role',
    color: 'bg-gray-100 text-gray-800',
  };
}

/**
 * Get all available roles for selection
 */
export function getAvailableRoles(): RoleDisplayInfo[] {
  return Object.values(ROLE_INFO);
}

/**
 * Check if a role has specific permissions
 */
export function hasPermissionLevel(
  userRole: UserRole | string,
  requiredLevel: 'user' | 'manager' | 'admin'
): boolean {
  const roleHierarchy = {
    user: 1,
    superuser: 2,
    admin: 3,
  };

  const levelRequirement = {
    user: 1,
    manager: 2,
    admin: 3,
  };

  const userLevel = roleHierarchy[userRole as UserRole] || 0;
  const requiredRoleLevel = levelRequirement[requiredLevel] || 99;

  return userLevel >= requiredRoleLevel;
}

/**
 * Role badge component helper
 */
export function getRoleBadgeClass(role: UserRole | string): string {
  const info = getRoleInfo(role);
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.color}`;
}
