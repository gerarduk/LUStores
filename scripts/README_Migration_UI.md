# Enhanced Interactive Migration UI

## Overview

This Flask web application transforms the existing "fire-and-forget" migration script into an interactive, visual interface for mapping legacy database columns to the new PostgreSQL schema. It provides a sophisticated approach to data migration with real-time editing, validation, selective record migration, and multi-table mapping capabilities.

## 🆕 New Enhanced Features

### ✅ **Secure Password Handling**
- **bcrypt Implementation**: All legacy passwords are now properly hashed using bcrypt before migration
- **Security Compliance**: Meets industry standards for password storage
- **Fallback Protection**: Graceful degradation if bcrypt is unavailable

### ✅ **Granular Record Control**
- **Individual Selection**: Choose specific records to migrate using checkboxes
- **Bulk Operations**: Select All/None and Toggle Selection for efficient management
- **Selective Migration**: Migrate only chosen records, ignore the rest
- **Progress Tracking**: Real-time count of selected vs available records

### ✅ **Entry Filtering & Exclusion**
- **Ignore Functionality**: Mark irrelevant records to exclude from migration
- **Visual Indicators**: Ignored records are clearly marked with distinctive styling
- **Reversible Actions**: Unignore records with a single click
- **Smart Selection**: Ignored records are automatically excluded from bulk selections

## Features

### 🎯 Core Functionality
- **Tab-based Interface**: Each legacy table gets its own tab for focused mapping
- **Visual Column Mapping**: Clear OLD DB COLUMNS → ENTRIES → NEW DB COLUMNS layout
- **Editable Data**: Edit data entries before migration to clean up inconsistencies
- **Multi-table Mapping**: Map one legacy table to multiple new tables
- **Primary/Foreign Key Handling**: Automatic PK/FK relationship detection and linking
- **Real-time Validation**: Validate mappings before executing migration

### 🔧 Advanced Features
- **Data Type Validation**: Automatic data type checking and conversion
- **Transform Functions**: Apply data transformations (uppercase, date formatting, etc.)
- **Preview Mode**: See exactly how data will be transformed before migration
- **Save/Load Mappings**: Persist mapping configurations for reuse
- **Progress Tracking**: Real-time migration progress with detailed logging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Flask Migration UI                       │
├─────────────────────────────────────────────────────────────┤
│  Setup Page          │  Main Interface    │  Preview Modal  │
│  - DB Connections    │  - Tab per Table   │  - Transform    │
│  - Data Loading      │  - Column Mapping  │    Preview      │
│  - Schema Detection  │  - Multi-table     │  - Validation   │
│                      │    Support         │    Results      │
├─────────────────────────────────────────────────────────────┤
│              Enhanced Migration Engine                      │
│  - Legacy Data Parser    │  - Schema Analyzer              │
│  - Validation Engine     │  - Transform Engine             │
│  - FK Dependency Solver  │  - Migration Executor           │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (New)        │  MySQL/SQL File (Legacy)       │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start the Migration UI
```bash
cd /home/user/LUStores/scripts
./start_migration_ui.sh
```

### 2. Open Browser
Navigate to: `http://localhost:5001`

### 3. Setup Database Connections
- **PostgreSQL**: Enter connection string for your new database
- **Legacy Data**: Choose MySQL connection or SQL backup file

### 4. Load Legacy Data
- Click "Load Legacy Data" to import your legacy database
- Review the data summary showing record counts per table

### 5. Map Columns
- Use the tab interface to map each legacy table
- For each legacy column:
  - View sample data
  - Edit data if needed
  - Select target table from dropdown
  - Select target column from dropdown
  - Choose data transformation if needed

### 6. 🆕 Select Records (New!)
- **Record Selection Controls**: Use the enhanced record selection interface
  - View all records in a scrollable table
  - Use checkboxes to select individual records for migration
  - **Select All/None**: Bulk selection operations
  - **Toggle Selection**: Invert current selection
  - **Ignore Records**: Mark irrelevant records to exclude
- **Smart Migration**: Only selected records will be migrated
- **Progress Tracking**: See selected count in real-time

### 7. 🆕 Migrate Selected Records
- Click "Migrate Selected" to migrate only chosen records
- **Confirmation Dialog**: Review selection before proceeding
- **Secure Password Migration**: Passwords automatically hashed with bcrypt
- **Detailed Results**: See exact counts of migrated/ignored/total records

## Interface Layout

### Main Mapping Table
```
┌─────────────────┬─────────────┬─────────────┬─────────────┬─────────────┬──────────┬───────────┬─────────┐
│ Legacy Column   │ Sample Data │ Editable    │ Target      │ Target      │ Data     │ Transform │ Actions │
│                 │             │ Data        │ Table ▼     │ Column ▼    │ Type     │ Function  │         │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼──────────┼───────────┼─────────┤
│ NAME            │ Bed         │ [Bed      ] │ items ▼     │ name ▼      │ VARCHAR  │ trim ▼    │ [🗑️]   │
│ SKU             │ 1000-1      │ [1000-1   ] │ items ▼     │ sku ▼       │ VARCHAR  │ none ▼    │ [🗑️]   │
│ TEXT            │ 4 posts...  │ [4 posts  ] │ items ▼     │ description │ TEXT     │ none ▼    │ [🗑️]   │
│ ...             │ ...         │ ...         │ ...         │ ...         │ ...      │ ...       │ ...     │
└─────────────────┴─────────────┴─────────────┴─────────────┴─────────────┴──────────┴───────────┴─────────┘
```

