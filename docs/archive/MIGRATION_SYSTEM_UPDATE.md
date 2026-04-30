# Database Migration System Update

## Summary
Updated the migration system to automatically detect and apply all SQL migration files in the `migrations/` folder, ensuring the database schema stays in sync with the codebase.

## Changes Made

### 1. New Bash Migration Runner (`scripts/run-migrations.sh`)
Created a comprehensive bash script that:
- **Tracks Applied Migrations**: Creates a `schema_migrations` table to track which migrations have been applied
- **Auto-Discovery**: Automatically finds all `.sql` files in the `migrations/` directory
- **Sequential Application**: Applies migrations in alphabetical/numerical order
- **Idempotent**: Skips migrations that have already been applied
- **Connection Handling**: Parses `DATABASE_URL` environment variable or uses individual connection parameters
- **Error Handling**: Stops on first error and provides clear feedback
- **Migration History**: Shows complete history of applied migrations

**Usage:**
```bash
# Using DATABASE_URL environment variable
DATABASE_URL="postgresql://user:pass@host:port/dbname" ./scripts/run-migrations.sh

# Or using individual parameters
DB_HOST=localhost DB_PORT=5432 DB_NAME=university_inventory DB_USER=postgres ./scripts/run-migrations.sh
```

### 2. Updated Python Migration Script (`scripts/data_migration_script.py`)
Modified the `verify_and_apply_migrations()` method to:
- **Dynamic Migration Loading**: Reads all `.sql` files from `migrations/` directory instead of hardcoded migrations
- **Automatic Application**: Applies each migration file in sorted order
- **Migration Tracking**: Uses `applied_migrations` table to track what's been applied
- **Better Logging**: Provides clear feedback on migration status with ✅ and ❌ indicators
- **Migration Summary**: Displays all applied migrations with timestamps

**Benefits:**
- No need to manually add migrations to the Python script
- Consistent with the SQL migration files in the repository
- Easier to maintain and extend

### 3. Migration Files Covered

The system now automatically handles these migrations:

1. `0000_hesitant_moon_knight.sql` - Initial schema creation
2. `002_allow_null_audit_fields.sql` - Allow NULL for audit fields
3. `003_add_location_and_unit_fields.sql` - Add location and unit to items
4. `004_add_is_paid_to_sales.sql` - Add is_paid to sales table
5. `005_add_quote_name_to_quotes.sql` - Add quote_name to quotes
6. `006_add_delivery_charge_to_orders.sql` - Add delivery_charge to orders
7. **`007_add_activity_cat3_to_chargecodes.sql`** - Add activity and cat3 columns to chargecodes (NEW)

### 4. Migration Tracking Tables

Both scripts use a migration tracking table:

**Bash Script**: `schema_migrations`
```sql
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
);
```

**Python Script**: `applied_migrations`
```sql
CREATE TABLE applied_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
);
```

## Fixing the Charge Code Error

### Problem
The error occurred because the `activity` and `cat3` columns were added to the schema definition (`shared/schema.ts`) but the migration file `007_add_activity_cat3_to_chargecodes.sql` was not applied to the production database.

### Solution
Run one of these migration scripts:

**Option 1: Using the bash script (recommended for production)**
```bash
cd /data/LUStores
DATABASE_URL="your_database_url" ./scripts/run-migrations.sh
```

**Option 2: Using the Python migration script (for full data migration)**
```bash
cd /data/LUStores
python scripts/data_migration_script.py --schema-file path/to/schema.json \
    --source-host ... --target-host ... [other args]
```

**Option 3: Manual SQL execution**
```bash
psql -h HOST -U USER -d DATABASE -f migrations/007_add_activity_cat3_to_chargecodes.sql
```

## Integration Points

### Docker Deployment
You can add the migration runner to your Docker entrypoint or startup script:

```bash
# In your startup script or Dockerfile CMD
./scripts/run-migrations.sh && npm run start
```

### CI/CD Pipeline
Add to your GitHub Actions or deployment pipeline:

```yaml
- name: Run Database Migrations
  run: |
    DATABASE_URL=${{ secrets.DATABASE_URL }} ./scripts/run-migrations.sh
```

### Development Workflow
After pulling new code with schema changes:

```bash
# Update dependencies
npm install

# Apply migrations
./scripts/run-migrations.sh

# Start development server
npm run dev
```

## Benefits of This Approach

1. **No More Manual Updates**: Adding a new `.sql` file to `migrations/` automatically makes it available
2. **Consistency**: Same migration files work for both development and production
3. **Idempotent**: Safe to run multiple times - already applied migrations are skipped
4. **Version Control**: All migrations are tracked in Git
5. **Audit Trail**: Complete history of when each migration was applied
6. **Error Detection**: Clear error messages if a migration fails
7. **Rollback Safety**: Migrations are tracked so you know what's been applied

## Future Enhancements

Consider adding:
- **Migration Rollback**: Support for down migrations
- **Migration Validation**: Pre-flight checks before applying
- **Backup Creation**: Automatic database backup before migrations
- **Dry Run Mode**: Test migrations without applying them
- **Migration Dependencies**: Explicit dependency graph for complex migrations

## Related Files

- `migrations/007_add_activity_cat3_to_chargecodes.sql` - The charge code schema update
- `shared/schema.ts` - TypeScript schema definitions
- `server/routes.ts` - API endpoints using the schema
- `scripts/generate-migration.ts` - Drizzle migration generator
- `drizzle.config.ts` - Drizzle ORM configuration
