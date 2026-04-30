/**
 * Role Utilities
 *
 * Provides user-friendly display names for user roles and helper functions
 */
/**
 * Map database role values to user-friendly display names
 */
export const ROLE_DISPLAY_NAMES = {
    user: 'User',
    superuser: 'Manager',
    admin: 'System Admin',
};
/**
 * Detailed role information for dropdowns and displays
 */
export const ROLE_INFO = {
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
export function getRoleDisplayName(role) {
    return ROLE_DISPLAY_NAMES[role] || role;
}
/**
 * Get role information for display
 */
export function getRoleInfo(role) {
    return ROLE_INFO[role] || {
        value: role,
        label: role,
        description: 'Unknown role',
        color: 'bg-gray-100 text-gray-800',
    };
}
/**
 * Get all available roles for selection
 */
export function getAvailableRoles() {
    return Object.values(ROLE_INFO);
}
/**
 * Check if a role has specific permissions
 */
export function hasPermissionLevel(userRole, requiredLevel) {
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
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = levelRequirement[requiredLevel] || 99;
    return userLevel >= requiredRoleLevel;
}
/**
 * Role badge component helper
 */
export function getRoleBadgeClass(role) {
    const info = getRoleInfo(role);
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.color}`;
}
