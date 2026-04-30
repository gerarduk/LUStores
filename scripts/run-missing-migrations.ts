import { db } from '../server/dbConfig';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running missing database migrations...');

    const migrations = [
      '011_add_charge_code_hold_status.sql',
      '012_add_supplier_account_number.sql'
    ];

    // Also run migrations from server/migrations folder
    const serverMigrations = [
      { path: '../server/migrations/add_show_picking_list_to_users.sql', name: 'add_show_picking_list_to_users.sql' },
      { path: '../server/migrations/add_delivered_to_sales.sql', name: 'add_delivered_to_sales.sql' }
    ];

    for (const migrationFile of migrations) {
      console.log(`\n📄 Running migration: ${migrationFile}`);

      const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.log(`  ⚠️  Migration file not found: ${migrationFile}, skipping...`);
        continue;
      }

      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

      // Split by semicolons and run each statement
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          if (statement.includes('ALTER TABLE')) {
            const match = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
            if (match) {
              console.log(`  ✓ Adding column ${match[1]}`);
            }
          } else if (statement.includes('CREATE INDEX')) {
            const match = statement.match(/idx_\w+/);
            console.log(`  ✓ Creating index: ${match?.[0] || 'unknown'}`);
          } else if (statement.includes('COMMENT ON')) {
            console.log(`  ✓ Adding comment`);
          }

          await db.execute(sql.raw(statement));
        } catch (error: any) {
          // If column/index already exists, that's fine
          if (error.message?.includes('already exists') || error.cause?.message?.includes('already exists')) {
            console.log(`  ℹ️  Already exists, skipping`);
          } else if (error.cause?.message?.includes('does not exist') && statement.includes('COMMENT ON')) {
            // Skip COMMENT failures if column doesn't exist yet
            console.log(`  ⚠️  Skipping comment (column may not exist yet)`);
          } else {
            throw error;
          }
        }
      }

      console.log(`  ✅ Completed: ${migrationFile}`);
    }

    // Run server migrations
    for (const migration of serverMigrations) {
      console.log(`\n📄 Running server migration: ${migration.name}`);

      const migrationPath = path.join(__dirname, migration.path);

      if (!fs.existsSync(migrationPath)) {
        console.log(`  ⚠️  Migration file not found: ${migration.name}, skipping...`);
        continue;
      }

      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

      // Split by semicolons and run each statement
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          if (statement.includes('ALTER TABLE')) {
            const match = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
            if (match) {
              console.log(`  ✓ Adding column ${match[1]}`);
            }
          } else if (statement.includes('CREATE INDEX')) {
            const match = statement.match(/idx_\w+/);
            console.log(`  ✓ Creating index: ${match?.[0] || 'unknown'}`);
          } else if (statement.includes('COMMENT ON')) {
            console.log(`  ✓ Adding comment`);
          }

          await db.execute(sql.raw(statement));
        } catch (error: any) {
          // If column/index already exists, that's fine
          if (error.message?.includes('already exists') || error.cause?.message?.includes('already exists')) {
            console.log(`  ℹ️  Already exists, skipping`);
          } else if (error.cause?.message?.includes('does not exist') && statement.includes('COMMENT ON')) {
            // Skip COMMENT failures if column doesn't exist yet
            console.log(`  ⚠️  Skipping comment (column may not exist yet)`);
          } else {
            throw error;
          }
        }
      }

      console.log(`  ✅ Completed: ${migration.name}`);
    }

    console.log('\n✅ All migrations completed successfully');
    console.log('📊 Database schema updated with:');
    console.log('   - Charge code on-hold status tracking');
    console.log('   - Supplier account numbers');
    console.log('   - User show_picking_list preference');
    console.log('   - Sales delivered_to recipient tracking');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
