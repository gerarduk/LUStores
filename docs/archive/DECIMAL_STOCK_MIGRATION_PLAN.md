# Decimal Stock Quantities Migration Plan

## Executive Summary

**Objective**: Migrate stock quantities from INTEGER to NUMERIC(10,2) to support fractional quantities (e.g., 10.50 units)

**Impact**: 
- 156 items with fractional stock
- £1,481.47 value recovery (inc VAT)
- Better accuracy for bulk items (cables, liquids, materials)

**Estimated Effort**: 6-10 hours

**Risk Level**: Medium (requires database migration + code changes)

---

## Phase 1: Database Schema Changes

### 1.1 Create Migration File
**File**: `migrations/005_decimal_stock_quantities.sql`

```sql
-- Migration: Support decimal stock quantities
-- Date: 2025-12-01
-- Rationale: Allow fractional quantities for bulk items (cables, liquids, etc.)

BEGIN;

-- Step 1: Alter items table to use NUMERIC for stock columns
ALTER TABLE "items" 
  ALTER COLUMN "current_stock" TYPE NUMERIC(10, 2) USING current_stock::numeric(10, 2),
  ALTER COLUMN "minimum_stock" TYPE NUMERIC(10, 2) USING minimum_stock::numeric(10, 2);

-- Step 2: Update default values to match new type
ALTER TABLE "items" 
  ALTER COLUMN "current_stock" SET DEFAULT 0.00,
  ALTER COLUMN "minimum_stock" SET DEFAULT 0.00;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN "items"."current_stock" IS 'Current stock quantity - supports up to 2 decimal places for fractional units';
COMMENT ON COLUMN "items"."minimum_stock" IS 'Minimum stock threshold - supports up to 2 decimal places';

-- Step 4: Update any existing triggers that might expect integer values
-- (If you have triggers on stock updates, review and update them)

-- Step 5: Verify data integrity
DO $$
BEGIN
  -- Check for any unexpected decimal precision (shouldn't happen, but safe check)
  PERFORM 1 FROM items 
  WHERE current_stock != ROUND(current_stock::numeric, 2)
     OR minimum_stock != ROUND(minimum_stock::numeric, 2);
  
  IF FOUND THEN
    RAISE EXCEPTION 'Data integrity issue: found stock values with more than 2 decimal places';
  END IF;
END $$;

COMMIT;
```

**Rollback Script**: `migrations/005_decimal_stock_quantities_rollback.sql`

```sql
-- Rollback: Revert to integer stock quantities
BEGIN;

-- Truncate decimals (data loss warning!)
ALTER TABLE "items" 
  ALTER COLUMN "current_stock" TYPE INTEGER USING FLOOR(current_stock),
  ALTER COLUMN "minimum_stock" TYPE INTEGER USING FLOOR(minimum_stock);

ALTER TABLE "items" 
  ALTER COLUMN "current_stock" SET DEFAULT 0,
  ALTER COLUMN "minimum_stock" SET DEFAULT 0;

COMMIT;
```

### 1.2 Update Init SQL
**File**: `init.sql` (line 68)

```sql
-- BEFORE:
current_stock INTEGER NOT NULL DEFAULT 0,
minimum_stock INTEGER NOT NULL DEFAULT 0,

-- AFTER:
current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
minimum_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
```

---

## Phase 2: TypeScript Schema Updates

### 2.1 Update Drizzle Schema
**File**: `shared/schema.ts` (lines 84-85)

```typescript
// BEFORE:
currentStock: integer("current_stock").notNull().default(0),
minimumStock: integer("minimum_stock").notNull().default(0),

// AFTER:
currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default("0.00"),
minimumStock: decimal("minimum_stock", { precision: 10, scale: 2 }).notNull().default("0.00"),
```

### 2.2 Update Zod Validation Schemas
**File**: `shared/schema.ts` (search for `createInsertSchema`)

```typescript
// Add custom refinements for stock validation
export const insertItemSchema = createInsertSchema(items, {
  currentStock: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Stock must be a valid number with up to 2 decimal places")
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, "Stock cannot be negative")
    .refine(val => val <= 99999999.99, "Stock value too large"),
  minimumStock: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Minimum stock must be a valid number with up to 2 decimal places")
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, "Minimum stock cannot be negative"),
});
```

