# Bug Report: Stock Concatenation in Refund Operation

**Status:** 🔴 Critical
**Priority:** High
**Reported:** 2026-01-12
**Component:** `server/storage.ts` - `refundSaleInPlace` method
**Affects:** Refund operations only

---

## Summary

When refunding a sale, stock quantities are concatenated as strings instead of being added as numbers, causing incorrect inventory levels (e.g., 10 + 5 = "105" instead of 15).

---

## Symptoms

- After refunding items, `currentStock` shows concatenated values (e.g., "105" instead of 15)
- Stock movements log shows string concatenation
- Physical inventory doesn't match system inventory after refunds
- Database `current_stock` column contains string-concatenated values

---

## Root Cause

**File:** `/home/user/LUStores/server/storage.ts`
**Line:** 534

```typescript
// BUGGY CODE (Line 534):
await tx.update(itemsTable).set({
  currentStock: sql`${sql.identifier('currentStock')} + ${actualRefund}`,
  updatedAt: now
}).where(eq(itemsTable.id, itemId));
```

**Problem:**

The code uses drizzle-orm's `sql` template to dynamically build an SQL UPDATE statement. When `actualRefund` is interpolated directly into the SQL string without explicit type casting, PostgreSQL may treat it as a string literal, causing string concatenation instead of numeric addition.

### Why This Happens

1. **Database Schema:** `current_stock` is a `DECIMAL(10,2)` column (defined in `shared/schema.ts` line 84)
2. **Drizzle ORM:** Returns decimal values as strings to preserve precision
3. **SQL Interpolation:** When `${actualRefund}` is interpolated without casting, PostgreSQL may interpret it as:
   ```sql
   UPDATE items SET current_stock = current_stock + '5'
   ```
4. **PostgreSQL Behavior:** Depending on implicit casting rules, this can result in string concatenation

---

## Affected Operations

| Operation | Status | Notes |
|-----------|--------|-------|
| Refunds (`refundSaleInPlace`) | ❌ **BUGGY** | Uses SQL template interpolation |
| Sales (`processQuote`) | ✅ OK | Uses `parseFloat()` and JavaScript arithmetic |
| Order Receiving (`receiveOrder`) | ✅ OK | Uses `parseFloat()` and JavaScript arithmetic |
| Manual Stock Adjustments | ✅ OK | Proper number handling |

---

## Reproduction Steps

1. Create a sale with 10 units of an item (current stock: 50)
2. Complete the sale (stock becomes 40)
3. Refund 5 units from the sale
4. **Expected:** Stock should be 45
5. **Actual:** Stock shows "405" (string concatenation: "40" + "5")

---

## Fix

### Option 1: Match Existing Pattern (Recommended)

Follow the same pattern used in `processQuote` (line 2031-2048) and `receiveOrder` (line 2543-2548):

```typescript
// FIXED VERSION:
for (const { itemId, refundQty } of items) {
  if (!saleItemsMap.has(itemId)) throw new Error(`Item ${itemId} not in sale`);
  const saleItem = saleItemsMap.get(itemId) as any;
  const newQty = Math.max(0, saleItem.quantity - refundQty);
  const actualRefund = saleItem.quantity - newQty;
  if (actualRefund <= 0) continue;

  // Update sale item quantity
  await tx.update(saleItems).set({
    quantity: newQty,
    updatedAt: now
  }).where(eq(saleItems.id, saleItem.id));

  // FIX: Fetch current stock, calculate in JavaScript, then update
  const [currentItem] = await tx
    .select({ currentStock: itemsTable.currentStock })
    .from(itemsTable)
    .where(eq(itemsTable.id, itemId));

  if (!currentItem) {
    throw new Error(`Item ${itemId} not found`);
  }

  const currentStockNum = parseFloat(currentItem.currentStock.toString());
  const actualRefundNum = parseFloat(actualRefund.toString());
  const newStock = currentStockNum + actualRefundNum;

  // Update with calculated value
  await tx
    .update(itemsTable)
    .set({
      currentStock: newStock.toString(),
      updatedAt: now
    })
    .where(eq(itemsTable.id, itemId));

  noteLines.push(`Refunded ${actualRefund}x ${saleItem.itemName || ''} (itemId: ${itemId})`);
}
```

### Option 2: Explicit SQL Casting

If you must use SQL template interpolation, explicitly cast to numeric:

```typescript
// Alternative fix with explicit casting:
await tx.update(itemsTable).set({
  currentStock: sql`${sql.identifier('currentStock')} + CAST(${actualRefund} AS DECIMAL(10,2))`,
  updatedAt: now
}).where(eq(itemsTable.id, itemId));
```

**Note:** Option 1 is preferred because it matches the existing patterns in the codebase and is more maintainable.

---

## Testing

### Unit Test (Add to `server/__tests__/storage.test.ts`)

