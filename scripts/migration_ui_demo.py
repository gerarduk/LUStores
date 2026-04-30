#!/usr/bin/env python3
"""
Demo Flask Migration UI - Simplified version for demonstration
Shows the interface without requiring database connections
"""

from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.secret_key = 'demo_key'

# Mock data for demonstration
mock_legacy_tables = ['users', 'stock', 'supplier', 'charge', 'issues', 'orders']
mock_new_tables = ['users', 'items', 'categories', 'suppliers', 'chargecodes', 'quotes', 'quote_items', 'sales', 'sale_items']

mock_legacy_data = {
    'stock': {
        'columns': ['SIZE', 'BALANCE', 'HIDDEN', 'DESC1', 'CODE', 'PRICE', 'ONORDER', 'REF3', 'SUPPLY1', 'SUPPLY3', 'SUPPLY2', 'REORDER', 'ORDERNO', 'REF1', 'PREVYR', 'YTODATE', 'LOCATION', 'UNITS', 'DESC2', 'MIN', 'REF2', 'PREFIX'],
        'records': [
            {'SIZE': '6.41000', 'BALANCE': None, 'HIDDEN': None, 'DESC1': None, 'CODE': '1.00000', 'PRICE': None, 'ONORDER': None, 'REF3': 'N', 'SUPPLY1': 'POST-IT PAGE MARKERS', 'SUPPLY3': '1085509', 'SUPPLY2': 'L03', 'REORDER': '1.00000', 'ORDERNO': '3.00000', 'REF1': None, 'PREVYR': None, 'YTODATE': 'ST8178', 'LOCATION': None, 'UNITS': None, 'DESC2': None, 'MIN': None, 'REF2': None, 'PREFIX': '4.00000'},
            {'SIZE': '12.50000', 'BALANCE': '15', 'HIDDEN': 'N', 'DESC1': 'Laboratory bed frame', 'CODE': '2.00000', 'PRICE': '450.00', 'ONORDER': '0', 'REF3': 'Y', 'SUPPLY1': 'BED FRAME', 'SUPPLY3': '2001234', 'SUPPLY2': 'F12', 'REORDER': '5.00000', 'ORDERNO': '1.00000', 'REF1': 'FURNITURE', 'PREVYR': '8', 'YTODATE': 'BF2001', 'LOCATION': 'STORE-A', 'UNITS': 'EACH', 'DESC2': '4 posts and mattress', 'MIN': '2', 'REF2': 'METAL', 'PREFIX': '12.00000'}
        ],
        'total_count': 7632
    },
    'users': {
        'columns': ['USERNAME', 'USERPASSWORD', 'LEVEL'],
        'records': [
            {'USERNAME': 'admin', 'USERPASSWORD': 'hashed_password', 'LEVEL': '1'},
            {'USERNAME': 'user1', 'USERPASSWORD': 'hashed_password', 'LEVEL': '2'}
        ],
        'total_count': 8
    }
}

mock_new_schema = {
    'items': {
        'columns': {
            'id': {'data_type': 'integer', 'is_nullable': False, 'default': 'nextval(...)'},
            'name': {'data_type': 'character varying', 'is_nullable': False, 'default': None},
            'sku': {'data_type': 'character varying', 'is_nullable': False, 'default': None},
            'description': {'data_type': 'text', 'is_nullable': True, 'default': None},
            'category_id': {'data_type': 'integer', 'is_nullable': False, 'default': None},
            'price': {'data_type': 'numeric', 'is_nullable': False, 'default': None},
            'current_stock': {'data_type': 'integer', 'is_nullable': False, 'default': '0'},
            'minimum_stock': {'data_type': 'integer', 'is_nullable': False, 'default': '0'},
            'is_active': {'data_type': 'boolean', 'is_nullable': False, 'default': 'true'},
            'created_by': {'data_type': 'character varying', 'is_nullable': False, 'default': None},
            'updated_by': {'data_type': 'character varying', 'is_nullable': True, 'default': None},
            'created_at': {'data_type': 'timestamp', 'is_nullable': True, 'default': 'now()'},
            'updated_at': {'data_type': 'timestamp', 'is_nullable': True, 'default': 'now()'}
        },
        'foreign_keys': {
            'category_id': {'referenced_table': 'categories', 'referenced_column': 'id'},
            'created_by': {'referenced_table': 'users', 'referenced_column': 'id'},
            'updated_by': {'referenced_table': 'users', 'referenced_column': 'id'}
        },
        'primary_keys': ['id']
    },
    'categories': {
        'columns': {
            'id': {'data_type': 'integer', 'is_nullable': False, 'default': 'nextval(...)'},
            'name': {'data_type': 'character varying', 'is_nullable': False, 'default': None},
            'description': {'data_type': 'text', 'is_nullable': True, 'default': None},
            'created_at': {'data_type': 'timestamp', 'is_nullable': True, 'default': 'now()'}
        },
        'foreign_keys': {},
        'primary_keys': ['id']
    },
    'suppliers': {
        'columns': {
            'id': {'data_type': 'character varying', 'is_nullable': False, 'default': None},
            'name': {'data_type': 'character varying', 'is_nullable': False, 'default': None},
            'contact': {'data_type': 'character varying', 'is_nullable': True, 'default': None},
            'email': {'data_type': 'character varying', 'is_nullable': True, 'default': None},
            'phone': {'data_type': 'character varying', 'is_nullable': True, 'default': None},
            'address': {'data_type': 'character varying', 'is_nullable': True, 'default': None}
        },
        'foreign_keys': {},
        'primary_keys': ['id']
    }
}

