import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
// Use relative path as fallback if @shared path mapping fails
let schema;
try {
  schema = require('@shared/schema');
} catch (e) {
  console.log('⚠️  @shared/schema not found, trying relative path...');
  schema = require('../../../shared/schema');
}
import { initializeDatabase } from '../../dbInit';

export async function setupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/university_inventory'
  });
  
  const db = drizzle(pool, { schema });
  
  try {
    console.log('🔄 Setting up test database...');
    
    // First, check if database is accessible
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection established');
    
    // Initialize the database schema and seed data
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Verify critical tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = tables.rows.map(r => r.table_name);
    console.log('📋 Available tables:', tableNames);
    
    // Verify items table structure specifically
    const itemsColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'items'
    `);
    
    console.log('🔧 Items table columns:', itemsColumns.rows.map(r => r.column_name));
    
    // Check for VAT columns
    const hasVatRate = itemsColumns.rows.some(col => 
      col.column_name === 'vat_rate' || col.column_name === 'vatRate'
    );
    const hasVatIncluded = itemsColumns.rows.some(col => 
      col.column_name === 'vat_included' || col.column_name === 'vatIncluded'
    );
    
    if (!hasVatRate || !hasVatIncluded) {
      console.error('❌ VAT columns missing from items table');
      console.error('VAT Rate found:', hasVatRate);
      console.error('VAT Included found:', hasVatIncluded);
      throw new Error('Database schema is incomplete');
    }
    
    console.log('✅ Test database setup completed');
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function cleanupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/university_inventory'
  });
  
  const db = drizzle(pool, { schema });
  
  try {
    console.log('🧹 Cleaning up test database...');
    
    // Clean up in correct order to avoid foreign key constraints
    const cleanupOrder = [
      'stock_movements',
      'sale_items',
      'sales',
      'quote_items', 
      'quotes',
      'order_items',
      'orders',
      'charge_code_exclusions',
      'items',
      'categories',
      'chargecodes',
      'suppliers'
      // Note: Don't clean users as they might be needed across tests
    ];
    
    for (const table of cleanupOrder) {
      try {
        await db.execute(sql.raw(`DELETE FROM ${table} WHERE created_at > NOW() - INTERVAL '1 hour'`));
        console.log(`✅ Cleaned table: ${table}`);
      } catch (error) {
        console.log(`⚠️ Could not clean table ${table}:`, error.message);
      }
    }
    
    console.log('✅ Test database cleanup completed');
    
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

export async function waitForDatabase(maxAttempts = 30, delayMs = 1000) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/university_inventory'
  });
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const db = drizzle(pool);
      await db.execute(sql`SELECT 1`);
      console.log('✅ Database is ready');
      await pool.end();
      return;
    } catch (error) {
      console.log(`⏳ Waiting for database... (attempt ${attempt}/${maxAttempts})`);
      if (attempt === maxAttempts) {
        await pool.end();
        throw new Error(`Database not ready after ${maxAttempts} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
