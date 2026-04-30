import { db } from '../server/dbConfig';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running database migration: add_items_indexes.sql');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_items_indexes.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and run each statement
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.includes('CREATE INDEX')) {
        console.log(`  Creating index: ${statement.match(/idx_\w+/)?.[0] || 'unknown'}`);
      }
      await db.execute(sql.raw(statement));
    }
    
    console.log('✅ Migration completed successfully');
    console.log('📊 Indexes added to items table for improved search performance');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