### 2.3 Update TypeScript Types
Create type helper for stock quantities:

```typescript
// shared/types.ts
export type StockQuantity = string; // Stored as string to preserve precision
export type StockNumber = number; // Parsed numeric value

export function formatStockQuantity(qty: string | number): string {
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  return num.toFixed(2);
}

export function formatStockDisplay(qty: string | number): string {
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  // Only show decimals if they're non-zero
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}
```

---

## Phase 3: Backend API Updates

### 3.1 Route Handler Updates
**File**: `server/routes.ts`

#### Location 1: Create Item (line ~202)
```typescript
// BEFORE:
currentStock: parseInt(req.body.currentStock || 0),

// AFTER:
currentStock: parseFloat(req.body.currentStock || 0).toFixed(2),
```

#### Location 2: Update Item (line ~372)
```typescript
// BEFORE:
currentStock: parseInt(req.body.currentStock) || 0,

// AFTER:
currentStock: req.body.currentStock ? parseFloat(req.body.currentStock).toFixed(2) : undefined,
```

#### Location 3: Stock Adjustment (line ~635)
```typescript
// BEFORE:
await storage.updateItem(parseInt(itemId), { currentStock: 0 }, currentUserId);

// AFTER:
await storage.updateItem(parseInt(itemId), { currentStock: "0.00" }, currentUserId);
```

#### Location 4: Stock Availability Check (line ~1085, ~2044, ~2133)
```typescript
// BEFORE:
available: dbItem && dbItem.currentStock >= item.quantity,
currentStock: dbItem?.currentStock || 0,

// AFTER:
available: dbItem && parseFloat(dbItem.currentStock) >= parseFloat(item.quantity),
currentStock: dbItem?.currentStock || "0.00",
```

#### Location 5: Stock Value Calculations (line ~2156, ~2245)
```typescript
// BEFORE:
totalLowStockValue: lowStockItems.reduce((sum, item) => 
  sum + (parseFloat(item.price.toString()) * item.currentStock), 0),

// AFTER:
totalLowStockValue: lowStockItems.reduce((sum, item) => 
  sum + (parseFloat(item.price.toString()) * parseFloat(item.currentStock)), 0),
```

### 3.2 Storage Layer Updates
**File**: `server/storage.ts`

Search for all `currentStock` operations and ensure they handle decimal strings:

```typescript
// Stock update example
async updateItemStock(itemId: number, quantity: string, userId: string) {
  // Validate decimal
  const qtyNum = parseFloat(quantity);
  if (isNaN(qtyNum) || qtyNum < 0) {
    throw new Error("Invalid stock quantity");
  }
  
  const result = await db.update(items)
    .set({ 
      currentStock: quantity,
      updatedBy: userId,
      updatedAt: new Date()
    })
    .where(eq(items.id, itemId))
    .returning();
    
  return result[0];
}
```

---

## Phase 4: Frontend Updates

### 4.1 Input Components
**Files**: `client/src/components/ItemModal.tsx`, `client/src/components/InventoryTable.tsx`

```tsx
// Stock input field update
<Input
  type="number"
  step="0.01"  // Allow decimal input
  min="0"
  name="currentStock"
  placeholder="Current Stock"
  value={formData.currentStock}
  onChange={(e) => {
    const value = e.target.value;
    // Validate decimal places
    if (value.includes('.') && value.split('.')[1].length > 2) {
      return; // Don't allow more than 2 decimal places
    }
    setFormData({...formData, currentStock: value});
  }}
/>
```

### 4.2 Display Components
**Strategy**: Only show decimals when relevant

```tsx
// Helper function for smart display
function formatStockDisplay(stock: string | number): string {
  const num = typeof stock === 'string' ? parseFloat(stock) : stock;
  // Show decimals only if non-zero
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}

// Usage in table cells
<TableCell>{formatStockDisplay(item.currentStock)}</TableCell>
```

#### Files to Update:
1. **`client/src/components/InventoryTable.tsx`**
   - Stock column display
   - Low stock indicator logic

