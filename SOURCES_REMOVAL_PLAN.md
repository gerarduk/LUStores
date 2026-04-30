# Plan to Replace `sources` with Order-based Inference and Remove Table

Goal
----
Replace runtime uses of the `sources` table with inference from historical `orders`/`order_items`, provide an optional backfill for compatibility, and safely remove the `sources` table and related UI/tooling.

Summary of current usage
------------------------
- Runtime: `server/storage.ts`, `server/routes.ts`, `server/referentialIntegrity.ts`.
- DB init & migrations: `server/dbInit.ts`, `scripts/init-database.ts`, `scripts/migrate_legacy_data*.py` and related scripts.
- Client docs/visualizers: `client/src/components/DatabaseSchemaViewer.tsx`, `DatabaseERD.tsx`, `DatabaseSchemaManager.tsx`.

High-level plan
---------------
1. Replace runtime references (fast):
   - Change report/vendor filters and any supplier-item lookups to infer supplier↔item from `orders`/`order_items` where `orders.status = 'received'`.
   - Ensure inference ignores order lines with NULL `itemId`.
2. Backfill (optional, recommended):
   - Add a one-off migration script to populate `sources` from `order_items` (use most recent `unit_cost`/`vendorSku` per supplier+item).
   - Provide a safe rollback plan (dry-run mode to preview changes).
3. Migrate referential integrity checks:
   - Update `referentialIntegrity.ts` to stop treating `sources` as the canonical link for deletions; instead consult `order_items` for historical ties and adjust warnings accordingly.
4. Remove `sources` API/UI:
   - Remove `createSource`/`deleteSource` endpoints and any supplier-item management UI components only after backfill and verification.
5. Schema deletion & cleanup:
   - Update DB init scripts to no longer create `sources`.
   - Drop `sources` table in a migration.
   - Remove `sources` references from `shared/schema.ts`, code, and docs.
6. Tests & QA:
   - Add tests to assert vendor filters match items from `order_items`.
   - Manually QA reports, supplier pages, order creation and receiving flows.

Risks & mitigations
-------------------
- Risk: One-off historical orders (free-text lines without `itemId`) will not infer links. Mitigation: backfill only for `order_items` with valid `itemId` and keep manual supplier-link UI for exceptions.
- Risk: Client tooling and migration scripts expect `sources`. Mitigation: update all scripts and add a transitional compatibility layer that reads from `order_items` if `sources` is empty.

Next action
-----------
Implement runtime inference changes (replace `sources` usages in server code), then optionally add the backfill migration. Run tests/QA and then proceed with removal.

File created by automated codemod on March 4, 2026.

Implementation details: runtime inference (examples)
-----------------------------------------------
Below are concrete SQL and TypeScript/Drizzle examples showing how to infer which items are supplied by a given supplier using `orders`/`order_items` instead of `sources`.

1) SQL — list distinct item IDs supplied by a supplier (received orders only):

```sql
SELECT DISTINCT oi.item_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.supplier_id = $1
   AND o.status = 'received'
   AND oi.item_id IS NOT NULL;
```

2) SQL — filter sales that include at least one item supplied by a supplier:

```sql
SELECT s.*
FROM sales s
WHERE EXISTS (
   SELECT 1 FROM sale_items si
   WHERE si.sale_id = s.id
      AND si.item_id IN (
         SELECT DISTINCT oi.item_id
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.supplier_id = $1
            AND o.status = 'received'
            AND oi.item_id IS NOT NULL
      )
);
```

3) Drizzle/TypeScript snippet for `server/storage.ts` (use in `getSales` / `getSalesForExport`):

```ts
if (supplierId) {
   // Match sales that have a sale_item whose item_id appears in any received order
   // from the supplier. This avoids relying on `sources` and reflects actual
   // procurement history.
   conditions.push(sql`
      EXISTS (
         SELECT 1 FROM ${saleItems} si
         WHERE si.sale_id = ${sales.id}
            AND si.item_id IN (
               SELECT oi.item_id FROM ${orderItems} oi
               INNER JOIN ${orders} o ON oi.order_id = o.id
               WHERE o.supplier_id = ${supplierId}
                  AND o.status = 'received'
                  AND oi.item_id IS NOT NULL
            )
      )
   `);
}
```

4) Example: `getSupplierWithItems` using orders (TypeScript/Drizzle):

```ts
const itemsFromOrders = await db.select({ item: itemsTable, lastOrderDate: sql`MAX(${orders.receivedAt})` })
   .from(orderItems)
   .innerJoin(orders, eq(orderItems.orderId, orders.id))
   .innerJoin(itemsTable, eq(orderItems.itemId, itemsTable.id))
   .where(and(eq(orders.supplierId, supplierId), eq(orders.status, 'received')))
   .groupBy(itemsTable.id);

// merge with any manual catalog entries (if you keep them) and dedupe by item id
```

5) Backfill (optional) — populate `sources` from historical received orders:

```sql
INSERT INTO sources (item_id, supplier_id, price, notes_id, created_at)
SELECT oi.item_id, o.supplier_id, oi.unit_cost, NULL, NOW()
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.item_id IS NOT NULL
   AND o.status = 'received'
ON CONFLICT (item_id, supplier_id) DO UPDATE
   SET price = EXCLUDED.price;
```

6) Performance note & recommendation
------------------------------------
- These queries can be more expensive than a direct `sources` lookup because they scan `order_items` and join `orders`. To avoid runtime cost for interactive reports consider:
   - Adding a compact materialized view `supplier_item_links` that stores (supplier_id, item_id, last_order_date, last_unit_cost) and refresh it on schedule or via triggers when orders are received.
   - Adding indexes on `order_items(item_id)`, `orders(supplier_id, status)`, and `order_items(order_id)`.

7) Referential integrity change
-----------------------------
- Replace `sources` checks in `referentialIntegrity.ts` with `order_items` checks when deciding whether a supplier or item can be safely deleted. Example:

```ts
const [orderLinks] = await db.select({ count: count() })
   .from(orderItems)
   .innerJoin(orders, eq(orderItems.orderId, orders.id))
   .where(and(eq(orderItems.itemId, itemId), eq(orders.status, 'received')));

if (orderLinks.count > 0) {
   // treat as historical link, block or warn as appropriate
}
```

This approach means we never need to rely on manual `sources` synchronization — procurement history is the single source of truth for which suppliers actually supplied which items.
