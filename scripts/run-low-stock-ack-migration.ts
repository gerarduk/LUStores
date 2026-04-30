import { db } from '../server/dbConfig';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running low stock acknowledged migration...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_low_stock_acknowledged_at.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);
      await db.execute(sql.raw(statement));
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Changes made:');
    console.log('- Added low_stock_acknowledged_at column to items table');
    console.log('- Added index idx_items_low_stock_ack for performance');
    console.log('');
    console.log('Users can now acknowledge low stock notifications in Settings.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
