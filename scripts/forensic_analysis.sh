#!/bin/bash
# Forensic analysis of stock value discrepancies

echo "================================================================================"
echo "FORENSIC STOCK VALUE ANALYSIS"
echo "================================================================================"
echo ""

echo "================================================================================"
echo "SOURCE DATABASE ANALYSIS (ST7MA784)"
echo "================================================================================"
echo ""

echo "Overall totals:"
docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    'SOURCE' as database,
    COUNT(*) as total_items,
    SUM(BALANCE) as total_quantity,
    SUM(PRICE_EX_VAT * BALANCE) as value_ex_vat,
    SUM(SELLING_PRICE * BALANCE) as value_inc_vat,
    SUM((SELLING_PRICE - PRICE_EX_VAT) * BALANCE) as total_vat_amount
FROM source_stock
WHERE BALANCE > 0;
" 2>/dev/null

echo ""
echo "Breakdown by prefix (first 2 letters of STOCK_CODE):"
docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    SUBSTRING(STOCK_CODE, 1, 2) as prefix,
    COUNT(*) as item_count,
    SUM(BALANCE) as total_qty,
    ROUND(SUM(PRICE_EX_VAT * BALANCE)::numeric, 2) as value_ex_vat,
    ROUND(SUM(SELLING_PRICE * BALANCE)::numeric, 2) as value_inc_vat,
    ROUND(AVG((SELLING_PRICE - PRICE_EX_VAT) / NULLIF(PRICE_EX_VAT, 0) * 100)::numeric, 2) as avg_vat_rate_pct
FROM source_stock
WHERE BALANCE > 0
GROUP BY SUBSTRING(STOCK_CODE, 1, 2)
ORDER BY SUBSTRING(STOCK_CODE, 1, 2);
" 2>/dev/null

echo ""
echo "================================================================================"
echo "TARGET DATABASE ANALYSIS (university_inventory)"
echo "================================================================================"
echo ""

