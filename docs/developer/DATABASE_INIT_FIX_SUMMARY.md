# Database Initialization Fix for GitHub Actions

## Problem Analysis
The GitHub Actions workflow was failing during database schema verification with the error:
```
📋 Available tables: []
❌ Missing tables: ['users', 'categories', 'items', 'sales', 'sale_items', 'chargecodes', ...]
```

## Root Cause
The issue was that the database schema was not being properly initialized in the GitHub Actions environment:

1. **Docker vs GitHub Actions**: In Docker, the `init.sql` file is automatically mounted and executed via `docker-entrypoint-initdb.d`, but GitHub Actions uses a PostgreSQL service that doesn't have this file mounted.

2. **Missing Migration Files**: The workflow was trying to run `npm run db:migrate` but there were no migration files in the `migrations/` folder.

3. **drizzle-kit push vs init.sql**: The `drizzle-kit push` command expects the schema definition from TypeScript, but the `init.sql` file was the actual database initialization script.

## Solutions Implemented

### 1. Enhanced GitHub Actions Workflow
Updated `.github/workflows/main.yml` to:
- Install PostgreSQL client tools (`postgresql-client`)
- Use `psql` to execute the existing `init.sql` file
- Provide fallback methods if `init.sql` fails
- Apply the same fix to both test and performance test jobs

### 2. Database Initialization Script
Created `scripts/init-database.ts` as a TypeScript-based alternative that:
- Drops and recreates all tables for clean test state
- Creates all required tables from the schema
- Includes proper foreign key relationships
- Seeds basic test data for test/development environments

### 3. Package.json Script
Added `db:init` script to run the TypeScript initialization:
```json
"db:init": "npx tsx scripts/init-database.ts"
```

## Database Initialization Flow

### GitHub Actions Test Job:
```bash
1. Install PostgreSQL client tools
2. Wait for PostgreSQL service to be ready
3. Run init.sql using psql
4. Fallback to drizzle-kit push if init.sql fails
5. Final fallback to TypeScript init script
6. Verify schema with scripts/verify-schema.ts
```

### Performance Tests Job:
```bash
1. Install PostgreSQL client tools  
2. Wait for PostgreSQL service to be ready
3. Initialize database using init.sql
4. Start application with database ready
5. Run k6 performance tests
```

## Key Changes Made

### 1. GitHub Actions Workflow Updates
```yaml
- name: Setup test database schema
  run: |
    # Install PostgreSQL client tools
    sudo apt-get update && sudo apt-get install -y postgresql-client
    
    # Wait for database
    timeout 30 bash -c 'until pg_isready -h localhost -p 5432 -U postgres; do sleep 2; done'
    
    # Initialize schema
    PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d test_inventory -f init.sql || {
      # Fallback methods...
    }
```

### 2. Database Connection Environment
```yaml
env:
  NODE_ENV: test
  DATABASE_URL: postgresql://postgres:password@localhost:5432/test_inventory
  PGPASSWORD: password
```

### 3. PostgreSQL Service Configuration
```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_DB: test_inventory
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

## Verification Process

The workflow now includes comprehensive verification:

1. **Database Connection**: `pg_isready` health checks
2. **Dependencies**: Verify `pg` and `drizzle-orm` packages
3. **Schema Validation**: Run `scripts/verify-schema.ts`
4. **Table Existence**: Check all required tables are created
5. **Application Startup**: Verify app can connect to database

## Benefits

✅ **Reliable Database Setup**: Multiple fallback methods ensure schema creation  
✅ **Environment Consistency**: Same database state in Docker and CI/CD  
✅ **Test Isolation**: Clean database state for each test run  
✅ **Performance Testing**: Database ready for load testing  
✅ **Error Handling**: Graceful fallbacks prevent workflow failures  

## Troubleshooting Guide

### Common Issues:
1. **Connection Timeout**: Check PostgreSQL service health
2. **Permission Errors**: Verify PGPASSWORD environment variable
3. **Schema Conflicts**: Clean initialization drops existing tables
4. **Missing Dependencies**: Install postgresql-client package

### Debug Commands:
```bash
# Test database connection
pg_isready -h localhost -p 5432 -U postgres

# Manual schema initialization
PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d test_inventory -f init.sql

# Verify tables exist
PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d test_inventory -c "\dt"
```

## Next Steps

1. **Monitor Workflow**: Watch next GitHub Actions run for successful database setup
2. **Test Validation**: Ensure all tests pass with proper database state  
3. **Performance Testing**: Verify k6 tests run against initialized database
4. **Documentation**: Update README with database setup information

---

**Status**: ✅ Fixed and Ready for Testing  
**Impact**: Resolves database initialization failures in CI/CD  
**Priority**: Critical for pipeline reliability