2. **`client/src/components/ItemModal.tsx`**
   - Stock input fields
   - Display in view mode

3. **`client/src/pages/Dashboard.tsx`**
   - Stock statistics
   - Low stock alerts

4. **`client/src/pages/Sales.tsx`**
   - Quantity available display
   - Stock reduction preview

5. **`client/src/pages/Orders.tsx`**
   - Order quantity input
   - Stock level display

### 4.3 Validation Updates
```tsx
// Zod schema for form validation
const stockSchema = z.object({
  currentStock: z.string()
    .regex(/^\d+(\.\d{0,2})?$/, "Invalid stock format")
    .refine(val => parseFloat(val) >= 0, "Stock must be positive")
    .refine(val => parseFloat(val) <= 99999999.99, "Stock value too large"),
});
```

---

## Phase 5: Sales & Billing Updates

### 5.1 Sale Items Table
**File**: `shared/schema.ts` (line ~147)

```typescript
// BEFORE:
quantity: integer("quantity").notNull(),

// AFTER:
quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
```

**Migration**: `migrations/005_decimal_stock_quantities.sql` (add to existing)
```sql
-- Update sale_items quantity to support decimals
ALTER TABLE "sale_items" 
  ALTER COLUMN "quantity" TYPE NUMERIC(10, 2) USING quantity::numeric(10, 2);
```

### 5.2 Order Items Table
**File**: `shared/schema.ts` (line ~247)

```typescript
// BEFORE:
quantity: integer("quantity").notNull(),

// AFTER:
quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
```

**Migration**: Add to `migrations/005_decimal_stock_quantities.sql`
```sql
-- Update order_items quantity to support decimals
ALTER TABLE "order_items" 
  ALTER COLUMN "quantity" TYPE NUMERIC(10, 2) USING quantity::numeric(10, 2);
```

### 5.3 Stock Movements Table
**Search**: Find stock_movements definition and update quantity column

```typescript
quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
```

### 5.4 Quote Items Table
**Similar update needed for quote_items if it exists**

---

## Phase 6: Reporting & Analytics

### 6.1 Dashboard Statistics
**File**: `server/routes.ts` (Dashboard endpoint)

```typescript
// Update all calculations to handle decimal quantities
const totalStockValue = items.reduce((sum, item) => {
  const price = parseFloat(item.price);
  const stock = parseFloat(item.currentStock);
  const vatRate = parseFloat(item.vatRate);
  
  if (item.vatIncluded) {
    return sum + (price * stock);
  } else {
    return sum + (price * stock * (1 + vatRate));
  }
}, 0);
```

### 6.2 Reports
Update all report generation to format decimals appropriately:

```typescript
// Sales report
salesData.items.map(item => ({
  ...item,
  quantity: formatStockDisplay(item.quantity),
  value: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2)
}));
```

---

## Phase 7: Data Migration Script Updates

### 7.1 Remove Integer Truncation
**File**: `scripts/data_migration_script.py` (line ~930)

```python
# BEFORE:
target_current_stock = int(source_balance_raw)  # Truncate
target_minimum_stock = int(self._safe_decimal(item.get('MIN')))

# AFTER:
# Keep decimal precision
target_current_stock = source_balance_raw.quantize(Decimal('0.01'))
target_minimum_stock = self._safe_decimal(item.get('MIN')).quantize(Decimal('0.01'))
```

### 7.2 Remove Rounding Loss Tracking
Since we're keeping decimals, this becomes unnecessary:

```python
# Can remove or comment out rounding loss tracking
# The fractional_stock_items tracking is no longer needed
```

### 7.3 Update Value Tracking
```python
# Remove the int() conversion completely
target_stock_decimal = source_balance.quantize(Decimal('0.01'))
target_value_exc_vat = source_price_exc_vat * target_stock_decimal
# No rounding loss anymore!
```

---

## Phase 8: Testing Plan

