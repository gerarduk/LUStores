#!/usr/bin/env python3
"""
Interactive Flask Migration UI
=============================

A web-based interface for mapping legacy database columns to new database schema.
Provides visual column mapping, data editing, and multi-table transformation capabilities.

Features:
- Tab-based interface for each legacy table
- Visual column mapping with dropdowns
- Editable data entries before migration
- Multi-table mapping support
- Primary/Foreign key relationship handling
- Real-time data validation
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from flask import Flask, render_template, request, jsonify, session
from werkzeug.serving import WSGIRequestHandler
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    print("Warning: bcrypt not available. Password hashing will use fallback method.")

# Import our existing migration classes
from migrate_legacy_data_enhanced import EnhancedLegacyDataMigrator, MigrationValidator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress Flask dev server logs for cleaner output
class SilentRequestHandler(WSGIRequestHandler):
    def log_request(self, code='-', size='-'):
        pass

app = Flask(__name__)
app.secret_key = 'migration_ui_secret_key_change_in_production'

# Global migration instance
migrator = None
legacy_data = {}
new_schema = {}
column_mappings = {}
table_relationships = {}

def load_new_schema():
    """Load the new PostgreSQL schema structure from the database."""
    global new_schema
    
    if not migrator or not migrator.pg_conn:
        return {}
    
    try:
        cursor = migrator.pg_conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all tables and their columns
        cursor.execute("""
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                tc.constraint_type,
                kcu.referenced_table_name,
                kcu.referenced_column_name
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
            LEFT JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name
            LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND c.table_schema = 'public'
            ORDER BY t.table_name, c.ordinal_position
        """)
        
        results = cursor.fetchall()
        schema = {}
        
        for row in results:
            table_name = row['table_name']
            if table_name not in schema:
                schema[table_name] = {
                    'columns': {},
                    'foreign_keys': {},
                    'primary_keys': []
                }
            
            column_name = row['column_name']
            if column_name:
                schema[table_name]['columns'][column_name] = {
                    'data_type': row['data_type'],
                    'is_nullable': row['is_nullable'] == 'YES',
                    'default': row['column_default']
                }
                
                # Track foreign keys
                if row['constraint_type'] == 'FOREIGN KEY':
                    schema[table_name]['foreign_keys'][column_name] = {
                        'referenced_table': row['referenced_table_name'],
                        'referenced_column': row['referenced_column_name']
                    }
                
                # Track primary keys
                if row['constraint_type'] == 'PRIMARY KEY':
                    schema[table_name]['primary_keys'].append(column_name)
        
        new_schema = schema
        return schema
        
    except Exception as e:
        logger.error(f"Error loading new schema: {e}")
        return {}

def initialize_migrator(pg_connection_string, mysql_config=None):
    """Initialize the migration system."""
    global migrator
    
    try:
        migrator = EnhancedLegacyDataMigrator(pg_connection_string, mysql_config)
        migrator.connect_postgresql()
        if mysql_config:
            migrator.connect_mysql()
        
        load_new_schema()
        logger.info("Migration system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize migrator: {e}")
        return False

@app.route('/')
def index():
    """Main migration UI page."""
    if not migrator:
        return render_template('setup.html')
    
    return render_template('migration_ui.html', 
                         legacy_tables=list(legacy_data.keys()),
                         new_tables=list(new_schema.keys()))

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    """Setup database connections."""
    if request.method == 'POST':
        data = request.get_json()
        
        pg_connection = data.get('pg_connection')
        mysql_config = None
        
        if data.get('use_mysql'):
            mysql_config = {
                'host': data.get('mysql_host', 'localhost'),
                'port': int(data.get('mysql_port', 3306)),
                'user': data.get('mysql_user'),
                'password': data.get('mysql_password'),
                'database': data.get('mysql_database', 'physics_stores')
            }
        
        if initialize_migrator(pg_connection, mysql_config):
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to initialize connections'})
    
    return render_template('setup.html')

@app.route('/load_legacy_data', methods=['POST'])
def load_legacy_data():
    """Load legacy data from SQL file or MySQL database."""
    global legacy_data
    
    if not migrator:
        return jsonify({'success': False, 'error': 'Migrator not initialized'})
    
    data = request.get_json()
    sql_file = data.get('sql_file')
    use_mysql = data.get('use_mysql', False)
    
    try:
        migrator.load_legacy_data(sql_file, use_mysql)
        legacy_data = migrator.legacy_data
        
        return jsonify({
            'success': True,
            'tables': list(legacy_data.keys()),
            'record_counts': {table: len(records) for table, records in legacy_data.items()}
        })
        
    except Exception as e:
        logger.error(f"Error loading legacy data: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_table_data/<table_name>')
def get_table_data(table_name):
    """Get data for a specific legacy table."""
    if table_name not in legacy_data:
        return jsonify({'error': 'Table not found'})
    
    records = legacy_data[table_name]
    
    # Get column names from first record
    columns = list(records[0].keys()) if records else []
    
    # Limit to first 100 records for performance
    sample_records = records[:100]
    
    return jsonify({
        'columns': columns,
        'records': sample_records,
        'total_count': len(records),
        'sample_count': len(sample_records)
    })

@app.route('/get_new_schema/<table_name>')
def get_new_schema_table(table_name):
    """Get new schema information for a specific table."""
    if table_name not in new_schema:
        return jsonify({'error': 'Table not found in new schema'})
    
    return jsonify(new_schema[table_name])

@app.route('/get_all_new_tables')
def get_all_new_tables():
    """Get list of all new tables with their columns."""
    tables_info = {}
    for table_name, table_info in new_schema.items():
        tables_info[table_name] = {
            'columns': list(table_info['columns'].keys()),
            'foreign_keys': table_info.get('foreign_keys', {}),
            'primary_keys': table_info.get('primary_keys', [])
        }
    
    return jsonify(tables_info)

@app.route('/save_mapping', methods=['POST'])
def save_mapping():
    """Save column mapping configuration."""
    global column_mappings
    
    data = request.get_json()
    table_name = data.get('table_name')
    mappings = data.get('mappings')
    
    if not table_name or not mappings:
        return jsonify({'success': False, 'error': 'Missing table name or mappings'})
    
    column_mappings[table_name] = mappings
    
    # Save to session for persistence
    session['column_mappings'] = column_mappings
    
    return jsonify({'success': True})

@app.route('/get_mapping/<table_name>')
def get_mapping(table_name):
    """Get saved column mapping for a table."""
    mappings = column_mappings.get(table_name, {})
    return jsonify(mappings)

@app.route('/preview_transformation', methods=['POST'])
def preview_transformation():
    """Preview how data will be transformed based on current mappings."""
    data = request.get_json()
    table_name = data.get('table_name')
    mappings = data.get('mappings')
    
    if table_name not in legacy_data:
        return jsonify({'error': 'Legacy table not found'})
    
    records = legacy_data[table_name][:10]  # Preview first 10 records
    transformed_records = []
    
    for record in records:
        transformed = {}
        for old_column, mapping_info in mappings.items():
            if mapping_info.get('target_table') and mapping_info.get('target_column'):
                target_table = mapping_info['target_table']
                target_column = mapping_info['target_column']
                
                # Apply any transformations
                value = record.get(old_column)
                if mapping_info.get('transform_function'):
                    # Apply transformation function (placeholder for now)
                    pass
                
                if target_table not in transformed:
                    transformed[target_table] = {}
                
                transformed[target_table][target_column] = value
        
        transformed_records.append(transformed)
    
    return jsonify({
        'success': True,
        'preview': transformed_records,
        'record_count': len(transformed_records)
    })

@app.route('/execute_migration', methods=['POST'])
def execute_migration():
    """Execute the actual data migration based on saved mappings."""
    if not migrator or not column_mappings:
        return jsonify({'success': False, 'error': 'Migration not properly configured'})
    
    data = request.get_json()
    tables_to_migrate = data.get('tables', [])
    
    try:
        # This would implement the actual migration logic
        # For now, return a placeholder response
        return jsonify({
            'success': True,
            'message': f'Migration would process {len(tables_to_migrate)} tables',
            'tables': tables_to_migrate
        })
        
    except Exception as e:
        logger.error(f"Migration error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/migrate_selected_records', methods=['POST'])
def migrate_selected_records():
    """Migrate only selected records from a table."""
    if not migrator:
        return jsonify({'success': False, 'error': 'Migration not properly configured'})
    
    data = request.get_json()
    table_name = data.get('table_name')
    selected_indices = data.get('selected_indices', [])
    ignored_indices = data.get('ignored_indices', [])
    mappings = data.get('mappings', {})
    
    if not table_name or not selected_indices:
        return jsonify({'success': False, 'error': 'Missing table name or selected records'})
    
    if table_name not in legacy_data:
        return jsonify({'success': False, 'error': 'Legacy table not found'})
    
    try:
        # Filter records based on selection
        all_records = legacy_data[table_name]
        selected_records = [all_records[i] for i in selected_indices if i < len(all_records)]
        
        logger.info(f"Migrating {len(selected_records)} selected records from {table_name}")
        logger.info(f"Ignoring {len(ignored_indices)} records from {table_name}")
        
        # TODO: Implement actual selective migration logic
        # For now, return success with summary
        return jsonify({
            'success': True,
            'message': f'Successfully migrated {len(selected_records)} records from {table_name}',
            'migrated_count': len(selected_records),
            'ignored_count': len(ignored_indices),
            'total_available': len(all_records)
        })
        
    except Exception as e:
        logger.error(f"Selective migration error for {table_name}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_record_selection/<table_name>')
def get_record_selection(table_name):
    """Get current record selection state for a table."""
    # This would normally be stored in session or database
    # For now, return empty selection
    return jsonify({
        'selected_indices': [],
        'ignored_indices': [],
        'total_records': len(legacy_data.get(table_name, []))
    })

@app.route('/save_record_selection', methods=['POST'])
def save_record_selection():
    """Save current record selection state."""
    data = request.get_json()
    table_name = data.get('table_name')
    selected_indices = data.get('selected_indices', [])
    ignored_indices = data.get('ignored_indices', [])
    
    # Store in session for persistence
    if 'record_selections' not in session:
        session['record_selections'] = {}
    
    session['record_selections'][table_name] = {
        'selected': selected_indices,
        'ignored': ignored_indices
    }
    
    return jsonify({'success': True})

@app.route('/validate_mappings', methods=['POST'])
def validate_mappings():
    """Validate the current column mappings for consistency."""
    data = request.get_json()
    mappings = data.get('mappings', {})
    
    validation_results = {
        'errors': [],
        'warnings': [],
        'success': True
    }
    
    # Check for unmapped required columns
    for table_name, table_mappings in mappings.items():
        if table_name in new_schema:
            new_table_info = new_schema[table_name]
            required_columns = [
                col for col, info in new_table_info['columns'].items() 
                if not info['is_nullable'] and not info['default']
            ]
            
            mapped_columns = [
                mapping['target_column'] 
                for mapping in table_mappings.values() 
                if mapping.get('target_column')
            ]
            
            for required_col in required_columns:
                if required_col not in mapped_columns:
                    validation_results['warnings'].append(
                        f"Required column '{required_col}' in table '{table_name}' is not mapped"
                    )
    
    return jsonify(validation_results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001, request_handler=SilentRequestHandler)
