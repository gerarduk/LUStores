-- Migration script to fix vendor modal displaying £0
--
-- Issue: The vendor modal was showing £0 for order totals because:
-- 1. The order_items table was missing the vendor_sku column
-- 2. The orders table was missing the invoice_pdf_path column
-- 3. This caused the API to fail when fetching supplier details with orders
-- 4. The frontend would silently fall back to basic supplier data without aggregated stats
--
-- Solution: Add the missing columns to the database
--
-- Run this script on your production/staging database

BEGIN;

-- Add missing vendor_sku column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS vendor_sku VARCHAR(100);

-- Add missing invoice_pdf_path column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_pdf_path VARCHAR(500);

-- Verify the columns were added
DO $$
DECLARE
    vendor_sku_exists BOOLEAN;
    invoice_path_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_items' AND column_name = 'vendor_sku'
    ) INTO vendor_sku_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'invoice_pdf_path'
    ) INTO invoice_path_exists;

    IF vendor_sku_exists AND invoice_path_exists THEN
        RAISE NOTICE '✅ SUCCESS: Both columns added successfully';
    ELSE
        RAISE EXCEPTION '❌ FAILURE: Columns were not added correctly';
    END IF;
END $$;

COMMIT;
