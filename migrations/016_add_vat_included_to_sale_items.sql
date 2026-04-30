-- Migration: Add vat_included column to sale_items table
-- Description: Store vatIncluded as a snapshot at time of sale instead of relying on LEFT JOIN to items table
-- This ensures accurate historical reporting even if items are deleted or modified

-- Step 1: Add the column as nullable first
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS vat_included BOOLEAN;

-- Step 2: Populate existing rows from the items table
-- For any rows where item still exists, copy the vatIncluded value from the item
-- For deleted items, infer from the stored calculations:
--   If subtotal ≈ unit_price * quantity (VAT excluded pricing), set false
--   Otherwise default to false for legacy data consistency (legacy prices excluded VAT at 20%)
UPDATE sale_items si
SET vat_included = COALESCE(
    -- First try to get from the items table if item still exists
    (SELECT i.vat_included FROM items i WHERE i.id = si.item_id),
    -- For deleted items, infer from calculations:
    -- If subtotal equals unit_price * quantity (within rounding), price was excluding VAT
    CASE
        WHEN ABS(si.subtotal - (si.unit_price * si.quantity)) < 0.02 THEN false
        ELSE false  -- Default to false (VAT excluded) for legacy data at 20% flat rate
    END
)
WHERE si.vat_included IS NULL;

-- Step 3: Make the column NOT NULL now that all rows have values
ALTER TABLE sale_items ALTER COLUMN vat_included SET NOT NULL;

-- Step 4: Set default VAT rate to 20% for any NULL vat_rate values (legacy data)
UPDATE sale_items SET vat_rate = 0.20 WHERE vat_rate IS NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN sale_items.vat_included IS 'Snapshot of whether price included VAT at time of sale (true = price includes VAT, false = VAT added to price)';

-- Log the migration
DO $$
DECLARE
    updated_count INTEGER;
    vat_included_true INTEGER;
    vat_included_false INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM sale_items WHERE vat_included IS NOT NULL;
    SELECT COUNT(*) INTO vat_included_true FROM sale_items WHERE vat_included = true;
    SELECT COUNT(*) INTO vat_included_false FROM sale_items WHERE vat_included = false;

    RAISE NOTICE 'Migration complete: % sale_items now have vat_included snapshot stored', updated_count;
    RAISE NOTICE '  - VAT Included (price includes VAT): % items', vat_included_true;
    RAISE NOTICE '  - VAT Excluded (20%% added to price): % items', vat_included_false;
END $$;
