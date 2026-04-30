# Data Migration with Integrated Testing

This document explains how to run the data migration script with the integrated Playwright test suite.

## Overview

The migration script now includes a comprehensive testing phase that validates the application before migrating production data:

1. **Phase 1: Pre-Migration Testing**
   - Clear the database
   - Create a temporary admin user
   - Wait for the application server to be ready
   - Run comprehensive Playwright test suite (90+ tests)
   - Only proceed if ALL tests pass

2. **Phase 2: Data Migration**
   - Re-clear the database
   - Migrate categories, suppliers, items, charge codes, orders, and sales
   - Restore admin users
   - Generate migration summary

## Prerequisites

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install bcrypt psycopg2-binary pymysql

# Install Node.js dependencies (for Playwright)
npm install

# Install Playwright browsers
npx playwright install
```

### 2. Ensure Application Server is Running

The test suite requires the application to be running:

```bash
# In a separate terminal, start the server
npm run dev
```

The server should be accessible at `http://localhost:5000` (default).

### 3. Prepare Schema Export

Export your legacy database schema:

```bash
python scripts/export_schemas.py \
  --source-host localhost \
  --source-database physicsstores \
  --source-user root \
  --source-password your_password \
  --target-host localhost \
  --target-database university_inventory \
  --target-user postgres \
  --target-password your_password \
  --output-file schema_export.json
```

## Running the Migration

### Basic Usage (with testing - RECOMMENDED)

```bash
python scripts/data_migration_script.py \
  --schema-file schema_export.json \
  --source-host localhost \
  --source-user root \
  --source-password source_password \
  --source-database physicsstores \
  --target-host localhost \
  --target-user postgres \
  --target-password target_password \
  --target-database university_inventory
```

### Skip Tests (NOT RECOMMENDED)

If you need to skip the testing phase (e.g., for debugging):

```bash
python scripts/data_migration_script.py \
  --schema-file schema_export.json \
  --source-host localhost \
  --source-user root \
  --source-password source_password \
  --source-database physicsstores \
  --target-host localhost \
  --target-user postgres \
  --target-password target_password \
  --target-database university_inventory \
  --skip-tests
```

### Custom Server URL

If your application runs on a different URL:

```bash
python scripts/data_migration_script.py \
  [... other arguments ...] \
  --server-url http://localhost:3000
```

## Command-Line Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--schema-file` | Yes | - | Path to the JSON schema export file |
| `--source-host` | Yes | - | Source database (MySQL) host |
| `--source-port` | No | 3306 | Source database port |
| `--source-user` | Yes | - | Source database username |
| `--source-password` | Yes | - | Source database password |
| `--source-database` | Yes | - | Source database name (e.g., physicsstores) |
| `--target-host` | Yes | - | Target database (PostgreSQL) host |
| `--target-port` | No | 5432 | Target database port |
| `--target-user` | Yes | - | Target database username |
| `--target-password` | Yes | - | Target database password |
| `--target-database` | Yes | - | Target database name (e.g., university_inventory) |
| `--skip-tests` | No | false | Skip pre-migration testing (not recommended) |
| `--server-url` | No | http://localhost:5000 | Application server URL |

## Test Suite Coverage

The comprehensive test suite includes 90+ tests covering:

### 1. Authentication (4 tests)
- Valid/invalid login
- Logout functionality
- SSO availability check

### 2. Categories (7 tests)
- Create, edit, delete categories
- View empty state
- Validation and error handling

### 3. Charge Codes (8 tests)
- Create with/without PIN
- Expired codes
- Category exclusions
- Search and edit

### 4. Vendors/Suppliers (5 tests)
- Create, edit, delete vendors
- Search functionality

### 5. Inventory (10 tests)
- Add items with all fields
- Duplicate SKU validation
- Search and filter
- Decimal stock support

### 6. Orders (7 tests)
- Create orders with/without supplier
- Delivery charges
- Receive orders
- VAT calculations

### 7. Sales & Quotes (6 tests)
- Browse items
- Create quotes
- Invalid charge code handling
- Process to sale

### 8. Notes (3 tests)
- Add notes to items, orders, charge codes
- View notes list

### 9. Users (3 tests)
- View, create, search users

### 10. Dashboard (3 tests)
- View stats and charts
- Low stock alerts

### 11. Settings (2 tests)
- VAT configuration

## Migration Workflow

### Step-by-Step Process

```
┌─────────────────────────────────────────────┐
│ PHASE 1: PRE-MIGRATION TESTING              │
├─────────────────────────────────────────────┤
│ 1. Clear database                           │
│ 2. Create admin user (admin@university.edu) │
│ 3. Wait for server (max 120 seconds)        │
│ 4. Run Playwright tests (max 10 minutes)    │
│    ├─ 90+ tests covering all features       │
│    ├─ All tests must PASS                   │
│    └─ If ANY test fails → ABORT MIGRATION   │
└─────────────────────────────────────────────┘
                     ↓
          ┌──────────────────────┐
          │   Tests PASSED?      │
          └──────────────────────┘
                 │         │
                YES       NO
                 │         └──→ [ABORT MIGRATION]
                 ↓
┌─────────────────────────────────────────────┐
│ PHASE 2: DATA MIGRATION                     │
├─────────────────────────────────────────────┤
│ 1. Re-clear database                        │
│ 2. Migrate categories                       │
│ 3. Migrate suppliers                        │
│ 4. Migrate items                            │
│ 5. Migrate charge codes                     │
│ 6. Migrate orders                           │
│ 7. Migrate issues → sales                   │
│ 8. Restore admin users                      │
│ 9. Generate summary report                  │
└─────────────────────────────────────────────┘
                     ↓
          [MIGRATION COMPLETE]
```

