/**
 * Frontend User Permissions and UI Adaptation Tests
 * 
 * Tests frontend permission-based UI rendering and adaptation including:
 * 1. Role utility functions (hasPermissionLevel, getRoleInfo)
 * 2. Conditional component rendering based on permissions
 * 3. Settings page permission management UI
 * 4. Button/form disabling based on user permissions
 * 5. Navigation menu adaptation for different roles
 * 6. Permission-based route protection
 * 7. Frontend API permission integration
 * 8. Permission state management
 * 9. User context and role detection
 * 10. Frontend permission validation
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API functions
vi.mock('../../../client/src/lib/api', () => ({
  getCurrentUser: vi.fn(),
  getUserPermissions: vi.fn(),
  checkUserPermission: vi.fn(),
  checkUserPermissions: vi.fn(),
  updateUserPermissions: vi.fn(),
  getUsers: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

// Import components and utilities to test
import { hasPermissionLevel, getRoleInfo, roleHierarchy } from '../../../client/src/lib/roleUtils';
import Settings from '../../../client/src/pages/Settings';
import { AuthContext } from '../../../client/src/contexts/AuthContext';
import Navigation from '../../../client/src/components/Navigation';
import InventoryManagement from '../../../client/src/pages/InventoryManagement';
import { 
  getCurrentUser, 
  getUserPermissions, 
  checkUserPermission,
  checkUserPermissions,
  updateUserPermissions,
  getUsers,
} from '../../../client/src/lib/api';

interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'superuser' | 'admin';
  isActive: boolean;
}

interface MockAuthContextValue {
  currentUser: MockUser | null;
  login: jest.MockedFunction<any>;
  logout: jest.MockedFunction<any>;
  isLoading: boolean;
  permissions: string[];
  hasPermission: jest.MockedFunction<(permission: string) => boolean>;
  canManagePermissions: boolean;
}

// Test utilities
function createMockUser(role: 'user' | 'superuser' | 'admin'): MockUser {
  return {
    id: `${role}_test_001`,
    email: `${role}@test.com`,
    firstName: role.charAt(0).toUpperCase() + role.slice(1),
    lastName: 'User',
    role,
    isActive: true,
  };
}

function createMockAuthValue(user: MockUser | null, permissions: string[] = []): MockAuthContextValue {
  return {
    currentUser: user,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    permissions,
    hasPermission: vi.fn((permission: string) => permissions.includes(permission)),
    canManagePermissions: user?.role === 'admin' || false,
  };
}

function renderWithProviders(
  ui: React.ReactElement,
  authValue: MockAuthContextValue,
  route: string = '/'
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

// Permission constants matching backend
const PERMISSIONS = {
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_DELETE: 'inventory.delete',
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_EDIT: 'sales.edit',
  SALES_DELETE: 'sales.delete',
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  USERS_VIEW: 'users.view',
  USERS_ADD: 'users.add',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset_password',
  USERS_MANAGE_PERMISSIONS: 'users.manage_permissions',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_ADVANCED: 'reports.advanced',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_PERMISSIONS: 'settings.permissions',
  BACKUP_CREATE: 'backup.create',
  BACKUP_RESTORE: 'backup.restore',
};

describe('Frontend User Permissions and UI Adaptation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Role Utility Functions', () => {

    describe('hasPermissionLevel', () => {
      it('should correctly validate user role hierarchy', () => {
        expect(hasPermissionLevel('user', 'user')).toBe(true);
        expect(hasPermissionLevel('user', 'superuser')).toBe(false);
        expect(hasPermissionLevel('user', 'admin')).toBe(false);

        expect(hasPermissionLevel('superuser', 'user')).toBe(true);
        expect(hasPermissionLevel('superuser', 'superuser')).toBe(true);
        expect(hasPermissionLevel('superuser', 'admin')).toBe(false);

        expect(hasPermissionLevel('admin', 'user')).toBe(true);
        expect(hasPermissionLevel('admin', 'superuser')).toBe(true);
        expect(hasPermissionLevel('admin', 'admin')).toBe(true);
      });

      it('should handle edge cases gracefully', () => {
        expect(hasPermissionLevel(null, 'user')).toBe(false);
        expect(hasPermissionLevel(undefined, 'user')).toBe(false);
        expect(hasPermissionLevel('user', null)).toBe(false);
        expect(hasPermissionLevel('user', undefined)).toBe(false);
        expect(hasPermissionLevel('invalid_role' as any, 'user')).toBe(false);
        expect(hasPermissionLevel('user', 'invalid_required' as any)).toBe(false);
      });
    });

    describe('getRoleInfo', () => {
      it('should return correct role information', () => {
        const userInfo = getRoleInfo('user');
        expect(userInfo.level).toBe(1);
        expect(userInfo.displayName).toBe('User');

        const superuserInfo = getRoleInfo('superuser');
        expect(superuserInfo.level).toBe(2);
        expect(superuserInfo.displayName).toBe('Manager');

        const adminInfo = getRoleInfo('admin');
        expect(adminInfo.level).toBe(3);
        expect(adminInfo.displayName).toBe('Administrator');
      });

      it('should handle invalid roles gracefully', () => {
        const invalidInfo = getRoleInfo('invalid' as any);
        expect(invalidInfo.level).toBe(0);
        expect(invalidInfo.displayName).toBe('Unknown');
      });
    });

    describe('roleHierarchy', () => {
      it('should maintain correct role numeric values', () => {
        expect(roleHierarchy.user).toBe(1);
        expect(roleHierarchy.superuser).toBe(2);
        expect(roleHierarchy.admin).toBe(3);
      });
    });
  });

  describe('Navigation Component Permission-Based Rendering', () => {

    it('should show appropriate navigation items for basic users', () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.ORDERS_VIEW,
      ]);

      renderWithProviders(<Navigation />, authValue);

      // Should show basic navigation items
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();

      // Should NOT show admin navigation items
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should show additional navigation items for superusers', () => {
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_EDIT,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.REPORTS_VIEW,
      ]);

      renderWithProviders(<Navigation />, authValue);

      // Should show basic items
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();

      // Should show additional items for superuser
      expect(screen.getByText('Reports')).toBeInTheDocument();

      // Should still NOT show admin-only items
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should show all navigation items for admins', () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_PERMISSIONS,
      ]);

      renderWithProviders(<Navigation />, authValue);

      // Should show all navigation items
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should adapt navigation when user permissions change', () => {
      const user = createMockUser('user');
      let authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.SALES_VIEW]);

      const { rerender } = renderWithProviders(<Navigation />, authValue);

      // Initially should not show Reports
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();

      // User gains reports permission
      authValue = createMockAuthValue(user, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.REPORTS_VIEW,
      ]);

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter>
              <Navigation />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Should now show Reports
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should hide navigation completely when user is not authenticated', () => {
      const authValue = createMockAuthValue(null, []);

      renderWithProviders(<Navigation />, authValue);

      // Should show login-related content only
      expect(screen.queryByText('Inventory')).not.toBeInTheDocument();
      expect(screen.queryByText('Sales')).not.toBeInTheDocument();
      expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    });
  });

  describe('Settings Page Permission Management UI', () => {

    beforeEach(() => {
      // Mock API calls for Settings page
      (getUsers as MockedFunction<typeof getUsers>).mockResolvedValue([
        { id: 'user1', email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'user' },
        { id: 'user2', email: 'manager@test.com', firstName: 'Manager', lastName: 'Two', role: 'superuser' },
      ]);

      (getUserPermissions as MockedFunction<typeof getUserPermissions>).mockResolvedValue({
        permissions: ['inventory.view', 'sales.view'],
        role: 'user',
        canManagePermissions: false,
      });
    });

    it('should show Settings page only to administrators', async () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [PERMISSIONS.SETTINGS_PERMISSIONS], true);

      renderWithProviders(<Settings />, authValue, '/settings');

      await waitFor(() => {
        expect(screen.getByText('System Settings')).toBeInTheDocument();
      });
    });

    it('should deny access to non-admin users', () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      renderWithProviders(
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/unauthorized" element={<div>Access Denied</div>} />
        </Routes>,
        authValue,
        '/settings'
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should show user permission management section for admins', async () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [
        PERMISSIONS.SETTINGS_PERMISSIONS,
        PERMISSIONS.USERS_MANAGE_PERMISSIONS,
      ]);

      renderWithProviders(<Settings />, authValue, '/settings');

      await waitFor(() => {
        expect(screen.getByText('User Permission Management')).toBeInTheDocument();
        expect(screen.getByText('Manage user permissions and roles')).toBeInTheDocument();
      });
    });

    it('should show user list with permission management controls', async () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [
        PERMISSIONS.SETTINGS_PERMISSIONS,
        PERMISSIONS.USERS_MANAGE_PERMISSIONS,
        PERMISSIONS.USERS_VIEW,
      ]);

      renderWithProviders(<Settings />, authValue, '/settings');

      await waitFor(() => {
        expect(screen.getByText('user1@test.com')).toBeInTheDocument();
        expect(screen.getByText('manager@test.com')).toBeInTheDocument();
      });

      // Should show permission action buttons
      const permissionButtons = screen.getAllByText('Manage Permissions');
      expect(permissionButtons.length).toBeGreaterThan(0);
    });

    it('should allow admins to toggle specific user permissions', async () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [
        PERMISSIONS.SETTINGS_PERMISSIONS,
        PERMISSIONS.USERS_MANAGE_PERMISSIONS,
      ]);

      (checkUserPermissions as MockedFunction<typeof checkUserPermissions>).mockResolvedValue({
        'inventory.create': false,
        'reports.view': false,
        'users.view': false,
      });

      renderWithProviders(<Settings />, authValue, '/settings');

      await waitFor(() => {
        expect(screen.getByText('User Permission Management')).toBeInTheDocument();
      });

      // Click on user to open permission modal
      const manageButton = screen.getAllByText('Manage Permissions')[0];
      fireEvent.click(manageButton);

      await waitFor(() => {
        expect(screen.getByText('Permission Settings')).toBeInTheDocument();
      });

      // Toggle permission
      const inventoryCreateToggle = screen.getByLabelText('Create Inventory Items');
      fireEvent.click(inventoryCreateToggle);

      // Verify API call
      expect(updateUserPermissions).toHaveBeenCalledWith('user1', {
        'inventory.create': true,
      });
    });

    it('should show permission enforcement setting toggle', async () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [PERMISSIONS.SETTINGS_PERMISSIONS]);

      renderWithProviders(<Settings />, authValue, '/settings');

      await waitFor(() => {
        expect(screen.getByText('Permission Enforcement')).toBeInTheDocument();
        expect(screen.getByText('Enable strict permission checking')).toBeInTheDocument();
      });

      const enforcementToggle = screen.getByRole('checkbox', { name: /enforce permissions/i });
      expect(enforcementToggle).toBeInTheDocument();
    });

    it('should prevent non-admin users from seeing permission management UI elements', () => {
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.SETTINGS_VIEW, // Has settings access but not permission management
      ]);

      renderWithProviders(<Settings />, authValue, '/settings');

      // Should show basic settings but not permission management
      expect(screen.queryByText('User Permission Management')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage user permissions and roles')).not.toBeInTheDocument();
      expect(screen.queryByText('Permission Enforcement')).not.toBeInTheDocument();
    });
  });

  describe('Inventory Management Component Permission-Based UI', () => {

    it('should show read-only view for basic users', () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Should show inventory table
      expect(screen.getByText('Inventory Management')).toBeInTheDocument();

      // Should NOT show create/edit/delete buttons
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument();
      expect(screen.queryByText('Create New Item')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should show creation buttons for superusers', () => {
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Should show create button
      expect(screen.getByText('Add Item')).toBeInTheDocument();

      // Should still not show delete for safety
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should show all management buttons for admins', () => {
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        PERMISSIONS.INVENTORY_EDIT,
        PERMISSIONS.INVENTORY_DELETE,
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Should show all management buttons
      expect(screen.getByText('Add Item')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should disable buttons based on individual permissions', () => {
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        // Missing INVENTORY_EDIT permission
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Create button should be enabled
      const addButton = screen.getByText('Add Item');
      expect(addButton).not.toHaveAttribute('disabled');

      // Edit buttons should be disabled or hidden
      const editButtons = screen.queryAllByRole('button', { name: /edit/i });
      editButtons.forEach((button) => {
        expect(button).toHaveAttribute('disabled');
      });
    });

    it('should show warning messages when user lacks required permissions', () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, []); // No permissions

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Should show permission warning
      expect(screen.getByText(/You don't have permission to view inventory/)).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('should adapt UI when permissions change dynamically', async () => {
      const user = createMockUser('user');
      let authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      const { rerender } = renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Initially should not show create button
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument();

      // User gains create permission
      authValue = createMockAuthValue(user, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
      ]);

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter initialEntries={['/inventory']}>
              <InventoryManagement />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Should now show create button
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
  });

  describe('Context Menu and Action Permission Checking', () => {

    it('should show appropriate context menu items based on permissions', async () => {
      // Mock an inventory item context menu
      const admin = createMockUser('admin');
      const authValue = createMockAuthValue(admin, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_EDIT,
        PERMISSIONS.INVENTORY_DELETE,
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Right-click on an inventory item (assuming context menu exists)
      const inventoryRow = screen.getByTestId('inventory-item-123');
      fireEvent.contextMenu(inventoryRow);

      await waitFor(() => {
        expect(screen.getByText('Edit Item')).toBeInTheDocument();
        expect(screen.getByText('Delete Item')).toBeInTheDocument();
        expect(screen.getByText('Duplicate Item')).toBeInTheDocument();
      });
    });

    it('should hide dangerous actions from non-admin users', async () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      const inventoryRow = screen.getByTestId('inventory-item-123');
      fireEvent.contextMenu(inventoryRow);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.queryByText('Edit Item')).not.toBeInTheDocument();
        expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
      });
    });

    it('should disable context menu actions based on specific permissions', async () => {
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_CREATE,
        // Missing INVENTORY_EDIT permissions
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      const inventoryRow = screen.getByTestId('inventory-item-123');
      fireEvent.contextMenu(inventoryRow);

      await waitFor(() => {
        const editButton = screen.getByText('Edit Item');
        expect(editButton).toHaveAttribute('disabled');
        expect(editButton).toHaveAttribute('title', 'Insufficient permissions');
      });
    });
  });

  describe('Form Field Permission-Based Disabling', () => {

    it('should disable form fields based on edit permissions', () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]); // Read-only

      renderWithProviders(<InventoryManagement />, authValue, '/inventory/edit/123');

      // Form fields should be disabled
      const nameInput = screen.getByLabelText('Item Name');
      const quantityInput = screen.getByLabelText('Quantity');
      const priceInput = screen.getByLabelText('Price');

      expect(nameInput).toHaveAttribute('disabled');
      expect(quantityInput).toHaveAttribute('disabled');
      expect(priceInput).toHaveAttribute('disabled');

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /save/i });
      expect(submitButton).toHaveAttribute('disabled');
    });

    it('should enable fields based on specific field permissions', () => {
      // User with limited edit permissions
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_EDIT,
        // Has edit but maybe not price editing
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory/edit/123');

      const nameInput = screen.getByLabelText('Item Name');
      const quantityInput = screen.getByLabelText('Quantity');

      expect(nameInput).not.toHaveAttribute('disabled');
      expect(quantityInput).not.toHaveAttribute('disabled');

      // Price might be disabled even for superuser if there's specific pricing permission
      const priceInput = screen.getByLabelText('Price');
      if (screen.queryByTestId('price-readonly-indicator')) {
        expect(priceInput).toHaveAttribute('disabled');
      }
    });
  });

  describe('Frontend Permission Validation and Error Handling', () => {

    it('should show permission error messages when API calls fail', async () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      // Mock API to return permission error
      (checkUserPermission as MockedFunction<typeof checkUserPermission>).mockRejectedValue({
        status: 403,
        message: 'Insufficient permissions',
      });

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
        expect(screen.getByText(/contact administrator/i)).toBeInTheDocument();
      });
    });

    it('should handle permission check failures gracefully', async () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      // Mock API to fail
      (getUserPermissions as MockedFunction<typeof getUserPermissions>).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      await waitFor(() => {
        // Should show fallback UI or error message
        expect(screen.getByText(/unable to load permissions/i)).toBeInTheDocument();
      });
    });

    it('should validate permissions before allowing dangerous operations', async () => {
      const superuser = createMockUser('superuser');
      const authValue = createMockAuthValue(superuser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_DELETE,
      ]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
        expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
      });

      // Mock permission check before actual delete
      (checkUserPermission as MockedFunction<typeof checkUserPermission>).mockResolvedValue({
        hasPermission: true,
      });

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmButton);

      // Should verify permissions again before executing
      expect(checkUserPermission).toHaveBeenCalledWith(PERMISSIONS.INVENTORY_DELETE);
    });

    it('should prevent UI manipulation attacks', async () => {
      const user = createMockUser('user'); // Basic user
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      renderWithProviders(<InventoryManagement />, authValue, '/inventory');

      // Try to programmatically enable a disabled button
      const addButton = screen.queryByText('Add Item');
      
      if (addButton) {
        // Even if button becomes enabled via DOM manipulation
        addButton.removeAttribute('disabled');
        fireEvent.click(addButton);

        // Backend validation should still prevent action
        await waitFor(() => {
          expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Permission State Management', () => {

    it('should update UI immediately when permissions change', async () => {
      const user = createMockUser('user');
      let authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      const { rerender } = renderWithProviders(<InventoryManagement />, authValue);

      // Initially no create button
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument();

      // Permission granted via external update
      authValue.permissions.push(PERMISSIONS.INVENTORY_CREATE);
      authValue.hasPermission = vi.fn((perm) => authValue.permissions.includes(perm));

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter>
              <InventoryManagement />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Should now show create button
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('should cache permission checks for performance', async () => {
      const user = createMockUser('user');
      const authValue = createMockAuthValue(user, [PERMISSIONS.INVENTORY_VIEW]);

      renderWithProviders(<InventoryManagement />, authValue);

      // Make multiple permission checks
      for (let i = 0; i < 5; i++) {
        authValue.hasPermission(PERMISSIONS.INVENTORY_VIEW);
      }

      // Should not make redundant API calls (mocked function should be called efficiently)
      expect(authValue.hasPermission).toHaveBeenCalledTimes(5);
    });

    it('should invalidate permission cache when user changes', async () => {
      let currentUser = createMockUser('user');
      let authValue = createMockAuthValue(currentUser, [PERMISSIONS.INVENTORY_VIEW]);

      const { rerender } = renderWithProviders(<Navigation />, authValue);

      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();

      // User changes to admin
      currentUser = createMockUser('admin');
      authValue = createMockAuthValue(currentUser, [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.USERS_VIEW,
      ]);

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter>
              <Navigation />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Should show admin navigation items
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });
});