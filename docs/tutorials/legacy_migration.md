# Legacy Data Migration Tutorial

## Overview

This tutorial explains how to migrate data from the legacy physics_stores MySQL/MariaDB database to the new PostgreSQL schema.

## Prerequisites

- Python 3.8+
- PostgreSQL database
- Access to legacy MySQL/MariaDB database or SQL dump
- Required Python packages (see `migration-requirements.txt`)

## Installation

```bash
pip install -r migration-requirements.txt
```

## Migration Process

### 1. Prepare Your Data

**Option A: Direct Database Connection**
```bash
python migrate_legacy_data.py \
  --mysql-db \
  --mysql-host your-mysql-host \
  --mysql-user your-username \
  --mysql-password your-password \
  --mysql-database physics_stores \
  --pg-connection "postgresql://user:pass@localhost/newdb"
```

**Option B: SQL Dump File**
```bash
python migrate_legacy_data.py \
  --sql-file path/to/dev-samples/legacy/physics_stores_backup.sql \
  --pg-connection "postgresql://user:pass@localhost/newdb"
```

### 2. Migration Steps

The migration follows this order:

1. **Users**: Migrated first for foreign key requirements
2. **Suppliers**: Created with address consolidation
3. **Categories & Items**: Stock normalized into items with categories
4. **Sources**: Item-supplier relationships established
5. **Chargecodes**: Metadata extracted from charge records
6. **Quotes**: Issues converted to pending quotes
7. **Orders**: Split into orders and order_items

### 3. Error Handling

The migration includes comprehensive error tracking:
- Errors logged without stopping migration
- Detailed error reports generated
- Statistics provided for each table

### 4. Validation

After migration, verify:
- Record counts match expectations
- Foreign key relationships intact
- Sample data review

## Key Transformations

### Stock Items
- **Name**: Derived from SUPPLY1 field
- **SKU**: Uses YTODATE or SUPPLY3 as unique identifier
- **Categories**: Auto-categorized based on description keywords
- **Suppliers**: Linked via new sources table

### Issues to Quotes
- Issues represent "shopping carts" or pending quotes
- Converted to formal quote structure
- Customer information preserved in JSON format

### Orders
- Split into header (orders) and line items (order_items)
- Maintains supplier relationships
- Tracks outstanding quantities

## Troubleshooting

### Common Issues

1. **Missing Foreign Keys**: Ensure users are migrated first
2. **Data Type Errors**: Check for NULL/empty values in required fields
3. **Duplicate SKUs**: Review YTODATE and SUPPLY3 field uniqueness

### Recovery

If migration fails partway:
1. Check error logs in migration report
2. Fix data issues in source
3. Clear target tables if needed
4. Restart migration

## Output Files

- `legacy_migration_report.md`: Comprehensive migration report
- `docs/explanations/legacy_migration_report.md`: Documentation copy
- Console output: Real-time progress and statistics
