-- Migration: Add recipient/delivery confirmation fields to sales table
-- Date: 2026-01-12
-- Description: Adds fields to track who received the items from a sale

-- Add delivery tracking fields
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS delivered_to VARCHAR(200),
ADD COLUMN IF NOT EXISTS delivered_to_email VARCHAR(200),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN sales.delivered_to IS 'Name of the person who received the items (selected from authorized users)';
COMMENT ON COLUMN sales.delivered_to_email IS 'Email address of the recipient';
COMMENT ON COLUMN sales.delivered_at IS 'Timestamp when the recipient was recorded';

-- Create index for faster queries on recipient
CREATE INDEX IF NOT EXISTS idx_sales_delivered_to ON sales(delivered_to);
CREATE INDEX IF NOT EXISTS idx_sales_delivered_at ON sales(delivered_at);

-- Verification query (uncomment to test)
-- SELECT id, sale_id, delivered_to, delivered_to_email, delivered_at FROM sales LIMIT 5;