@app.route('/')
def index():
    """Main migration UI page."""
    return render_template('migration_ui.html', 
                         legacy_tables=mock_legacy_tables,
                         new_tables=mock_new_tables)

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    """Setup database connections."""
    if request.method == 'POST':
        # Mock successful connection
        return jsonify({'success': True})
    
    return render_template('setup.html')

@app.route('/load_legacy_data', methods=['POST'])
def load_legacy_data():
    """Load legacy data from SQL file or MySQL database."""
    return jsonify({
        'success': True,
        'tables': mock_legacy_tables,
        'record_counts': {table: mock_legacy_data.get(table, {}).get('total_count', 100) for table in mock_legacy_tables}
    })

@app.route('/get_table_data/<table_name>')
def get_table_data(table_name):
    """Get data for a specific legacy table."""
    if table_name in mock_legacy_data:
        return jsonify(mock_legacy_data[table_name])
    
    # Return mock data for other tables
    return jsonify({
        'columns': ['COLUMN1', 'COLUMN2', 'COLUMN3'],
        'records': [
            {'COLUMN1': 'Sample Data 1', 'COLUMN2': 'Value A', 'COLUMN3': '123'},
            {'COLUMN1': 'Sample Data 2', 'COLUMN2': 'Value B', 'COLUMN3': '456'}
        ],
        'total_count': 100,
        'sample_count': 2
    })

@app.route('/get_all_new_tables')
def get_all_new_tables():
    """Get list of all new tables with their columns."""
    tables_info = {}
    for table_name, table_info in mock_new_schema.items():
        tables_info[table_name] = {
            'columns': list(table_info['columns'].keys()),
            'foreign_keys': table_info.get('foreign_keys', {}),
            'primary_keys': table_info.get('primary_keys', [])
        }
    
    return jsonify(tables_info)

@app.route('/save_mapping', methods=['POST'])
def save_mapping():
    """Save column mapping configuration."""
    return jsonify({'success': True})

@app.route('/get_mapping/<table_name>')
def get_mapping(table_name):
    """Get saved column mapping for a table."""
    # Return some demo mappings for the stock table
    if table_name == 'stock':
        return jsonify({
            'SUPPLY1': {'target_table': 'items', 'target_column': 'name', 'transform_function': 'trim'},
            'YTODATE': {'target_table': 'items', 'target_column': 'sku', 'transform_function': ''},
            'DESC1': {'target_table': 'items', 'target_column': 'description', 'transform_function': ''}
        })
    return jsonify({})

@app.route('/preview_transformation', methods=['POST'])
def preview_transformation():
    """Preview how data will be transformed based on current mappings."""
    return jsonify({
        'success': True,
        'preview': [
            {
                'items': {
                    'name': 'POST-IT PAGE MARKERS',
                    'sku': 'ST8178',
                    'description': 'Office supplies for marking pages'
                }
            },
            {
                'items': {
                    'name': 'BED FRAME',
                    'sku': 'BF2001', 
                    'description': 'Laboratory bed frame - 4 posts and mattress'
                }
            }
        ],
        'record_count': 2
    })

@app.route('/validate_mappings', methods=['POST'])
def validate_mappings():
    """Validate the current column mappings for consistency."""
    return jsonify({
        'errors': [],
        'warnings': ['Required column "category_id" in table "items" is not mapped'],
        'success': True
    })

@app.route('/execute_migration', methods=['POST'])
def execute_migration():
    """Execute the actual data migration based on saved mappings."""
    return jsonify({
        'success': True,
        'message': 'Demo mode - Migration would process selected tables',
        'tables': ['stock', 'users']
    })

if __name__ == '__main__':
    print("🚀 Starting Flask Migration UI Demo...")
    print("🌐 Navigate to http://localhost:5001 to see the interface")
    print("📊 This is a demo version with mock data")
    print("⚡ Press Ctrl+C to stop the server")
    app.run(debug=True, host='0.0.0.0', port=5001)
