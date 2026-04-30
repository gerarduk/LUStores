-- Migration: Migrate vendor/supplier relationships from sources table to orders
-- Description: Creates historical orders with qty 0 to preserve item-vendor relationships
-- This ensures vendor data is available in the new ordering system

-- Create historical orders for each supplier that has items in the sources table
-- This will only run if there are sources without corresponding orders

DO $$
DECLARE
    supplier_rec RECORD;
    new_order_id INTEGER;
    order_num INTEGER := 1;
    source_rec RECORD;
    item_rec RECORD;
BEGIN
    -- Loop through each unique supplier that has sources but no historical migration order
    FOR supplier_rec IN
        SELECT DISTINCT s.supplier_id, sup.name as supplier_name
        FROM sources s
        JOIN suppliers sup ON s.supplier_id = sup.id
        WHERE NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o.supplier_id = s.supplier_id
            AND o.status = 'historical_migration'
        )
    LOOP
        -- Create a new order for this supplier
        INSERT INTO orders (
            order_id,
            supplier_id,
            status,
            total_amount,
            delivery_charge,
            created_at,
            updated_at
        ) VALUES (
            'HIST-' || supplier_rec.supplier_id || '-' || to_char(NOW(), 'YYYYMMDD'),
            supplier_rec.supplier_id,
            'historical_migration',
            0.00,
            0.00,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_order_id;

        RAISE NOTICE 'Created historical order % for supplier %', new_order_id, supplier_rec.supplier_name;

        -- Add all items from sources for this supplier as order items with qty 0
        FOR source_rec IN
            SELECT s.*, i.name as item_name, i.sku as item_sku, i.description as item_description, i.category_id
            FROM sources s
            JOIN items i ON s.item_id = i.id
            WHERE s.supplier_id = supplier_rec.supplier_id
        LOOP
            INSERT INTO order_items (
                order_id,
                item_id,
                item_name,
                item_sku,
                vendor_sku,
                item_description,
                category_id,
                unit_cost,
                quantity,
                total_cost,
                received,
                received_quantity,
                created_at,
                updated_at
            ) VALUES (
                new_order_id,
                source_rec.item_id,
                source_rec.item_name,
                source_rec.item_sku,
                NULL, -- vendor_sku can be set later if known
                source_rec.item_description,
                source_rec.category_id,
                COALESCE(source_rec.price, 0.00),
                0.00, -- quantity 0 as requested
                0.00, -- total cost 0
                true, -- mark as received (historical)
                0.00, -- received quantity 0
                NOW(),
                NOW()
            );
        END LOOP;

        order_num := order_num + 1;
    END LOOP;

    IF order_num = 1 THEN
        RAISE NOTICE 'No new historical orders needed - all suppliers already migrated or no sources exist';
    ELSE
        RAISE NOTICE 'Created % historical orders from sources table', order_num - 1;
    END IF;
END $$;

-- Add index for the new status type if not exists
CREATE INDEX IF NOT EXISTS idx_orders_historical_migration ON orders(status) WHERE status = 'historical_migration';

-- Add comment explaining the migration
COMMENT ON INDEX idx_orders_historical_migration IS 'Index for historical migration orders created from sources table data';
