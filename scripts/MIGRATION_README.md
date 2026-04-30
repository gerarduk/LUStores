# Database Migration System

This system provides comprehensive tools for migrating data from the legacy "physicsstores" database to the modern "university_inventory" database.

## Files Overview

1. **`data_migration_script.py`** - Main migration script with intelligent mapping logic
2. **`quick_migration.py`** - Simplified runner that uses schema export files
3. **`database_schemas_export_*.json`** - Schema export files containing both database structures

## Key Features

### Intelligent Data Mapping

The migration script handles complex transformations between the legacy and modern schemas:

- **Users**: Maps legacy user levels to modern role system (admin/manager/user)
- **Categories**: Auto-creates categories based on stock item prefixes
- **Items**: Combines DESC1/DESC2 fields and maps to modern item structure
- **Suppliers**: Consolidates address fields and maps contact information
- **Orders**: Converts denormalized order records to normalized orders + order_items
- **Stock Movements**: Transforms legacy "issues" into modern stock movement tracking
- **Charge Codes**: Maps legacy charge codes to modern charge code system

### Data Safety Features

- **Null Value Handling**: Automatically adds null values where required
- **Data Validation**: Validates and cleans data during migration
- **Error Recovery**: Continues migration even if individual records fail
- **Transaction Safety**: Uses database transactions for data consistency
- **Comprehensive Logging**: Detailed logs for troubleshooting and auditing

## Quick Start

### Method 1: Using the Quick Migration Runner

```bash
# 1. Export your schemas using the web interface "Export Schemas to JSON" button
# 2. Run the quick migration script
python quick_migration.py path/to/database_schemas_export_20250911_152208.json
```

The script will prompt you for database passwords and automatically run the migration.

### Method 2: Manual Command Line

```bash
python data_migration_script.py \
  --schema-file database_schemas_export_20250911_152208.json \
  --source-host py-it.lancs.ac.uk \
  --source-port 3306 \
  --source-user root \
  --source-password YOUR_SOURCE_PASSWORD \
  --source-database physicsstores \
  --target-host py-stores.lancs.ac.uk \
  --target-port 5432 \
  --target-user postgres \
  --target-password YOUR_TARGET_PASSWORD \
  --target-database university_inventory
```

## Migration Process

The migration follows this order to respect foreign key dependencies:

1. **Users** - Create user accounts with appropriate roles
2. **Categories** - Generate categories from stock prefixes
3. **Suppliers** - Migrate supplier information
4. **Items** - Migrate stock items with category associations
5. **Charge Codes** - Migrate legacy charge codes
6. **Orders** - Convert denormalized orders to normalized structure
7. **Stock Movements** - Transform issues into stock movements

## Data Transformation Examples

### Legacy Stock → Modern Items

```
Legacy:
- CODE: "LAB001"
- PREFIX: "LAB"
- DESC1: "Laboratory Beaker"
- DESC2: "250ml Glass"
- PRICE: 15.50
- BALANCE: 25

Modern:
- name: "Laboratory Beaker"
- sku: "LAB001"
- description: "Laboratory Beaker - 250ml Glass"
- category_id: [auto-created "Lab" category]
- price: 15.50
- current_stock: 25
```

### Legacy Orders → Modern Orders + Order Items

```
Legacy (denormalized):
- ORDER_NO: "ORD001"
- STOCK_CODE: "LAB001"
- QTY: 10
- PRICE: 15.50

Modern (normalized):
Orders table:
- order_id: "ORD001"
- total_amount: 155.00

Order_items table:
- order_id: [foreign key to orders]
- item_id: [foreign key to items]
- quantity: 10
- unit_cost: 15.50
```

## Migration Statistics

The script provides detailed statistics:

```
MIGRATION SUMMARY
================================================================
users               :     15 migrated,      0 errors,      0 skipped
categories          :      8 migrated,      0 errors,      0 skipped
suppliers           :     45 migrated,      2 errors,      0 skipped
items               :    892 migrated,      5 errors,      3 skipped
chargecodes         :     23 migrated,      0 errors,      0 skipped
orders              :    156 migrated,      3 errors,      0 skipped
order_items         :    634 migrated,     12 errors,      0 skipped
stock_movements     :   2341 migrated,     18 errors,     15 skipped
----------------------------------------------------------------
TOTAL               :   4114 migrated,     40 errors
Success rate: 99.0%
```

## Error Handling

- **Individual Record Failures**: If one record fails, the migration continues with others
- **Missing References**: Handles missing foreign key references gracefully
- **Data Type Conversion**: Safely converts between different data types
- **Length Validation**: Truncates strings that exceed field limits
- **Null Value Management**: Adds appropriate null values for optional fields

## Logging

All migration activity is logged to:
- **Console**: Real-time progress updates
- **data_migration.log**: Detailed log file with timestamps

## Prerequisites

```bash
pip install pymysql psycopg2-binary
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify database credentials and network connectivity
2. **Missing Dependencies**: Install required Python packages
3. **Foreign Key Errors**: Check that target database schema is properly initialized
4. **Permission Errors**: Ensure database users have appropriate permissions

### Manual Data Cleanup

After migration, you may want to:

1. **Review Error Logs**: Check for any records that failed to migrate
2. **Validate Data**: Spot-check migrated data for accuracy
3. **Update Sequences**: Reset PostgreSQL sequences if needed
4. **Rebuild Indexes**: Optimize performance after bulk insert

## Schema Compatibility

The migration script is designed for the specific schema pair:
- **Source**: Legacy "physicsstores" (MySQL/MariaDB)
- **Target**: Modern "university_inventory" (PostgreSQL)

For different schemas, you'll need to modify the mapping logic in the migration script.

## Performance Considerations

- **Batch Processing**: Processes records in batches for efficiency
- **Transaction Management**: Uses appropriate transaction boundaries
- **Memory Usage**: Streams large datasets to avoid memory issues
- **Network Optimization**: Minimizes database round trips

## Security Notes

- **Password Handling**: Passwords are not stored in schema exports
- **Connection Security**: Use secure connections for production migrations
- **Data Validation**: All data is validated before insertion
- **Audit Trail**: Complete logging for compliance requirements
