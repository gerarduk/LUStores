import { db } from './dbConfig';
import { hashPassword } from './localAuth';
import { categories, users, items, suppliers, sources, chargecodes, permissionDefinitions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '@shared/schema';

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
      // Also check error.cause because DrizzleQueryError wraps the real error there
      const causeMsg = (error as any)?.cause?.message ?? '';
      if (error instanceof Error &&
          (error.message.includes('EAI_AGAIN') ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('getaddrinfo') ||
           causeMsg.includes('EAI_AGAIN') ||
           causeMsg.includes('ECONNREFUSED') ||
           causeMsg.includes('getaddrinfo'))) {
        
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
};

// Lightweight schema initialization for test environment
async function initializeLightweightSchema() {
  try {
    console.log('🚀 Initializing minimal schema for testing...');
    
    // Create tables one by one to avoid connection timeouts
    // Users table (minimal, no constraints)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        role VARCHAR DEFAULT 'user',
        is_active BOOLEAN DEFAULT true
      )
    `);
    
    // Categories table (minimal)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR,
        description VARCHAR
      )
    `);
    
    // Notes table (minimal, no foreign key constraints to avoid issues)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        reference_type VARCHAR(50),
        reference_id VARCHAR(100),
        created_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Minimal schema initialized for testing');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize minimal schema:', error);
    throw error;
  }
}

/**
 * Apply essential schema updates that might be missing from existing databases
 */
async function applyEssentialMigrations() {
  try {
    console.log('🔄 Applying essential schema migrations...');
    
    // First, ensure the base schema exists by running Drizzle migrations
    try {
      console.log('📦 Running Drizzle migrations to ensure base schema exists...');
      await retryDatabaseOperation(() => migrate(db, { migrationsFolder: '../migrations' }));
      console.log('✅ Drizzle migrations completed');
    } catch (migrationError: any) {
      console.log('ℹ️  Drizzle migrations skipped (may already be applied):', migrationError.message);
    }
    
    // Add show_picking_list column if it doesn't exist
    try {
      await retryDatabaseOperation(() => db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS show_picking_list BOOLEAN NOT NULL DEFAULT true
      `));
      console.log('✅ show_picking_list column migrated');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error('⚠️  show_picking_list migration error:', error.message);
      } else {
        console.log('ℹ️  show_picking_list column already exists');
      }
    }
    
    // Add delivered_to columns to sales if they don't exist (for "issued to" tracking)
    try {
      await retryDatabaseOperation(() => db.execute(sql`
        ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS delivered_to VARCHAR(200),
        ADD COLUMN IF NOT EXISTS delivered_to_email VARCHAR(200),
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP
      `));
      console.log('✅ Sales table columns migrated');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error('⚠️  Sales table migration error:', error.message);
      } else {
        console.log('ℹ️  Sales table columns already exist');
      }
    }
    
    // Add vendor_sku column to order_items if it doesn't exist
    try {
      await retryDatabaseOperation(() => db.execute(sql`
        ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS vendor_sku VARCHAR(100)
      `));
      // Create index for vendor_sku
      await retryDatabaseOperation(() => db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_order_items_vendor_sku ON order_items(vendor_sku)
      `));
      console.log('✅ vendor_sku column added to order_items table');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error('⚠️  vendor_sku migration error:', error.message);
      } else {
        console.log('ℹ️  vendor_sku column already exists');
      }
    }
    
    console.log('✅ Essential schema migrations completed');
  } catch (error: any) {
    console.error('⚠️  Schema migration error:', error.message);
    // Don't throw - this is non-critical
  }
}

/**
 * Ensure essential system settings exist in the database
 */
async function seedEssentialSettings() {
  try {
    console.log('🔄 Seeding essential system settings...');
    
    const essentialSettings = [
      // Inventory settings
      { key: 'inventory.low_stock_threshold', value: 10, description: 'Default low stock threshold percentage', category: 'inventory', is_system: false },
      // Notification settings
      { key: 'notifications.show_low_stock', value: true, description: 'Show low stock notifications', category: 'notifications', is_system: false },
      { key: 'notifications.email_enabled', value: false, description: 'Enable email notifications', category: 'notifications', is_system: false },
      // Permission settings
      { key: 'permissions.enforce', value: true, description: 'Whether to enforce permission checks', category: 'permissions', is_system: false },
      { key: 'permissions.quote_to_sale_roles', value: ['superuser', 'admin'], description: 'Roles allowed to convert quotes to sales', category: 'permissions', is_system: false },
      { key: 'permissions.manage_categories_roles', value: ['admin'], description: 'Roles allowed to manage categories', category: 'permissions', is_system: false },
      { key: 'permissions.add_vendor_roles', value: ['superuser', 'admin'], description: 'Roles allowed to add vendors', category: 'permissions', is_system: false },
      { key: 'permissions.database_backup_roles', value: ['admin'], description: 'Roles allowed to create database backups', category: 'permissions', is_system: false },
      { key: 'permissions.generate_reports_roles', value: ['superuser', 'admin'], description: 'Roles allowed to generate reports', category: 'permissions', is_system: false },
      // Security settings
      { key: 'security.password_min_length', value: 8, description: 'Minimum password length', category: 'security', is_system: false },
      { key: 'security.session_secure', value: true, description: 'Require secure session cookies', category: 'security', is_system: false },
      { key: 'security.login_attempts_max', value: 5, description: 'Maximum failed login attempts before lockout', category: 'security', is_system: false },
      // Page visibility settings - controls which pages each role can see
      { key: 'pages.visible_to_user', value: ['dashboard','inventory','sales','orders','notes','categories'], description: 'Pages visible to user role', category: 'pages', is_system: false },
      { key: 'pages.visible_to_superuser', value: ['dashboard','inventory','sales','orders','notes','categories','vendors','users','reports','analytics','chargecodes','settings','documentation'], description: 'Pages visible to superuser role', category: 'pages', is_system: false },
      { key: 'pages.visible_to_admin', value: ['dashboard','inventory','sales','orders','notes','categories','vendors','users','reports','analytics','chargecodes','backups','system','settings','documentation'], description: 'Pages visible to admin role', category: 'pages', is_system: false },
    ];
    
    for (const setting of essentialSettings) {
      await retryDatabaseOperation(() => db.execute(sql`
        INSERT INTO system_settings (key, value, description, category, is_system)
        VALUES (${setting.key}, ${JSON.stringify(setting.value)}, ${setting.description}, ${setting.category}, ${setting.is_system})
        ON CONFLICT (key) DO NOTHING
      `));
    }
    
    console.log('✅ Essential system settings seeded');
  } catch (error: any) {
    console.error('⚠️  System settings seeding warning:', error.message);
    // Don't throw - this is non-critical
  }
}

export async function initializeDatabase() {
  // Apply essential migrations to fix schema mismatches
  await applyEssentialMigrations();
  
  // Seed essential system settings if they don't exist
  await seedEssentialSettings();
  
  console.log('⚡ Database initialization complete');
  return true;
}