### 8.1 Database Tests
```sql
-- Test 1: Verify decimal precision
INSERT INTO items (name, sku, category_id, price, current_stock, minimum_stock)
VALUES ('Test Cable', 'TEST-001', 1, 10.50, 15.75, 5.25);

SELECT current_stock, minimum_stock FROM items WHERE sku = 'TEST-001';
-- Expected: 15.75, 5.25

-- Test 2: Verify calculations
SELECT 
  current_stock,
  price,
  current_stock * price as value
FROM items WHERE sku = 'TEST-001';
-- Expected: 15.75, 10.50, 165.375
```

### 8.2 API Tests
```typescript
// Test decimal stock create
const response = await fetch('/api/items', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Test Item',
    sku: 'TEST-002',
    currentStock: '25.50',
    minimumStock: '10.25'
  })
});
// Verify response has exact decimal values

// Test stock update
await fetch(`/api/items/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ currentStock: '33.33' })
});
```

### 8.3 Frontend Tests
1. **Input validation**
   - Enter 10.5 → accept
   - Enter 10.555 → reject (too many decimals)
   - Enter -5 → reject (negative)
   - Enter 10 → accept and display as "10" (not "10.00")

2. **Display tests**
   - Whole numbers show without decimals: 10
   - Fractional numbers show with decimals: 10.50
   - Large numbers format correctly: 1,234.50

3. **Sales flow**
   - Select item with 15.75 stock
   - Sell 5.25 units
   - Verify remaining: 10.50
   - Verify receipt shows 5.25 units

### 8.4 Integration Tests
1. **Full sales workflow**
   - Create item with 100.50 stock
   - Process sale of 25.75 units
   - Verify stock movement record
   - Verify final stock: 74.75

2. **Order receiving workflow**
   - Create order for 50.25 units
   - Receive order
   - Verify stock increases by exact amount

3. **Reporting workflow**
   - Generate sales report
   - Verify quantities show decimals where relevant
   - Verify totals calculate correctly

---

## Phase 9: Documentation Updates

### 9.1 User Documentation
**File**: Create `docs/DECIMAL_STOCK_GUIDE.md`

```markdown
# Using Decimal Stock Quantities

## Overview
The system now supports fractional stock quantities (e.g., 10.50 units) for items 
sold in bulk or partial units.

## When to Use Decimals
- Cables sold by the meter
- Liquids sold by the liter
- Materials sold by weight
- Any item where partial units make sense

## How to Enter Decimals
- Use a period (.) for decimals: 10.50
- Maximum 2 decimal places: 10.55 ✓, 10.555 ✗
- Whole numbers can be entered without decimals: 10

## Display Format
- Whole quantities display without decimals: "10"
- Fractional quantities show 2 decimals: "10.50"

## Examples
- Cable: 150.50 meters
- Paint: 5.75 liters
- Screws: 100 pieces (whole number)
```

### 9.2 API Documentation
Update API docs to reflect decimal string format for quantity fields.

### 9.3 Database Documentation
Update ER diagrams to show NUMERIC(10,2) type.

---

## Phase 10: Deployment Strategy

### 10.1 Pre-Deployment Checklist
- [ ] Create database backup
- [ ] Review all code changes
- [ ] Run all tests locally
- [ ] Test migration script on development database
- [ ] Verify rollback script works
- [ ] Update monitoring for decimal-related errors

### 10.2 Deployment Steps

#### Step 1: Database Migration (Maintenance Window)
```bash
# 1. Backup database
pg_dump university_inventory > backup_pre_decimal_$(date +%Y%m%d).sql

# 2. Run migration
psql university_inventory < migrations/005_decimal_stock_quantities.sql

# 3. Verify migration
psql university_inventory -c "
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'items' 
  AND column_name IN ('current_stock', 'minimum_stock');"

# Expected output: both show numeric(10,2)
```

#### Step 2: Deploy Code Changes
```bash
# Deploy backend first
git pull origin main
npm install
npm run build
pm2 restart all

# Deploy frontend
cd client
npm install
npm run build
```

#### Step 3: Verify Deployment
- Test create item with decimal stock
- Test update stock with decimal
- Test sales flow with decimal quantities
- Check dashboard displays correctly

### 10.3 Rollback Plan
If issues occur:

```bash
# 1. Restore from backup
psql university_inventory < backup_pre_decimal_$(date +%Y%m%d).sql

