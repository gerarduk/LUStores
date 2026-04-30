-- Migration: Add vendor_sku column to order_items table
-- Date: 2026-01-16
-- Description: Adds vendor_sku column to track vendor-specific SKU/part numbers for ordered items

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS vendor_sku VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN order_items.vendor_sku IS 'Vendor''s part number or SKU for this specific item in the order';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_items_vendor_sku ON order_items(vendor_sku);

-- Verification query (uncomment to test)
-- SELECT id, item_sku, vendor_sku FROM order_items LIMIT 5;
