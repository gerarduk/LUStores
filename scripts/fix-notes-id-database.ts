#!/usr/bin/env ts-node
/**
 * Database Migration Script: Fix notes_id Column Issues
 * 
 * This script ensures all tables have the proper notes_id column as defined in the schema.
 * It addresses the runtime database mismatch where notes_id columns are missing.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'university_inventory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function fixNotesIdColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting notes_id column migration...');
    
    // Tables that should have notes_id column according to schema
    const tablesWithNotesId = [
      'sales',
      'items', 
      'chargecodes',
      'orders',
      'quotes',
      'suppliers',
      'sources',
      'categories'
    ];
    
    // Check which tables are missing the notes_id column
    console.log('📋 Checking existing notes_id columns...');
    const existingColumns = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns 
      WHERE column_name = 'notes_id' 
        AND table_schema = 'public'
        AND table_name = ANY($1)
    `, [tablesWithNotesId]);
    
    const existingTables = existingColumns.rows.map(row => row.table_name);
    const missingTables = tablesWithNotesId.filter(table => !existingTables.includes(table));
    
    console.log(`✅ Tables with notes_id: ${existingTables.join(', ')}`);
    console.log(`❌ Tables missing notes_id: ${missingTables.join(', ')}`);
    
    // Add missing notes_id columns
    for (const table of missingTables) {
      try {
        console.log(`🔨 Adding notes_id column to ${table}...`);
        await client.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL
        `);
        console.log(`✅ Successfully added notes_id to ${table}`);
      } catch (error) {
        console.error(`❌ Failed to add notes_id to ${table}:`, error.message);
      }
    }
    
    // Verify all columns were added
    console.log('🔍 Verifying notes_id columns...');
    const finalCheck = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE column_name = 'notes_id' 
        AND table_schema = 'public'
        AND table_name = ANY($1)
      ORDER BY table_name
    `, [tablesWithNotesId]);
    
    console.log('📊 Final notes_id column status:');
    finalCheck.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('✅ notes_id column migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixNotesIdColumns();
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { fixNotesIdColumns };