# 2. Revert code
git revert <commit-hash>
npm run build
pm2 restart all
```

---

## Phase 11: Post-Deployment

### 11.1 Monitoring
- Watch for decimal parsing errors
- Monitor database query performance
- Check for display issues on frontend
- Review user feedback

### 11.2 Data Quality Checks
```sql
-- Check for unexpected precision
SELECT id, sku, current_stock 
FROM items 
WHERE current_stock != ROUND(current_stock, 2);

-- Check for negative values
SELECT id, sku, current_stock 
FROM items 
WHERE current_stock < 0;

-- Check for extremely large values
SELECT id, sku, current_stock 
FROM items 
WHERE current_stock > 1000000;
```

### 11.3 User Training
- Notify users of decimal support
- Provide examples of when to use decimals
- Update help documentation
- Address questions/concerns

---

## Risk Assessment & Mitigation

### High Risk
**Risk**: Data loss during migration
- **Mitigation**: Full database backup, test on staging first, have rollback ready

**Risk**: Calculation errors in pricing/totals
- **Mitigation**: Comprehensive test suite, validate all arithmetic operations

### Medium Risk
**Risk**: Display inconsistencies
- **Mitigation**: Smart display logic (show decimals only when relevant)

**Risk**: User confusion
- **Mitigation**: Clear documentation, training, helpful input validation messages

### Low Risk
**Risk**: Performance impact
- **Mitigation**: NUMERIC(10,2) has minimal performance overhead vs INTEGER

---

## Success Criteria

✅ **Technical Success**
- All 156 items with fractional stock migrate without loss
- £1,481.47 value recovery confirmed
- Zero rounding errors in calculations
- All tests passing

✅ **User Success**
- Users can enter decimal quantities easily
- Display is clear and not confusing
- No workflow disruptions
- Positive user feedback

✅ **Business Success**
- Accurate inventory tracking for bulk items
- Improved financial reporting accuracy
- Reduced manual adjustments needed
- Better alignment with real-world usage

---

## Timeline

**Estimated: 2-3 working days**

### Day 1: Development
- Morning: Database migration + schema updates (2-3 hours)
- Afternoon: Backend API updates (3-4 hours)

### Day 2: Frontend & Testing
- Morning: Frontend updates (3-4 hours)
- Afternoon: Testing + fixes (3-4 hours)

### Day 3: Deployment & Verification
- Morning: Staging deployment + testing (2 hours)
- Afternoon: Production deployment + monitoring (2 hours)

---

## Appendix: Complete File Change List

### Database Files
- `migrations/005_decimal_stock_quantities.sql` ✨ NEW
- `migrations/005_decimal_stock_quantities_rollback.sql` ✨ NEW
- `init.sql` 🔧 MODIFY

### Schema Files
- `shared/schema.ts` 🔧 MODIFY (multiple locations)
- `shared/types.ts` 🔧 MODIFY (add helper functions)

### Backend Files
- `server/routes.ts` 🔧 MODIFY (~15 locations)
- `server/storage.ts` 🔧 MODIFY (stock update methods)

### Frontend Files
- `client/src/components/ItemModal.tsx` 🔧 MODIFY
- `client/src/components/InventoryTable.tsx` 🔧 MODIFY
- `client/src/pages/Dashboard.tsx` 🔧 MODIFY
- `client/src/pages/Sales.tsx` 🔧 MODIFY
- `client/src/pages/Orders.tsx` 🔧 MODIFY

### Migration Script
- `scripts/data_migration_script.py` 🔧 MODIFY (remove int() conversion)

### Documentation
- `docs/DECIMAL_STOCK_GUIDE.md` ✨ NEW
- `README.md` 🔧 MODIFY (add note about decimal support)
- `diagrams/database-entity-relationships.md` 🔧 MODIFY

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create feature branch**: `feature/decimal-stock-quantities`
3. **Begin Phase 1**: Database migration file
4. **Test on development database**
5. **Proceed through phases systematically**
6. **Deploy to staging environment**
7. **Final production deployment**

---

**Document Version**: 1.0  
**Last Updated**: December 1, 2025  
**Author**: Migration Planning Team  
**Status**: Ready for Implementation