### Multi-Table Mapping
When one legacy table needs to map to multiple new tables:
1. Click "Add Multi-Table Mapping"
2. Select additional target tables
3. Choose which columns from each table to include
4. The system handles PK/FK relationships automatically

## Key Benefits Over Original Script

### ❌ Old "Fire-and-Forget" Approach
- Blind data transformation
- No data validation before migration
- Hard-coded column mappings
- No way to preview results
- All-or-nothing execution
- Difficult to debug failures

### ✅ New Enhanced Interactive Approach
- **Visual Data Review**: See actual data before migration
- **Editable Entries**: Clean up data inconsistencies on-the-fly
- **Flexible Mapping**: Dynamic column mapping with dropdowns
- **Multi-table Support**: Handle complex schema transformations
- **Validation First**: Catch errors before execution
- **🆕 Selective Migration**: Choose individual records to migrate
- **🆕 Bulk Operations**: Select All/None/Toggle for efficient management
- **🆕 Record Filtering**: Ignore irrelevant entries with visual indicators
- **🆕 Secure Passwords**: bcrypt hashing for legacy password migration
- **Preview Mode**: See exactly what will happen
- **Rollback Capability**: Safe migration with rollback options

## Data Transformation Examples

### Simple Column Mapping
```
Legacy: stock.SUPPLY1 → New: items.name
Legacy: stock.YTODATE → New: items.sku
Legacy: stock.DESC1   → New: items.description
```

### Multi-Table Mapping
```
Legacy: stock table → New: items + categories + sources
┌─────────────────────────────────────────────────────────┐
│ stock.SUPPLY1     → items.name                          │
│ stock.YTODATE     → items.sku                           │
│ stock.DESC1       → items.description                   │
│ stock.SUPPLY2     → categories.name (create if needed)  │
│ stock.SUPPLY3     → sources.supplier_code               │
└─────────────────────────────────────────────────────────┘
```

### Data Transformations
- **Text Cleaning**: Trim whitespace, convert case
- **Date Formatting**: Parse legacy date formats
- **Decimal Precision**: Handle currency and measurements
- **Foreign Key Resolution**: Link related records automatically

## API Endpoints

### Core Migration
- `GET /` - Main migration interface
- `POST /setup` - Configure database connections
- `POST /load_legacy_data` - Load data from source
- `GET /get_table_data/<table>` - Get legacy table data
- `GET /get_all_new_tables` - Get new schema information
- `POST /save_mapping` - Save column mappings
- `POST /preview_transformation` - Preview data transformation
- `POST /validate_mappings` - Validate mapping configuration
- `POST /execute_migration` - Execute the actual migration

### 🆕 Selective Migration (New!)
- `POST /migrate_selected_records` - Migrate only selected records
- `GET /get_record_selection/<table>` - Get current record selection state
- `POST /save_record_selection` - Save record selection state

## Files Structure

```
scripts/
├── migration_ui.py                 # Main Flask application
├── templates/
│   ├── setup.html                 # Database setup page
│   └── migration_ui.html          # Main mapping interface
├── migrate_legacy_data_enhanced.py # Enhanced migration engine
├── flask_migration_requirements.txt # Python dependencies
├── start_migration_ui.sh          # Startup script
└── README_Migration_UI.md         # This documentation
```

## Usage Examples

### 1. Basic Column Mapping
1. Load legacy `stock` table (7,632 records)
2. Map `SUPPLY1` → `items.name`
3. Map `YTODATE` → `items.sku`
4. Edit sample data to clean inconsistencies
5. Preview transformation
6. Execute migration

### 2. Multi-Table Transformation
1. Load legacy `issues` table (69,766 records)
2. Map to both `quotes` and `quote_items` tables
3. Handle foreign key relationships automatically
4. Split data across multiple target tables
5. Validate referential integrity
6. Execute migration

### 3. Data Cleaning Workflow
1. Load legacy data with inconsistent formats
2. Use editable data fields to clean entries
3. Apply transformation functions (trim, format)
4. Preview cleaned data
5. Validate against new schema constraints
6. Execute migration with clean data

## Error Handling

The interface provides comprehensive error handling:
- **Connection Errors**: Clear feedback on database connectivity
- **Data Validation**: Highlight constraint violations before migration
- **Foreign Key Issues**: Automatic detection and resolution suggestions
- **Type Mismatches**: Data type conversion warnings and fixes
- **Missing Mappings**: Identify unmapped required columns

## Security Considerations

- Database credentials are handled securely
- SQL injection protection through parameterized queries
- Session-based mapping storage
- Input validation on all user data
- Safe file handling for SQL backups

## Future Enhancements

- **Batch Processing**: Handle very large datasets efficiently
- **Migration History**: Track and rollback previous migrations
- **Custom Transforms**: User-defined transformation functions
- **Export Mappings**: Save mapping configurations as JSON/YAML
- **Automated Testing**: Generate test cases from mappings
- **Performance Monitoring**: Track migration performance metrics

This interactive approach transforms the migration process from a risky "fire-and-forget" operation into a controlled, validated, and user-friendly experience.
