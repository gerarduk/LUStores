# MariaDB to PostgreSQL Migration Implementation

## Overview
This implementation provides a secure, UI-integrated migration system that allows superusers to migrate data from an existing MariaDB database to the current PostgreSQL database via the Settings interface.

## Components Implemented

### 1. Migration Script (`/scripts/migrate_mariadb_api.py`)
- **Purpose**: API-ready migration script with comprehensive MariaDBMigrator class
- **Features**:
  - Database connection handling for both MariaDB and PostgreSQL
  - Data clearing with foreign key dependency handling
  - Ordered migration: users → categories → suppliers → items
  - Progress callback system for real-time UI updates
  - Password hashing with bcrypt for user migration
  - Command-line interface for testing
  - Comprehensive error handling and logging

- **Key Methods**:
  - `connect_databases()`: Establishes connections to both databases
  - `clear_postgresql_data()`: Safely truncates all tables respecting foreign keys
  - `migrate_users()`, `migrate_categories()`, `migrate_suppliers()`, `migrate_items()`: Individual table migration methods
  - `run_migration()`: Main orchestration method with progress reporting

### 2. API Endpoint (`/server/routes.ts`)
- **Endpoint**: `POST /api/settings/migrate-mariadb`
- **Security**: 
  - Requires authentication via `requireAuth` middleware
  - **Superuser-only access** - Only users with `role: 'superuser'` can execute
  - Explicit confirmation required via `confirm_clear` parameter
- **Features**:
  - Server-Sent Events (SSE) for real-time progress streaming
  - Subprocess execution of migration script
  - Comprehensive error handling and validation
  - Progress parsing and forwarding to UI

### 3. UI Integration (`/client/src/pages/Settings.tsx`)
- **New Tab**: "Migration" tab added to Settings interface
- **Access Control**: Tab disabled for non-superusers
- **Features**:
  - Connection form with MariaDB credentials
  - **Safety warnings** about data clearing
  - **Explicit confirmation checkbox** required
  - Real-time progress bar and log display
  - Status indicators (idle/running/completed/failed)
  - Form validation and error handling

## Security Features

### Role-Based Access Control
- **Frontend**: Migration tab disabled unless `user.role === 'superuser'`
- **Backend**: API endpoint validates `userRole !== 'superuser'` and rejects with 403
- **Double Protection**: Both UI and API enforce superuser requirement

### Data Safety
- **Warning Alerts**: Prominent red warning about permanent data deletion
- **Explicit Confirmation**: User must check "I understand this will permanently delete all existing data"
- **Validation**: Backend requires `confirm_clear: true` in request body
- **Graceful Failure**: Migration stops on any error without partial corruption

### Authentication & Authorization
- **JWT Token**: All requests require valid authentication token
- **Role Verification**: Server validates user role from JWT claims
- **Secure Headers**: Proper CORS and authentication headers

## Migration Process Flow

1. **UI Validation**: 
   - Check superuser role
   - Validate all required fields
   - Require explicit confirmation

2. **API Security Check**:
   - Verify JWT authentication
   - Confirm superuser role
   - Validate required parameters

3. **Migration Execution**:
   - Start SSE stream for progress updates
   - Launch Python migration script as subprocess
   - Monitor output and parse progress messages
   - Stream real-time updates to UI

4. **Progress Reporting**:
   - Parse `[XX%] message` format from script output
   - Send structured JSON via SSE: `{message, progress, timestamp}`
   - Update UI progress bar and message log

5. **Completion**:
   - Success: Display completion message
   - Failure: Show error details and allow retry
   - Reset: Allow form reset for new migration

## Technical Dependencies

### Python Packages (Installed)
- `pymysql`: MariaDB/MySQL connectivity
- `psycopg2`: PostgreSQL connectivity  
- `bcrypt`: Password hashing for user migration

### Frontend Components
- Progress bar component for visual feedback
- Alert components for warnings and status
- Form components with validation
- Real-time SSE handling

## Database Schema Compatibility

The migration script maps legacy MariaDB tables to the current PostgreSQL schema:

- **Users**: Maps roles, hashes passwords with bcrypt
- **Categories**: Handles parent-child relationships
- **Suppliers**: Basic supplier data migration
- **Items**: Complex mapping with suppliers, categories, pricing, VAT

## Usage Instructions

### For Superusers:
1. Navigate to Settings → Migration tab
2. Fill in MariaDB connection details:
   - Host (IP address or hostname)
   - Port (default: 3306)
   - Username and Password
   - Database name
3. **Read and acknowledge the warning**
4. Check "I understand this will permanently delete all existing data"
5. Click "Start Migration"
6. Monitor progress in real-time
7. Wait for completion confirmation

### Testing the Migration Script:
```bash
cd /home/user/LUStores/scripts
python3 migrate_mariadb_api.py --help
python3 migrate_mariadb_api.py \
  --mariadb-host YOUR_HOST \
  --mariadb-user YOUR_USER \
  --mariadb-password YOUR_PASSWORD \
  --mariadb-database YOUR_DB \
  --pg-password YOUR_PG_PASSWORD \
  --pg-database lustores
```

## Error Handling

- **Connection Failures**: Clear error messages for database connectivity issues
- **Authentication Errors**: Proper 403 responses for unauthorized access
- **Validation Errors**: Form validation with user-friendly messages
- **Migration Errors**: Detailed error reporting with rollback safety
- **Network Issues**: Graceful handling of SSE connection problems

## Files Modified/Created

### New Files:
- `/scripts/migrate_mariadb_api.py` - Main migration script
- `/MIGRATION_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `/server/routes.ts` - Added migration API endpoint after existing settings routes
- `/client/src/pages/Settings.tsx` - Added Migration tab, progress UI, and handlers

## Verification

✅ **Security**: Only superusers can access migration functionality  
✅ **Safety**: Explicit warnings and confirmation required  
✅ **Progress**: Real-time updates during migration  
✅ **Error Handling**: Comprehensive error reporting and recovery  
✅ **Dependencies**: All required packages installed and tested  
✅ **Build**: Client builds successfully with new UI components  
✅ **API**: Migration endpoint integrated into existing routes structure  

The implementation successfully fulfills all requirements:
- ✅ MariaDB URL/username/password support
- ✅ UI integration in settings menu
- ✅ Data clearing with warnings
- ✅ Superuser-only access control
- ✅ Real-time progress reporting
