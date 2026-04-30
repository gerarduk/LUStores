#!/usr/bin/env python3
"""
Quick test script to validate separate database credentials.
"""

import sys
import logging
from enhanced_migration import EnhancedMigrator

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Test database connections with separate credentials."""
    
    print("=== Enhanced Migration Credential Test ===")
    print()
    
    # Get MariaDB password
    mariadb_password = input("Enter MariaDB password for PhysicsStores@py-it.lancaster.ac.uk: ").strip()
    if not mariadb_password:
        print("❌ MariaDB password is required")
        return False
    
    print()
    
    # MariaDB configuration (external server)
    mariadb_config = {
        'host': 'py-it.lancaster.ac.uk',
        'port': 3306,
        'user': 'PhysicsStores',
        'password': mariadb_password,
        'database': 'physicsstores'
    }
    
    # PostgreSQL configuration (local/Docker)
    postgres_config = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': 'ynOhGf5T8QCETzdAqFJybWdS3n36gDSq',
        'database': 'university_inventory'
    }
    
    print("🔄 Creating migrator with separate credentials...")
    migrator = EnhancedMigrator(mariadb_config, postgres_config)
    
    try:
        print("🔄 Testing MariaDB connection...")
        migrator.connect_source()
        print("✅ MariaDB connection successful!")
        print(f"   📋 Connected to: {mariadb_config['user']}@{mariadb_config['host']}/{mariadb_config['database']}")
        
        print()
        print("🔄 Testing PostgreSQL connection...")
        migrator.connect_target()
        print("✅ PostgreSQL connection successful!")
        print(f"   📋 Connected to: {postgres_config['user']}@{postgres_config['host']}/{postgres_config['database']}")
        
        print()
        print("🔄 Loading source schema...")
        source_schema = migrator.load_source_schema()
        print(f"✅ Loaded {len(source_schema)} MariaDB tables")
        
        print("🔄 Loading target schema...")
        target_schema = migrator.load_target_schema()
        print(f"✅ Loaded {len(target_schema)} PostgreSQL tables")
        
        print()
        print("🎉 All credential tests passed!")
        print("✅ Separate database credentials working correctly")
        
        # Show available tables
        print()
        print("📋 Available source tables:")
        for table in list(source_schema.keys())[:5]:  # Show first 5
            print(f"   - {table}")
        if len(source_schema) > 5:
            print(f"   ... and {len(source_schema) - 5} more")
        
        print()
        print("📋 Available target tables:")
        for table in list(target_schema.keys())[:5]:  # Show first 5
            print(f"   - {table}")
        if len(target_schema) > 5:
            print(f"   ... and {len(target_schema) - 5} more")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        logger.error(f"Full error: {e}", exc_info=True)
        return False
    
    finally:
        # Clean up connections
        if migrator.mariadb_conn:
            migrator.mariadb_conn.close()
        if migrator.pg_conn:
            migrator.pg_conn.close()

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
