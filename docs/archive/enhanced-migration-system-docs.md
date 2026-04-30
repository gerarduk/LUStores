# Enhanced Database Migration System

## Overview

The enhanced database migration system provides a comprehensive web interface for migrating data from legacy MariaDB/MySQL databases to PostgreSQL with advanced features including:

- **Interactive Connection Management** - Test and configure database connections
- **AI-Powered Table Mapping** - Intelligent suggestions for table and column mappings
- **Data Type Transformation** - Handle type casting with user control
- **Preview & Validation** - See transformed data before applying changes
- **Row-by-Row Editing** - Manual data correction interface
- **Bulk Operations** - Mass transformations and operations
- **Migration Planning** - Detailed execution plans with time estimates
- **One-to-Many Mapping** - Split legacy tables into multiple target tables
- **Real-time Progress** - Monitor migration execution with live updates

## Features

### 1. Connection Management
- **Dual Database Support**: Connect to both MariaDB (source) and PostgreSQL (target)
- **Connection Testing**: Validate credentials and connectivity before proceeding
- **Schema Discovery**: Automatically detect and analyze database schemas
- **Security**: Superuser-only access with proper authentication

### 2. Intelligent Mapping
- **AI Suggestions**: Automatic table and column mapping based on schema analysis
- **Fuzzy Matching**: Find similar table/column names across databases
- **Confidence Scoring**: Rate mapping suggestions as high/medium/low confidence
- **Manual Override**: Full user control over all mappings

### 3. Data Transformation
- **Type Conversion**: Handle MySQL to PostgreSQL type differences
- **Custom Transformations**: Define custom data transformation functions
- **Foreign Key Mapping**: Preserve relationships across databases
- **Data Validation**: Validate data integrity during transformation

### 4. Preview & Editing
- **Live Preview**: See how data will be transformed before migration
- **Sample Data**: View first few rows of each table transformation
- **Manual Editing**: Edit individual data values before migration
- **Bulk Editing**: Apply transformations to entire columns or tables

### 5. Migration Planning
- **Execution Plan**: Detailed plan showing migration order and dependencies
- **Time Estimates**: Projected migration time based on data volume
- **Dependency Resolution**: Handle foreign key constraints and relationships
- **Warning System**: Identify potential issues before execution

### 6. Execution & Monitoring
- **Progress Tracking**: Real-time progress updates during migration
- **Error Handling**: Graceful error recovery and reporting
- **Rollback Support**: Ability to undo changes if needed
- **Logging**: Comprehensive migration logs for troubleshooting

## User Interface

The migration interface is organized into 5 main tabs:

### Tab 1: Connection
- Configure MariaDB source database connection
- Configure PostgreSQL target database connection
- Test connectivity and discover schemas
- View table counts and basic statistics

### Tab 2: Mapping
- Generate AI-powered mapping suggestions
- Review and modify table mappings
- Configure column mappings and transformations
- Handle one-to-many table splits

### Tab 3: Preview
- Preview data transformations
- View sample transformed data
- Edit individual data values
- Validate transformation results

### Tab 4: Plan
- Create detailed migration execution plan
- Review migration order and dependencies
- View time estimates and resource requirements
- Final validation before execution

### Tab 5: Execute
- Execute the migration plan
- Monitor real-time progress
- Handle errors and warnings
- View completion status and summary

## API Endpoints

### Connection Testing
- `POST /api/migration/connection/test` - Test database connections

### Mapping Management
- `POST /api/migration/mappings/suggest` - Generate mapping suggestions
- `POST /api/migration/mappings/save` - Save user-defined mappings

### Data Operations
- `POST /api/migration/data/preview` - Preview transformed data
- `POST /api/migration/data/edit` - Edit specific data values

### Migration Execution
- `POST /api/migration/plan` - Create migration execution plan
- `POST /api/migration/execute` - Execute migration

## Security

- **Superuser Only**: All migration functionality requires superuser role
- **Authentication**: JWT token-based authentication for all API calls
- **Input Validation**: Comprehensive validation of all inputs
- **Connection Security**: Secure database connection handling
- **Audit Logging**: All migration activities are logged

## Backend Architecture

### Enhanced Migration Script (`scripts/enhanced_migration_api.py`)
- **MigrationSession Class**: Manages complete migration session state
- **Schema Analysis**: Comprehensive schema discovery and analysis
- **AI Suggestions**: Intelligent mapping suggestion algorithms
- **Data Transformation**: Flexible data transformation pipeline
- **Progress Tracking**: Real-time progress reporting

### API Integration
- **Flask Web Service**: RESTful API for migration operations
- **Database Connections**: Secure connection pooling and management
- **Error Handling**: Comprehensive error handling and reporting
- **Session Management**: Stateful migration session handling

## Frontend Components

### EnhancedDatabaseMigration Component
- **React-based UI**: Modern, responsive interface
- **State Management**: Complex state handling for migration workflow
- **Real-time Updates**: Live progress and status updates
- **Error Handling**: User-friendly error messages and recovery

### Integration with Settings
- **Seamless Integration**: Built into existing Settings page
- **Permission Handling**: Proper role-based access control
- **Consistent UI**: Matches existing application design patterns

## Usage Workflow

1. **Setup Connections**
   - Enter MariaDB connection details
   - Enter PostgreSQL connection details
   - Test both connections

2. **Configure Mappings**
   - Generate AI suggestions
   - Review and modify table mappings
   - Configure column transformations
   - Handle special cases

3. **Preview & Validate**
   - Preview transformed data
   - Make manual corrections
   - Validate transformation rules
   - Resolve any issues

4. **Plan Migration**
   - Create execution plan
   - Review dependencies
   - Estimate execution time
   - Final validation

5. **Execute Migration**
   - Start migration execution
   - Monitor progress
   - Handle any errors
   - Verify completion

## Benefits

- **User-Friendly**: Intuitive web interface eliminates need for command-line tools
- **Flexible**: Supports complex migration scenarios with custom transformations
- **Safe**: Preview and validation prevent data loss or corruption
- **Efficient**: AI suggestions and bulk operations speed up migration process
- **Reliable**: Comprehensive error handling and rollback capabilities
- **Transparent**: Detailed logging and progress tracking throughout process

## Future Enhancements

- **Batch Processing**: Handle very large databases with batch processing
- **Incremental Migration**: Support for incremental/delta migrations
- **Custom Validators**: User-defined data validation rules
- **Migration Templates**: Save and reuse migration configurations
- **Advanced Scheduling**: Schedule migrations for optimal timing
- **Multi-Database Support**: Extend to other database systems beyond MariaDB/PostgreSQL
