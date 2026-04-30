/**
 * Permission Seeding Script
 *
 * Run this once to populate the permission_definitions table
 * with all default permissions.
 *
 * Usage: npx tsx scripts/seed-permissions.ts
 */

import { db } from '../server/dbConfig';
import { permissionDefinitions } from '../shared/schema';

const permissions = [
  // Inventory Permissions
  {
    name: 'inventory.view',
    description: 'View inventory items',
    category: 'Inventory',
    defaultRoles: ['user', 'superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'inventory.add',
    description: 'Add new inventory items',
    category: 'Inventory',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'inventory.edit',
    description: 'Edit inventory items',
    category: 'Inventory',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'inventory.delete',
    description: 'Delete inventory items',
    category: 'Inventory',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'inventory.stock.add',
    description: 'Add stock to items',
    category: 'Inventory',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'inventory.stock.remove',
    description: 'Remove stock from items',
    category: 'Inventory',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'inventory.stock.adjust',
    description: 'Adjust stock levels',
    category: 'Inventory',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },

  // Sales Permissions
  {
    name: 'sales.view',
    description: 'View sales records',
    category: 'Sales',
    defaultRoles: ['user', 'superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'sales.create',
    description: 'Create new sales',
    category: 'Sales',
    defaultRoles: ['user', 'superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'sales.process',
    description: 'Process quotes into sales',
    category: 'Sales',
    defaultRoles: ['user', 'superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'sales.refund',
    description: 'Process refunds',
    category: 'Sales',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },

  // Orders Permissions (Managers and admins only)
  {
    name: 'orders.view',
    description: 'View purchase orders',
    category: 'Orders',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'orders.create',
    description: 'Create purchase orders',
    category: 'Orders',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'orders.receive',
    description: 'Receive orders into inventory',
    category: 'Orders',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'orders.cancel',
    description: 'Cancel orders',
    category: 'Orders',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },

  // Reports Permissions (Managers and admins only)
  {
    name: 'reports.view',
    description: 'View reports and analytics',
    category: 'Reports',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'reports.export',
    description: 'Export report data',
    category: 'Reports',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'reports.advanced',
    description: 'Access advanced analytics',
    category: 'Reports',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },

  // Suppliers Permissions
  {
    name: 'suppliers.view',
    description: 'View suppliers',
    category: 'Suppliers',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'suppliers.add',
    description: 'Add new suppliers',
    category: 'Suppliers',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'suppliers.edit',
    description: 'Edit suppliers',
    category: 'Suppliers',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'suppliers.delete',
    description: 'Delete suppliers',
    category: 'Suppliers',
    defaultRoles: ['superuser', 'admin'],
    isSystem: true,
  },

  // Categories Permissions
  {
    name: 'categories.view',
    description: 'View categories',
    category: 'Categories',
    defaultRoles: ['user', 'superuser', 'admin'],
    isSystem: true,
  },
  {
    name: 'categories.add',
    description: 'Add new categories',
    category: 'Categories',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'categories.edit',
    description: 'Edit categories',
    category: 'Categories',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'categories.delete',
    description: 'Delete categories',
    category: 'Categories',
    defaultRoles: ['admin'],
    isSystem: true,
  },

  // User Management Permissions (Admin only)
  {
    name: 'users.view',
    description: 'View users',
    category: 'User Management',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'users.add',
    description: 'Add new users',
    category: 'User Management',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'users.edit',
    description: 'Edit users',
    category: 'User Management',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'users.delete',
    description: 'Delete users',
    category: 'User Management',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'users.reset_password',
    description: 'Reset user passwords',
    category: 'User Management',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'users.manage_permissions',
    description: 'Manage user permissions and charge code assignments',
    category: 'User Management',
    defaultRoles: ['admin'],
    isSystem: true,
  },

  // Settings Permissions (Admin only)
  {
    name: 'settings.view',
    description: 'View system settings',
    category: 'Settings',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'settings.edit',
    description: 'Edit system settings',
    category: 'Settings',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'settings.permissions',
    description: 'Configure permission system',
    category: 'Settings',
    defaultRoles: ['admin'],
    isSystem: true,
  },

  // Backup Permissions (Admin only)
  {
    name: 'backup.create',
    description: 'Create database backups',
    category: 'Backup',
    defaultRoles: ['admin'],
    isSystem: true,
  },
  {
    name: 'backup.restore',
    description: 'Restore from backups',
    category: 'Backup',
    defaultRoles: ['admin'],
    isSystem: true,
  },
];

async function seedPermissions() {
  console.log('🌱 Seeding default permissions...\n');

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const perm of permissions) {
    try {
      const result = await db
        .insert(permissionDefinitions)
        .values({
          name: perm.name,
          description: perm.description,
          category: perm.category,
          defaultRoles: perm.defaultRoles as any,
          isSystem: perm.isSystem,
        })
        .onConflictDoUpdate({
          target: permissionDefinitions.name,
          set: {
            description: perm.description,
            category: perm.category,
            defaultRoles: perm.defaultRoles as any,
          },
        })
        .returning();

      if (result.length > 0) {
        console.log(`  ✓ ${perm.name} (${perm.category})`);
        inserted++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`  ✗ ${perm.name}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total permissions: ${permissions.length}`);
  console.log(`  Inserted/Updated: ${inserted}`);
  console.log(`  Errors: ${errors}`);

  console.log('\n✅ Permission seeding complete!');
  console.log('\nNext steps:');
  console.log('  1. Enable permission enforcement in Settings UI');
  console.log('  2. Update routes.ts with requirePermission() middleware');
  console.log('  3. Test with different user roles');

  process.exit(0);
}

seedPermissions().catch((error) => {
  console.error('❌ Error seeding permissions:', error);
  process.exit(1);
});