echo "Overall totals:"
docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    'TARGET' as database,
    COUNT(*) as total_items,
    SUM(current_stock) as total_quantity,
    ROUND(SUM(price * current_stock)::numeric, 2) as value_at_price,
    ROUND(SUM(
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_inc_vat
FROM items
WHERE current_stock > 0;
"

echo ""
echo "Breakdown by prefix (first 2 letters of SKU):"
docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    SUBSTRING(sku, 1, 2) as prefix,
    COUNT(*) as item_count,
    SUM(current_stock) as total_qty,
    ROUND(SUM(price * current_stock)::numeric, 2) as value_at_price,
    ROUND(SUM(
        CASE 
            WHEN vat_included THEN price * current_stock 
            ELSE price * current_stock * (1 + vat_rate)
        END
    )::numeric, 2) as value_inc_vat,
    ROUND(AVG(vat_rate * 100)::numeric, 2) as avg_vat_rate_pct
FROM items
WHERE current_stock > 0
GROUP BY SUBSTRING(sku, 1, 2)
ORDER BY SUBSTRING(sku, 1, 2);
"

echo ""
echo "================================================================================"
echo "SIDE-BY-SIDE COMPARISON"
echo "================================================================================"
echo ""

docker compose exec -T db psql -U postgres -d university_inventory -c "
WITH source_summary AS (
    SELECT 
        SUBSTRING(STOCK_CODE, 1, 2) as prefix,
        COUNT(*) as src_count,
        SUM(BALANCE) as src_qty,
        ROUND(SUM(SELLING_PRICE * BALANCE)::numeric, 2) as src_value_inc_vat
    FROM source_stock
    WHERE BALANCE > 0
    GROUP BY SUBSTRING(STOCK_CODE, 1, 2)
),
target_summary AS (
    SELECT 
        SUBSTRING(sku, 1, 2) as prefix,
        COUNT(*) as tgt_count,
        SUM(current_stock) as tgt_qty,
        ROUND(SUM(
            CASE 
                WHEN vat_included THEN price * current_stock 
                ELSE price * current_stock * (1 + vat_rate)
            END
        )::numeric, 2) as tgt_value_inc_vat
    FROM items
    WHERE current_stock > 0
    GROUP BY SUBSTRING(sku, 1, 2)
)
SELECT 
    COALESCE(s.prefix, t.prefix) as prefix,
    COALESCE(s.src_count, 0) as source_count,
    COALESCE(t.tgt_count, 0) as target_count,
    COALESCE(t.tgt_count, 0) - COALESCE(s.src_count, 0) as count_diff,
    COALESCE(s.src_qty, 0) as source_qty,
    COALESCE(t.tgt_qty, 0) as target_qty,
    ROUND((COALESCE(t.tgt_qty, 0) - COALESCE(s.src_qty, 0))::numeric, 2) as qty_diff,
    COALESCE(s.src_value_inc_vat, 0) as source_value,
    COALESCE(t.tgt_value_inc_vat, 0) as target_value,
    ROUND((COALESCE(t.tgt_value_inc_vat, 0) - COALESCE(s.src_value_inc_vat, 0))::numeric, 2) as value_diff
FROM source_summary s
FULL OUTER JOIN target_summary t ON s.prefix = t.prefix
ORDER BY prefix;
"

echo ""
echo "================================================================================"
echo "ITEM-LEVEL DISCREPANCIES: Missing in Target"
echo "================================================================================"
echo ""

docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    s.STOCK_CODE,
    SUBSTRING(s.DESCRIPTION, 1, 40) as description,
    s.BALANCE as source_qty,
    ROUND((s.SELLING_PRICE * s.BALANCE)::numeric, 2) as source_value_inc_vat
FROM source_stock s
LEFT JOIN items t ON s.STOCK_CODE = t.sku
WHERE s.BALANCE > 0 
  AND t.id IS NULL
ORDER BY (s.SELLING_PRICE * s.BALANCE) DESC
LIMIT 20;
"

echo ""
echo "================================================================================"
echo "ITEM-LEVEL DISCREPANCIES: Missing in Source"
echo "================================================================================"
echo ""

docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    t.sku,
    SUBSTRING(t.name, 1, 40) as name,
    t.current_stock as target_qty,
    ROUND((
        CASE 
            WHEN t.vat_included THEN t.price * t.current_stock 
            ELSE t.price * t.current_stock * (1 + t.vat_rate)
        END
    )::numeric, 2) as target_value_inc_vat
FROM items t
LEFT JOIN source_stock s ON t.sku = s.STOCK_CODE
WHERE t.current_stock > 0 
  AND s.STOCK_CODE IS NULL
ORDER BY (
    CASE 
        WHEN t.vat_included THEN t.price * t.current_stock 
        ELSE t.price * t.current_stock * (1 + t.vat_rate)
    END
) DESC
LIMIT 20;
"

echo ""
echo "================================================================================"
echo "ITEM-LEVEL DISCREPANCIES: Quantity Mismatches"
echo "================================================================================"
echo ""

docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    s.STOCK_CODE,
    SUBSTRING(s.DESCRIPTION, 1, 30) as description,
    s.BALANCE as source_qty,
    t.current_stock as target_qty,
    ROUND((t.current_stock - s.BALANCE)::numeric, 2) as qty_diff,
    ROUND((s.SELLING_PRICE * s.BALANCE)::numeric, 2) as src_val,
    ROUND((
        CASE 
            WHEN t.vat_included THEN t.price * t.current_stock 
            ELSE t.price * t.current_stock * (1 + t.vat_rate)
        END
    )::numeric, 2) as tgt_val
FROM source_stock s
INNER JOIN items t ON s.STOCK_CODE = t.sku
WHERE s.BALANCE > 0 
  AND t.current_stock > 0
  AND ABS(s.BALANCE - t.current_stock) > 0.01
ORDER BY ABS(s.BALANCE - t.current_stock) DESC
LIMIT 20;
"

echo ""
echo "================================================================================"
echo "ITEM-LEVEL DISCREPANCIES: VAT Rate Differences"
echo "================================================================================"
echo ""

docker compose exec -T db psql -U postgres -d university_inventory -c "
SELECT 
    s.STOCK_CODE,
    SUBSTRING(s.DESCRIPTION, 1, 30) as description,
    s.BALANCE as qty,
    ROUND(((s.SELLING_PRICE - s.PRICE_EX_VAT) / NULLIF(s.PRICE_EX_VAT, 0) * 100)::numeric, 2) as src_vat_pct,
    ROUND((t.vat_rate * 100)::numeric, 2) as tgt_vat_pct,
    ROUND((s.SELLING_PRICE * s.BALANCE)::numeric, 2) as src_val,
    ROUND((
        CASE 
            WHEN t.vat_included THEN t.price * t.current_stock 
            ELSE t.price * t.current_stock * (1 + t.vat_rate)
        END
    )::numeric, 2) as tgt_val,
    ROUND((
        CASE 
            WHEN t.vat_included THEN t.price * t.current_stock 
            ELSE t.price * t.current_stock * (1 + t.vat_rate)
        END - s.SELLING_PRICE * s.BALANCE
    )::numeric, 2) as value_diff
FROM source_stock s
INNER JOIN items t ON s.STOCK_CODE = t.sku
WHERE s.BALANCE > 0 
  AND t.current_stock > 0
  AND ABS(s.BALANCE - t.current_stock) <= 0.01
  AND ABS(
    (s.SELLING_PRICE * s.BALANCE) - 
    CASE 
        WHEN t.vat_included THEN t.price * t.current_stock 
        ELSE t.price * t.current_stock * (1 + t.vat_rate)
    END
  ) > 0.10
ORDER BY ABS(
    (s.SELLING_PRICE * s.BALANCE) - 
    CASE 
        WHEN t.vat_included THEN t.price * t.current_stock 
        ELSE t.price * t.current_stock * (1 + t.vat_rate)
    END
) DESC
LIMIT 20;
"

echo ""
echo "================================================================================"
echo "FINAL SUMMARY"
echo "================================================================================"
echo ""

docker compose exec -T db psql -U postgres -d university_inventory -c "
WITH source_total AS (
    SELECT 
        SUM(SELLING_PRICE * BALANCE) as source_value_inc_vat
    FROM source_stock
    WHERE BALANCE > 0
),
target_total AS (
    SELECT 
        SUM(
            CASE 
                WHEN vat_included THEN price * current_stock 
                ELSE price * current_stock * (1 + vat_rate)
            END
        ) as target_value_inc_vat
    FROM items
    WHERE current_stock > 0
)
SELECT 
    ROUND(s.source_value_inc_vat::numeric, 2) as source_total_inc_vat,
    ROUND(t.target_value_inc_vat::numeric, 2) as target_total_inc_vat,
    ROUND((t.target_value_inc_vat - s.source_value_inc_vat)::numeric, 2) as difference,
    ROUND(((t.target_value_inc_vat - s.source_value_inc_vat) / s.source_value_inc_vat * 100)::numeric, 2) as pct_difference
FROM source_total s, target_total t;
"

echo ""
echo "Migration script reported: £83,496.01"
echo "Dashboard currently shows: £71,904.76 (before VAT fix)"
echo "Dashboard should show:     (value from above after VAT fix applied)"
echo ""
echo "================================================================================"
