# Legacy Data Migration Guide

This document explains how to migrate data from the legacy MySQL/MariaDB physics stores database to the new PostgreSQL schema.

## Overview

The migration script (`migrate_legacy_data.py`) supports two data sources:
1. **Direct MySQL/MariaDB connection** (recommended for live databases)
2. **SQL backup file parsing** (for existing dump files)

The script transforms and imports data from the legacy system into the new schema structure. Here's the mapping:

### Table Mappings

| Legacy Table | New Table(s) | Description |
|--------------|--------------|-------------|
| `users` | `users` | User accounts with role mapping and UUID generation |
| `stock` | `items` + `categories` | Inventory items with automatic category creation |
| `supplier` | N/A | Supplier information integrated into item descriptions |
| `charge` | `sales` + `sale_items` | Completed transactions |
| `issues` | `quotes` + `quote_items` | Pending requests treated as draft quotes |
| `orders` | N/A | Historical data (can be added as sales if needed) |
| `periods` | N/A | Reference data (not migrated) |
| `vatparams` | N/A | VAT configuration integrated into items |

### Key Transformations

1. **User IDs**: Legacy integer IDs → UUID strings
2. **Categories**: Auto-generated from stock item patterns
3. **SKUs**: Legacy stock IDs → `LEGACY-{id}` format
4. **Prices**: Decimal precision handling
5. **VAT**: 20% default rate applied consistently
6. **Dates**: Legacy date formats → PostgreSQL timestamps

## Prerequisites

1. **Python 3.7+** with pip
2. **PostgreSQL database** with the new schema already created
3. **Database connection details** (host, port, database, username, password)
4. **MySQL/MariaDB access** (if using direct database connection)

## Installation

1. Install Python dependencies:
```bash
pip install -r migration-requirements.txt
```

2. Ensure your PostgreSQL database is running and accessible

3. Verify the database schema is up to date by running migrations in your application

## Usage

### Method 1: Direct MySQL Database Connection (Recommended)

Connect directly to the legacy MySQL/MariaDB database:

```bash
python migrate_legacy_data.py \
  --mysql-db \
  --mysql-host py-it.lancs.ac.uk \
  --mysql-user your_username \
  --mysql-password your_password \
  --mysql-database physics_stores \
  --pg-connection "postgresql://username:password@localhost:5432/database_name"
```

### Method 2: SQL File Parsing

Parse an existing SQL backup file:

```bash
python migrate_legacy_data.py \
  --sql-file "dev-samples/legacy/physics_stores_backup-Friday-18h.sql" \
  --pg-connection "postgresql://username:password@localhost:5432/database_name"
```

### Dry Run (Parse Only)

To test the data loading without making any database changes:

**From MySQL database:**
```bash
python migrate_legacy_data.py \
  --mysql-db \
  --mysql-host py-it.lancs.ac.uk \
  --mysql-user your_username \
  --mysql-password your_password \
  --mysql-database physics_stores \
  --pg-connection "postgresql://username:password@localhost:5432/database_name" \
  --dry-run
```

**From SQL file:**
```bash
python migrate_legacy_data.py \
  --sql-file "dev-samples/legacy/physics_stores_backup-Friday-18h.sql" \
  --pg-connection "postgresql://username:password@localhost:5432/database_name" \
  --dry-run
```

### PowerShell Helper Script

Use the provided PowerShell script for easier execution:

**Direct MySQL connection:**
```powershell
.\run-migration.ps1 -UseMySQL -MySQLUser "your_username" -MySQLPassword "your_password"
```

**SQL file parsing:**
```powershell
.\run-migration.ps1 -SqlFile "dev-samples\legacy\physics_stores_backup-Friday-18h.sql"
```

**Dry run:**
```powershell
.\run-migration.ps1 -UseMySQL -MySQLUser "your_username" -DryRun
```

### Connection String Examples

**Local PostgreSQL:**
```
postgresql://postgres:password@localhost:5432/lustores
```

**Remote PostgreSQL:**
```
postgresql://user:pass@host.example.com:5432/dbname
```

