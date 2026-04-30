-- Add quote_name column to quotes table
-- Migration: 005_add_quote_name_to_quotes.sql

-- Check if the column exists before adding it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'quote_name'
    ) THEN
        ALTER TABLE quotes ADD COLUMN quote_name VARCHAR(200);
        RAISE NOTICE 'Added quote_name column to quotes table';
    ELSE
        RAISE NOTICE 'quote_name column already exists in quotes table';
    END IF;
END $$;
