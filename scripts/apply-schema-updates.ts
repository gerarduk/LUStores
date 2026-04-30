import { db } from '../server/dbConfig';
import { sql } from 'drizzle-orm';

/**
 * Apply schema updates for existing databases
 * This script is idempotent - safe to run multiple times
 */
async function applySchemaUpdates() {
  try {
    console.log('🔄 Applying schema updates to database...\n');

    // 1. Add on-hold columns to chargecodes
    console.log('📋 Adding charge code hold status columns...');
    await db.execute(sql`
      ALTER TABLE chargecodes
      ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await db.execute(sql`
      ALTER TABLE chargecodes
      ADD COLUMN IF NOT EXISTS hold_reason TEXT
    `);
    await db.execute(sql`
      ALTER TABLE chargecodes
      ADD COLUMN IF NOT EXISTS held_at TIMESTAMP
    `);
    await db.execute(sql`
      ALTER TABLE chargecodes
      ADD COLUMN IF NOT EXISTS held_by VARCHAR REFERENCES users(id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_chargecodes_on_hold ON chargecodes(on_hold)
    `);
    console.log('  ✅ Charge code hold status columns added\n');

    // 2. Add account_number to suppliers
    console.log('📋 Adding supplier account number column...');
    await db.execute(sql`
      ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(25)
    `);
    console.log('  ✅ Supplier account number column added\n');

    // 3. Create charge_code_authorized_users table
    console.log('📋 Creating charge code authorized users table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS charge_code_authorized_users (
        id SERIAL PRIMARY KEY,
        charge_code VARCHAR NOT NULL REFERENCES chargecodes(code) ON DELETE CASCADE,
        user_name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        department VARCHAR(200),
        notes TEXT,
        created_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_charge_code_authorized_users_charge_code
      ON charge_code_authorized_users(charge_code)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_charge_code_authorized_users_user_name
      ON charge_code_authorized_users(user_name)
    `);
    console.log('  ✅ Charge code authorized users table created\n');

    console.log('✅ All schema updates applied successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('   ✓ Charge code on-hold status (on_hold, hold_reason, held_at, held_by)');
    console.log('   ✓ Supplier account numbers (account_number)');
    console.log('   ✓ Charge code authorized users table (charge_code_authorized_users)');
    console.log('\n🎉 Your database is now up to date!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to apply schema updates:', error);
    console.error('\nIf you see "already exists" errors, the schema may already be up to date.');
    process.exit(1);
  }
}

applySchemaUpdates();
