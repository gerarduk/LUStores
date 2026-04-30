#!/usr/bin/env python3
"""
Data Migration Script: Legacy Physics Stores to Modern University Inventory
===========================================================================

This script migrates data from the legacy physicsstores database to the modern
university_inventory database, handling schema differences and adding null values
where needed.

Key Mappings:
- stock -> items (with category assignment)
- supplier -> suppliers 
- orders -> orders + order_items (denormalized to normalized)
- issues -> stock_movements
- charge -> chargecodes
- users -> users (with role assignment)

Author: S Mander
License: MIT
"""

import json
import logging
import os
import sys
import hashlib
import subprocess
import time

# Check for bcrypt availability
try:
    import bcrypt
except ImportError:
    print("ERROR: bcrypt is required for password hashing.")
    print("Please install it with: pip install bcrypt")
    sys.exit(1)

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Any, Tuple
import psycopg2
import psycopg2.extras
import pymysql
import pymysql.cursors
import csv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataMigrationError(Exception):
    """Custom exception for migration errors."""
    pass

class LegacyToModernMigrator:
    """Handles migration from legacy physicsstores to modern university_inventory."""
    
    def __init__(self, source_config: Dict, target_config: Dict, schema_file: str, batch_size: int = 1000, skip_tests: bool = False, server_url: str = 'http://localhost:5000'):
        """Initialize migrator with database connections and schema information."""
        self.source_config = source_config
        self.target_config = target_config
        self.schema_file = schema_file
        self.batch_size = batch_size  # Number of rows to fetch per batch
        self.skip_tests = skip_tests  # Whether to skip pre-migration tests
        self.server_url = server_url  # Application server URL

        # Load schema information
        self.schemas = self._load_schemas()
        self.source_schema = self.schemas['schemas']['source']
        self.target_schema = self.schemas['schemas']['target']

        # Migration tracking
        self.migration_stats = {
            'users': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'categories': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'suppliers': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'items': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'chargecodes': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'orders': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'order_items': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0},
            'stock_movements': {'processed': 0, 'migrated': 0, 'skipped': 0, 'errors': 0}
        }

        # Stock value tracking
        self.value_tracking = {
            'source_total_value_exc_vat': Decimal('0'),    # Total value in source exc VAT (price * balance)
            'source_total_value_inc_vat': Decimal('0'),    # Total value in source inc VAT
            'source_items_with_value': 0,                  # Items with non-zero value
            'source_items_zero_price': 0,                  # Items with price = 0
            'source_items_zero_stock': 0,                  # Items with stock = 0
            'target_total_value_exc_vat': Decimal('0'),    # Total value in target exc VAT (price * current_stock)
            'target_total_value_inc_vat': Decimal('0'),    # Total value in target inc VAT
            'target_items_with_value': 0,                  # Items with non-zero value
            'skipped_value_exc_vat': Decimal('0'),         # Value exc VAT of items that were skipped
            'skipped_items': [],                           # List of (sku, reason, value) for skipped items
            'vat_rate_from_source': None,                  # VAT rate fetched from legacy DB
            'rounding_loss_qty': Decimal('0'),             # Total stock quantity lost to rounding
            'rounding_loss_value_exc_vat': Decimal('0'),   # Total value lost to rounding (exc VAT)
            'rounding_loss_items': 0,                      # Number of items with rounding loss
            'suspicious_items': [],                        # Items with unexpectedly large discrepancies
            'fractional_stock_items': []                   # Items with fractional stock in source
        }

        # ID mappings for foreign key resolution
        self.id_mappings = {
            'users': {},           # legacy_username -> new_id
            'categories': {},      # legacy_prefix -> new_id
            'suppliers': {},       # legacy_code -> new_id
            'items': {},           # legacy_code -> new_id
            'chargecodes': {},     # legacy_costcentre -> new_code
            'orders': {}           # legacy_order_no -> new_id
        }

        # Preserved admin users from target database
        self.preserved_admins = []
    
    def _load_schemas(self) -> Dict:
        """Load schema information from JSON file."""
        try:
            with open(self.schema_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            raise DataMigrationError(f"Failed to load schema file: {e}")
    
    def _get_source_connection(self):
        """Get connection to source database."""
        return pymysql.connect(**self.source_config)
    
    def _get_target_connection(self):
        """Get connection to target database."""
        return psycopg2.connect(**self.target_config)

    def _ensure_target_schema_updated(self, cursor):
        """Ensure target database schema has all required columns before migration."""
        logger.info("Ensuring target database schema is up to date...")
        
        # Add show_picking_list column if it doesn't exist
        try:
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS show_picking_list BOOLEAN NOT NULL DEFAULT true
            """)
            logger.info("  ✓ Ensured show_picking_list column exists")
        except Exception as e:
            # Column might already exist or table doesn't exist yet
            logger.debug(f"  Note: show_picking_list check: {e}")
        
        # Add delivered_to columns to sales if they don't exist (for "issued to" tracking)
        try:
            cursor.execute("""
                ALTER TABLE sales 
                ADD COLUMN IF NOT EXISTS delivered_to VARCHAR(200),
                ADD COLUMN IF NOT EXISTS delivered_to_email VARCHAR(200),
                ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP
            """)
            logger.info("  ✓ Ensured delivered_to columns exist on sales table")
        except Exception as e:
            logger.debug(f"  Note: delivered_to columns check: {e}")

        # Ensure indexes needed for supplier->item inference exist
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);
            """)
            logger.info("  ✓ Ensured index idx_order_items_item_id exists")
        except Exception as e:
            logger.debug(f"  Note: idx_order_items_item_id creation check: {e}")

        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_orders_supplier_status ON orders(supplier_id, status);
            """)
            logger.info("  ✓ Ensured index idx_orders_supplier_status exists")
        except Exception as e:
            logger.debug(f"  Note: idx_orders_supplier_status creation check: {e}")

        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_sale_items_sale_item ON sale_items(sale_id, item_id);
            """)
            logger.info("  ✓ Ensured index idx_sale_items_sale_item exists")
        except Exception as e:
            logger.debug(f"  Note: idx_sale_items_sale_item creation check: {e}")

    def _verify_row_count(self, connection, table_name: str, count_query: str) -> int:
        """Verify row count in source table."""
        try:
            with connection.cursor() as cursor:
                cursor.execute(count_query)
                result = cursor.fetchone()
                count = result[0] if result else 0
                logger.info(f"Source table '{table_name}' has {count} rows")
                return count
        except Exception as e:
            logger.warning(f"Could not verify row count for {table_name}: {e}")
            return -1  # Return -1 to indicate count verification failed

    def _fetch_in_batches(self, connection, query: str, table_name: str, expected_count: int = -1):
        """
        Fetch data in batches using server-side cursor (SSCursor).
        Yields batches of rows as dictionaries.
        """
        try:
            # Use SSCursor for server-side cursor (streaming results)
            with connection.cursor(pymysql.cursors.SSDictCursor) as cursor:
                cursor.execute(query)

                batch_num = 0
                total_fetched = 0

                while True:
                    batch = cursor.fetchmany(self.batch_size)
                    if not batch:
                        break

                    batch_num += 1
                    total_fetched += len(batch)

                    logger.info(f"Fetched batch {batch_num} from {table_name}: {len(batch)} rows (total: {total_fetched})")
                    yield batch

                # Verify we got all rows
                if expected_count > 0 and total_fetched != expected_count:
                    logger.warning(f"Row count mismatch for {table_name}: expected {expected_count}, fetched {total_fetched}")
                else:
                    logger.info(f"Successfully fetched all {total_fetched} rows from {table_name}")

        except Exception as e:
            logger.error(f"Error fetching batches from {table_name}: {e}")
            raise

    def _retry_operation(self, operation, max_retries: int = 3, retry_delay: int = 5):
        """
        Retry an operation with exponential backoff.

        Args:
            operation: Callable to execute
            max_retries: Maximum number of retry attempts
            retry_delay: Initial delay in seconds (doubles each retry)
        """
        import time

        for attempt in range(max_retries):
            try:
                return operation()
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"Operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Operation failed after {max_retries} attempts: {e}")
                    raise

    def _safe_decimal(self, value: Any, default: Decimal = Decimal('0.00')) -> Decimal:
        """Safely convert value to Decimal."""
        if value is None:
            return default
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            logger.warning(f"Could not convert '{value}' to Decimal, using default {default}")
            return default
    
    def _safe_int(self, value: Any, default: int = 0) -> int:
        """Safely convert value to int."""
        if value is None:
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            logger.warning(f"Could not convert '{value}' to int, using default {default}")
            return default
    
    def _safe_str(self, value: Any, max_length: int = None) -> Optional[str]:
        """Safely convert value to string with optional length limit."""
        if value is None:
            return None

        result = str(value).strip()
        if not result:
            return None

        if max_length and len(result) > max_length:
            result = result[:max_length]
            logger.warning(f"Truncated string '{value}' to {max_length} characters")

        return result

    def _find_item_by_stock_code(self, cursor, stock_code: str) -> Optional[Tuple[int, str, Decimal]]:
        """
        Try multiple strategies to find an item by stock code.
        Returns tuple of (item_id, item_name, unit_price) or None if not found.

        Strategies:
        1. Exact SKU match (case-insensitive)
        2. Extract SKU pattern and match (e.g., "st8485" from "st8485 - Description")
        3. Fuzzy match on item name
        """
        import re

        # Strategy 1: Exact SKU match (case-insensitive)
        cursor.execute("SELECT id, name, price FROM items WHERE UPPER(sku) = UPPER(%s)", (stock_code,))
        result = cursor.fetchone()
        if result:
            return (result[0], result[1], result[2] if result[2] else Decimal('0'))

        # Strategy 2: Extract SKU pattern (2 letters + 4 digits) from stock_code
        sku_pattern = re.search(r'\b([a-zA-Z]{2}\d{4})\b', stock_code)
        if sku_pattern:
            extracted_sku = sku_pattern.group(1)
            cursor.execute("SELECT id, name, price FROM items WHERE UPPER(sku) = UPPER(%s)", (extracted_sku,))
            result = cursor.fetchone()
            if result:
                # logger.info(f"Found item using extracted SKU '{extracted_sku}' from '{stock_code}'")
                return (result[0], result[1], result[2] if result[2] else Decimal('0'))

        # Strategy 3: Fuzzy match on item name (ILIKE for partial match)
        # Remove common words and try to match on item name
        search_term = stock_code.lower().strip()
        # Try exact name match first
        cursor.execute("SELECT id, name, price, sku FROM items WHERE UPPER(name) = UPPER(%s)", (stock_code,))
        result = cursor.fetchone()
        if result:
            # logger.info(f"Found item by name match: '{stock_code}' matched '{result[1]}' (SKU: {result[3]})")
            return (result[0], result[1], result[2] if result[2] else Decimal('0'))

        # Try partial name match (at least 5 characters to avoid too broad matches)
        if len(search_term) >= 5:
            cursor.execute(
                "SELECT id, name, price, sku FROM items WHERE UPPER(name) LIKE UPPER(%s) LIMIT 1",
                (f'%{stock_code}%',)
            )
            result = cursor.fetchone()
            if result:
                # logger.info(f"Found item by partial name match: '{stock_code}' matched '{result[1]}' (SKU: {result[3]})")
                return (result[0], result[1], result[2] if result[2] else Decimal('0'))

        # No match found
        return None

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        # Generate a salt and hash the password
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def _export_rounding_losses_to_csv(self, filename: str = 'rounding_losses.csv'):
        """Export detailed rounding loss information to CSV file."""
        if not self.value_tracking['fractional_stock_items']:
            logger.info("No rounding losses to export.")
            return
        
        try:
            # Get absolute path for output file
            output_dir = os.path.dirname(os.path.abspath(__file__))
            output_path = os.path.join(output_dir, filename)
            
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'Product_Code',
                    'Product_Name',
                    'Source_Qty',
                    'Target_Qty',
                    'Qty_Loss',
                    'Unit_Cost_ExcVAT',
                    'Value_Loss_ExcVAT',
                    'VAT_Rate',
                    'Value_Loss_IncVAT',
                    'Severity'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                vat_rate = self.value_tracking['vat_rate_from_source'] or Decimal('0.20')
                
                # Sort by value loss descending
                sorted_items = sorted(self.value_tracking['fractional_stock_items'],
                                    key=lambda x: x['value_loss'], reverse=True)
                
                for item in sorted_items:
                    value_loss_inc_vat = item['value_loss'] * (Decimal('1') + vat_rate)
                    
                    # Determine severity
                    if item['loss'] >= Decimal('1.0') or item['value_loss'] >= Decimal('10.00'):
                        severity = 'HIGH'
                    elif item['loss'] >= Decimal('0.5') or item['value_loss'] >= Decimal('5.00'):
                        severity = 'MEDIUM'
                    else:
                        severity = 'LOW'
                    
                    writer.writerow({
                        'Product_Code': item['sku'],
                        'Product_Name': item.get('name', 'Unknown'),
                        'Source_Qty': f"{item['source_qty']:.2f}",
                        'Target_Qty': f"{item['target_qty']:.0f}",
                        'Qty_Loss': f"{item['loss']:.2f}",
                        'Unit_Cost_ExcVAT': f"{item['price']:.2f}",
                        'Value_Loss_ExcVAT': f"{item['value_loss']:.2f}",
                        'VAT_Rate': f"{vat_rate * 100:.2f}%",
                        'Value_Loss_IncVAT': f"{value_loss_inc_vat:.2f}",
                        'Severity': severity
                    })
            
            logger.info(f"\n✅ Rounding losses exported to: {output_path}")
            logger.info(f"   Total items exported: {len(sorted_items)}")
            logger.info(f"   Total value loss (exc VAT): £{sum(x['value_loss'] for x in sorted_items):,.2f}")
            logger.info(f"   Total value loss (inc VAT): £{sum(x['value_loss'] * (Decimal('1') + vat_rate) for x in sorted_items):,.2f}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to export rounding losses to CSV: {e}")
            return None
    
    def migrate_users(self):

        """Migrate users from legacy to modern schema."""
        logger.info("Starting user migration...")
        
        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()
        
        try:
            with source_conn.cursor(pymysql.cursors.DictCursor) as source_cursor:
                with target_conn.cursor() as target_cursor:
                    # First, check if "Legacy System" user already exists
                    legacy_user_id = 'legacy-system'
                    
                    target_cursor.execute("SELECT id FROM users WHERE id = %s", (legacy_user_id,))
                    existing_legacy_user = target_cursor.fetchone()
                    
                    if existing_legacy_user:
                        logger.info(f"Legacy system user already exists with ID: {legacy_user_id}")
                        self.id_mappings['users']['LEGACY_SYSTEM'] = legacy_user_id
                    else:
                        # Create a "Legacy System" user for foreign key integrity
                        legacy_user_sql = """
                            INSERT INTO users (
                                id, email, password_hash, first_name, last_name, role,
                                is_active, must_change_password, show_picking_list, created_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                        """
                        
                        target_cursor.execute(legacy_user_sql, (
                            legacy_user_id,
                            'legacy@system.local',
                            self._hash_password('legacy_system_account'),  # Hash the password
                            'Legacy',
                            'System',
                            'admin',
                            False,  # Not active - this is just for data integrity
                            False,
                            True,   # show_picking_list - default to true
                            datetime.now(timezone.utc),
                            datetime.now(timezone.utc)
                        ))
                        
                        self.id_mappings['users']['LEGACY_SYSTEM'] = legacy_user_id
                        # logger.info(f"Created legacy system user with ID: {legacy_user_id}")
                    
                    # Get all users from legacy system
                    source_cursor.execute("SELECT * FROM users")
                    legacy_users = source_cursor.fetchall()
                    
                    for user in legacy_users:
                        try:
                            self.migration_stats['users']['processed'] += 1
                            
                            # Generate a string ID based on username
                            user_id = f"user-{user['USERNAME'].lower().replace(' ', '-')}"
                            
                            # Check if user already exists
                            target_cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
                            if target_cursor.fetchone():
                                # logger.info(f"User {user['USERNAME']} already exists, skipping...")
                                self.migration_stats['users']['skipped'] += 1
                                self.id_mappings['users'][user['USERNAME']] = user_id
                                continue
                            
                            # Map legacy user to modern schema
                            email = self._safe_str(user['USERNAME'], 255)
                            if not email or '@' not in email:
                                email = f"{user['USERNAME']}@physics.lancs.ac.uk"
                            
                            # Determine role based on legacy level
                            level = self._safe_int(user.get('LEVEL', 0))
                            if level >= 10:
                                role = 'admin'
                            elif level >= 5:
                                role = 'manager'
                            else:
                                role = 'user'
                            
                            # Insert new user with ON CONFLICT handling
                            insert_sql = """
                                INSERT INTO users (
                                    id, email, password_hash, first_name, last_name, role,
                                    is_active, must_change_password, show_picking_list, created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING
                            """
                            
                            target_cursor.execute(insert_sql, (
                                user_id,
                                email,
                                self._hash_password(user.get('USERPASSWORD', 'changeme')),  # Hash legacy password
                                self._safe_str(user['USERNAME'], 50),  # Use username as first name
                                'User',  # Default last name
                                role,
                                True,  # is_active
                                True,  # must_change_password
                                True,  # show_picking_list - default to true
                                datetime.now(timezone.utc),
                                datetime.now(timezone.utc)
                            ))
                            
                            self.id_mappings['users'][user['USERNAME']] = user_id
                            
                            self.migration_stats['users']['migrated'] += 1
                            logger.info(f"Migrated user: {user['USERNAME']} -> ID {user_id}")
                            
                        except Exception as e:
                            self.migration_stats['users']['errors'] += 1
                            # logger.error(f"Error migrating user {user['USERNAME']}: {e}")
                            continue
            
            target_conn.commit()
            
        except Exception as e:
            target_conn.rollback()
            raise DataMigrationError(f"User migration failed: {e}")
        finally:
            source_conn.close()
            target_conn.close()
    
    def _has_executable_sql(self, sql_content: str) -> bool:
        """Check if SQL content has any executable statements (not just comments)."""
        for line in sql_content.split('\n'):
            # Strip whitespace
            line = line.strip()
            # Skip empty lines
            if not line:
                continue
            # Skip comment lines
            if line.startswith('--'):
                continue
            # If we find any non-comment, non-empty line, there's executable SQL
            return True
        return False

    def verify_and_apply_migrations(self):
        """Verify database schema and apply any missing SQL migrations from the migrations folder."""
        logger.info("Starting migration verification and application...")

        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as cursor:
                # Check if migration tracking table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'applied_migrations'
                    );
                """)
                
                migration_table_exists = cursor.fetchone()[0]
                
                if not migration_table_exists:
                    # Create migration tracking table
                    logger.info("Creating migration tracking table...")
                    cursor.execute("""
                        CREATE TABLE applied_migrations (
                            id SERIAL PRIMARY KEY,
                            migration_name VARCHAR(255) NOT NULL UNIQUE,
                            applied_at TIMESTAMP DEFAULT NOW()
                        );
                    """)
                
                # Get all SQL migration files from the migrations directory
                migrations_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations')
                
                if not os.path.exists(migrations_dir):
                    logger.warning(f"Migrations directory not found: {migrations_dir}")
                    target_conn.commit()
                    return
                
                # Get all .sql files, sorted alphabetically/numerically
                migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])
                
                if not migration_files:
                    logger.info("No SQL migration files found in migrations directory")
                    target_conn.commit()
                    return
                
                logger.info(f"Found {len(migration_files)} migration files in {migrations_dir}")
                
                # Apply each migration file
                for migration_file in migration_files:
                    migration_name = os.path.splitext(migration_file)[0]  # Remove .sql extension
                    
                    # Check if migration was already applied
                    cursor.execute(
                        "SELECT COUNT(*) FROM applied_migrations WHERE migration_name = %s",
                        (migration_name,)
                    )
                    
                    if cursor.fetchone()[0] > 0:
                        logger.info(f"Migration {migration_name} already applied, skipping...")
                        continue
                    
                    # Read migration SQL file
                    migration_path = os.path.join(migrations_dir, migration_file)
                    logger.info(f"Applying migration: {migration_name}")
                    
                    try:
                        with open(migration_path, 'r') as f:
                            migration_sql = f.read()

                        # Check if the file contains executable SQL (not just comments)
                        if not self._has_executable_sql(migration_sql):
                            logger.info(f"📝 Migration {migration_name} contains only documentation (no SQL to execute), marking as applied...")
                            cursor.execute(
                                "INSERT INTO applied_migrations (migration_name) VALUES (%s) ON CONFLICT (migration_name) DO NOTHING",
                                (migration_name,)
                            )
                            target_conn.commit()
                            continue

                        # Execute migration SQL (split by statements if needed)
                        # Note: Some complex migrations may need special handling
                        if migration_sql.strip():
                            try:
                                # Execute the entire file as one transaction
                                cursor.execute(migration_sql)

                                # Record successful migration
                                cursor.execute(
                                    "INSERT INTO applied_migrations (migration_name) VALUES (%s)",
                                    (migration_name,)
                                )

                                logger.info(f"✅ Successfully applied migration: {migration_name}")

                            except Exception as e:
                                # Rollback the failed transaction
                                target_conn.rollback()
                                
                                # Check if it's a "already exists" type error
                                error_msg = str(e).lower()
                                if 'already exists' in error_msg or 'duplicate' in error_msg:
                                    logger.warning(f"⚠️  Migration {migration_name} appears already applied: {e}")
                                    # Record it as applied to avoid future attempts
                                    try:
                                        cursor.execute(
                                            "INSERT INTO applied_migrations (migration_name) VALUES (%s) ON CONFLICT (migration_name) DO NOTHING",
                                            (migration_name,)
                                        )
                                        target_conn.commit()  # Commit the tracking record
                                    except Exception as record_error:
                                        logger.warning(f"Could not record migration {migration_name}: {record_error}")
                                        target_conn.rollback()
                                    continue
                                else:
                                    # For other errors, re-raise
                                    logger.error(f"❌ Failed to apply migration {migration_name}: {e}")
                                    raise DataMigrationError(f"Migration {migration_name} failed: {e}")
                                
                        else:
                            logger.warning(f"Migration file {migration_file} is empty, skipping...")
                        
                    except DataMigrationError:
                        # Re-raise DataMigrationError (already handled above)
                        raise
                    except Exception as e:
                        # Unexpected error during file reading
                        logger.error(f"❌ Failed to process migration file {migration_name}: {e}")
                        raise DataMigrationError(f"Migration file processing failed for {migration_name}: {e}")
                
                target_conn.commit()
                logger.info("All migrations verified and applied successfully")
                
                # Show applied migrations
                cursor.execute("SELECT migration_name, applied_at FROM applied_migrations ORDER BY applied_at")
                applied = cursor.fetchall()
                logger.info(f"\n{'='*60}")
                logger.info("Applied Migrations:")
                for migration_name, applied_at in applied:
                    logger.info(f"  ✓ {migration_name} (applied: {applied_at})")
                logger.info(f"{'='*60}\n")
                
        except Exception as e:
            target_conn.rollback()
            raise DataMigrationError(f"Migration verification failed: {e}")
        finally:
            target_conn.close()
    
    def migrate_categories(self):
        """Create default categories matching the application's seed data."""
        logger.info("Starting category migration...")
        
        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as target_cursor:
                # Default categories matching the application seed data
                default_categories = [
                    {
                        'name': 'IT Equipment',
                        'description': 'Computers, laptops, and technology devices',
                        'icon': 'fas fa-laptop',
                        'color': 'blue'
                    },
                    {
                        'name': 'Office Supplies',
                        'description': 'Pens, paper, and general office materials',
                        'icon': 'fas fa-paperclip',
                        'color': 'green'
                    },
                    {
                        'name': 'Textbooks',
                        'description': 'Educational books and learning materials',
                        'icon': 'fas fa-book',
                        'color': 'orange'
                    },
                    {
                        'name': 'Laboratory',
                        'description': 'Scientific equipment and lab supplies',
                        'icon': 'fas fa-microscope',
                        'color': 'purple'
                    },
                    {
                        'name': 'Furniture',
                        'description': 'Desks, chairs, and office furniture',
                        'icon': 'fas fa-chair',
                        'color': 'brown'
                    },
                    {
                        'name': 'General',
                        'description': 'General laboratory supplies (migrated from legacy system)',
                        'icon': 'fas fa-box',
                        'color': '#6c757d'
                    }
                ]
                
                category_sql = """
                    INSERT INTO categories (name, description, icon, color, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        description = EXCLUDED.description,
                        icon = EXCLUDED.icon,
                        color = EXCLUDED.color,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id
                """
                
                general_category_id = None
                for category in default_categories:
                    # Check if category already exists
                    target_cursor.execute("SELECT id FROM categories WHERE name = %s", (category['name'],))
                    existing = target_cursor.fetchone()
                    
                    if existing:
                        category_id = existing[0]
                        logger.info(f"Category '{category['name']}' already exists (ID: {category_id})")
                        self.migration_stats['categories']['skipped'] += 1
                    else:
                        target_cursor.execute(category_sql, (
                            category['name'],
                            category['description'],
                            category['icon'],
                            category['color'],
                            datetime.now(timezone.utc),
                            datetime.now(timezone.utc)
                        ))
                        category_id = target_cursor.fetchone()[0]
                        logger.info(f"Created category '{category['name']}' (ID: {category_id})")
                        self.migration_stats['categories']['migrated'] += 1
                    
                    # Store the General category ID for legacy item mapping
                    if category['name'] == 'General':
                        general_category_id = category_id
                
                # Map all possible prefixes and empty string to General category for legacy items
                self.id_mappings['categories'][''] = general_category_id
                self.id_mappings['categories']['GENERAL'] = general_category_id
                
                self.migration_stats['categories']['processed'] = len(default_categories)
                logger.info(f"Processed {len(default_categories)} categories: {self.migration_stats['categories']['migrated']} created, {self.migration_stats['categories']['skipped']} existing")
            
            target_conn.commit()
            
        except Exception as e:
            target_conn.rollback()
            raise DataMigrationError(f"Category migration failed: {e}")
        finally:
            target_conn.close()
    
    def migrate_suppliers(self):
        """Migrate suppliers from legacy to modern schema with batching."""
        logger.info("Starting supplier migration with batch processing...")

        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()

        try:
            with target_conn.cursor() as target_cursor:
                # Check if suppliers table has an auto-incrementing ID
                target_cursor.execute("""
                    SELECT column_name, column_default, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'suppliers' AND table_schema = 'public'
                    ORDER BY ordinal_position
                """)
                supplier_columns = target_cursor.fetchall()
                logger.info(f"Suppliers table schema: {supplier_columns}")

            # Step 1: Verify row count in source table
            expected_count = self._verify_row_count(source_conn, 'supplier', 'SELECT COUNT(*) FROM supplier')

            # Step 2: Fetch and process in batches
            query = "SELECT * FROM supplier ORDER BY CODE"  # ORDER BY for consistent batching

            for batch in self._fetch_in_batches(source_conn, query, 'supplier', expected_count):
                # Process batch with retry logic
                def process_batch():
                    with target_conn.cursor() as target_cursor:
                        for supplier in batch:
                            try:
                                self.migration_stats['suppliers']['processed'] += 1

                                # Build address from legacy fields
                                address_parts = []
                                for addr_field in ['ADDRESS1', 'ADDRESS2', 'ADDRESS3', 'ADDRESS4']:
                                    addr_part = self._safe_str(supplier.get(addr_field))
                                    if addr_part:
                                        address_parts.append(addr_part)

                                full_address = ', '.join(address_parts) if address_parts else None

                                # Handle notes migration
                                notes_id = None
                                supplier_notes = self._safe_str(supplier.get('NOTES'))
                                supplier_code = self._safe_str(supplier.get('CODE'))
                                if supplier_notes:
                                    # Insert into notes table with correct column names and required fields
                                    insert_note_sql = """
                                        INSERT INTO notes (text, reference_type, reference_id, created_by, created_at, updated_at)
                                        VALUES (%s, %s, %s, %s, %s, %s)
                                        RETURNING id
                                    """
                                    target_cursor.execute(insert_note_sql, (
                                        supplier_notes,
                                        'supplier',  # reference_type
                                        supplier_code,  # reference_id (supplier CODE)
                                        'admin_001',  # created_by (default admin user)
                                        datetime.now(timezone.utc),
                                        datetime.now(timezone.utc)
                                    ))
                                    notes_id = target_cursor.fetchone()[0]

                                # Insert supplier - use CODE as ID since it's varchar not auto-increment
                                insert_sql = """
                                    INSERT INTO suppliers (
                                        id, name, contact, email, phone, address, account_number, notes_id, created_at, updated_at
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                    ON CONFLICT (id) DO UPDATE SET
                                        name = EXCLUDED.name,
                                        phone = EXCLUDED.phone,
                                        address = EXCLUDED.address,
                                        account_number = EXCLUDED.account_number,
                                        notes_id = EXCLUDED.notes_id,
                                        updated_at = EXCLUDED.updated_at
                                """

                                supplier_id = self._safe_str(supplier['CODE'], 50)  # Use CODE as ID
                                supplier_name = self._safe_str(supplier['NAME'], 255) or f"Supplier {supplier['CODE']}"
                                account_number = self._safe_str(supplier.get('ACCOUNT'), 25)

                                target_cursor.execute(insert_sql, (
                                    supplier_id,
                                    supplier_name,
                                    None,  # No contact person in legacy
                                    None,  # No email in legacy
                                    self._safe_str(supplier.get('TELEPHONE'), 50),
                                    full_address,
                                    account_number,
                                    notes_id,
                                    datetime.now(timezone.utc),
                                    datetime.now(timezone.utc)
                                ))

                                self.id_mappings['suppliers'][supplier['CODE']] = supplier_id
                                self.migration_stats['suppliers']['migrated'] += 1

                            except Exception as e:
                                self.migration_stats['suppliers']['errors'] += 1
                                logger.error(f"ERROR: Failed to migrate supplier {supplier.get('CODE', 'UNKNOWN')}: {e}")
                                logger.error(f"Supplier data: {supplier}")
                                raise DataMigrationError(f"Supplier migration failed for {supplier.get('CODE', 'UNKNOWN')}: {e}")

                        # Commit batch
                        target_conn.commit()
                        logger.info(f"Committed batch of {len(batch)} suppliers (total migrated: {self.migration_stats['suppliers']['migrated']})")

                # Retry batch processing if it fails
                self._retry_operation(process_batch, max_retries=3, retry_delay=5)

            # Step 3: Verify final counts
            logger.info(f"Supplier migration completed: {self.migration_stats['suppliers']['migrated']} migrated, {self.migration_stats['suppliers']['errors']} errors")

            if expected_count > 0 and self.migration_stats['suppliers']['processed'] != expected_count:
                logger.error(f"Row count mismatch! Expected {expected_count}, processed {self.migration_stats['suppliers']['processed']}")
                raise DataMigrationError(f"Supplier migration incomplete: expected {expected_count} rows, processed {self.migration_stats['suppliers']['processed']}")

        except Exception as e:
            target_conn.rollback()
            logger.error(f"Supplier migration failed completely: {e}")
            raise DataMigrationError(f"Supplier migration failed: {e}")
        finally:
            source_conn.close()
            target_conn.close()
    
    def migrate_items(self):
        """Migrate stock items from legacy to modern schema with batching."""
        logger.info("Starting item migration with batch processing...")

        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()

        try:
            # Fetch VAT rate from legacy database
            logger.info("Fetching VAT rate from legacy database...")
            with source_conn.cursor(pymysql.cursors.DictCursor) as source_cursor:
                source_cursor.execute("SELECT VAT FROM vatparams LIMIT 1")
                vat_result = source_cursor.fetchone()
                if vat_result and vat_result.get('VAT'):
                    # VAT is stored as percentage (e.g., 20.00), convert to decimal (0.20)
                    vat_percentage = Decimal(str(vat_result['VAT']))
                    self.value_tracking['vat_rate_from_source'] = vat_percentage / Decimal('100')
                    logger.info(f"Found VAT rate in legacy DB: {vat_percentage}% (will use {self.value_tracking['vat_rate_from_source']} as decimal)")
                else:
                    # Default to 20% if not found
                    self.value_tracking['vat_rate_from_source'] = Decimal('0.20')
                    logger.warning("No VAT rate found in legacy database, defaulting to 20%")
            
            vat_rate = self.value_tracking['vat_rate_from_source']

            # User migration is skipped, so we'll use NULL for created_by
            logger.info("User migration skipped, items will have NULL created_by")

            # Ensure the SKU unique constraint exists (should be from migrations, but verify)
            with target_conn.cursor() as target_cursor:
                target_cursor.execute("""
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'items' 
                    AND constraint_type = 'UNIQUE' 
                    AND constraint_name = 'items_sku_unique'
                """)
                
                if not target_cursor.fetchone():
                    logger.warning("SKU unique constraint missing, creating it now...")
                    try:
                        target_cursor.execute("""
                            ALTER TABLE items ADD CONSTRAINT items_sku_unique UNIQUE (sku)
                        """)
                        target_conn.commit()
                        logger.info("✓ Created items_sku_unique constraint")
                    except Exception as e:
                        logger.error(f"Failed to create SKU unique constraint: {e}")
                        target_conn.rollback()
                        raise
                else:
                    logger.info("✓ SKU unique constraint exists")

            # Get general category ID
            general_category_id = self.id_mappings['categories']['GENERAL']
            logger.info(f"Using general category ID: {general_category_id}")

            # Step 1: Verify row count in source table
            expected_count = self._verify_row_count(source_conn, 'stock', 'SELECT COUNT(*) FROM stock')

            # Step 2: Fetch and process in batches
            query = "SELECT * FROM stock ORDER BY CODE"  # ORDER BY for consistent batching

            for batch in self._fetch_in_batches(source_conn, query, 'stock', expected_count):
                # Process batch with retry logic
                def process_batch():
                    with target_conn.cursor() as target_cursor:
                        for item in batch:
                            try:
                                self.migration_stats['items']['processed'] += 1

                                # Check if item has a valid CODE (required for SKU)
                                item_code = item.get('CODE')
                                if not item_code:
                                    # Track skipped value
                                    skipped_price = self._safe_decimal(item.get('PRICE'))
                                    skipped_qty = self._safe_decimal(item.get('BALANCE'))
                                    skipped_value = skipped_price * skipped_qty
                                    self.value_tracking['skipped_value_exc_vat'] += skipped_value
                                    self.value_tracking['skipped_items'].append(
                                        ('NO-CODE', 'Missing item code', skipped_value)
                                    )
                                    logger.warning(f"Skipping item with missing CODE: {item}")
                                    self.migration_stats['items']['skipped'] += 1
                                    continue

                                # Calculate source item value (price * balance)
                                # Legacy DB prices are EXCLUDING VAT
                                source_price_exc_vat = self._safe_decimal(item.get('PRICE'))
                                source_balance = self._safe_decimal(item.get('BALANCE'))
                                source_value_exc_vat = source_price_exc_vat * source_balance
                                source_value_inc_vat = source_value_exc_vat * (Decimal('1') + vat_rate)

                                # Track source value statistics
                                self.value_tracking['source_total_value_exc_vat'] += source_value_exc_vat
                                self.value_tracking['source_total_value_inc_vat'] += source_value_inc_vat
                                if source_value_exc_vat > 0:
                                    self.value_tracking['source_items_with_value'] += 1
                                if source_price_exc_vat == 0:
                                    self.value_tracking['source_items_zero_price'] += 1
                                    logger.info(f"[VALUE TRACKING] Item {item_code} has ZERO PRICE (stock: {source_balance})")
                                if source_balance == 0:
                                    self.value_tracking['source_items_zero_stock'] += 1

                                # All items go in General category
                                category_id = general_category_id

                                # Build description from DESC1 and DESC2
                                desc_parts = []
                                if item.get('DESC1'):
                                    desc_parts.append(self._safe_str(item['DESC1']))
                                if item.get('DESC2'):
                                    desc_parts.append(self._safe_str(item['DESC2']))
                                description = ' - '.join(desc_parts) if desc_parts else None

                                # Debug logging for this item
                                item_name = self._safe_str(item.get('DESC1'), 255) or f"Item {item_code}"

                                # Insert item
                                insert_sql = """
                                    INSERT INTO items (
                                        name, sku, description, category_id, price, vat_rate, vat_included,
                                        current_stock, minimum_stock, unit, location, is_active, created_by, updated_by,
                                        created_at, updated_at
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                    ON CONFLICT (sku) DO UPDATE SET
                                        name = EXCLUDED.name,
                                        description = EXCLUDED.description,
                                        category_id = EXCLUDED.category_id,
                                        price = EXCLUDED.price,
                                        vat_rate = EXCLUDED.vat_rate,
                                        current_stock = EXCLUDED.current_stock,
                                        minimum_stock = EXCLUDED.minimum_stock,
                                        unit = EXCLUDED.unit,
                                        location = EXCLUDED.location,
                                        is_active = EXCLUDED.is_active,
                                        updated_at = EXCLUDED.updated_at
                                    RETURNING id
                                """

                                # Convert balance to NUMERIC(10,2) for database (preserves decimals)
                                # After schema migration to decimal support, we can now store fractional quantities
                                source_balance_raw = self._safe_decimal(item.get('BALANCE'))
                                target_current_stock = source_balance_raw.quantize(Decimal('0.01'))  # Round to 2 decimal places

                                target_minimum_stock = self._safe_decimal(item.get('MIN')).quantize(Decimal('0.01'))

                                # Get unit and location from legacy database
                                # SIZE field contains the unit (e.g., "kg", "liters", "pieces")
                                item_unit = self._safe_str(item.get('SIZE'), 50) or 'pieces'
                                item_location = self._safe_str(item.get('LOCATION'), 200)

                                target_cursor.execute(insert_sql, (
                                    item_name,
                                    self._safe_str(item_code, 50),  # Use item_code (validated above)
                                    description,
                                    category_id,
                                    source_price_exc_vat,  # Price from legacy DB (excluding VAT)
                                    vat_rate,  # VAT rate from legacy DB or default 20%
                                    False,  # VAT not included in legacy prices
                                    target_current_stock,  # Decimal stock value (2 decimal places)
                                    target_minimum_stock,  # Decimal minimum stock value (2 decimal places)
                                    item_unit,  # Unit from SIZE field (default to 'pieces')
                                    item_location,  # Location from LOCATION field
                                    True,  # is_active - always set to True for all migrated items
                                    None,  # created_by - NULL since user migration is skipped
                                    None,  # updated_by - NULL since user migration is skipped
                                    datetime.now(timezone.utc),
                                    datetime.now(timezone.utc)
                                ))

                                item_id = target_cursor.fetchone()[0]
                                self.id_mappings['items'][item_code] = item_id

                                self.migration_stats['items']['migrated'] += 1

                                # Track target value using ACTUAL inserted decimal stock value
                                # After decimal migration, stock values are preserved with 2 decimal places
                                target_stock_decimal = Decimal(str(target_current_stock))
                                target_value_exc_vat = source_price_exc_vat * target_stock_decimal
                                target_value_inc_vat = target_value_exc_vat * (Decimal('1') + vat_rate)
                                self.value_tracking['target_total_value_exc_vat'] += target_value_exc_vat
                                self.value_tracking['target_total_value_inc_vat'] += target_value_inc_vat
                                if target_value_exc_vat > 0:
                                    self.value_tracking['target_items_with_value'] += 1
                                
                                # Track any remaining precision loss (should be minimal with decimal support)
                                rounding_loss = abs(source_balance - target_stock_decimal)
                                if rounding_loss > Decimal('0.01'):
                                    rounding_value_loss = source_price_exc_vat * rounding_loss
                                    self.value_tracking['rounding_loss_qty'] += rounding_loss
                                    self.value_tracking['rounding_loss_value_exc_vat'] += rounding_value_loss
                                    self.value_tracking['rounding_loss_items'] += 1
                                    
                                    # Track fractional stock items for analysis
                                    fractional_part = source_balance - Decimal(int(source_balance))
                                    if fractional_part > Decimal('0.01'):
                                        self.value_tracking['fractional_stock_items'].append({
                                            'sku': item_code,
                                            'name': item_name,
                                            'source_qty': source_balance,
                                            'target_qty': target_stock_decimal,
                                            'loss': rounding_loss,
                                            'price': source_price_exc_vat,
                                            'value_loss': rounding_value_loss
                                        })
                                    
                                    # Flag suspicious discrepancies (loss > 1.0 unit or > £10 value)
                                    if rounding_loss > Decimal('1.0') or rounding_value_loss > Decimal('10.00'):
                                        self.value_tracking['suspicious_items'].append({
                                            'sku': item_code,
                                            'name': item_name,
                                            'source_qty': source_balance,
                                            'target_qty': target_stock_decimal,
                                            'qty_loss': rounding_loss,
                                            'price': source_price_exc_vat,
                                            'value_loss': rounding_value_loss,
                                            'issue': 'Large rounding loss' if rounding_loss > Decimal('1.0') else 'High value loss'
                                        })
                                        logger.warning(f"[SUSPICIOUS] Item {item_code}: Large discrepancy! Source={source_balance}, Target={target_current_stock}, Loss={rounding_loss} units (£{rounding_value_loss:.2f})")
                                    else:
                                        logger.info(f"[VALUE TRACKING] Item {item_code}: Stock rounded from {source_balance} to {target_current_stock}, value loss: £{rounding_value_loss:.2f}")

                            except Exception as e:
                                self.migration_stats['items']['errors'] += 1
                                # Track error value
                                error_code = item.get('CODE', 'UNKNOWN')
                                error_price = self._safe_decimal(item.get('PRICE'))
                                error_qty = self._safe_decimal(item.get('BALANCE'))
                                error_value = error_price * error_qty
                                self.value_tracking['skipped_value_exc_vat'] += error_value
                                self.value_tracking['skipped_items'].append(
                                    (error_code, f'Migration error: {str(e)[:50]}', error_value)
                                )
                                logger.error(f"ERROR: Failed to migrate item {error_code}: {e}")
                                logger.error(f"Item data: {item}")
                                raise DataMigrationError(f"Item migration failed for {error_code}: {e}")

                        # Commit batch
                        target_conn.commit()
                        logger.info(f"Committed batch of {len(batch)} items (total migrated: {self.migration_stats['items']['migrated']})")

                # Retry batch processing if it fails
                self._retry_operation(process_batch, max_retries=3, retry_delay=5)

            # Step 3: Verify final counts
            logger.info(f"Item migration completed: {self.migration_stats['items']['migrated']} migrated, {self.migration_stats['items']['errors']} errors, {self.migration_stats['items']['skipped']} skipped")

            if expected_count > 0 and self.migration_stats['items']['processed'] != expected_count:
                logger.error(f"Row count mismatch! Expected {expected_count}, processed {self.migration_stats['items']['processed']}")
                raise DataMigrationError(f"Item migration incomplete: expected {expected_count} rows, processed {self.migration_stats['items']['processed']}")

            # Diagnostic: Show items missing from target that exist in source
            logger.info("\n" + "="*60)
            logger.info("DIAGNOSTIC: Checking for items in source not in target...")
            logger.info("="*60)
            with source_conn.cursor(pymysql.cursors.DictCursor) as diag_cursor:
                with target_conn.cursor() as target_cursor:
                    # Get all source items with value
                    diag_cursor.execute("""
                        SELECT CODE, DESC1, PRICE, BALANCE, (PRICE * BALANCE) as value
                        FROM stock
                        WHERE (PRICE * BALANCE) > 0
                        ORDER BY (PRICE * BALANCE) DESC
                        LIMIT 20
                    """)
                    top_value_items = diag_cursor.fetchall()

                    logger.info("Top 20 most valuable items in source:")
                    missing_high_value = []
                    for item in top_value_items:
                        code = item['CODE']
                        value = self._safe_decimal(item['value'])

                        # Check if this item exists in target
                        target_cursor.execute("SELECT id FROM items WHERE UPPER(sku) = UPPER(%s)", (code,))
                        if target_cursor.fetchone():
                            status = "✓ MIGRATED"
                        else:
                            status = "✗ MISSING"
                            missing_high_value.append((code, item['DESC1'], value))

                        logger.info(f"  {status:12} {code:12} £{value:>10,.2f}  {item['DESC1']}")

                    if missing_high_value:
                        logger.warning(f"\n⚠️  {len(missing_high_value)} high-value items are MISSING from target database!")
                        for code, desc, value in missing_high_value:
                            logger.warning(f"   - {code}: {desc} (value: £{value:,.2f})")
                    else:
                        logger.info("\n✅ All top 20 valuable items successfully migrated!")

            logger.info("="*60 + "\n")

            # VERIFICATION: Check if items are actually committed to database
            logger.info("="*60)
            logger.info("POST-MIGRATION VERIFICATION")
            logger.info("="*60)
            with target_conn.cursor() as verify_cursor:
                # Count items in target database
                verify_cursor.execute("SELECT COUNT(*) FROM items")
                actual_db_count = verify_cursor.fetchone()[0]
                logger.info(f"Items in target database (actual):     {actual_db_count}")
                logger.info(f"Items migrated (script counted):       {self.migration_stats['items']['migrated']}")

                if actual_db_count != self.migration_stats['items']['migrated']:
                    logger.error(f"⚠️  MISMATCH! Database has {actual_db_count} but script counted {self.migration_stats['items']['migrated']}")
                else:
                    logger.info("✅ Database count matches migration count")

                # Specific check for EL2526
                verify_cursor.execute("SELECT id, name, sku, price, current_stock FROM items WHERE sku ILIKE '%EL2526%'")
                el2526_results = verify_cursor.fetchall()

                logger.info(f"\nSearching for EL2526 in database:")
                if el2526_results:
                    for row in el2526_results:
                        logger.info(f"  ✓ FOUND: ID={row[0]}, Name='{row[1]}', SKU='{row[2]}', Price=£{row[3]}, Stock={row[4]}")
                else:
                    logger.warning("  ✗ EL2526 NOT FOUND in database!")

                    # Try broader search
                    verify_cursor.execute("SELECT sku FROM items WHERE sku LIKE 'EL25%' ORDER BY sku")
                    similar = verify_cursor.fetchall()
                    if similar:
                        logger.info("  Similar EL25xx SKUs found:")
                        for (sku,) in similar[:10]:
                            logger.info(f"    - {sku}")

            logger.info("="*60 + "\n")

        except Exception as e:
            target_conn.rollback()
            logger.error(f"Item migration failed completely: {e}")
            raise DataMigrationError(f"Item migration failed: {e}")
        finally:
            source_conn.close()
            target_conn.close()
    
    def ensure_misc_item(self):
        """Ensure MISC item exists for adjustments and refunds."""
        logger.info("Ensuring MISC adjustment item exists...")
        
        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as cursor:
                # 1. Ensure "Miscellaneous" category exists
                cursor.execute("""
                    INSERT INTO categories (name, description, icon, color)
                    VALUES ('Miscellaneous', 'Adjustments, refunds, and miscellaneous items', 'fas fa-adjust', 'gray')
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                """)
                
                result = cursor.fetchone()
                if result:
                    misc_category_id = result[0]
                else:
                    # Category already exists, fetch it
                    cursor.execute("SELECT id FROM categories WHERE name = 'Miscellaneous'")
                    misc_category_id = cursor.fetchone()[0]
                
                # 2. Ensure MISC item exists
                cursor.execute("""
                    INSERT INTO items (
                        name, sku, description, category_id, price, vat_rate, 
                        vat_included, current_stock, minimum_stock, unit, 
                        location, is_active
                    )
                    VALUES (
                        'MISC - Adjustment Item', 
                        'MISC', 
                        'Generic item for adjustments, refunds, and miscellaneous charges. Price is set per transaction.',
                        %s,
                        0.00,  -- Default price is 0, will be overridden per transaction
                        0.20,  -- 20%% VAT
                        false, -- Price excludes VAT
                        999999.00, -- Effectively unlimited stock
                        0.00,
                        'each',
                        'Virtual',
                        true
                    )
                    ON CONFLICT (sku) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        current_stock = 999999.00,
                        is_active = true
                    RETURNING id, sku
                """, (misc_category_id,))
                
                misc_item = cursor.fetchone()
                logger.info(f"✅ MISC item ensured: ID={misc_item[0]}, SKU={misc_item[1]}")
                
            target_conn.commit()
            
        except Exception as e:
            logger.error(f"Error ensuring MISC item: {e}")
            target_conn.rollback()
            raise
        finally:
            target_conn.close()
    
    def create_supplier_relationship_orders(self):
        """Create zero-quantity orders for items with suppliers to preserve supplier relationships.

        In the legacy system, each item had up to 3 suppliers defined via SUPPLY1/REF1, SUPPLY2/REF2, SUPPLY3/REF3.
        In the new system, we support multiple suppliers per item. To preserve the historical supplier information
        and show users where items were previously ordered from, we create a zero-quantity order for each 
        item-supplier relationship with a date of 01/01/1980 (indicating historical).
        
        These orders are created with status='historical_migration' and appear in the "See Past Orders"
        UI for each item, showing the complete supplier history from the legacy system.
        """
        print("\n" + "="*80)
        print("📦 STEP 7.6: Creating Historical Supplier Relationship Orders")
        print("="*80)
        logger.info("Creating supplier relationship orders (zero-quantity, dated 01/01/1980) to preserve legacy supplier data...")

        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()

        # Use 01/01/1980 as the historical date to indicate these are legacy supplier relationships
        historical_date = datetime(1980, 1, 1, tzinfo=timezone.utc)

        try:
            with source_conn.cursor(pymysql.cursors.DictCursor) as source_cursor:
                with target_conn.cursor() as target_cursor:
                    # Get the admin user ID for created_by (must be a real user)
                    target_cursor.execute("SELECT id FROM users WHERE role = %s LIMIT 1", ('admin',))
                    admin_user_result = target_cursor.fetchone()
                    admin_user_id = admin_user_result[0] if admin_user_result else None
                    
                    if not admin_user_id:
                        print("❌ ERROR: No admin user found in database - cannot create historical orders")
                        logger.error("No admin user found - cannot create historical orders without valid created_by user")
                        return

                    # Get all stock items with their SUPPLY1/SUPPLY2/SUPPLY3 relationships
                    source_cursor.execute("""
                        SELECT CODE, SUPPLY1, REF1, SUPPLY2, REF2, SUPPLY3, REF3
                        FROM stock
                        WHERE CODE IS NOT NULL
                    """)
                    stock_items = source_cursor.fetchall()

                    # Extract all supplier relationships (CODE, SUPPLY, REF)
                    supplier_relationships = []
                    for item in stock_items:
                        stock_code = item['CODE']
                        
                        # Check SUPPLY1/REF1
                        if item['SUPPLY1'] and str(item['SUPPLY1']).strip():
                            supplier_relationships.append({
                                'CODE': stock_code,
                                'SUPPLY': item['SUPPLY1'],
                                'REF': item['REF1'],
                                'slot': 1
                            })
                        
                        # Check SUPPLY2/REF2
                        if item['SUPPLY2'] and str(item['SUPPLY2']).strip():
                            supplier_relationships.append({
                                'CODE': stock_code,
                                'SUPPLY': item['SUPPLY2'],
                                'REF': item['REF2'],
                                'slot': 2
                            })
                        
                        # Check SUPPLY3/REF3
                        if item['SUPPLY3'] and str(item['SUPPLY3']).strip():
                            supplier_relationships.append({
                                'CODE': stock_code,
                                'SUPPLY': item['SUPPLY3'],
                                'REF': item['REF3'],
                                'slot': 3
                            })

                    print(f"📋 Found {len(supplier_relationships)} supplier relationships from legacy system")
                    print(f"   (from {len(stock_items)} stock items with SUPPLY1/2/3 data)")

                    relationship_orders_created = 0
                    skipped_missing_item = 0
                    skipped_missing_supplier = 0
                    errors = []

                    for supplier_rel in supplier_relationships:
                        stock_code = supplier_rel['CODE']
                        supplier_code = supplier_rel['SUPPLY']
                        ref_sku = supplier_rel['REF']
                        slot = supplier_rel['slot']

                        try:
                            # Get the migrated item ID
                            item_id = self.id_mappings['items'].get(stock_code)
                            if not item_id:
                                skipped_missing_item += 1
                                continue

                            # Get the migrated supplier ID
                            supplier_id = self.id_mappings['suppliers'].get(supplier_code)
                            if not supplier_id:
                                skipped_missing_supplier += 1
                                logger.debug(f"Supplier {supplier_code} not found in mappings for item {stock_code}")
                                continue

                            # Create a unique order ID for this relationship
                            order_id = f"LEGACY-SUPPLIER-{stock_code}-{supplier_code}-S{slot}"

                            # Check if this order already exists
                            target_cursor.execute("SELECT id FROM orders WHERE order_id = %s", (order_id,))
                            if target_cursor.fetchone():
                                continue

                            # Get item details for the order
                            target_cursor.execute("""
                                SELECT name, sku, price
                                FROM items
                                WHERE id = %s
                            """, (item_id,))
                            item_details = target_cursor.fetchone()

                            if not item_details:
                                logger.warning(f"Item details not found for item_id {item_id} (stock_code {stock_code})")
                                continue

                            item_name, item_sku, item_price = item_details

                            # Create the order header with historical date (01/01/1980)
                            target_cursor.execute("""
                                INSERT INTO orders (
                                    order_id, supplier_id, status, total_amount, delivery_charge,
                                    created_by, created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                RETURNING id
                            """, (
                                order_id,
                                supplier_id,
                                'historical_migration',  # Mark as historical migration
                                Decimal('0.00'),  # Zero total
                                Decimal('0.00'),  # Zero delivery charge
                                admin_user_id,  # Use actual admin user ID
                                historical_date,  # 01/01/1980 to indicate historical supplier relationship
                                historical_date
                            ))

                            result = target_cursor.fetchone()
                            if not result:
                                error_msg = f"Failed to insert order {order_id} - no ID returned"
                                logger.error(error_msg)
                                errors.append(error_msg)
                                continue

                            new_order_id = result[0]

                            # Get item category
                            target_cursor.execute("SELECT category_id FROM items WHERE id = %s", (item_id,))
                            category_result = target_cursor.fetchone()
                            category_id = category_result[0] if category_result else None

                            # Create the order item with zero quantity and historical date
                            # Store the vendor's reference SKU in the vendor_sku column
                            vendor_sku = self._safe_str(ref_sku, 100) if ref_sku else None

                            target_cursor.execute("""
                                INSERT INTO order_items (
                                    order_id, item_id, item_name, item_sku, vendor_sku, item_description, category_id,
                                    unit_cost, quantity, total_cost, received,
                                    received_quantity, created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                new_order_id,
                                item_id,
                                item_name,
                                item_sku,
                                vendor_sku,  # Store vendor's item reference ID here
                                f"Historical supplier relationship from legacy system" if vendor_sku else None,
                                category_id,
                                item_price or Decimal('0.00'),
                                Decimal('0.00'),  # Zero quantity - this is just for supplier relationship tracking
                                Decimal('0.00'),  # Zero total
                                True,  # Marked as received (historical)
                                Decimal('0.00'),  # Zero received quantity
                                historical_date,  # 01/01/1980 to indicate historical supplier relationship
                                historical_date
                            ))

                            relationship_orders_created += 1

                        except Exception as e:
                            # Roll back the transaction on error and create new connection to continue
                            target_conn.rollback()
                            error_msg = f"Failed to create supplier relationship order for {stock_code}: {str(e)}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                            # Get a fresh cursor after rollback to continue
                            target_cursor = target_conn.cursor()
                            continue

                    target_conn.commit()

                    # Log summary - CLEAR AND PROMINENT
                    print("\n✅ HISTORICAL ORDERS CREATED:")
                    print(f"   ✓ Created: {relationship_orders_created} orders")
                    if skipped_missing_item > 0:
                        print(f"   ⊘ Skipped (item not found): {skipped_missing_item}")
                    if skipped_missing_supplier > 0:
                        print(f"   ⊘ Skipped (supplier not found): {skipped_missing_supplier}")
                    
                    if errors:
                        print(f"   ⚠️  Errors encountered: {len(errors)}")
                        for error in errors[:5]:  # Show first 5 errors
                            print(f"      - {error}")
                        if len(errors) > 5:
                            print(f"      ... and {len(errors) - 5} more errors")

                    if relationship_orders_created == 0:
                        if len(supplier_relationships) > 0:
                            print(f"\n⚠️  WARNING: No orders created, but {len(supplier_relationships)} supplier relationships found!")
                            print("   → Most likely: {skipped_missing_supplier} suppliers not in new system (need mapping)")
                            print("   → Check error messages above or database connectivity")
                        else:
                            print("   (No SUPPLY1/2/3 data found in legacy stock table)")
                    else:
                        print(f"\n📍 These historical orders will appear in: Inventory → Item → 'See Past Orders'")

                    print("="*80 + "\n")

        except Exception as e:
            error_msg = f"Supplier relationship order creation failed: {str(e)}"
            logger.error(error_msg)
            target_conn.rollback()
            raise DataMigrationError(error_msg)
        finally:
            source_conn.close()
            target_conn.close()

    def migrate_chargecodes(self):
        """Migrate charge codes from legacy to modern schema."""
        logger.info("Starting chargecode migration...")
        
        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()
        
        try:
            with source_conn.cursor(pymysql.cursors.DictCursor) as source_cursor:
                with target_conn.cursor() as target_cursor:
                    # User migration is skipped, so we'll use NULL for authorised_by
                    logger.info("User migration skipped, chargecodes will have NULL authorised_by")
                    
                    # First create a general chargecode for legacy system (only if it doesn't exist)
                    target_cursor.execute("SELECT code FROM chargecodes WHERE code = %s", ('GENERAL',))
                    general_exists = target_cursor.fetchone()
                    
                    if not general_exists:
                        general_chargecode_sql = """
                            INSERT INTO chargecodes (
                                code, title, authorised_by, valid_from, valid_until,
                                pin, cost_centre, activity, cat3, created_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """

                        target_cursor.execute(general_chargecode_sql, (
                            'GENERAL',
                            'General charges (legacy system)',
                            None,  # authorised_by - NULL since user migration is skipped
                            datetime.now(timezone.utc).date(),
                            None,  # No expiry
                            None,  # No PIN
                            'GENERAL',
                            None,  # No activity for general
                            None,  # No cat3 for general
                            datetime.now(timezone.utc),
                            datetime.now(timezone.utc)
                        ))
                        
                        logger.info("Created general chargecode: GENERAL")
                    else:
                        logger.info("General chargecode already exists, skipping creation")
                    
                    self.id_mappings['chargecodes']['GENERAL'] = 'GENERAL'
                    
                    # Get all charge codes
                    source_cursor.execute("SELECT * FROM charge")
                    legacy_charges = source_cursor.fetchall()
                    logger.info(f"Found {len(legacy_charges)} chargecodes to migrate")
                    
                    for charge in legacy_charges:
                        try:
                            self.migration_stats['chargecodes']['processed'] += 1
                            
                            # Use COSTCENTRE as the charge code
                            code = self._safe_str(charge.get('COSTCENTRE'), 50)
                            if not code:
                                logger.warning(f"Skipping chargecode with missing COSTCENTRE: {charge}")
                                self.migration_stats['chargecodes']['skipped'] += 1
                                continue
                            
                            # Check if this chargecode already exists (avoid duplicates)
                            target_cursor.execute("SELECT code FROM chargecodes WHERE code = %s", (code,))
                            existing = target_cursor.fetchone()
                            if existing:
                                logger.info(f"Chargecode {code} already exists, skipping")
                                self.migration_stats['chargecodes']['skipped'] += 1
                                self.id_mappings['chargecodes'][code] = code  # Still map it
                                continue
                            
                            # Insert chargecode
                            insert_sql = """
                                INSERT INTO chargecodes (
                                    code, title, authorised_by, valid_from, valid_until,
                                    pin, cost_centre, activity, cat3, on_hold, created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (code) DO UPDATE SET
                                    title = EXCLUDED.title,
                                    valid_from = EXCLUDED.valid_from,
                                    valid_until = EXCLUDED.valid_until,
                                    pin = EXCLUDED.pin,
                                    activity = EXCLUDED.activity,
                                    cat3 = EXCLUDED.cat3,
                                    on_hold = EXCLUDED.on_hold,
                                    updated_at = EXCLUDED.updated_at
                            """

                            # Convert ONHOLD 'Y'/'N' to boolean
                            on_hold = charge.get('ONHOLD', '').strip().upper() == 'Y'

                            target_cursor.execute(insert_sql, (
                                code,
                                self._safe_str(charge.get('TITLE'), 255) or f"Charge Code {code}",
                                None,  # authorised_by - NULL since user migration is skipped
                                charge.get('START'),
                                charge.get('END'),
                                self._safe_str(charge.get('PIN'), 10),
                                code,  # Use same as code
                                self._safe_str(charge.get('ACTIVITY'), 200),
                                self._safe_str(charge.get('CAT3'), 200),
                                on_hold,
                                datetime.now(timezone.utc),
                                datetime.now(timezone.utc)
                            ))
                            
                            self.id_mappings['chargecodes'][code] = code

                            # Migrate authorized users (AUTHORISE1, AUTHORISE2, AUTHORISE3)
                            authorized_users = []
                            for i in range(1, 4):
                                auth_field = f'AUTHORISE{i}'
                                auth_name = self._safe_str(charge.get(auth_field), 200)
                                if auth_name:
                                    authorized_users.append(auth_name)

                            # Insert authorized users into charge_code_authorized_users table
                            if authorized_users:
                                insert_auth_sql = """
                                    INSERT INTO charge_code_authorized_users (
                                        charge_code, user_name, created_at, updated_at
                                    ) VALUES (%s, %s, %s, %s)
                                """
                                for auth_user in authorized_users:
                                    target_cursor.execute(insert_auth_sql, (
                                        code,
                                        auth_user,
                                        datetime.now(timezone.utc),
                                        datetime.now(timezone.utc)
                                    ))
                                logger.info(f"Added {len(authorized_users)} authorized users to chargecode {code}")

                            self.migration_stats['chargecodes']['migrated'] += 1
                            logger.info(f"Migrated chargecode: {code}")
                            
                        except Exception as e:
                            self.migration_stats['chargecodes']['errors'] += 1
                            logger.error(f"ERROR: Failed to migrate chargecode {charge.get('COSTCENTRE', 'UNKNOWN')}: {e}")
                            logger.error(f"Chargecode data: {charge}")
                            # Don't continue - we need to see what's failing
                            raise DataMigrationError(f"Chargecode migration failed for {charge.get('COSTCENTRE', 'UNKNOWN')}: {e}")
            
            target_conn.commit()
            logger.info(f"Chargecode migration completed: {self.migration_stats['chargecodes']['migrated']} migrated, {self.migration_stats['chargecodes']['errors']} errors")
            
        except Exception as e:
            target_conn.rollback()
            logger.error(f"Chargecode migration failed completely: {e}")
            raise DataMigrationError(f"Chargecode migration failed: {e}")
        finally:
            source_conn.close()
            target_conn.close()
    
    def migrate_orders(self):
        """Migrate orders from legacy denormalized to modern normalized schema."""
        logger.info("Starting order migration...")
        
        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()
        
        try:
            with source_conn.cursor(pymysql.cursors.DictCursor) as source_cursor:
                with target_conn.cursor() as target_cursor:
                    # User migration is skipped, so we'll use NULL for created_by
                    logger.info("User migration skipped, orders will have NULL created_by")
                    
                    # Get all orders grouped by ORDER_NO
                    source_cursor.execute("""
                        SELECT ORDER_NO, DATE, SUPPLIER, 
                               COUNT(*) as item_count,
                               SUM(VALUE) as total_value
                        FROM orders 
                        WHERE ORDER_NO IS NOT NULL 
                        GROUP BY ORDER_NO, DATE, SUPPLIER
                        ORDER BY ORDER_NO
                    """)
                    order_groups = source_cursor.fetchall()
                    logger.info(f"Found {len(order_groups)} order groups to migrate")
                    
                    # Check for duplicate ORDER_NO values across different groups
                    seen_orders = set()
                    duplicate_orders = []
                    for group in order_groups:
                        order_no = group['ORDER_NO']
                        if order_no in seen_orders:
                            duplicate_orders.append(order_no)
                        seen_orders.add(order_no)
                    
                    if duplicate_orders:
                        logger.warning(f"Found orders with same ORDER_NO but different DATE/SUPPLIER: {duplicate_orders}")
                        logger.info("Will handle these by checking for existing orders before inserting")
                    
                    processed_order_nos = set()  # Track which order numbers we've already processed
                    
                    for order_group in order_groups:
                        try:
                            self.migration_stats['orders']['processed'] += 1
                            
                            order_no = order_group['ORDER_NO']
                            supplier_code = order_group['SUPPLIER']
                            supplier_id = self.id_mappings['suppliers'].get(supplier_code)
                            
                            # Check if we've already processed this order number
                            if order_no in processed_order_nos:
                                logger.info(f"Order {order_no} already processed, skipping duplicate")
                                self.migration_stats['orders']['skipped'] += 1
                                continue
                            
                            # Check if this order already exists in target database
                            target_cursor.execute("SELECT id FROM orders WHERE order_id = %s", (order_no,))
                            existing_order = target_cursor.fetchone()
                            if existing_order:
                                logger.info(f"Order {order_no} already exists in target database, skipping")
                                self.migration_stats['orders']['skipped'] += 1
                                self.id_mappings['orders'][order_no] = existing_order[0]  # Still map it
                                processed_order_nos.add(order_no)
                                continue
                            
                            if not supplier_id:
                                logger.warning(f"Supplier {supplier_code} not found for order {order_no}")
                                supplier_id = None
                            
                            # Insert order header
                            insert_order_sql = """
                                INSERT INTO orders (
                                    order_id, supplier_id, status, total_amount,
                                    created_by, created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (order_id) DO UPDATE SET
                                    supplier_id = EXCLUDED.supplier_id,
                                    status = EXCLUDED.status,
                                    total_amount = EXCLUDED.total_amount,
                                    updated_at = EXCLUDED.updated_at
                                RETURNING id
                            """
                            
                            target_cursor.execute(insert_order_sql, (
                                order_no,
                                supplier_id,
                                'completed' if order_group['DATE'] else 'pending',
                                self._safe_decimal(order_group['total_value']),
                                None,  # created_by - NULL since user migration is skipped
                                datetime.now(timezone.utc),
                                datetime.now(timezone.utc)
                            ))
                            
                            new_order_id = target_cursor.fetchone()[0]
                            self.id_mappings['orders'][order_no] = new_order_id
                            processed_order_nos.add(order_no)  # Mark as processed
                            
                            # Get all items for this order (get order_id from our mappings)
                            if order_no in self.id_mappings['orders']:
                                new_order_id = self.id_mappings['orders'][order_no]
                                
                                source_cursor.execute("""
                                    SELECT * FROM orders WHERE ORDER_NO = %s
                                """, (order_no,))
                                order_items = source_cursor.fetchall()
                                
                                # Insert order items
                                for order_item in order_items:
                                    try:
                                        self.migration_stats['order_items']['processed'] += 1
                                        
                                        stock_code = order_item['STOCK_CODE']
                                        item_id = self.id_mappings['items'].get(stock_code)
                                        
                                        # Get category for the item
                                        category_id = None
                                        if item_id:
                                            target_cursor.execute("SELECT category_id FROM items WHERE id = %s", (item_id,))
                                            cat_result = target_cursor.fetchone()
                                            if cat_result:
                                                category_id = cat_result[0]
                                        
                                        insert_item_sql = """
                                            INSERT INTO order_items (
                                                order_id, item_id, item_name, item_sku, category_id,
                                                unit_cost, quantity, total_cost, received,
                                                received_quantity, created_at, updated_at
                                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                        """
                                        
                                        target_cursor.execute(insert_item_sql, (
                                            new_order_id,
                                            item_id,
                                            f"Item {stock_code}",  # Default name
                                            stock_code,
                                            category_id,
                                            self._safe_decimal(order_item.get('PRICE')),
                                            self._safe_decimal(order_item.get('QTY')),
                                            self._safe_decimal(order_item.get('VALUE')),
                                            order_item.get('RECD_DATE') is not None,
                                            self._safe_decimal(order_item.get('QTY')) if order_item.get('RECD_DATE') else Decimal('0'),
                                            datetime.now(timezone.utc),
                                            datetime.now(timezone.utc)
                                        ))
                                        
                                        self.migration_stats['order_items']['migrated'] += 1
                                        
                                    except Exception as e:
                                        self.migration_stats['order_items']['errors'] += 1
                                        logger.error(f"ERROR: Failed to migrate order item {stock_code}: {e}")
                                        logger.error(f"Order item data: {order_item}")
                                        # Don't continue - we need to see what's failing
                                        raise DataMigrationError(f"Order item migration failed for {stock_code}: {e}")
                                
                                self.migration_stats['orders']['migrated'] += 1
                                logger.info(f"Migrated order: {order_no} -> ID {new_order_id}")
                            else:
                                logger.warning(f"Order {order_no} was skipped, not processing items")
                            
                        except Exception as e:
                            self.migration_stats['orders']['errors'] += 1
                            logger.error(f"ERROR: Failed to migrate order {order_group.get('ORDER_NO', 'UNKNOWN')}: {e}")
                            logger.error(f"Order data: {order_group}")
                            # Don't continue - we need to see what's failing
                            raise DataMigrationError(f"Order migration failed for {order_group.get('ORDER_NO', 'UNKNOWN')}: {e}")
            
            target_conn.commit()
            logger.info(f"Order migration completed: {self.migration_stats['orders']['migrated']} migrated, {self.migration_stats['orders']['errors']} errors")
            
        except Exception as e:
            target_conn.rollback()
            logger.error(f"Order migration failed completely: {e}")
            raise DataMigrationError(f"Order migration failed: {e}")
        finally:
            source_conn.close()
            target_conn.close()
    
    def migrate_stock_movements(self):
        """Migrate issues to sales instead of stock movements with batching."""
        logger.info("Starting issue-to-sales migration with batch processing...")
        
        source_conn = self._get_source_connection()
        target_conn = self._get_target_connection()

        try:
            # User migration is skipped, so we'll use NULL for user_id
            logger.info("User migration skipped, stock movements will have NULL user_id")
            general_chargecode_id = self.id_mappings['chargecodes']['GENERAL']

            # Check table structure
            with source_conn.cursor(pymysql.cursors.DictCursor) as source_cursor:
                source_cursor.execute("SHOW COLUMNS FROM issues")
                columns = source_cursor.fetchall()

                # Check if there's an ID column for uniqueness
                has_id_column = any(col['Field'].lower() in ['id', 'issue_id', 'auto_id'] for col in columns)
                logger.info(f"Issues table has ID column: {has_id_column}")

            # Step 1: Verify row count in source table
            expected_count = self._verify_row_count(source_conn, 'issues', 'SELECT COUNT(*) FROM issues')

            # Step 2: Fetch and process in batches
            query = "SELECT * FROM issues ORDER BY DATE, STOCK_CODE, QUANTITY"  # ORDER BY for consistent batching
            issue_counter = 1  # Counter for unique sale IDs across all batches

            for batch in self._fetch_in_batches(source_conn, query, 'issues', expected_count):
                # Process batch with retry logic
                def process_batch():
                    nonlocal issue_counter  # Access counter from outer scope
                    with target_conn.cursor() as target_cursor:
                        for issue in batch:
                            try:
                                self.migration_stats['stock_movements']['processed'] += 1

                                stock_code = issue['STOCK_CODE']

                                # Look up item using fuzzy matching (handles SKU extraction and name matching)
                                item_match = self._find_item_by_stock_code(target_cursor, stock_code)

                                if not item_match:
                                    # logger.warning(f"Item with stock code '{stock_code}' not found after trying all matching strategies (exact SKU, extracted SKU, name match)")
                                    self.migration_stats['stock_movements']['skipped'] += 1
                                    continue

                                # Unpack the match results
                                item_id, item_name, unit_price = item_match

                                quantity = self._safe_decimal(issue.get('QUANTITY', 0)).quantize(Decimal('0.01'))
                                if quantity < 0:
                                    # logger.warning(f"Invalid negative quantity {quantity} for item {stock_code}, skipping")
                                    self.migration_stats['stock_movements']['skipped'] += 1
                                    continue

                                # Allow zero quantity (could be cancelled/refunded/placeholder)
                                # if quantity == 0:
                                    # logger.info(f"Issue with zero quantity for item {stock_code} (may be cancelled/refunded/placeholder) - preserving for audit")

                                # Parse issue date
                                issue_date = issue.get('DATE')
                                if issue_date:
                                    if isinstance(issue_date, str):
                                        try:
                                            issue_date = datetime.strptime(issue_date, '%Y-%m-%d')
                                            issue_date = issue_date.replace(tzinfo=timezone.utc)
                                        except:
                                            issue_date = datetime.now(timezone.utc)
                                    elif isinstance(issue_date, datetime):
                                        # It's already a datetime object
                                        if issue_date.tzinfo is None:
                                            issue_date = issue_date.replace(tzinfo=timezone.utc)
                                    else:
                                        # It's a date object (not datetime) - convert to datetime
                                        issue_date = datetime.combine(issue_date, datetime.min.time())
                                        issue_date = issue_date.replace(tzinfo=timezone.utc)
                                else:
                                    issue_date = datetime.now(timezone.utc)

                                # Calculate amounts - item prices in legacy system do NOT include VAT
                                item_vat_rate = Decimal('0.20')  # 20% VAT rate
                                item_subtotal = unit_price * Decimal(str(quantity))  # Price before VAT
                                item_vat = item_subtotal * item_vat_rate  # Calculate VAT
                                item_total = item_subtotal + item_vat  # Total with VAT

                                # Sale totals (same as item totals for single-item sales)
                                sale_subtotal = item_subtotal
                                sale_vat = item_vat
                                sale_total = item_total

                                # Generate a unique sale ID using counter
                                base_sale_id = f"LEGACY-{issue.get('STOCK_CODE', 'UNK')}-{issue_date.strftime('%Y%m%d')}"
                                sale_id_str = f"{base_sale_id}-{issue_counter:06d}"
                                issue_counter += 1

                                # Double-check for uniqueness
                                original_sale_id = sale_id_str
                                attempt = 1
                                while True:
                                    target_cursor.execute("SELECT id FROM sales WHERE sale_id = %s", (sale_id_str,))
                                    if not target_cursor.fetchone():
                                        break  # This sale_id is unique
                                    sale_id_str = f"{original_sale_id}-DUP{attempt:03d}"
                                    attempt += 1
                                    if attempt > 1000:  # Safety break
                                        raise DataMigrationError(f"Could not generate unique sale_id after 1000 attempts for {stock_code}")

                                # Determine charge code (use COSTCENTRE from issue if present, otherwise GENERAL)
                                charge_code = self._safe_str(issue.get('COSTCENTRE'))
                                if not charge_code or charge_code not in self.id_mappings['chargecodes']:
                                    charge_code = 'GENERAL'

                                # Customer info as JSON
                                customer_info = {
                                    "name": self._safe_str(issue.get('ISSUEDTO')) or 'Unknown',
                                    "legacy_issue": True,
                                    "reason": self._safe_str(issue.get('REASON')) or '',
                                    "original_date": issue_date.isoformat(),
                                    "legacy_data": {
                                        "costcentre": self._safe_str(issue.get('COSTCENTRE')) or '',
                                        "activity": self._safe_str(issue.get('ACTIVITY')) or '',
                                        "user": self._safe_str(issue.get('USER')) or '',
                                        "periodcode": self._safe_str(issue.get('PERIODCODE')) or '',
                                        "pin": self._safe_str(issue.get('PIN')) or ''
                                    }
                                }

                                # Create sale for this issue
                                # Get the "issued to" person from the legacy data
                                issued_to_name = self._safe_str(issue.get('ISSUEDTO')) or None
                                
                                sale_sql = """
                                    INSERT INTO sales (
                                        sale_id, charge_code, subtotal_amount, vat_amount, total_amount,
                                        vat_applied, customer_info, status, processed_by, 
                                        delivered_to, delivered_at, created_at, updated_at
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                    RETURNING id
                                """

                                target_cursor.execute(sale_sql, (
                                    sale_id_str,                    # sale_id
                                    charge_code,                    # charge_code (from issue or GENERAL)
                                    sale_subtotal,                  # subtotal_amount (before VAT)
                                    sale_vat,                       # vat_amount
                                    sale_total,                     # total_amount (with VAT)
                                    True,                           # vat_applied
                                    json.dumps(customer_info),      # customer_info (JSON)
                                    'completed',                    # status
                                    None,                           # processed_by - NULL since user migration is skipped
                                    issued_to_name,                 # delivered_to (from ISSUEDTO)
                                    issue_date,                     # delivered_at (use issue date as delivery date)
                                    issue_date,                     # created_at (use original issue date)
                                    datetime.now(timezone.utc)      # updated_at
                                ))

                                sale_id = target_cursor.fetchone()[0]

                                # Add sale item (no category_id in schema)
                                # Legacy prices are EXCLUDING VAT, so vat_included = False
                                item_sql = """
                                    INSERT INTO sale_items (
                                        sale_id, item_id, item_name, item_sku, unit_price, vat_rate,
                                        vat_included, vat_amount, quantity, subtotal, total_with_vat, created_at
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                """

                                target_cursor.execute(item_sql, (
                                    sale_id,                        # sale_id
                                    item_id,                        # item_id
                                    item_name,                      # item_name
                                    stock_code,                     # item_sku
                                    unit_price,                     # unit_price (before VAT)
                                    item_vat_rate,                  # vat_rate (0.20 = 20%)
                                    False,                          # vat_included (legacy prices exclude VAT)
                                    item_vat,                       # vat_amount
                                    quantity,                       # quantity (as integer)
                                    item_subtotal,                  # subtotal (before VAT)
                                    item_total,                     # total_with_vat
                                    issue_date                      # created_at (use original issue date)
                                ))

                                self.migration_stats['stock_movements']['migrated'] += 1

                            except Exception as e:
                                # Rollback only this transaction to prevent transaction abort
                                target_conn.rollback()
                                self.migration_stats['stock_movements']['errors'] += 1
                                self.migration_stats['stock_movements']['skipped'] += 1
                                logger.error(f"ERROR: Failed to migrate issue for {issue.get('STOCK_CODE', 'UNKNOWN')}: {e}")
                                logger.error(f"Issue data: {issue}")
                                # Don't raise - continue with next record
                                continue

                        # Commit batch
                        try:
                            target_conn.commit()
                            logger.info(f"Committed batch of {len(batch)} issues (total migrated: {self.migration_stats['stock_movements']['migrated']}, errors: {self.migration_stats['stock_movements']['errors']})")
                        except Exception as e:
                            logger.error(f"Failed to commit batch: {e}")
                            target_conn.rollback()

                # Process the batch (errors are handled per-record)
                process_batch()

            # Step 3: Verify final counts
            logger.info(f"Issue-to-sales migration completed: {self.migration_stats['stock_movements']['migrated']} migrated, {self.migration_stats['stock_movements']['errors']} errors, {self.migration_stats['stock_movements']['skipped']} skipped")

            if expected_count > 0 and self.migration_stats['stock_movements']['processed'] != expected_count:
                logger.warning(f"Row count mismatch! Expected {expected_count}, processed {self.migration_stats['stock_movements']['processed']}")
                logger.warning(f"This may be due to skipped or errored records - check the logs above for details")

        except Exception as e:
            target_conn.rollback()
            logger.error(f"Issue-to-sales migration encountered an error: {e}")
            logger.warning(f"Continuing to next migration step...")
        finally:
            source_conn.close()
            target_conn.close()
    
    def ensure_decimal_stock_columns(self):
        """Ensure all stock quantity columns are NUMERIC(10,2) instead of INTEGER."""
        logger.info("Converting stock columns to NUMERIC(10,2)...")
        
        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as cursor:
                # Check if items.current_stock is already NUMERIC
                cursor.execute("""
                    SELECT data_type, numeric_precision, numeric_scale
                    FROM information_schema.columns
                    WHERE table_name = 'items' AND column_name = 'current_stock'
                """)
                result = cursor.fetchone()
                
                if result and result[0] == 'numeric':
                    logger.info(f"  ✓ Stock columns already NUMERIC({result[1]},{result[2]})")
                    return
                
                logger.info("  Converting columns from INTEGER to NUMERIC(10,2)...")
                
                # Convert all stock-related columns
                cursor.execute("""
                    -- Items table
                    ALTER TABLE items 
                      ALTER COLUMN current_stock TYPE NUMERIC(10,2) USING current_stock::NUMERIC(10,2),
                      ALTER COLUMN minimum_stock TYPE NUMERIC(10,2) USING minimum_stock::NUMERIC(10,2);
                    
                    -- Stock movements table
                    ALTER TABLE stock_movements
                      ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2),
                      ALTER COLUMN previous_stock TYPE NUMERIC(10,2) USING previous_stock::NUMERIC(10,2),
                      ALTER COLUMN new_stock TYPE NUMERIC(10,2) USING new_stock::NUMERIC(10,2);
                    
                    -- Sale items table
                    ALTER TABLE sale_items
                      ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);
                    
                    -- Order items table
                    ALTER TABLE order_items
                      ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2),
                      ALTER COLUMN received_quantity TYPE NUMERIC(10,2) USING received_quantity::NUMERIC(10,2);
                    
                    -- Quote items table
                    ALTER TABLE quote_items
                      ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);
                """)
                
                target_conn.commit()
                logger.info("  ✓ Successfully converted all stock columns to NUMERIC(10,2)")
                
        except Exception as e:
            target_conn.rollback()
            logger.error(f"Failed to convert stock columns: {e}")
            raise
        finally:
            target_conn.close()

    def clear_target_database_fast(self):
        """Fast database clearing using TRUNCATE with proper CASCADE handling."""
        logger.info("Fast-clearing existing data from target database...")
        
        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as cursor:
                # Ensure schema is up to date before querying
                self._ensure_target_schema_updated(cursor)
                target_conn.commit()
                
                # Preserve admin users
                cursor.execute("""
                    SELECT id, email, password_hash, first_name, last_name, role, 
                           is_active, must_change_password, show_picking_list, created_at, updated_at
                    FROM users 
                    WHERE role = 'admin' AND is_active = true
                """)
                existing_admins = cursor.fetchall()
                
                if existing_admins:
                    logger.info(f"Found {len(existing_admins)} existing admin users to preserve")
                    self.preserved_admins = existing_admins
                else:
                    self.preserved_admins = []
                
                # Disable triggers to speed up truncation
                cursor.execute("SET session_replication_role = 'replica';")
                
                # Truncate all tables in reverse dependency order
                # CASCADE will automatically clear dependent tables
                tables = [
                    'sale_items',
                    'sales', 
                    'quote_items',
                    'quotes',
                    'order_items',
                    'orders',
                    'sources',
                    'stock_movements',
                    'items',
                    'suppliers',
                    'categories',
                    'chargecodes',
                    'user_permissions',
                    'charge_code_exclusions',
                    'notes'
                ]
                
                for table in tables:
                    try:
                        cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                        logger.info(f"  ✓ Cleared {table}")
                    except Exception as e:
                        logger.warning(f"  ✗ Could not truncate {table}: {e}")
                
                # Re-enable triggers
                cursor.execute("SET session_replication_role = 'origin';")
                
            target_conn.commit()
            logger.info("Database cleared successfully")
            
        except Exception as e:
            target_conn.rollback()
            logger.error(f"Fast clear failed: {e}")
            raise
        finally:
            target_conn.close()

    def clear_target_database(self):

        """Clear existing data from target database before migration."""
        logger.info("Clearing existing data from target database...")
        
        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as cursor:
                # Ensure schema is up to date before querying
                self._ensure_target_schema_updated(cursor)
                target_conn.commit()
                
                # First, backup any existing admin users before clearing
                cursor.execute("""
                    SELECT id, email, password_hash, first_name, last_name, role, 
                           is_active, must_change_password, show_picking_list, created_at, updated_at
                    FROM users 
                    WHERE role = 'admin' AND is_active = true
                """)
                existing_admins = cursor.fetchall()
                
                if existing_admins:
                    logger.info(f"Found {len(existing_admins)} existing admin users to preserve")
                    # Store admin users temporarily
                    self.preserved_admins = existing_admins
                else:
                    self.preserved_admins = []
                
                # Terminate any other active connections to avoid locks
                logger.info("Terminating other database connections...")
                cursor.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                    AND pid <> pg_backend_pid()
                    AND state = 'idle'
                """)
                target_conn.commit()
                
                # Temporarily disable foreign key checks for faster clearing
                cursor.execute("SET session_replication_role = 'replica';")
                logger.info("Disabled foreign key checks")
                
                # NOTE: 'users' table is NOT cleared to preserve existing user accounts
                # NOTE: 'applied_migrations' is NOT cleared to keep track of schema migrations
                tables_to_clear = [
                    'stock_movements',
                    'sale_items',
                    'sales',
                    'quote_items',
                    'quotes',
                    'order_items',
                    'orders',
                    'sources',
                    'items',
                    'suppliers',
                    'categories',
                    'chargecodes',
                    'user_permissions',
                    'charge_code_exclusions',
                    'notes'
                ]
                
                logger.info(f"Clearing {len(tables_to_clear)} tables...")
                cleared_count = 0
                for table in tables_to_clear:
                    try:
                        # Use TRUNCATE which is faster since we disabled FK checks
                        cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                        cleared_count += 1
                        target_conn.commit()  # Commit after each table to avoid long transactions
                        logger.info(f"  [{cleared_count}/{len(tables_to_clear)}] ✓ Cleared {table}")
                    except Exception as e:
                        logger.warning(f"  ✗ Could not clear {table}: {e}")
                        target_conn.rollback()
                        continue
                
                # Re-enable foreign key checks
                cursor.execute("SET session_replication_role = 'origin';")
                target_conn.commit()
                logger.info("Re-enabled foreign key checks")
                
            target_conn.commit()
            logger.info("Target database cleared successfully")
            
        finally:
            target_conn.close()
    
    def restore_preserved_admins(self):
        """Restore preserved admin users after migration."""
        logger.info("Restoring preserved admin users...")
        
        target_conn = self._get_target_connection()
        
        try:
            with target_conn.cursor() as cursor:
                if self.preserved_admins:
                    admin_sql = """
                        INSERT INTO users (
                            id, email, password_hash, first_name, last_name, role,
                            is_active, must_change_password, show_picking_list, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    for admin in self.preserved_admins:
                        try:
                            cursor.execute(admin_sql, admin)
                            logger.info(f"Restored admin user: {admin[1]}")  # admin[1] is email
                        except Exception as e:
                            logger.warning(f"Could not restore admin user {admin[1]}: {e}")
                            continue
                else:
                    # Create default admin user if none existed
                    logger.info("No preserved admin users found, creating default admin")
                    default_admin_sql = """
                        INSERT INTO users (
                            id, email, password_hash, first_name, last_name, role,
                            is_active, must_change_password, show_picking_list, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    cursor.execute(default_admin_sql, (
                        'admin-default',
                        'admin@university.edu',
                        self._hash_password('admin123'),  # Hash the default password
                        'Admin',
                        'User',
                        'admin',
                        True,
                        False,  # Don't force password change for migration
                        True,   # show_picking_list - default to true
                        datetime.now(timezone.utc),
                        datetime.now(timezone.utc)
                    ))
                    
                    logger.info("Created default admin user: admin@university.edu / admin123")
                
            target_conn.commit()
            logger.info("Admin user restoration completed")
            
        except Exception as e:
            target_conn.rollback()
            logger.error(f"Failed to restore admin users: {e}")
            raise DataMigrationError(f"Admin user restoration failed: {e}")
        finally:
            target_conn.close()

    def wait_for_server_ready(self, max_wait_seconds=120):
        """Wait for the application server to be ready."""
        logger.info(f"Waiting for application server to be ready ({self.server_url})...")

        start_time = time.time()
        while time.time() - start_time < max_wait_seconds:
            try:
                import urllib.request
                import urllib.error

                # Try to connect to the server
                response = urllib.request.urlopen(self.server_url, timeout=5)
                if response.status == 200:
                    logger.info("✓ Server is ready")
                    return True
            except (urllib.error.URLError, ConnectionRefusedError, TimeoutError, OSError):
                # Server not ready yet
                time.sleep(2)
                continue

        logger.error(f"Server did not become ready within {max_wait_seconds} seconds")
        logger.error(f"Make sure the application is running at {self.server_url}")
        return False

    def run_playwright_tests(self):
        """Run the comprehensive Playwright test suite."""
        logger.info("\n" + "="*80)
        logger.info("RUNNING PLAYWRIGHT TEST SUITE")
        logger.info("="*80)
        logger.info("This will verify all application functionality before migration...")

        # Get the project root directory (parent of scripts/)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)

        # Path to the test file
        test_file = os.path.join(project_root, 'tests', 'e2e', 'comprehensive-test-suite.spec.ts')

        if not os.path.exists(test_file):
            logger.error(f"Test file not found: {test_file}")
            return False

        logger.info(f"Test file: {test_file}")
        logger.info("Starting tests (this may take several minutes)...")

        try:
            # Run Playwright tests
            result = subprocess.run(
                ['npx', 'playwright', 'test', test_file, '--reporter=list'],
                cwd=project_root,
                capture_output=False,
                text=True,
                timeout=600  # 10 minute timeout for all tests
            )

            # Print test output
            logger.info("\n" + "-"*80)
            logger.info("TEST OUTPUT:")
            logger.info("-"*80)
            if result.stdout:
                for line in result.stdout.split('\n'):
                    logger.info(line)
            if result.stderr:
                for line in result.stderr.split('\n'):
                    if line.strip():  # Only log non-empty stderr lines
                        logger.warning(line)
            logger.info("-"*80)

            # Check if tests passed
            if result.returncode == 0:
                logger.info("\n" + "="*80)
                logger.info("✓ ALL TESTS PASSED - Proceeding with migration")
                logger.info("="*80 + "\n")
                return True
            else:
                logger.error("\n" + "="*80)
                logger.error("✗ TESTS FAILED - Migration aborted")
                logger.error("="*80)
                logger.error(f"Test suite exited with code: {result.returncode}")
                logger.error("Please fix the failing tests before running migration.")
                return False

        except subprocess.TimeoutExpired:
            logger.error("Tests timed out after 10 minutes")
            return False
        except FileNotFoundError:
            logger.error("npx or playwright not found. Please ensure Node.js and Playwright are installed.")
            logger.error("Run: npm install")
            return False
        except Exception as e:
            logger.error(f"Error running tests: {e}")
            return False

    def run_migration(self):
        """Run the complete migration process with pre-migration testing."""
        logger.info("Starting complete data migration with pre-migration testing...")
        logger.info(f"Source: {self.source_schema['database_name']} ({self.source_schema['database_type']})")
        logger.info(f"Target: {self.target_schema['database_name']} ({self.target_schema['database_type']})")

        # Keep connections for final summary
        source_conn = None
        target_conn = None

        try:
            # Step 0: Verify and apply any missing migrations first
            logger.info("Step 0: Verifying and applying database migrations...")
            self.verify_and_apply_migrations()

            # Step 0.5: Ensure stock columns are NUMERIC for decimal support
            logger.info("Step 0.5: Ensuring stock columns support decimals...")
            self.ensure_decimal_stock_columns()

            # Conditional testing phase
            if not self.skip_tests:
                # Step 1: Clear database for testing
                logger.info("\n" + "="*80)
                logger.info("PHASE 1: PRE-MIGRATION TESTING")
                logger.info("="*80)
                logger.info("Step 1: Clearing target database for testing...")
                self.clear_target_database_fast()

                # Step 1.5: Restore admin user for testing
                logger.info("Step 1.5: Creating admin user for tests...")
                self.restore_preserved_admins()

                # Step 2: Wait for server to be ready
                logger.info("Step 2: Waiting for application server...")
                if not self.wait_for_server_ready(max_wait_seconds=120):
                    raise DataMigrationError("Application server is not ready. Please ensure the server is running.")

                # Step 3: Run comprehensive Playwright tests
                logger.info("Step 3: Running comprehensive test suite...")
                if not self.run_playwright_tests():
                    raise DataMigrationError(
                        "Pre-migration tests failed. Migration aborted. "
                        "Please fix the failing tests before attempting migration."
                    )

                # Step 4: Tests passed - Clear database again for actual migration
                logger.info("\n" + "="*80)
                logger.info("PHASE 2: DATA MIGRATION")
                logger.info("="*80)
                logger.info("Step 4: Re-clearing target database for migration...")
                self.clear_target_database_fast()
            else:
                # Skip tests - just clear database once
                logger.info("\n" + "="*80)
                logger.info("WARNING: Skipping pre-migration tests (--skip-tests flag)")
                logger.info("="*80)
                logger.info("Step 1: Clearing target database...")
                self.clear_target_database_fast()
            
            # Migration order is important due to foreign key dependencies
            # logger.info("Step 5: Migrating users...")
            # self.migrate_users()

            logger.info("Step 5: Migrating categories...")
            self.migrate_categories()

            logger.info("Step 6: Migrating suppliers...")
            self.migrate_suppliers()

            logger.info("Step 7: Migrating items...")
            self.migrate_items()
            # Check if items migration was successful before continuing
            if self.migration_stats['items']['migrated'] == 0:
                raise DataMigrationError("No items were migrated - stopping migration")

            logger.info("Step 7.5: Ensuring MISC item exists...")
            self.ensure_misc_item()



            logger.info("Step 8: Migrating chargecodes...")
            self.migrate_chargecodes()

            logger.info("Step 9: Migrating orders...")
            self.migrate_orders()

            logger.info("Step 10: Migrating issues as sales...")
            self.migrate_stock_movements()  # This now migrates issues as sales
            logger.info("Step 10.6: Creating supplier relationship orders...")
            self.create_supplier_relationship_orders()
            logger.info("Step 11: Restoring admin users...")
            self.restore_preserved_admins()
            
            # Open connections for final summary
            source_conn = self._get_source_connection()
            target_conn = self._get_target_connection()
            
            self._print_migration_summary(source_conn, target_conn)
            logger.info("Migration completed successfully!")
            logger.info("Admin access: admin@university.edu / admin123")
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
        finally:
            if source_conn:
                source_conn.close()
            if target_conn:
                target_conn.close()
    
    def _print_migration_summary(self, source_conn, target_conn):
        """Print migration statistics."""
        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        
        total_processed = 0
        total_migrated = 0
        total_errors = 0
        
        for table_name, stats in self.migration_stats.items():
            logger.info(f"{table_name:20}: {stats['migrated']:6} migrated, {stats['errors']:6} errors, {stats['skipped']:6} skipped")
            total_processed += stats['processed']
            total_migrated += stats['migrated']
            total_errors += stats['errors']
        
        logger.info("-" * 60)
        logger.info(f"{'TOTAL':20}: {total_migrated:6} migrated, {total_errors:6} errors")
        logger.info(f"Success rate: {(total_migrated / total_processed * 100) if total_processed > 0 else 0:.1f}%")
        logger.info("="*60)

        # Print comprehensive stock value analysis
        logger.info("\n" + "="*80)
        logger.info("STOCK VALUE RECONCILIATION SUMMARY")
        logger.info("="*80)
        
        vat_rate_percent = self.value_tracking['vat_rate_from_source'] * Decimal('100') if self.value_tracking['vat_rate_from_source'] else Decimal('20')
        logger.info(f"\nVAT Rate Used: {vat_rate_percent:.2f}%")
        logger.info(f"Note: Legacy database prices are EXCLUDING VAT")
        logger.info("")
        
        # Summary table
        logger.info("-" * 80)
        logger.info(f"{'Description':<40} {'Exc VAT':>15} {'Inc VAT':>15} {'Items':>8}")
        logger.info("-" * 80)
        
        # Source database
        logger.info(f"{'SOURCE DATABASE (Legacy)':<40} {'£' + f'{self.value_tracking['source_total_value_exc_vat']:,.2f}':>15} {'£' + f'{self.value_tracking['source_total_value_inc_vat']:,.2f}':>15} {self.migration_stats['items']['processed']:>8}")
        logger.info(f"  {'Items with value > 0':<38} {'':<15} {'':<15} {self.value_tracking['source_items_with_value']:>8}")
        logger.info(f"  {'Items with ZERO price':<38} {'':<15} {'':<15} {self.value_tracking['source_items_zero_price']:>8}")
        logger.info(f"  {'Items with ZERO stock':<38} {'':<15} {'':<15} {self.value_tracking['source_items_zero_stock']:>8}")
        logger.info("")
        
        # Target database
        logger.info(f"{'TARGET DATABASE (New System)':<40} {'£' + f'{self.value_tracking['target_total_value_exc_vat']:,.2f}':>15} {'£' + f'{self.value_tracking['target_total_value_inc_vat']:,.2f}':>15} {self.migration_stats['items']['migrated']:>8}")
        logger.info(f"  {'Items with value > 0':<38} {'':<15} {'':<15} {self.value_tracking['target_items_with_value']:>8}")
        logger.info("")
        
        # Rounding losses
        if self.value_tracking['rounding_loss_items'] > 0:
            rounding_loss_value_inc_vat = self.value_tracking['rounding_loss_value_exc_vat'] * (Decimal('1') + self.value_tracking['vat_rate_from_source'])
            logger.info(f"{'ROUNDING LOSS (Decimal→Integer)':<40} {'£' + f'{self.value_tracking['rounding_loss_value_exc_vat']:,.2f}':>15} {'£' + f'{rounding_loss_value_inc_vat:,.2f}':>15} {self.value_tracking['rounding_loss_items']:>8}")
            logger.info(f"  {'Total qty lost to rounding':<38} {f'{self.value_tracking['rounding_loss_qty']:,.2f} units':>15} {'':<15} {'':>8}")
            logger.info("")
        
        # Skipped items
        items_skipped = self.migration_stats['items']['skipped'] + self.migration_stats['items']['errors']
        if items_skipped > 0:
            skipped_value_inc_vat = self.value_tracking['skipped_value_exc_vat'] * (Decimal('1') + self.value_tracking['vat_rate_from_source'])
            logger.info(f"{'SKIPPED/ERRORED ITEMS':<40} {'£' + f'{self.value_tracking['skipped_value_exc_vat']:,.2f}':>15} {'£' + f'{skipped_value_inc_vat:,.2f}':>15} {items_skipped:>8}")
            logger.info("")
        
        logger.info("-" * 80)
        
        # Calculate discrepancy and show detailed reconciliation
        value_discrepancy_exc = self.value_tracking['source_total_value_exc_vat'] - self.value_tracking['target_total_value_exc_vat']
        value_discrepancy_inc = self.value_tracking['source_total_value_inc_vat'] - self.value_tracking['target_total_value_inc_vat']
        
        # Detailed reconciliation breakdown
        logger.info("\n" + "="*80)
        logger.info("VALUE RECONCILIATION BREAKDOWN")
        logger.info("="*80)
        logger.info("\nThis shows how source value converts to target value:")
        logger.info("")
        logger.info("-" * 80)
        logger.info(f"{'Component':<50} {'Exc VAT':>15} {'Inc VAT':>15}")
        logger.info("-" * 80)
        
        # Show the reconciliation formula
        logger.info(f"{'Source Database Total Value':<50} {'£' + f'{self.value_tracking['source_total_value_exc_vat']:,.2f}':>15} {'£' + f'{self.value_tracking['source_total_value_inc_vat']:,.2f}':>15}")
        logger.info("")
        
        # Less: Rounding losses
        if self.value_tracking['rounding_loss_items'] > 0:
            rounding_loss_value_inc_vat = self.value_tracking['rounding_loss_value_exc_vat'] * (Decimal('1') + self.value_tracking['vat_rate_from_source'])
            logger.info(f"{'Less: Rounding Loss (decimal→integer stock)':<50} {'-£' + f'{self.value_tracking['rounding_loss_value_exc_vat']:,.2f}':>15} {'-£' + f'{rounding_loss_value_inc_vat:,.2f}':>15}")
            logger.info(f"  └─ {self.value_tracking['rounding_loss_items']} items affected, {self.value_tracking['rounding_loss_qty']:.2f} units lost")
        
        # Less: Skipped/errored items
        items_skipped = self.migration_stats['items']['skipped'] + self.migration_stats['items']['errors']
        if items_skipped > 0:
            skipped_value_inc_vat = self.value_tracking['skipped_value_exc_vat'] * (Decimal('1') + self.value_tracking['vat_rate_from_source'])
            logger.info(f"{'Less: Skipped/Errored Items':<50} {'-£' + f'{self.value_tracking['skipped_value_exc_vat']:,.2f}':>15} {'-£' + f'{skipped_value_inc_vat:,.2f}':>15}")
            logger.info(f"  └─ {items_skipped} items not migrated")
        
        logger.info("")
        logger.info("-" * 80)
        
        # Expected target value
        expected_target_exc = self.value_tracking['source_total_value_exc_vat'] - self.value_tracking['rounding_loss_value_exc_vat'] - self.value_tracking['skipped_value_exc_vat']
        expected_target_inc = expected_target_exc * (Decimal('1') + self.value_tracking['vat_rate_from_source'])
        logger.info(f"{'Expected Target Value':<50} {'£' + f'{expected_target_exc:,.2f}':>15} {'£' + f'{expected_target_inc:,.2f}':>15}")
        logger.info(f"{'Actual Target Value (from database)':<50} {'£' + f'{self.value_tracking['target_total_value_exc_vat']:,.2f}':>15} {'£' + f'{self.value_tracking['target_total_value_inc_vat']:,.2f}':>15}")
        logger.info("")
        logger.info("-" * 80)
        
        # Final reconciliation check
        reconciliation_diff_exc = expected_target_exc - self.value_tracking['target_total_value_exc_vat']
        reconciliation_diff_inc = expected_target_inc - self.value_tracking['target_total_value_inc_vat']
        
        if abs(reconciliation_diff_exc) < Decimal('0.10'):  # Within 10p
            logger.info(f"{'Reconciliation Difference':<50} {'£' + f'{reconciliation_diff_exc:,.2f}':>15} {'£' + f'{reconciliation_diff_inc:,.2f}':>15}")
            logger.info("\n✅ RECONCILIATION SUCCESSFUL! Expected and actual values match (within £0.10)")
            logger.info("\nExplanation:")
            logger.info(f"  • Source had £{self.value_tracking['source_total_value_inc_vat']:,.2f} inc VAT")
            if self.value_tracking['rounding_loss_items'] > 0:
                logger.info(f"  • Lost £{rounding_loss_value_inc_vat:,.2f} to decimal→integer rounding ({self.value_tracking['rounding_loss_items']} items)")
            if items_skipped > 0:
                logger.info(f"  • Lost £{skipped_value_inc_vat:,.2f} from {items_skipped} skipped/errored items")
            logger.info(f"  • Target correctly has £{self.value_tracking['target_total_value_inc_vat']:,.2f} inc VAT")
        else:
            logger.info(f"{'Reconciliation Difference':<50} {'£' + f'{reconciliation_diff_exc:,.2f}':>15} {'£' + f'{reconciliation_diff_inc:,.2f}':>15}")
            logger.warning("\n⚠️  RECONCILIATION MISMATCH! Difference exceeds expected tolerance.")
            logger.warning(f"   Expected target: £{expected_target_inc:,.2f}, Actual: £{self.value_tracking['target_total_value_inc_vat']:,.2f}")
            logger.warning(f"   Unexplained difference: £{reconciliation_diff_inc:,.2f}")
        
        logger.info("="*80)
        
        # Original discrepancy reporting (simplified now that we have detailed reconciliation)
        if abs(value_discrepancy_exc) > Decimal('0.01'):  # Allow for small rounding differences
            discrepancy_percent = (value_discrepancy_exc / self.value_tracking['source_total_value_exc_vat'] * 100) if self.value_tracking['source_total_value_exc_vat'] > 0 else 0
            logger.info("\n" + "="*80)
            logger.info("OVERALL DISCREPANCY SUMMARY")
            logger.info("="*80)
            logger.info(f"Source Total (inc VAT):  £{self.value_tracking['source_total_value_inc_vat']:,.2f}")
            logger.info(f"Target Total (inc VAT):  £{self.value_tracking['target_total_value_inc_vat']:,.2f}")
            logger.info(f"Difference:              £{value_discrepancy_inc:,.2f} ({discrepancy_percent:.2f}%)")
            logger.info("\nRefer to VALUE RECONCILIATION BREAKDOWN above for detailed explanation.")
        else:
            logger.info("\n✅ VALUE MATCH! Source and target values align perfectly.")

        logger.info("="*80)
        
        # Data Quality Analysis - Suspicious Discrepancies
        if self.value_tracking['suspicious_items'] or self.value_tracking['fractional_stock_items']:
            logger.info("\n" + "="*80)
            logger.info("DATA QUALITY ANALYSIS - STOCK DISCREPANCIES")
            logger.info("="*80)
            
            # Analyze suspicious items
            if self.value_tracking['suspicious_items']:
                logger.warning(f"\n⚠️  Found {len(self.value_tracking['suspicious_items'])} items with SUSPICIOUS discrepancies!")
                logger.warning("These items have unusually large rounding losses that may indicate data quality issues:\n")
                
                # Sort by value loss descending
                suspicious_sorted = sorted(self.value_tracking['suspicious_items'], 
                                         key=lambda x: x['value_loss'], reverse=True)
                
                logger.info("-" * 100)
                logger.info(f"{'SKU':<12} {'Name':<30} {'Source Qty':>12} {'Target Qty':>12} {'Qty Loss':>12} {'Value Loss':>12}")
                logger.info("-" * 100)
                
                total_suspicious_value = Decimal('0')
                for item in suspicious_sorted[:20]:  # Show top 20
                    logger.info(f"{item['sku']:<12} {item['name'][:30]:<30} {item['source_qty']:>12.2f} {item['target_qty']:>12.0f} {item['qty_loss']:>12.2f} £{item['value_loss']:>10.2f}")
                    total_suspicious_value += item['value_loss']
                
                if len(suspicious_sorted) > 20:
                    remaining = len(suspicious_sorted) - 20
                    remaining_value = sum(item['value_loss'] for item in suspicious_sorted[20:])
                    logger.info(f"{'...':<12} {'(' + str(remaining) + ' more items)':<30} {'':<12} {'':<12} {'':<12} £{remaining_value:>10.2f}")
                    total_suspicious_value += remaining_value
                
                logger.info("-" * 100)
                logger.info(f"{'TOTAL':<12} {'':<30} {'':<12} {'':<12} {'':<12} £{total_suspicious_value:>10.2f}")
                logger.info("")
                
                # Provide analysis
                logger.warning("\n🔍 ANALYSIS:")
                logger.warning(f"  • {len(self.value_tracking['suspicious_items'])} items have rounding loss > 1 unit OR > £10")
                logger.warning(f"  • Total value impact: £{total_suspicious_value:,.2f}")
                logger.warning(f"  • This represents {(total_suspicious_value / self.value_tracking['rounding_loss_value_exc_vat'] * 100) if self.value_tracking['rounding_loss_value_exc_vat'] > 0 else 0:.1f}% of all rounding losses")
                
                logger.warning("\n💡 POSSIBLE CAUSES:")
                logger.warning("  1. Source database has fractional stock quantities (e.g., 10.5 units)")
                logger.warning("  2. Items sold in bulk/partial units (e.g., meters of cable, liters)")
                logger.warning("  3. Legacy system allowed decimal quantities, new system uses integers")
                logger.warning("  4. Data quality issues in source database")
                
                logger.warning("\n📋 RECOMMENDATIONS:")
                logger.warning("  1. Review items with source qty > 10 and loss > 1 unit - may need manual adjustment")
                logger.warning("  2. Consider using smallest sellable unit (e.g., cm instead of m, ml instead of L)")
                logger.warning("  3. For high-value items, consider rounding UP instead of truncating")
                logger.warning("  4. Add validation rules to prevent fractional quantities in new system")
            
            # Analyze fractional stock distribution
            if self.value_tracking['fractional_stock_items']:
                logger.info("\n" + "-"*80)
                logger.info("FRACTIONAL STOCK ANALYSIS")
                logger.info("-"*80)
                logger.info(f"\nTotal items with fractional stock: {len(self.value_tracking['fractional_stock_items'])}")
                
                # Group by fractional magnitude
                small_fractional = [x for x in self.value_tracking['fractional_stock_items'] if x['loss'] < Decimal('0.5')]
                large_fractional = [x for x in self.value_tracking['fractional_stock_items'] if x['loss'] >= Decimal('0.5')]
                
                logger.info(f"  • Small fractional (loss < 0.5 units):  {len(small_fractional)} items")
                logger.info(f"  • Large fractional (loss ≥ 0.5 units):  {len(large_fractional)} items")
                
                if large_fractional:
                    large_fractional_value = sum(x['value_loss'] for x in large_fractional)
                    logger.warning(f"\n⚠️  {len(large_fractional)} items lost ≥0.5 units each (£{large_fractional_value:,.2f} total)")
                    logger.warning("     Consider rounding these UP to nearest integer instead of truncating")
                
                # Show distribution by SKU prefix
                prefix_analysis = {}
                for item in self.value_tracking['fractional_stock_items']:
                    prefix = item['sku'][:2] if len(item['sku']) >= 2 else item['sku']
                    if prefix not in prefix_analysis:
                        prefix_analysis[prefix] = {'count': 0, 'total_loss': Decimal('0'), 'total_value_loss': Decimal('0')}
                    prefix_analysis[prefix]['count'] += 1
                    prefix_analysis[prefix]['total_loss'] += item['loss']
                    prefix_analysis[prefix]['total_value_loss'] += item['value_loss']
                
                if prefix_analysis:
                    logger.info("\nFractional stock by prefix:")
                    logger.info(f"{'Prefix':<8} {'Items':>8} {'Qty Loss':>12} {'Value Loss':>12}")
                    logger.info("-" * 45)
                    for prefix in sorted(prefix_analysis.keys(), key=lambda p: prefix_analysis[p]['total_value_loss'], reverse=True):
                        data = prefix_analysis[prefix]
                        logger.info(f"{prefix:<8} {data['count']:>8} {data['total_loss']:>12.2f} £{data['total_value_loss']:>10.2f}")
            
            logger.info("="*80)
        
        # Export rounding losses to CSV
        if self.value_tracking['fractional_stock_items']:
            logger.info("\n" + "="*80)
            logger.info("EXPORTING ROUNDING LOSSES TO CSV")
            logger.info("="*80)
            csv_path = self._export_rounding_losses_to_csv('rounding_losses_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.csv')
            if csv_path:
                logger.info(f"\n📄 Detailed rounding loss report saved to: {csv_path}")
                logger.info("   This file contains:")
                logger.info("   • Product code for each affected item")
                logger.info("   • Source quantity (with decimals)")
                logger.info("   • Target quantity (integer)")
                logger.info("   • Quantity loss from rounding")
                logger.info("   • Unit cost and total value loss")
                logger.info("   • Severity rating (HIGH/MEDIUM/LOW)")
                logger.info("\n   Use this file to:")
                logger.info("   1. Review high-value rounding losses for manual adjustment")
                logger.info("   2. Identify items that may need different unit of measure")
                logger.info("   3. Import into spreadsheet for analysis and decision making")
        
        # Add detailed breakdown by prefix
        logger.info("\n" + "="*80)
        logger.info("DETAILED VALUE ANALYSIS BY SKU PREFIX")
        logger.info("="*80)
        logger.info("\nThis breakdown helps identify where value discrepancies occur")
        logger.info("by grouping items by their first 2 characters (e.g., 'GA', 'EL', 'ST')")
        logger.info("")
        
        try:
            # Query source database for breakdown
            source_cursor = source_conn.cursor()
            # Note: Legacy DB has PRICE (exc VAT), no SELLING_PRICE column
            # Calculate inc VAT using the VAT rate we fetched earlier
            vat_multiplier = 1 + self.value_tracking['vat_rate_from_source']
            source_cursor.execute(f"""
                SELECT 
                    SUBSTRING(CODE, 1, 2) as prefix,
                    COUNT(*) as item_count,
                    SUM(BALANCE) as total_qty,
                    SUM(PRICE * BALANCE) as value_exc_vat,
                    SUM(PRICE * BALANCE * {vat_multiplier}) as value_inc_vat
                FROM stock
                WHERE BALANCE > 0
                GROUP BY SUBSTRING(CODE, 1, 2)
                ORDER BY SUBSTRING(CODE, 1, 2)
            """)
            source_by_prefix = {row[0]: {'count': row[1], 'qty': Decimal(str(row[2] or 0)), 
                                          'exc_vat': Decimal(str(row[3] or 0)), 
                                          'inc_vat': Decimal(str(row[4] or 0))} 
                                for row in source_cursor.fetchall()}
            
            # Query target database for breakdown
            target_cursor = target_conn.cursor()
            target_cursor.execute("""
                SELECT 
                    SUBSTRING(sku, 1, 2) as prefix,
                    COUNT(*) as item_count,
                    SUM(current_stock) as total_qty,
                    SUM(price * current_stock / (1 + vat_rate)) as value_exc_vat,
                    SUM(CASE WHEN vat_included THEN price * current_stock 
                             ELSE price * current_stock * (1 + vat_rate) END) as value_inc_vat
                FROM items
                WHERE current_stock > 0
                GROUP BY SUBSTRING(sku, 1, 2)
                ORDER BY SUBSTRING(sku, 1, 2)
            """)
            target_by_prefix = {row[0]: {'count': row[1], 'qty': Decimal(str(row[2] or 0)), 
                                          'exc_vat': Decimal(str(row[3] or 0)), 
                                          'inc_vat': Decimal(str(row[4] or 0))} 
                                for row in target_cursor.fetchall()}
            
            # Get all unique prefixes
            all_prefixes = sorted(set(list(source_by_prefix.keys()) + list(target_by_prefix.keys())))
            
            logger.info("-" * 110)
            logger.info(f"{'Prefix':<8} {'Source':<10} {'Target':<10} {'Diff':<10} | {'Source Inc VAT':>16} {'Target Inc VAT':>16} {'Difference':>16}")
            logger.info(f"{'':8} {'Items':<10} {'Items':<10} {'Items':<10} | {'':>16} {'':>16} {'':>16}")
            logger.info("-" * 110)
            
            total_source_value = Decimal('0')
            total_target_value = Decimal('0')
            
            for prefix in all_prefixes:
                src = source_by_prefix.get(prefix, {'count': 0, 'qty': Decimal('0'), 'exc_vat': Decimal('0'), 'inc_vat': Decimal('0')})
                tgt = target_by_prefix.get(prefix, {'count': 0, 'qty': Decimal('0'), 'exc_vat': Decimal('0'), 'inc_vat': Decimal('0')})
                
                count_diff = tgt['count'] - src['count']
                value_diff = tgt['inc_vat'] - src['inc_vat']
                
                total_source_value += src['inc_vat']
                total_target_value += tgt['inc_vat']
                
                diff_indicator = "✓" if abs(value_diff) < Decimal('0.01') else "⚠" if abs(value_diff) < Decimal('100') else "❌"
                
                logger.info(f"{prefix:<8} {src['count']:<10} {tgt['count']:<10} {count_diff:>+9} | "
                           f"£{src['inc_vat']:>14,.2f} £{tgt['inc_vat']:>14,.2f} "
                           f"£{value_diff:>+14,.2f} {diff_indicator}")
            
            logger.info("-" * 110)
            logger.info(f"{'TOTAL':<8} {'':<10} {'':<10} {'':<10} | "
                       f"£{total_source_value:>14,.2f} £{total_target_value:>14,.2f} "
                       f"£{total_target_value - total_source_value:>+14,.2f}")
            logger.info("="*110)
            
            logger.info("\nLegend:")
            logger.info("  ✓ = Values match (within £0.01)")
            logger.info("  ⚠ = Small discrepancy (< £100)")
            logger.info("  ❌ = Significant discrepancy (≥ £100)")
            
            # Show VAT rate analysis
            logger.info("\n" + "="*80)
            logger.info("VAT RATE DISTRIBUTION IN TARGET DATABASE")
            logger.info("="*80)
            
            target_cursor.execute("""
                SELECT 
                    ROUND((vat_rate * 100)::numeric, 2) as vat_rate_pct,
                    vat_included,
                    COUNT(*) as item_count,
                    ROUND(SUM(current_stock)::numeric, 2) as total_qty,
                    ROUND(SUM(price * current_stock)::numeric, 2) as value_at_price,
                    ROUND(SUM(
                        CASE 
                            WHEN vat_included THEN price * current_stock 
                            ELSE price * current_stock * (1 + vat_rate)
                        END
                    )::numeric, 2) as value_inc_vat
                FROM items
                WHERE current_stock > 0
                GROUP BY vat_rate, vat_included
                ORDER BY vat_rate DESC, vat_included DESC
            """)
            
            logger.info(f"\n{'VAT Rate':<12} {'VAT Mode':<15} {'Items':<8} {'Total Qty':<12} {'Value @Price':<16} {'Value Inc VAT':<16}")
            logger.info("-" * 80)
            
            for row in target_cursor.fetchall():
                vat_pct = row[0]
                vat_mode = "Included" if row[1] else "Add to Price"
                item_count = row[2]
                qty = row[3]
                value_at_price = row[4]
                value_inc_vat = row[5]
                
                logger.info(f"{vat_pct:>10}% {vat_mode:<15} {item_count:<8} {qty:>11.2f} £{value_at_price:>13,.2f} £{value_inc_vat:>13,.2f}")
            
            logger.info("="*80)
            
            logger.info("\nNOTE: To verify dashboard value after VAT fix:")
            logger.info(f"  Expected dashboard value: £{total_target_value:,.2f}")
            logger.info(f"  This should match the migration target value: £{self.value_tracking['target_total_value_inc_vat']:,.2f}")
            
        except Exception as e:
            logger.warning(f"Could not generate detailed breakdown: {e}")

        # Print source database schema for reference
        self._print_source_schema(source_conn)

        logger.info("\n" + "="*80)

    def _print_source_schema(self, source_conn):
        """Print the source database schema for reference."""
        logger.info("\n" + "="*80)
        logger.info("SOURCE DATABASE SCHEMA")
        logger.info("="*80)
        logger.info("\nThis shows all tables and columns from the legacy database")
        logger.info("")

        try:
            cursor = source_conn.cursor()

            # Get all tables
            cursor.execute("SHOW TABLES")
            tables = [row[0] for row in cursor.fetchall()]

            for table_name in sorted(tables):
                logger.info(f"\nTable: {table_name}")
                logger.info("-" * 80)

                # Get column information
                cursor.execute(f"DESCRIBE `{table_name}`")
                columns = cursor.fetchall()

                logger.info(f"{'Column':<30} {'Type':<20} {'Null':<8} {'Key':<8} {'Default':<15}")
                logger.info("-" * 80)

                for col in columns:
                    field = col[0]
                    field_type = col[1]
                    null_allowed = col[2]
                    key = col[3]
                    default = str(col[4]) if col[4] is not None else 'NULL'

                    logger.info(f"{field:<30} {field_type:<20} {null_allowed:<8} {key:<8} {default:<15}")

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                row_count = cursor.fetchone()[0]
                logger.info(f"\nRow count: {row_count:,}")

            logger.info("\n" + "="*80)

        except Exception as e:
            logger.warning(f"Could not print source schema: {e}")

def main():
    """Main function to run the migration."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate data from legacy physicsstores to modern university_inventory')
    parser.add_argument('--schema-file', required=True, help='Path to the JSON schema export file')
    parser.add_argument('--source-host', required=True, help='Source database host')
    parser.add_argument('--source-port', default=3306, type=int, help='Source database port')
    parser.add_argument('--source-user', required=True, help='Source database user')
    parser.add_argument('--source-password', required=True, help='Source database password')
    parser.add_argument('--source-database', required=True, help='Source database name')
    parser.add_argument('--target-host', required=True, help='Target database host')
    parser.add_argument('--target-port', default=5432, type=int, help='Target database port')
    parser.add_argument('--target-user', required=True, help='Target database user')
    parser.add_argument('--target-password', required=True, help='Target database password')
    parser.add_argument('--target-database', required=True, help='Target database name')
    parser.add_argument('--dry-run', action='store_true', help='Print what would be migrated without making changes')
    parser.add_argument('--skip-tests', action='store_true', help='Skip pre-migration Playwright tests (not recommended)')
    parser.add_argument('--server-url', default='http://localhost:5000', help='Application server URL (default: http://localhost:5000)')

    args = parser.parse_args()
    
    source_config = {
        'host': args.source_host,
        'port': args.source_port,
        'user': args.source_user,
        'password': args.source_password,
        'database': args.source_database,
        'charset': 'utf8mb4'
    }
    
    target_config = {
        'host': args.target_host,
        'port': args.target_port,
        'user': args.target_user,
        'password': args.target_password,
        'database': args.target_database
    }
    
    if args.dry_run:
        logger.info("DRY RUN MODE - No changes will be made to the database")
        # TODO: Implement dry run functionality
        return
    
    try:
        migrator = LegacyToModernMigrator(
            source_config,
            target_config,
            args.schema_file,
            skip_tests=args.skip_tests,
            server_url=args.server_url
        )
        migrator.run_migration()
        logger.info("\n" + "="*60)
        logger.info("MIGRATION COMPLETED SUCCESSFULLY")
        logger.info("="*60)
        logger.info("Check the summary above for details on any errors or skipped records.")
        logger.info("\nAdmin access: admin@university.edu / admin123")
    except Exception as e:
        logger.error(f"Migration encountered a critical error: {e}")
        logger.error(f"Some data may have been migrated - check the summary above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
