-- ================================================================================
-- STOCK VALUE ANALYSIS - Target Database Only
-- This analyzes the current state to understand the discrepancy
-- ================================================================================

\echo '================================================================================'
\echo 'CURRENT DATABASE STATE ANALYSIS'
\echo '================================================================================'
\echo ''

-- Overall totals with different VAT calculations
SELECT 
    COUNT(*) as total_items,
    ROUND(SUM(current_stock)::numeric, 2) as total_quantity,
    ROUND(SUM(price * current_stock)::numeric, 2) as value_at_price_only,
    ROUND(SUM(
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_with_vat_logic,
    ROUND(SUM(price * current_stock * (1 + vat_rate))::numeric, 2) as value_if_all_add_vat,
    COUNT(CASE WHEN vat_included THEN 1 END) as items_vat_included,
    COUNT(CASE WHEN NOT vat_included THEN 1 END) as items_vat_not_included
FROM items
WHERE current_stock > 0;

\echo ''
\echo 'Breakdown by prefix (first 2 letters of SKU):'

SELECT 
    SUBSTRING(sku, 1, 2) as prefix,
    COUNT(*) as item_count,
    ROUND(SUM(current_stock)::numeric, 2) as total_qty,
    ROUND(SUM(price * current_stock)::numeric, 2) as value_at_price,
    ROUND(SUM(
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_inc_vat,
    ROUND(AVG(vat_rate * 100)::numeric, 2) as avg_vat_rate_pct,
    COUNT(CASE WHEN vat_included THEN 1 END) as vat_included_count,
    COUNT(CASE WHEN NOT vat_included THEN 1 END) as vat_not_included_count
FROM items
WHERE current_stock > 0
GROUP BY SUBSTRING(sku, 1, 2)
ORDER BY value_inc_vat DESC;

\echo ''
\echo '================================================================================'
\echo 'VAT RATE DISTRIBUTION'
\echo '================================================================================'
\echo ''

SELECT 
    ROUND((vat_rate * 100)::numeric, 2) as vat_rate_pct,
    vat_included,
    COUNT(*) as item_count,
    ROUND(SUM(current_stock)::numeric, 2) as total_qty,
    ROUND(SUM(price * current_stock)::numeric, 2) as value_at_price,
    ROUND(SUM(
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_with_vat_logic
FROM items
WHERE current_stock > 0
GROUP BY vat_rate, vat_included
ORDER BY vat_rate DESC, vat_included DESC;

\echo ''
\echo '================================================================================'
\echo 'TOP 20 ITEMS BY VALUE (different calculations)'
\echo '================================================================================'
\echo ''

SELECT 
    sku,
    SUBSTRING(name, 1, 30) as name,
    ROUND(current_stock::numeric, 2) as qty,
    ROUND(price::numeric, 2) as price,
    ROUND((vat_rate * 100)::numeric, 2) as vat_pct,
    vat_included,
    ROUND((price * current_stock)::numeric, 2) as value_at_price,
    ROUND((
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_with_vat
FROM items
WHERE current_stock > 0
ORDER BY (
    CASE 
        WHEN vat_included THEN price * current_stock 
        ELSE price * current_stock * (1 + vat_rate)
    END
) DESC
LIMIT 20;

\echo ''
\echo '================================================================================'
\echo 'ITEMS WITH UNUSUAL VAT RATES (not 20%)'
\echo '================================================================================'
\echo ''

SELECT 
    sku,
    SUBSTRING(name, 1, 30) as name,
    ROUND(current_stock::numeric, 2) as qty,
    ROUND(price::numeric, 2) as price,
    ROUND((vat_rate * 100)::numeric, 2) as vat_pct,
    vat_included,
    ROUND((price * current_stock)::numeric, 2) as value_at_price,
    ROUND((
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_with_vat
FROM items
WHERE current_stock > 0
  AND vat_rate != 0.20
ORDER BY (price * current_stock) DESC
LIMIT 20;

\echo ''
\echo '================================================================================'
\echo 'SUMMARY COMPARISON'
\echo '================================================================================'
\echo ''

SELECT 
    'Dashboard (old calculation)' as calculation_method,
    71904.76 as value
UNION ALL
SELECT 
    'Price * Stock (no VAT)',
    ROUND(SUM(price * current_stock)::numeric, 2)
FROM items
WHERE current_stock > 0
UNION ALL
SELECT 
    'With VAT logic (vat_included check)',
    ROUND(SUM(
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2)
FROM items
WHERE current_stock > 0
UNION ALL
SELECT 
    'Migration script reported',
    83496.01;

\echo ''
\echo 'Expected values:'
\echo '  - Migration script: £83,496.01'
\echo '  - Dashboard (old):  £71,904.76'
\echo '  - Dashboard (new):  should match "With VAT logic" value above'
\echo ''
