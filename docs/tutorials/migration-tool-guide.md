# Migration Tool User Guide

## Overview

The Enhanced Migration Tool provides a web-based interface for migrating legacy database data to the new PostgreSQL schema. This tool offers selective record migration, secure password handling, and intuitive visual mapping.

## Quick Start

### 1. Launch the Migration Tool

```bash
cd /home/user/LUStores/scripts
./start_migration_ui.sh
```

The tool will start on `http://localhost:5001`

### 2. Database Setup

1. **PostgreSQL Connection**: Enter your new database connection string
   ```
   postgresql://username:password@localhost:5432/database_name
   ```

2. **Legacy Data Source**: Choose either:
   - **MySQL Connection**: Direct connection to legacy MySQL database
   - **SQL Backup File**: Import from SQL dump file

### 3. Data Loading

Click "Load Legacy Data" to import your legacy database records. You'll see a summary of tables and record counts.

### 4. Column Mapping

For each legacy table:
- **View Sample Data**: See actual legacy data entries
- **Map Columns**: Use dropdowns to map legacy columns to new schema
- **Edit Data**: Clean up data inconsistencies before migration
- **Apply Transforms**: Use built-in transformation functions

### 5. 🆕 Record Selection (New Feature!)

**Individual Record Control**:
- ✅ Select specific records with checkboxes
- 🔄 Use "Select All/None" for bulk operations
- ⚡ Toggle selection to invert current selection
- ❌ Ignore irrelevant records (marked with gray background)

**Smart Migration**:
- Only selected records will be migrated
- Ignored records are automatically excluded
- Real-time count shows selected vs total records

### 6. 🆕 Secure Migration

**Enhanced Security**:
- 🔒 Passwords automatically hashed with bcrypt
- 🛡️ Meets industry security standards
- ⚠️ Graceful fallback if bcrypt unavailable

## Key Features

### ✅ Selective Migration
- Choose individual records to migrate
- Skip irrelevant or problematic entries
- Bulk selection operations for efficiency

### ✅ Visual Data Review
- See actual legacy data before migration
- Edit entries to fix inconsistencies
- Preview transformations before execution

### ✅ Secure Password Handling
- Automatic bcrypt hashing for legacy passwords
- Security compliance for production use
- No plaintext passwords in target database

### ✅ Error Prevention
- Validate mappings before migration
- Check data types and constraints
- Preview results before committing changes

## Usage Examples

### Example 1: Selective User Migration

1. Load legacy `users` table (500 records)
2. Map columns: `USERNAME` → `email`, `USERPASSWORD` → `password_hash`
3. **Select Records**: Choose only active users (350 selected)
4. **Ignore Test Accounts**: Mark test accounts as ignored (50 ignored)
5. **Migrate Selected**: Migrate 350 active users with bcrypt-hashed passwords

**Result**: ✅ 350 migrated, ❌ 50 ignored, 📊 100 not selected

### Example 2: Product Data Cleanup

1. Load legacy `stock` table (7,632 records)
2. Map to `items` table with data cleaning
3. **Edit Sample Data**: Fix inconsistent product names
4. **Apply Transforms**: Trim whitespace, format SKUs
5. **Select Valid Products**: Choose records with complete data (6,800 selected)
6. **Ignore Discontinued**: Mark discontinued items as ignored (832 ignored)

**Result**: ✅ 6,800 migrated, ❌ 832 ignored, clean product catalog

## Migration Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Migration Controls                         │
├─────────────────────────────────────────────────────────────────────┤
│ [Select All] [Select None] [Toggle] [Migrate Selected] │ Selected: 25│
├─────────────────────────────────────────────────────────────────────┤
│ ☑  [❌] #1  │ John Doe    │ john@example.com   │ Admin     │ Active  │
│ ☑  [❌] #2  │ Jane Smith  │ jane@example.com   │ User      │ Active  │
│ ☐  [✅] #3  │ Test User   │ test@test.com      │ Test      │ Ignored │
│ ☑  [❌] #4  │ Bob Johnson │ bob@example.com    │ User      │ Active  │
└─────────────────────────────────────────────────────────────────────┘

Legend:
☑/☐ = Selected/Not selected for migration
❌ = Ignore button (click to ignore/unignore record)
✅ = Record is ignored (shown in gray)
```

## Troubleshooting

### Common Issues

**Connection Problems**:
- Verify database credentials
- Check network connectivity
- Ensure PostgreSQL/MySQL services are running

**Mapping Errors**:
- Check data type compatibility
- Verify required fields are mapped
- Use validation before migration

**Selection Issues**:
- Ignored records cannot be selected
- Use "Select None" to clear all selections
- Check record count matches expectations

**Password Migration**:
- Ensure bcrypt is installed: `pip install bcrypt`
- Check migration logs for password processing
- Verify hashed passwords in target database

### Getting Help

For additional support:
1. Check the migration logs for detailed error messages
2. Review the column mapping validation results
3. Use preview mode to test transformations
4. Consult the technical documentation in `/scripts/README_Migration_UI.md`

## Security Best Practices

- ✅ Use strong database credentials
- ✅ Run migration in a secure environment
- ✅ Backup target database before migration
- ✅ Verify password hashing is working
- ✅ Test with small record sets first
- ✅ Review migration results before production use

---

**Migration Tool Location**: `/scripts/start_migration_ui.sh`
**Documentation**: `/scripts/README_Migration_UI.md`
**Web Interface**: `http://localhost:5001` (when running)