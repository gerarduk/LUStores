-- Check for inactive items in the database
-- These items won't appear in Sales & Quotes interface

SELECT 
    id,
    name,
    sku,
    is_active,
    current_stock,
    price,
    category_id
FROM items
WHERE is_active = false
ORDER BY name;

-- Count inactive vs active items
SELECT 
    is_active,
    COUNT(*) as count,
    SUM(current_stock) as total_stock
FROM items
GROUP BY is_active;

-- To reactivate all inactive items (run this if you want them available for sale):
-- UPDATE items SET is_active = true WHERE is_active = false;

-- To reactivate specific items by SKU:
-- UPDATE items SET is_active = true WHERE sku IN ('SKU1', 'SKU2', 'SKU3');
