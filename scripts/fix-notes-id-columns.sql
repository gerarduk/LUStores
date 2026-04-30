-- Database Migration Script: Fix notes_id Column Issues
-- This script ensures all tables have the proper notes_id column as defined in the schema

-- Add notes_id column to sales table if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to items table if it doesn't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to chargecodes table if it doesn't exist
ALTER TABLE chargecodes ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to quotes table if it doesn't exist
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to suppliers table if it doesn't exist
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to sources table if it doesn't exist
ALTER TABLE sources ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Add notes_id column to categories table if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS notes_id INTEGER REFERENCES notes(id) DEFAULT NULL;

-- Verify the columns were added successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE column_name = 'notes_id' 
    AND table_schema = 'public'
ORDER BY table_name;
