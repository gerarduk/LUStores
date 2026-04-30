# MariaDB to PostgreSQL Migration UI

This Flask web application provides a user-friendly interface for migrating data from MariaDB/MySQL to PostgreSQL with advanced column mapping, data transformation, and validation features.

## Features

### Core Functionality
- **Database Connection Management**: Connect to both MariaDB/MySQL and PostgreSQL databases
- **Schema Introspection**: Automatically analyze table structures and data types from both databases
- **Column Mapping Interface**: Visual interface to map columns between source and target databases
- **Automatic Type Casting**: Intelligent type conversion with warnings for potentially problematic casts
- **Data Transformation**: Support for concatenation, custom values, and manual data overrides
- **Preview Mode**: Preview transformed data before migration
- **Safe Migration**: Read-only access to MariaDB with option to clear PostgreSQL before migration

### Security Features
- **Read-Only MariaDB Access**: Never modifies the source database
- **PostgreSQL Clear Option**: Safe way to reset target database before migration
- **Input Validation**: Comprehensive validation of database connections and configurations
- **Error Handling**: Robust error handling with detailed feedback

### User Interface
- **Tabbed Interface**: Separate tabs for each source table
- **Real-time Warnings**: Type casting warnings displayed immediately
- **Progress Tracking**: Visual feedback during migration process
- **Status Dashboard**: Overview of migration configuration and progress

## Installation

### Prerequisites
- Python 3.8+
- Flask 2.3+
- Required Python packages (install with requirements file):

```bash
pip install -r flask_migration_requirements.txt
```

Required packages:
- Flask==2.3.3
- psycopg2-binary==2.9.7
- pymysql==1.1.1
- bcrypt==4.0.1

### Database Access
Ensure you have:
- **MariaDB/MySQL**: Read access to the source database
- **PostgreSQL**: Full access to the target database (for schema introspection and data insertion)

## Usage

### Starting the Web Interface

1. **Navigate to the scripts directory:**
```bash
cd /path/to/LUStores/scripts
```

2. **Start the Flask application:**
```bash
python3 migrate_mariadb_api.py web
```

3. **Access the web interface:**
Open your browser to: http://localhost:5000

### Migration Workflow

#### Step 1: Database Connection
1. Enter MariaDB/MySQL connection details:
   - Host, Port, Database Name
   - Username and Password (read-only recommended)
   
2. Enter PostgreSQL connection details:
   - Host, Port, Database Name  
   - Username and Password (full access required)

3. Click "Connect to Databases"

#### Step 2: Column Mapping
For each source table:

1. **Review Source Columns**: See column names, types, and sample data
2. **Map to Target Columns**: Use dropdowns to select target PostgreSQL columns
3. **Review Type Warnings**: Address any problematic type conversions
4. **Set Manual Overrides**: Enter specific values for individual cells if needed

#### Step 3: Data Transformations
Configure advanced transformations:

1. **Concatenation**: Combine multiple source columns with separators
2. **Custom Values**: Set fixed values for target columns
3. **Manual Edits**: Override specific data values on a per-record basis

#### Step 4: Preview and Validate
1. Use the "Preview" button to see transformed data
2. Review warnings and adjust mappings as needed
3. Check the Status dashboard for configuration overview

#### Step 5: Migration Execution
1. **Optional**: Use "Clear PostgreSQL" to reset the target database
2. Click "Finalize Migration" to execute the migration
3. Monitor progress and review results

## API Endpoints

The application provides a REST API for programmatic access:

- `POST /api/connect` - Connect to databases
- `GET /api/schema/{db_type}/{table_name}` - Get table schema
- `POST /api/mapping` - Set column mappings
- `POST /api/transformation` - Configure transformations
- `POST /api/manual-data` - Set manual data overrides
- `GET /api/preview/{table_name}` - Preview transformed data
- `POST /api/clear-postgresql` - Clear target database
- `POST /api/finalize` - Execute migration
- `GET /api/status` - Get migration status

## Command Line Usage

The script also supports command-line usage for automated migrations:

```bash
python3 migrate_mariadb_api.py \
  --mariadb-host localhost \
  --mariadb-user username \
  --mariadb-password password \
  --mariadb-database source_db \
  --pg-host localhost \
  --pg-user postgres \
  --pg-password password \
  --pg-database target_db
```

## Configuration

### Environment Variables
- `FLASK_SECRET_KEY`: Set for production deployments
- `FLASK_ENV`: Set to 'production' for production deployments

### Logging Configuration
The application uses Python's logging module. Logs include:
- Connection status
- Migration progress
- Type casting warnings
- Error messages

## Safety Features

### MariaDB Protection
- **Read-Only Operations**: Only SELECT statements are executed on MariaDB
- **No Data Modification**: Source database is never altered
- **Connection Validation**: Ensures source database connectivity before proceeding

### PostgreSQL Safety
- **Clear Confirmation**: Clearing target database requires explicit confirmation
- **Transaction Safety**: Migration operations use proper transaction handling
- **Rollback Capability**: Failed migrations can be rolled back

### Data Validation
- **Type Compatibility**: Automatic detection of problematic type conversions
- **Required Field Validation**: Ensures all required database connection parameters
- **Sample Data Preview**: Review data transformations before execution

## Troubleshooting

### Common Issues

1. **Connection Failures**:
   - Verify database credentials
   - Check network connectivity
   - Ensure database servers are running

2. **Type Casting Warnings**:
   - Review data types in source and target
   - Consider data transformation options
   - Use manual overrides for problematic values

3. **Migration Errors**:
   - Check PostgreSQL table structure
   - Verify column mappings are complete
   - Review application logs for detailed error messages

### Performance Considerations
- Large tables: Consider migrating in batches
- Complex transformations: May increase migration time
- Network latency: Can affect schema introspection speed

## Development

### File Structure
- `migrate_mariadb_api.py`: Main Flask application
- `templates/migration_ui.html`: Web interface template
- `flask_migration_requirements.txt`: Python dependencies

### Extending the Application
The modular design allows for easy extension:
- Add new transformation types in the `apply_transformations` method
- Extend type casting logic in `_is_problematic_cast`
- Add new API endpoints for additional functionality

## Security Notes

### Production Deployment
- Change the Flask secret key
- Use HTTPS in production
- Implement proper authentication
- Restrict database access permissions
- Run behind a reverse proxy (nginx/Apache)

### Database Security
- Use read-only credentials for MariaDB
- Limit PostgreSQL permissions to target database only
- Enable database connection encryption
- Monitor database access logs

## Support

For issues or questions:
1. Review the troubleshooting section
2. Check application logs
3. Verify database connectivity and permissions
4. Ensure all required dependencies are installed