**With SSL:**
```
postgresql://user:pass@host.example.com:5432/dbname?sslmode=require
```

## Data Source Options

### Direct MySQL Connection (Recommended)

**Advantages:**
- Always gets the latest data from the live database
- More reliable data type handling
- Automatic handling of MySQL-specific date formats
- Better error reporting for connection issues
- No need to generate and transfer large SQL dump files

**Requirements:**
- Network access to the MySQL server (py-it.lancs.ac.uk)
- Valid MySQL credentials
- PyMySQL Python package (included in requirements)

### SQL File Parsing

**Advantages:**
- Works offline once you have the SQL dump
- No need for ongoing database access
- Can work with historical backups

**Disadvantages:**
- Data may be outdated depending on when the dump was created
- Requires manual SQL parsing which may miss edge cases
- Larger files require more memory

## Migration Process

The script performs these steps in order:

1. **Load Legacy Data**
   - **MySQL mode**: Connects to database and reads tables directly
   - **File mode**: Parses CREATE TABLE structures and INSERT statements
   - Builds in-memory data structures

2. **Migrate Users**
   - Generates new UUIDs
   - Maps legacy access levels to roles
   - Forces password changes for security

3. **Process Reference Data**
   - Extracts supplier information
   - Processes VAT parameters

4. **Create Categories and Items**
   - Auto-generates categories based on item descriptions
   - Creates inventory items with supplier info in descriptions
   - Maps legacy stock IDs to new item IDs

5. **Migrate Sales Data**
   - Groups charge records by charge_id
   - Creates sales with calculated totals
   - Creates individual sale items

6. **Migrate Quotes**
   - Converts issues to draft quotes
   - Creates quote items where possible

7. **Generate Summary Report**
   - Shows record counts for all tables
   - Displays mapping statistics

## Data Validation

After migration, verify:

1. **User count matches** between legacy and new system
2. **Item stock levels** are correctly transferred
3. **Sales totals** calculate correctly with VAT
4. **Foreign key relationships** are properly established

### Validation Queries

```sql
-- Check user migration
SELECT COUNT(*) FROM users;

-- Check items with categories
SELECT c.name, COUNT(i.id) as item_count 
FROM categories c 
LEFT JOIN items i ON c.id = i.category_id 
GROUP BY c.name;

-- Check sales totals
SELECT COUNT(*) as sales_count, 
       SUM(total_amount) as total_sales 
FROM sales;

-- Check quotes
SELECT COUNT(*) as quote_count, 
       SUM(total_amount) as total_quotes 
FROM quotes;
```

## Common Issues and Solutions

### 1. Connection Errors
- Verify PostgreSQL is running
- Check connection string format
- Ensure database exists and user has permissions

### 2. Data Parsing Errors
- Check for special characters in legacy data
- Verify SQL file encoding (should be UTF-8)
- Review any warnings about unparseable dates

### 3. Foreign Key Violations
- Ensure users are migrated first
- Check that referenced items exist before creating sales/quotes

### 4. Duplicate Data
- The script handles conflicts for users (by email) and categories (by name)
- For items, it uses unique SKUs to prevent duplicates

## Rollback Procedure

If you need to rollback the migration:

```sql
-- WARNING: This will delete all migrated data
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM quote_items; 
DELETE FROM quotes;
DELETE FROM stock_movements;
DELETE FROM items;
DELETE FROM categories;
DELETE FROM users WHERE id LIKE '%-%-%-%-%'; -- UUIDs only
```

## Custom Modifications

The script can be modified for specific requirements:

1. **Category Logic**: Edit `_extract_category()` method
2. **User Role Mapping**: Modify `_map_user_role()` method  
3. **VAT Rates**: Adjust VAT calculation logic
4. **Date Parsing**: Update `_parse_legacy_date()` for different formats

## Support

For issues or questions:
1. Check the console output for specific error messages
2. Review the PostgreSQL logs for database-related errors
3. Use the dry-run mode to test parsing without database changes
