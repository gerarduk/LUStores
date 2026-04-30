-- Migration: Convert stock quantities from INTEGER to NUMERIC(10,2)
-- This allows fractional quantities for cables, liquids, and bulk materials

-- Convert items table stock columns
ALTER TABLE items 
  ALTER COLUMN current_stock TYPE NUMERIC(10,2) USING current_stock::NUMERIC(10,2),
  ALTER COLUMN minimum_stock TYPE NUMERIC(10,2) USING minimum_stock::NUMERIC(10,2);

-- Convert stock_movements table
ALTER TABLE stock_movements
  ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2),
  ALTER COLUMN previous_stock TYPE NUMERIC(10,2) USING previous_stock::NUMERIC(10,2),
  ALTER COLUMN new_stock TYPE NUMERIC(10,2) USING new_stock::NUMERIC(10,2);

-- Convert sale_items table
ALTER TABLE sale_items
  ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);

-- Convert order_items table
ALTER TABLE order_items
  ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2),
  ALTER COLUMN received_quantity TYPE NUMERIC(10,2) USING received_quantity::NUMERIC(10,2);

-- Convert quote_items table
ALTER TABLE quote_items
  ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);