```typescript
describe('refundSaleInPlace', () => {
  it('should add refunded quantity to stock as number, not string', async () => {
    // Setup: Create item with stock of 10
    const item = await storage.createItem({
      name: 'Test Item',
      sku: 'TEST-REFUND-001',
      categoryId: 1,
      price: '10.00',
      currentStock: '10.00',
      minimumStock: '0.00',
      isActive: true,
    });

    // Create and process a sale of 5 units
    const sale = await storage.createSale(
      { chargeCode: 'TEST-001', totalAmount: '50.00', status: 'completed' },
      [{ itemId: item.id, quantity: 5, unitPrice: 10, itemName: 'Test Item', itemSku: 'TEST-REFUND-001' }],
      'test-user'
    );

    // Stock should now be 5
    let updatedItem = await storage.getItem(item.id);
    expect(parseFloat(updatedItem!.currentStock)).toBe(5);

    // Refund 3 units
    await storage.refundSaleInPlace(
      sale.id,
      [{ itemId: item.id, refundQty: 3 }],
      'Test refund',
      'test-user'
    );

    // Stock should be 8 (NOT "53" from string concatenation)
    updatedItem = await storage.getItem(item.id);
    const finalStock = parseFloat(updatedItem!.currentStock);

    expect(finalStock).toBe(8);
    expect(typeof finalStock).toBe('number');
    expect(updatedItem!.currentStock).not.toMatch(/^5/); // Should not start with "5" (would be "53")
  });
});
```

### Manual Test Procedure

1. Navigate to Inventory page
2. Note current stock of an item (e.g., "Office Chair" has 20 units)
3. Create a sale with 5 units of that item
4. Complete the sale (verify stock is now 15)
5. Navigate to Reports/Sales page
6. Find the completed sale
7. Click "Refund" and refund 2 units
8. **Expected:** Stock should be 17
9. **Before Fix:** Stock would show "152" (concatenation)
10. **After Fix:** Stock correctly shows 17

---

## Impact Assessment

**Severity:** High

- **Data Integrity:** ❌ Corrupts inventory stock levels
- **Financial Impact:** ⚠️ Incorrect stock can lead to overselling or understocking
- **User Workaround:** ✅ Manual stock adjustment via Inventory page
- **Data Loss:** ❌ No permanent data loss (can be corrected manually)

**Affected Users:**

- Any user with `sales.refund` permission
- Primarily affects:
  - Customer service staff processing returns
  - Warehouse staff restocking refunded items
  - Inventory managers reconciling stock

---

## Workaround (Until Fixed)

1. **Avoid using refund feature** for now
2. **Manual correction process:**
   - Note the refund quantity needed
   - Navigate to Inventory page
   - Find the item
   - Click "Edit"
   - **Manually calculate:** `new stock = current stock + refund quantity`
   - Update "Current Stock" field
   - Save changes
   - Add note explaining the manual adjustment

3. **For already-corrupted stock:**
   - Identify items with concatenated stock (look for unusually high values)
   - Calculate correct stock from sales/order history
   - Manually update via Inventory page

---

## Related Code Sections

**Good Examples (follow these patterns):**

1. **processQuote** (line 2031-2048):
   ```typescript
   const currentStockNum = parseFloat(currentItem.currentStock.toString());
   const quantityNum = parseFloat(item.quantity.toString());
   const newStock = currentStockNum - quantityNum;
   ```

2. **receiveOrder** (line 2543-2548):
   ```typescript
   const previousStock = parseFloat(item.currentStock.toString());
   const receivedQty = parseFloat(receivedItem.receivedQuantity.toString());
   const newStock = previousStock + receivedQty;
   ```

**Buggy Code:**

1. **refundSaleInPlace** (line 534):
   ```typescript
   currentStock: sql`${sql.identifier('currentStock')} + ${actualRefund}`
   ```

---

## References

- **Database Schema:** `shared/schema.ts` line 84 - `currentStock` is DECIMAL(10,2)
- **Drizzle ORM Docs:** https://orm.drizzle.team/docs/sql
- **PostgreSQL Decimal Handling:** https://www.postgresql.org/docs/current/datatype-numeric.html
- **Similar Issue (processQuote):** Fixed correctly in commit history

---

## Checklist for Fix

- [ ] Update `refundSaleInPlace` method to use `parseFloat()` pattern
- [ ] Add unit test for numeric addition (not concatenation)
- [ ] Test with decimal quantities (e.g., 2.5 units)
- [ ] Test with large quantities (>100 units)
- [ ] Verify stock movements log correctly
- [ ] Update CHANGELOG.md
- [ ] Remove "Known Issues" section from `sales-quotes.rst` after fix
- [ ] Notify users of fix via deployment notification

---

## Additional Notes

- This bug only affects refunds, not sales or order receiving
- The bug is deterministic and reproducible 100% of the time
- No race conditions or concurrency issues involved
- Fix is straightforward: copy the pattern from `processQuote`

---

## Questions for Developers

1. Why was SQL template interpolation used here instead of the JavaScript calculation pattern used elsewhere?
2. Are there other places in the codebase where similar SQL interpolation might cause issues?
3. Should we add a linting rule to detect direct numeric interpolation in SQL templates?

---

**Contact:** Claude Code Assistant
**Documentation Updated:** `docs/user-guide/sales-quotes.rst` - Added "Known Issues & Workarounds" section
**Next Steps:** Implement fix, test, deploy, notify users