## Output and Logs

### Console Output

The script provides detailed progress information:

```
Starting complete data migration with pre-migration testing...
Source: physicsstores (MySQL)
Target: university_inventory (PostgreSQL)

Step 0: Verifying and applying database migrations...
Step 0.5: Ensuring stock columns support decimals...

================================================================================
PHASE 1: PRE-MIGRATION TESTING
================================================================================
Step 1: Clearing target database for testing...
Step 1.5: Creating admin user for tests...
Step 2: Waiting for application server (http://localhost:5000)...
✓ Server is ready
Step 3: Running comprehensive test suite...

================================================================================
RUNNING PLAYWRIGHT TEST SUITE
================================================================================
This will verify all application functionality before migration...
Test file: /data/LUStores/tests/e2e/comprehensive-test-suite.spec.ts
Starting tests (this may take several minutes)...

--------------------------------------------------------------------------------
TEST OUTPUT:
--------------------------------------------------------------------------------
Running 90 tests using 1 worker

  ✓ 1. Authentication & Login > auth-01: Login with valid credentials
  ✓ 1. Authentication & Login > auth-02: Login with invalid credentials
  ✓ 2. Categories Management > categories-01: View empty categories list
  ✓ 2. Categories Management > categories-02: Create category - Electronics
  ...
  90 passed (5m)
--------------------------------------------------------------------------------

================================================================================
✓ ALL TESTS PASSED - Proceeding with migration
================================================================================

================================================================================
PHASE 2: DATA MIGRATION
================================================================================
Step 4: Re-clearing target database for migration...
Step 5: Migrating categories...
Step 6: Migrating suppliers...
...
```

### Log File

All output is also written to `data_migration.log` in the current directory.

## Troubleshooting

### Server Not Ready

**Error:** `Application server is not ready. Please ensure the server is running.`

**Solution:**
1. Start the application: `npm run dev`
2. Wait for server to fully start
3. Verify it's accessible at http://localhost:5000
4. Re-run the migration script

### Tests Failing

**Error:** `Pre-migration tests failed. Migration aborted.`

**Solution:**
1. Review the test output to identify failing tests
2. Fix the application code or configuration
3. Run tests manually: `npx playwright test tests/e2e/comprehensive-test-suite.spec.ts`
4. Once all tests pass, re-run the migration

### Playwright Not Found

**Error:** `npx or playwright not found`

**Solution:**
```bash
npm install
npx playwright install
```

### Database Connection Issues

**Error:** `Failed to connect to database`

**Solution:**
1. Verify database credentials
2. Ensure databases are running
3. Check network connectivity
4. Verify PostgreSQL/MySQL are accepting connections

### Test Timeout

**Error:** `Tests timed out after 10 minutes`

**Solution:**
1. Check for hanging tests
2. Increase timeout in the migration script (edit `timeout=600` in run_playwright_tests method)
3. Run tests individually to identify slow tests

## Best Practices

### 1. Always Run With Tests

**Never use `--skip-tests` in production.** The test suite ensures:
- All application features work correctly
- No regressions from recent changes
- Database schema is compatible
- Authentication is functioning

### 2. Monitor Test Output

Pay attention to test failures:
- **Authentication failures:** Check user creation and login logic
- **Category/Item failures:** Verify database constraints
- **Order/Sales failures:** Check business logic and calculations

### 3. Verify Server Before Migration

```bash
# Test server manually
curl http://localhost:5000

# Should return HTML of the application
```

### 4. Backup Before Migration

```bash
# PostgreSQL backup
pg_dump university_inventory > backup_before_migration.sql

# MySQL backup
mysqldump physicsstores > legacy_backup.sql
```

### 5. Review Migration Summary

After migration completes, review the summary:
- Check item counts match expected values
- Verify stock value reconciliation
- Look for errors or skipped records
- Test the application manually

## Example Complete Workflow

```bash
# 1. Backup databases
pg_dump university_inventory > backup.sql

# 2. Export schema
python scripts/export_schemas.py \
  --source-host localhost \
  --source-database physicsstores \
  --source-user root \
  --source-password password \
  --target-host localhost \
  --target-database university_inventory \
  --target-user postgres \
  --target-password password \
  --output-file schema_export.json

# 3. Start application server (in separate terminal)
npm run dev

# 4. Run migration with tests
python scripts/data_migration_script.py \
  --schema-file schema_export.json \
  --source-host localhost \
  --source-user root \
  --source-password password \
  --source-database physicsstores \
  --target-host localhost \
  --target-user postgres \
  --target-password password \
  --target-database university_inventory

# 5. Verify results
# - Check log file: data_migration.log
# - Login: admin@university.edu / admin123
# - Verify data in dashboard
```

## Test Development

To add more tests to the suite, edit:
```
/data/LUStores/tests/e2e/comprehensive-test-suite.spec.ts
```

Follow the existing test patterns:
```typescript
test('test-name: Description', async ({ page }) => {
  await page.goto('/page');
  // ... test logic ...
  await expect(page.locator('selector')).toBeVisible();
});
```

## Support

If you encounter issues:

1. Check `data_migration.log` for detailed error messages
2. Run tests manually: `npx playwright test tests/e2e/comprehensive-test-suite.spec.ts --ui`
3. Verify database connectivity
4. Ensure all dependencies are installed

## Security Notes

- **Never commit passwords** to version control
- Use environment variables for sensitive data
- Default admin password (`admin123`) should be changed immediately after migration
- Consider using `--skip-tests` only in isolated development environments

---

**Migration Version:** 2.0 with Integrated Testing
**Last Updated:** December 2025
