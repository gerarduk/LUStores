# Legacy Database Schema Comparison

## Overview

This document compares the legacy MySQL/MariaDB schema with the new PostgreSQL schema, highlighting improvements in normalization, relationships, and data integrity.

## Key Improvements

### 1. Proper Many-to-Many Relationships

**Legacy Issue**: The legacy `stock` table had multiple supplier columns (`SUPPLY1`, `SUPPLY2`, `SUPPLY3`) leading to:
- Data redundancy
- Limited supplier relationships
- Difficulty in querying supplier-item relationships

**New Solution**: 
- `sources` junction table linking `items` and `suppliers`
- Unlimited supplier relationships per item
- Clean many-to-many implementation

### 2. Normalization

**Legacy**: Mixed data types and purposes in single tables
**New**: Separated concerns:
- `categories` extracted from item descriptions
- `chargecodes` metadata separated from transactional data
- Order headers and line items split

### 3. Data Integrity

**Legacy**: Limited constraints and relationships
**New**: 
- Proper foreign key constraints
- Standardized field types
- Consistent naming conventions

## Table Mappings

| Legacy Table | New Table(s) | Transformation Type |
|--------------|--------------|-------------------|
| `users` | `users` | Direct mapping with role transformation |
| `stock` | `items` + `categories` + `sources` | Normalization + relationship extraction |
| `supplier` | `suppliers` | Address consolidation |
| `charge` | `chargecodes` | Metadata extraction |
| `issues` | `quotes` + `quote_items` | Business logic transformation |
| `orders` | `orders` + `order_items` | Header/detail separation |

## Field Mappings

### Stock → Items
```
SUPPLY1 → name
YTODATE/SUPPLY3 → sku  
DESC1 + DESC2 + SUPPLY1 → description
CODE/PRICE → price
PREFIX → current_stock
MIN → minimum_stock
HIDDEN ≠ 'Y' → is_active
```

### Supplier Transformation
```
CODE → id
NAME → name
NOTES → contact
TELEPHONE → phone
ADDRESS1 + ADDRESS2 + ADDRESS3 + ADDRESS4 → address
```

### Issues → Quotes
```
PIN → quote_id (prefixed)
COSTCENTRE → charge_code
VALUE → total_amount
REASON → notes
ISSUEDTO, USER, PERIODCODE → customer_info (JSON)
```

## Benefits of New Schema

1. **Scalability**: Can handle complex relationships
2. **Maintainability**: Clear separation of concerns
3. **Performance**: Proper indexing and relationships
4. **Data Quality**: Constraints prevent invalid data
5. **Flexibility**: Easy to extend with new features
