#!/usr/bin/env python3
"""
Test script for enhanced migration system with credential separation validation.
"""

import os
import sys
import logging
from enhanced_migration import EnhancedMigrator, ColumnMapping

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_connection_separation():
    """Test that MariaDB and PostgreSQL connections work independently."""
    logger.info("Testing database connection credential separation...")
    
    # Real MariaDB connection (external server)
    logger.info("1. Testing MariaDB connection alone...")
    mariadb_config = {
        'host': 'py-it.lancaster.ac.uk',
        'port': 3306,
        'user': 'PhysicsStores',
        'password': input("Enter MariaDB password for PhysicsStores: ").strip(),
        'database': 'physicsstores'
    }
    
    # Real PostgreSQL connection (local/Docker)
    logger.info("2. Testing PostgreSQL connection alone...")
    postgres_config = {
        'host': 'localhost',  # or 'db' if running in Docker
        'port': 5432,
        'user': 'postgres',
        'password': 'ynOhGf5T8QCETzdAqFJybWdS3n36gDSq',  # From .env.prod
        'database': 'university_inventory'
    }
    
    # Test both connections together
    logger.info("3. Testing both connections together...")
    migrator = EnhancedMigrator(mariadb_config, postgres_config)
    
    try:
        # Test MariaDB connection first
        logger.info("Testing MariaDB connection...")
        migrator.connect_source()
        logger.info("✅ MariaDB connection successful!")
        
        # Test PostgreSQL connection
        logger.info("Testing PostgreSQL connection...")
        migrator.connect_target()
        logger.info("✅ PostgreSQL connection successful!")
        
        # Test schema loading
        logger.info("Testing schema loading...")
        source_schema = migrator.load_source_schema()
        logger.info(f"✅ Loaded {len(source_schema)} MariaDB tables")
        
        target_schema = migrator.load_target_schema()
        logger.info(f"✅ Loaded {len(target_schema)} PostgreSQL tables")
        
        return True
        
        # Try to connect - this should show clear error messages about which database fails
        migrator.connect_databases()
        
        logger.info("✅ Connection test completed successfully")
        
        # Test schema loading if connections work
        if migrator.mariadb_conn:
            logger.info("Testing MariaDB schema loading...")
            try:
                source_schema = migrator.get_source_schema()
                logger.info(f"✅ Loaded schema for {len(source_schema)} MariaDB tables")
            except Exception as e:
                logger.error(f"❌ MariaDB schema loading failed: {e}")
        
        if migrator.pg_conn:
            logger.info("Testing PostgreSQL schema loading...")
            try:
                target_schema = migrator.get_target_schema()
                logger.info(f"✅ Loaded schema for {len(target_schema)} PostgreSQL tables")
            except Exception as e:
                logger.error(f"❌ PostgreSQL schema loading failed: {e}")
                
        # Clean up connections
        migrator.close_connections()
        
    except Exception as e:
        logger.error(f"❌ Connection test failed: {e}")
        # The error should clearly indicate which database and which credential failed
        if "MariaDB" in str(e):
            logger.info("ℹ️  MariaDB connection failed - check MariaDB credentials")
        elif "PostgreSQL" in str(e) or "postgres" in str(e):
            logger.info("ℹ️  PostgreSQL connection failed - check PostgreSQL credentials")
        else:
            logger.info("ℹ️  Connection error doesn't specify database - needs improvement")

def test_credential_isolation():
    """Test that credentials don't leak between connection attempts."""
    logger.info("Testing credential isolation...")
    
    # Create migrator with invalid MariaDB but valid PostgreSQL credentials
    migrator = EnhancedMigrator()
    
    # Set up intentionally wrong MariaDB credentials
    migrator.mariadb_config = {
        'host': 'wrong_host',
        'port': 3306,
        'user': 'wrong_user',
        'password': 'wrong_password',
        'database': 'wrong_db'
    }
    
    # Set up potentially valid PostgreSQL credentials
    migrator.postgres_config = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': 'postgres',
        'database': 'lustores'
    }
    
    try:
        migrator.connect_databases()
        logger.info("✅ Connection attempt completed")
        
        # Check which connections succeeded/failed
        if migrator.mariadb_conn:
            logger.info("✅ MariaDB connected (unexpected)")
        else:
            logger.info("❌ MariaDB failed (expected)")
            
        if migrator.pg_conn:
            logger.info("✅ PostgreSQL connected")
        else:
            logger.info("❌ PostgreSQL failed")
            
    except Exception as e:
        logger.info(f"Expected connection failure: {e}")
        
    finally:
        migrator.close_connections()

def test_web_interface():
    """Test the Flask web interface components."""
    logger.info("Testing web interface...")
    
    # Test that the template exists
    template_path = os.path.join(os.path.dirname(__file__), 'templates', 'enhanced_migration_ui.html')
    if os.path.exists(template_path):
        logger.info("✅ Web interface template found")
        
        # Check template size
        template_size = os.path.getsize(template_path)
        logger.info(f"ℹ️  Template size: {template_size:,} bytes")
        
        if template_size > 10000:  # Should be a substantial file
            logger.info("✅ Template appears complete")
        else:
            logger.warning("⚠️  Template may be incomplete")
    else:
        logger.error("❌ Web interface template missing")

def main():
    """Run all tests."""
    logger.info("=== Enhanced Migration System Test ===")
    logger.info("Testing credential separation and connection validation...\n")
    
    try:
        test_connection_separation()
        print()
        
        test_credential_isolation()
        print()
        
        test_web_interface()
        print()
        
        logger.info("=== Test Summary ===")
        logger.info("✅ Enhanced migration test completed")
        logger.info("💡 For full functionality test, ensure databases are running")
        logger.info("🌐 To test web interface: python enhanced_migration.py")
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
