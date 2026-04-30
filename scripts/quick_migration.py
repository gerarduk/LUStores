#!/usr/bin/env python3
"""
Quick Migration Runner
=====================

This script uses the exported schema JSON file to automatically run the data migration
with the connection details embedded in the schema export.

Usage:
    python quick_migration.py
"""

import json
import sys
import subprocess
import os

def main():
    # Use the fixed schema file path
    schema_file = "../migrations/database_schemas_export_20250911_152208.json"
    
    if not os.path.exists(schema_file):
        print(f"Schema file not found: {schema_file}")
        sys.exit(1)
    
    try:
        with open(schema_file, 'r') as f:
            schema_data = json.load(f)
        
        source_info = schema_data['schemas']['source']['connection_info']
        target_info = schema_data['schemas']['target']['connection_info']
        
        # Prompt for passwords since they're not stored in the export
        print("Database Migration Setup")
        print("=" * 40)
        print(f"Source: {source_info['database']} on {source_info['host']}:{source_info['port']}")
        print(f"Target: {target_info['database']} on {target_info['host']}:{target_info['port']}")
        print()
        
        source_password = input(f"Enter password for source database ({source_info['database']}): ")
        target_password = input(f"Enter password for target database ({target_info['database']}): ")
        
        # Build command
        cmd = [
            'python', 'data_migration_script.py',
            '--schema-file', schema_file,
            '--source-host', source_info['host'],
            '--source-port', str(source_info['port']),
            '--source-database', source_info['database'],
            '--source-user', 'root',  # You may need to adjust this
            '--source-password', source_password,
            '--target-host', target_info['host'],
            '--target-port', str(target_info['port']),
            '--target-database', target_info['database'],
            '--target-user', 'postgres',  # You may need to adjust this
            '--target-password', target_password
        ]
        
        print("\nStarting migration...")
        print("Command:", ' '.join(cmd[:-2] + ['--source-password', '***', '--target-password', '***']))
        print()
        
        # Run the migration
        result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
        
        if result.returncode == 0:
            print("\nMigration completed successfully!")
        else:
            print(f"\nMigration failed with exit code {result.returncode}")
            sys.exit(result.returncode)
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
