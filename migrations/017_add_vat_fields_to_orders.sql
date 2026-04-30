-- Add VAT and inventory update fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,4) DEFAULT 0.2000,
ADD COLUMN IF NOT EXISTS vat_included BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS update_inventory_values BOOLEAN DEFAULT false;

-- Add VAT fields to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,4) DEFAULT 0.2000,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0.00;