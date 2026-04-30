import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

async function verifySchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/university_inventory'
  });
  
  const db = drizzle(pool, { schema });
  
  try {
    console.log('🔍 Verifying database schema...');
    
    // Check if all required tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(r => r.table_name);
    console.log('📋 Available tables:', tableNames);
    
    const requiredTables = [
      'users', 'categories', 'items', 'sales', 'sale_items', 
      'chargecodes', 'charge_code_exclusions', 'quotes', 'quote_items',
      'orders', 'order_items', 'suppliers', 'stock_movements'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables);
      process.exit(1);
    }
    
    // Verify items table structure specifically (common failure point)
    const itemsColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'items'
      ORDER BY ordinal_position
    `);
    
    console.log('🔧 Items table structure:');
    itemsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check for the problematic vat_rate column
    const hasVatRate = itemsColumns.rows.some(col => 
      col.column_name === 'vat_rate' || col.column_name === 'vatRate'
    );
    
    if (!hasVatRate) {
      console.error('❌ VAT rate column missing from items table');
      process.exit(1);
    }
    
    // Verify foreign key constraints
    const fkConstraints = await db.execute(sql`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log('🔗 Foreign key constraints:');
    fkConstraints.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    console.log('✅ Schema verification completed successfully');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();
