Database Migration Tools and Scripts
====================================

This document provides ready-to-use scripts and tools for migrating from legacy inventory systems to LUStores. These scripts handle common migration scenarios and can be adapted for specific legacy systems.

Migration Utilities
-------------------

Database Schema Inspector
~~~~~~~~~~~~~~~~~~~~~~~~~

**Legacy System Analysis Script:**

.. code-block:: bash

   #!/bin/bash
   # File: inspect_legacy_db.sh
   # Purpose: Analyze legacy database structure
   
   DATABASE_HOST=${1:-localhost}
   DATABASE_NAME=${2:-inventory}
   DATABASE_USER=${3:-admin}
   
   echo "=== Legacy Database Analysis ==="
   echo "Host: $DATABASE_HOST"
   echo "Database: $DATABASE_NAME"
   echo "User: $DATABASE_USER"
   echo
   
   # Get all tables
   echo "=== Tables in Database ==="
   mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p "$DATABASE_NAME" \
     -e "SHOW TABLES;" | tail -n +2
   
   echo
   echo "=== Table Structures ==="
   
   # Get table structures
   TABLES=$(mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p "$DATABASE_NAME" \
     -e "SHOW TABLES;" | tail -n +2)
   
   for table in $TABLES; do
       echo "--- Structure of $table ---"
       mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p "$DATABASE_NAME" \
         -e "DESCRIBE $table;"
       echo
       
       echo "--- Sample data from $table (first 3 rows) ---"
       mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p "$DATABASE_NAME" \
         -e "SELECT * FROM $table LIMIT 3;"
       echo
       
       echo "--- Row count for $table ---"
       mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p "$DATABASE_NAME" \
         -e "SELECT COUNT(*) as row_count FROM $table;"
       echo "================================"
       echo
   done

**PostgreSQL Version:**

.. code-block:: bash

   #!/bin/bash
   # File: inspect_legacy_pg.sh
   # Purpose: Analyze legacy PostgreSQL database
   
   DATABASE_URL=${1:-postgresql://user:pass@localhost:5432/inventory}
   
   echo "=== Legacy PostgreSQL Database Analysis ==="
   echo "URL: $DATABASE_URL"
   echo
   
   # Get all tables
   echo "=== Tables in Database ==="
   psql "$DATABASE_URL" -t -c "
       SELECT tablename 
       FROM pg_tables 
       WHERE schemaname = 'public'
       ORDER BY tablename;
   "
   
   echo
   echo "=== Detailed Table Analysis ==="
   
   # Get table details
   psql "$DATABASE_URL" -c "
       SELECT 
           t.tablename,
           c.column_name,
           c.data_type,
           c.is_nullable,
           c.column_default
       FROM pg_tables t
       JOIN information_schema.columns c ON c.table_name = t.tablename
       WHERE t.schemaname = 'public'
       ORDER BY t.tablename, c.ordinal_position;
   "

Data Extraction Scripts
~~~~~~~~~~~~~~~~~~~~~~~

**Universal Data Extractor:**

.. code-block:: python

   #!/usr/bin/env python3
   # File: extract_legacy_data.py
   # Purpose: Extract data from various legacy database systems
   
   import sys
   import csv
   import argparse
   from typing import Dict, List, Any
   import logging
   
   # Database drivers
   try:
       import mysql.connector
       import psycopg2
       import sqlite3
       import pyodbc
   except ImportError as e:
       print(f"Missing database driver: {e}")
       print("Install with: pip install mysql-connector-python psycopg2 pyodbc")
   
   logging.basicConfig(level=logging.INFO)
   logger = logging.getLogger(__name__)
   
   class LegacyDataExtractor:
       def __init__(self, db_config: Dict[str, str]):
           self.db_config = db_config
           self.connection = None
   
       def connect(self):
           """Connect to legacy database"""
           db_type = self.db_config.get('type', 'mysql').lower()
           
           try:
               if db_type == 'mysql':
                   self.connection = mysql.connector.connect(
                       host=self.db_config['host'],
                       user=self.db_config['user'],
                       password=self.db_config['password'],
                       database=self.db_config['database']
                   )
               elif db_type == 'postgresql':
                   self.connection = psycopg2.connect(
                       host=self.db_config['host'],
                       user=self.db_config['user'],
                       password=self.db_config['password'],
                       database=self.db_config['database']
                   )
               elif db_type == 'sqlite':
                   self.connection = sqlite3.connect(self.db_config['file'])
               elif db_type == 'sqlserver':
                   conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={self.db_config['host']};DATABASE={self.db_config['database']};UID={self.db_config['user']};PWD={self.db_config['password']}"
                   self.connection = pyodbc.connect(conn_str)
               
               logger.info(f"Connected to {db_type} database")
               
           except Exception as e:
               logger.error(f"Failed to connect: {e}")
               raise
   
       def extract_categories(self) -> List[Dict[str, Any]]:
           """Extract categories from legacy system"""
           queries = {
               'standard': """
                   SELECT 
                       id as legacy_id,
                       name,
                       description,
                       parent_id
                   FROM categories
                   ORDER BY id
               """,
               'alternative1': """
                   SELECT 
                       category_id as legacy_id,
                       category_name as name,
                       category_desc as description,
                       parent_category_id as parent_id
                   FROM item_categories
                   ORDER BY category_id
               """,
               'alternative2': """
                   SELECT 
                       cat_id as legacy_id,
                       cat_name as name,
                       cat_description as description,
                       NULL as parent_id
                   FROM product_categories
                   ORDER BY cat_id
               """
           }
           
           return self._try_queries(queries, 'categories')
   
       def extract_items(self) -> List[Dict[str, Any]]:
           """Extract inventory items from legacy system"""
           queries = {
               'standard': """
                   SELECT 
                       i.id as legacy_id,
                       i.name,
                       i.sku,
                       i.description,
                       i.category_id as legacy_category_id,
                       c.name as category_name,
                       i.price,
                       i.quantity as current_stock,
                       i.reorder_level as minimum_stock,
                       i.active as is_active,
                       i.created_at,
                       i.updated_at
                   FROM items i
                   LEFT JOIN categories c ON i.category_id = c.id
                   ORDER BY i.id
               """,
               'alternative1': """
                   SELECT 
                       p.product_id as legacy_id,
                       p.product_name as name,
                       p.product_code as sku,
                       p.description,
                       p.category_id as legacy_category_id,
                       c.category_name as category_name,
                       p.unit_price as price,
                       p.stock_quantity as current_stock,
                       p.minimum_stock as minimum_stock,
                       p.is_active,
                       p.date_created as created_at,
                       p.date_modified as updated_at
                   FROM products p
                   LEFT JOIN item_categories c ON p.category_id = c.category_id
                   ORDER BY p.product_id
               """,
               'alternative2': """
                   SELECT 
                       inv.item_id as legacy_id,
                       inv.item_name as name,
                       inv.item_code as sku,
                       inv.item_desc as description,
                       inv.cat_id as legacy_category_id,
                       cat.cat_name as category_name,
                       inv.cost as price,
                       inv.qty_on_hand as current_stock,
                       inv.reorder_point as minimum_stock,
                       CASE WHEN inv.status = 'A' THEN 1 ELSE 0 END as is_active,
                       inv.date_added as created_at,
                       inv.last_updated as updated_at
                   FROM inventory inv
                   LEFT JOIN product_categories cat ON inv.cat_id = cat.cat_id
                   ORDER BY inv.item_id
               """
           }
           
           return self._try_queries(queries, 'items')
   
       def extract_users(self) -> List[Dict[str, Any]]:
           """Extract users from legacy system"""
           queries = {
               'standard': """
                   SELECT 
                       id as legacy_id,
                       username as id,
                       email,
                       first_name,
                       last_name,
                       role,
                       active as is_active,
                       created_at
                   FROM users
                   WHERE email IS NOT NULL
                   ORDER BY id
               """,
               'alternative1': """
                   SELECT 
                       user_id as legacy_id,
                       login_name as id,
                       email_address as email,
                       first_name,
                       last_name,
                       user_type as role,
                       is_active,
                       date_created as created_at
                   FROM system_users
                   WHERE email_address IS NOT NULL
                   ORDER BY user_id
               """
           }
           
           return self._try_queries(queries, 'users')
   
       def extract_stock_movements(self, months_back: int = 12) -> List[Dict[str, Any]]:
           """Extract stock movements from legacy system"""
           queries = {
               'standard': f"""
                   SELECT 
                       sm.id as legacy_id,
                       sm.item_id as legacy_item_id,
                       i.sku as item_sku,
                       sm.movement_type as type,
                       sm.quantity,
                       sm.previous_stock,
                       sm.new_stock,
                       sm.reason,
                       sm.user_id as legacy_user_id,
                       u.username as performed_by,
                       sm.created_at
                   FROM stock_movements sm
                   LEFT JOIN items i ON sm.item_id = i.id
                   LEFT JOIN users u ON sm.user_id = u.id
                   WHERE sm.created_at >= DATE_SUB(NOW(), INTERVAL {months_back} MONTH)
                   ORDER BY sm.created_at
               """,
               'alternative1': f"""
                   SELECT 
                       t.transaction_id as legacy_id,
                       t.product_id as legacy_item_id,
                       p.product_code as item_sku,
                       t.transaction_type as type,
                       t.quantity,
                       t.qty_before as previous_stock,
                       t.qty_after as new_stock,
                       t.notes as reason,
                       t.user_id as legacy_user_id,
                       u.login_name as performed_by,
                       t.transaction_date as created_at
                   FROM inventory_transactions t
                   LEFT JOIN products p ON t.product_id = p.product_id
                   LEFT JOIN system_users u ON t.user_id = u.user_id
                   WHERE t.transaction_date >= DATE_SUB(NOW(), INTERVAL {months_back} MONTH)
                   ORDER BY t.transaction_date
               """
           }
           
           return self._try_queries(queries, 'stock movements')
   
       def _try_queries(self, queries: Dict[str, str], entity_type: str) -> List[Dict[str, Any]]:
           """Try multiple query variations to find the right one"""
           for query_name, query in queries.items():
               try:
                   logger.info(f"Trying {query_name} query for {entity_type}")
                   cursor = self.connection.cursor()
                   cursor.execute(query)
                   
                   # Get column names
                   if hasattr(cursor, 'description'):
                       columns = [desc[0] for desc in cursor.description]
                   else:
                       # For SQLite
                       columns = [desc[0] for desc in cursor.description]
                   
                   # Fetch all rows
                   rows = cursor.fetchall()
                   
                   # Convert to list of dictionaries
                   result = []
                   for row in rows:
                       result.append(dict(zip(columns, row)))
                   
                   logger.info(f"Successfully extracted {len(result)} {entity_type} records using {query_name} query")
                   cursor.close()
                   return result
                   
               except Exception as e:
                   logger.warning(f"{query_name} query failed for {entity_type}: {e}")
                   continue
           
           logger.error(f"All queries failed for {entity_type}")
           return []
   
       def export_to_csv(self, data: List[Dict[str, Any]], filename: str):
           """Export data to CSV file"""
           if not data:
               logger.warning(f"No data to export to {filename}")
               return
               
           with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
               writer = csv.DictWriter(csvfile, fieldnames=data[0].keys())
               writer.writeheader()
               writer.writerows(data)
               
           logger.info(f"Exported {len(data)} records to {filename}")
   
       def close(self):
           """Close database connection"""
           if self.connection:
               self.connection.close()
   
   def main():
       parser = argparse.ArgumentParser(description='Extract data from legacy inventory system')
       parser.add_argument('--type', choices=['mysql', 'postgresql', 'sqlite', 'sqlserver'], 
                          default='mysql', help='Database type')
       parser.add_argument('--host', required=True, help='Database host')
       parser.add_argument('--user', required=True, help='Database user')
       parser.add_argument('--password', required=True, help='Database password')
       parser.add_argument('--database', required=True, help='Database name')
       parser.add_argument('--output-dir', default='.', help='Output directory for CSV files')
       parser.add_argument('--months-back', type=int, default=12, 
                          help='Months of stock movement history to extract')
       
       args = parser.parse_args()
       
       db_config = {
           'type': args.type,
           'host': args.host,
           'user': args.user,
           'password': args.password,
           'database': args.database
       }
       
       extractor = LegacyDataExtractor(db_config)
       
       try:
           extractor.connect()
           
           # Extract categories
           categories = extractor.extract_categories()
           extractor.export_to_csv(categories, f"{args.output_dir}/categories_export.csv")
           
           # Extract items
           items = extractor.extract_items()
           extractor.export_to_csv(items, f"{args.output_dir}/items_export.csv")
           
           # Extract users
           users = extractor.extract_users()
           extractor.export_to_csv(users, f"{args.output_dir}/users_export.csv")
           
           # Extract stock movements
           movements = extractor.extract_stock_movements(args.months_back)
           extractor.export_to_csv(movements, f"{args.output_dir}/stock_movements_export.csv")
           
           logger.info("Data extraction completed successfully")
           
       finally:
           extractor.close()
   
   if __name__ == '__main__':
       main()

**Usage:**

.. code-block:: bash

   # Extract from MySQL
   python extract_legacy_data.py \
     --type mysql \
     --host legacy-db.company.com \
     --user inventory_reader \
     --password secret123 \
     --database legacy_inventory \
     --output-dir ./migration_data
   
   # Extract from PostgreSQL
   python extract_legacy_data.py \
     --type postgresql \
     --host legacy-pg.company.com \
     --user inventory_user \
     --password secret123 \
     --database legacy_inv_db \
     --output-dir ./migration_data

Data Transformation Scripts
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**CSV Data Transformer:**

.. code-block:: python

   #!/usr/bin/env python3
   # File: transform_legacy_data.py
   # Purpose: Transform legacy CSV data to LUStores format
   
   import csv
   import re
   import hashlib
   import logging
   from datetime import datetime
   from typing import Dict, List, Any
   
   logging.basicConfig(level=logging.INFO)
   logger = logging.getLogger(__name__)
   
   class DataTransformer:
       def __init__(self):
           self.category_mapping = {}
           self.user_mapping = {}
           
       def transform_categories(self, input_file: str, output_file: str):
           """Transform legacy categories to LUStores format"""
           logger.info(f"Transforming categories from {input_file}")
           
           transformed = []
           icon_mapping = {
               'computer': 'fas fa-laptop',
               'office': 'fas fa-building',
               'lab': 'fas fa-flask',
               'medical': 'fas fa-heart',
               'furniture': 'fas fa-chair',
               'tool': 'fas fa-tools',
               'vehicle': 'fas fa-car',
               'book': 'fas fa-book',
               'default': 'fas fa-box'
           }
           
           color_palette = ['blue', 'green', 'purple', 'orange', 'red', 'gray', 'teal', 'pink']
           
           with open(input_file, 'r', encoding='utf-8') as f:
               reader = csv.DictReader(f)
               for i, row in enumerate(reader):
                   # Clean and validate name
                   name = self._clean_text(row.get('name', ''))
                   if not name:
                       logger.warning(f"Skipping category with empty name: {row}")
                       continue
                   
                   # Generate icon based on name keywords
                   icon = 'fas fa-box'
                   name_lower = name.lower()
                   for keyword, mapped_icon in icon_mapping.items():
                       if keyword in name_lower:
                           icon = mapped_icon
                           break
                   
                   # Assign color cyclically
                   color = color_palette[i % len(color_palette)]
                   
                   transformed_category = {
                       'name': name,
                       'description': self._clean_text(row.get('description', '')),
                       'icon': icon,
                       'color': color
                   }
                   
                   transformed.append(transformed_category)
                   
                   # Store mapping for items transformation
                   legacy_id = row.get('legacy_id') or row.get('id')
                   if legacy_id:
                       self.category_mapping[str(legacy_id)] = name
           
           self._write_csv(transformed, output_file)
           logger.info(f"Transformed {len(transformed)} categories")
   
       def transform_users(self, input_file: str, output_file: str):
           """Transform legacy users to LUStores format"""
           logger.info(f"Transforming users from {input_file}")
           
           transformed = []
           default_password_hash = '$2b$10$8K1p/a0dqailSurF.ONj2uyaLiI6Hqh4LAks.5wvW.3BlxtZjO96O'
           
           with open(input_file, 'r', encoding='utf-8') as f:
               reader = csv.DictReader(f)
               for row in enumerate(reader):
                   # Clean user ID
                   user_id = self._clean_username(row.get('id', ''))
                   if not user_id:
                       user_id = f"user_{row.get('legacy_id', i)}"
                   
                   # Validate email
                   email = row.get('email', '').strip().lower()
                   if not self._is_valid_email(email):
                       logger.warning(f"Invalid email for user {user_id}: {email}")
                       continue
                   
                   # Split name
                   first_name, last_name = self._split_name(
                       row.get('first_name', ''),
                       row.get('last_name', '')
                   )
                   
                   # Map role
                   role = self._map_role(row.get('role', ''))
                   
                   transformed_user = {
                       'id': user_id,
                       'email': email,
                       'password_hash': default_password_hash,
                       'first_name': first_name,
                       'last_name': last_name,
                       'role': role,
                       'is_active': self._to_boolean(row.get('is_active', 'true')),
                       'must_change_password': 'true'
                   }
                   
                   transformed.append(transformed_user)
                   
                   # Store mapping for movements
                   legacy_id = row.get('legacy_id')
                   if legacy_id:
                       self.user_mapping[str(legacy_id)] = user_id
           
           self._write_csv(transformed, output_file)
           logger.info(f"Transformed {len(transformed)} users")
   
       def transform_items(self, input_file: str, output_file: str):
           """Transform legacy items to LUStores format"""
           logger.info(f"Transforming items from {input_file}")
           
           transformed = []
           sku_seen = set()
           
           with open(input_file, 'r', encoding='utf-8') as f:
               reader = csv.DictReader(f)
               for i, row in enumerate(reader):
                   # Clean and validate required fields
                   name = self._clean_text(row.get('name', ''))
                   if not name:
                       logger.warning(f"Skipping item with empty name: {row}")
                       continue
                   
                   # Generate or clean SKU
                   sku = self._clean_sku(row.get('sku', ''))
                   if not sku:
                       sku = f"ITEM-{i+1:06d}"
                   
                   # Ensure SKU uniqueness
                   original_sku = sku
                   counter = 1
                   while sku in sku_seen:
                       sku = f"{original_sku}-{counter}"
                       counter += 1
                   sku_seen.add(sku)
                   
                   # Map category
                   category_name = self._map_category(row)
                   if not category_name:
                       category_name = 'Uncategorized'
                   
                   # Clean numeric fields
                   price = self._clean_decimal(row.get('price', '0'))
                   current_stock = self._clean_integer(row.get('current_stock', '0'))
                   minimum_stock = self._clean_integer(row.get('minimum_stock', '0'))
                   
                   transformed_item = {
                       'name': name,
                       'sku': sku,
                       'description': self._clean_text(row.get('description', '')),
                       'categoryName': category_name,
                       'price': str(price),
                       'vatRate': '0.20',
                       'vatIncluded': 'true',
                       'currentStock': str(current_stock),
                       'minimumStock': str(minimum_stock),
                       'isActive': self._to_boolean(row.get('is_active', 'true'))
                   }
                   
                   transformed.append(transformed_item)
           
           self._write_csv(transformed, output_file)
           logger.info(f"Transformed {len(transformed)} items")
   
       def _clean_text(self, text: str) -> str:
           """Clean and normalize text fields"""
           if not text:
               return ''
           return re.sub(r'\s+', ' ', str(text).strip())
   
       def _clean_username(self, username: str) -> str:
           """Clean username to valid format"""
           if not username:
               return ''
           # Remove special characters, keep alphanumeric and underscore
           cleaned = re.sub(r'[^a-zA-Z0-9_]', '', str(username).lower().strip())
           return cleaned[:50]  # Limit length
   
       def _clean_sku(self, sku: str) -> str:
           """Clean SKU to valid format"""
           if not sku:
               return ''
           # Remove special characters except hyphens
           cleaned = re.sub(r'[^a-zA-Z0-9\-]', '', str(sku).upper().strip())
           return cleaned[:100]  # Limit length
   
       def _clean_decimal(self, value: str) -> float:
           """Clean and convert to decimal"""
           if not value:
               return 0.0
           # Remove currency symbols and spaces
           cleaned = re.sub(r'[^\d\.]', '', str(value))
           try:
               return float(cleaned)
           except ValueError:
               return 0.0
   
       def _clean_integer(self, value: str) -> int:
           """Clean and convert to integer"""
           if not value:
               return 0
           cleaned = re.sub(r'[^\d]', '', str(value))
           try:
               return int(cleaned)
           except ValueError:
               return 0
   
       def _to_boolean(self, value: str) -> str:
           """Convert various boolean representations to string"""
           if not value:
               return 'false'
           value_lower = str(value).lower().strip()
           return 'true' if value_lower in ['true', '1', 'yes', 'active', 'y'] else 'false'
   
       def _is_valid_email(self, email: str) -> bool:
           """Validate email format"""
           pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
           return bool(re.match(pattern, email))
   
       def _split_name(self, first: str, last: str) -> tuple:
           """Split and clean name components"""
           first = self._clean_text(first)
           last = self._clean_text(last)
           
           # If last name is empty but first name has spaces, split it
           if not last and ' ' in first:
               parts = first.split(' ', 1)
               first = parts[0]
               last = parts[1]
           
           return first or 'Unknown', last or 'User'
   
       def _map_role(self, role: str) -> str:
           """Map legacy roles to LUStores roles"""
           if not role:
               return 'user'
           
           role_lower = str(role).lower().strip()
           if role_lower in ['admin', 'administrator', 'root', 'superuser']:
               return 'admin'
           elif role_lower in ['manager', 'supervisor', 'lead', 'coordinator']:
               return 'manager'
           else:
               return 'user'
   
       def _map_category(self, row: Dict[str, str]) -> str:
           """Map legacy category to LUStores category name"""
           # Try category name first
           category_name = row.get('category_name')
           if category_name:
               return self._clean_text(category_name)
           
           # Try mapping by legacy ID
           legacy_category_id = row.get('legacy_category_id')
           if legacy_category_id and str(legacy_category_id) in self.category_mapping:
               return self.category_mapping[str(legacy_category_id)]
           
           return None
   
       def _write_csv(self, data: List[Dict], filename: str):
           """Write data to CSV file"""
           if not data:
               logger.warning(f"No data to write to {filename}")
               return
           
           with open(filename, 'w', newline='', encoding='utf-8') as f:
               writer = csv.DictWriter(f, fieldnames=data[0].keys())
               writer.writeheader()
               writer.writerows(data)
   
   def main():
       transformer = DataTransformer()
       
       # Transform in order: categories first, then users, then items
       transformer.transform_categories('categories_export.csv', 'categories_transformed.csv')
       transformer.transform_users('users_export.csv', 'users_transformed.csv')
       transformer.transform_items('items_export.csv', 'items_transformed.csv')
       
       logger.info("Data transformation completed")
   
   if __name__ == '__main__':
       main()

Import Automation Scripts
~~~~~~~~~~~~~~~~~~~~~~~~~

**LUStores Import Script:**

.. code-block:: bash

   #!/bin/bash
   # File: import_to_lustores.sh
   # Purpose: Import transformed data into LUStores
   
   set -e  # Exit on any error
   
   DATABASE_URL=${DATABASE_URL:-postgresql://user:pass@localhost:5432/university_inventory}
   MIGRATION_USER=${MIGRATION_USER:-migration_admin}
   DATA_DIR=${1:-./migration_data}
   
   echo "=== LUStores Data Import ==="
   echo "Database: $DATABASE_URL"
   echo "Data Directory: $DATA_DIR"
   echo "Migration User: $MIGRATION_USER"
   echo
   
   # Verify files exist
   required_files=("categories_transformed.csv" "users_transformed.csv" "items_transformed.csv")
   for file in "${required_files[@]}"; do
       if [[ ! -f "$DATA_DIR/$file" ]]; then
           echo "Error: Required file $DATA_DIR/$file not found"
           exit 1
       fi
   done
   
   # Create migration user if not exists
   echo "Creating migration user..."
   psql "$DATABASE_URL" << EOF
   INSERT INTO users (
       id, email, password_hash, first_name, last_name, role, 
       is_active, must_change_password, created_at, updated_at
   ) VALUES (
       '$MIGRATION_USER',
       'migration@university.edu',
       '\$2b\$10\$8K1p/a0dqailSurF.ONj2uyaLiI6Hqh4LAks.5wvW.3BlxtZjO96O',
       'Migration',
       'Administrator',
       'admin',
       true,
       false,
       NOW(),
       NOW()
   ) ON CONFLICT (id) DO NOTHING;
   EOF
   
   # Import categories
   echo "Importing categories..."
   psql "$DATABASE_URL" << EOF
   CREATE TEMP TABLE temp_categories (
       name VARCHAR(100),
       description TEXT,
       icon VARCHAR(50),
       color VARCHAR(50)
   );
   
   \COPY temp_categories FROM '$DATA_DIR/categories_transformed.csv' CSV HEADER;
   
   INSERT INTO categories (name, description, icon, color, created_at, updated_at)
   SELECT name, description, icon, color, NOW(), NOW()
   FROM temp_categories
   WHERE name NOT IN (SELECT name FROM categories);
   
   SELECT COUNT(*) as imported_categories FROM temp_categories;
   EOF
   
   # Import users
   echo "Importing users..."
   psql "$DATABASE_URL" << EOF
   CREATE TEMP TABLE temp_users (
       id VARCHAR,
       email VARCHAR,
       password_hash VARCHAR,
       first_name VARCHAR,
       last_name VARCHAR,
       role VARCHAR,
       is_active BOOLEAN,
       must_change_password BOOLEAN
   );
   
   \COPY temp_users FROM '$DATA_DIR/users_transformed.csv' CSV HEADER;
   
   INSERT INTO users (
       id, email, password_hash, first_name, last_name, role,
       is_active, must_change_password, created_at, updated_at
   )
   SELECT 
       id, email, password_hash, first_name, last_name, role,
       is_active, must_change_password, NOW(), NOW()
   FROM temp_users
   WHERE email NOT IN (SELECT email FROM users);
   
   SELECT COUNT(*) as imported_users FROM temp_users;
   EOF
   
   # Import items
   echo "Importing items..."
   psql "$DATABASE_URL" << EOF
   CREATE TEMP TABLE temp_items (
       name VARCHAR(200),
       sku VARCHAR(100),
       description TEXT,
       categoryName VARCHAR(100),
       price DECIMAL(10,2),
       vatRate DECIMAL(5,4),
       vatIncluded BOOLEAN,
       currentStock INTEGER,
       minimumStock INTEGER,
       isActive BOOLEAN
   );
   
   \COPY temp_items FROM '$DATA_DIR/items_transformed.csv' CSV HEADER;
   
   INSERT INTO items (
       name, sku, description, category_id, price, vat_rate, vat_included,
       current_stock, minimum_stock, is_active, created_by, updated_by,
       created_at, updated_at
   )
   SELECT 
       ti.name,
       ti.sku,
       ti.description,
       c.id,
       ti.price,
       ti.vatRate,
       ti.vatIncluded,
       ti.currentStock,
       ti.minimumStock,
       ti.isActive,
       '$MIGRATION_USER',
       '$MIGRATION_USER',
       NOW(),
       NOW()
   FROM temp_items ti
   JOIN categories c ON c.name = ti.categoryName
   WHERE ti.sku NOT IN (SELECT sku FROM items);
   
   SELECT COUNT(*) as imported_items FROM temp_items;
   EOF
   
   # Validation
   echo "Validating import..."
   psql "$DATABASE_URL" << EOF
   SELECT 'Categories' as entity, COUNT(*) as count FROM categories
   UNION ALL
   SELECT 'Users', COUNT(*) FROM users
   UNION ALL
   SELECT 'Items', COUNT(*) FROM items;
   
   -- Check for issues
   SELECT 'Items without categories' as issue, COUNT(*)
   FROM items WHERE category_id IS NULL
   UNION ALL
   SELECT 'Duplicate SKUs', COUNT(*)
   FROM (SELECT sku FROM items GROUP BY sku HAVING COUNT(*) > 1) t
   UNION ALL
   SELECT 'Users without email', COUNT(*)
   FROM users WHERE email IS NULL OR email = '';
   EOF
   
   echo "Import completed successfully!"
   echo
   echo "Next steps:"
   echo "1. Test the application with imported data"
   echo "2. Create a backup of the migrated database"
   echo "3. Configure user passwords for production use"
   echo "4. Remove migration user if no longer needed"

Migration Verification Tools
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Data Integrity Checker:**

.. code-block:: python

   #!/usr/bin/env python3
   # File: verify_migration.py
   # Purpose: Verify data integrity after migration
   
   import psycopg2
   import sys
   import os
   from typing import List, Dict, Any
   
   class MigrationVerifier:
       def __init__(self, database_url: str):
           self.conn = psycopg2.connect(database_url)
           self.issues = []
   
       def verify_all(self) -> bool:
           """Run all verification checks"""
           print("Starting migration verification...")
           
           checks = [
               self.check_referential_integrity,
               self.check_required_fields,
               self.check_data_quality,
               self.check_duplicates,
               self.check_stock_consistency
           ]
           
           for check in checks:
               try:
                   check()
               except Exception as e:
                   self.issues.append(f"Check failed: {check.__name__}: {e}")
           
           return len(self.issues) == 0
   
       def check_referential_integrity(self):
           """Check foreign key constraints"""
           print("Checking referential integrity...")
           
           cursor = self.conn.cursor()
           
           # Items without categories
           cursor.execute("""
               SELECT COUNT(*) FROM items 
               WHERE category_id NOT IN (SELECT id FROM categories)
           """)
           orphaned_items = cursor.fetchone()[0]
           if orphaned_items > 0:
               self.issues.append(f"Found {orphaned_items} items with invalid category references")
           
           # Stock movements without valid items
           cursor.execute("""
               SELECT COUNT(*) FROM stock_movements 
               WHERE item_id NOT IN (SELECT id FROM items)
           """)
           orphaned_movements = cursor.fetchone()[0]
           if orphaned_movements > 0:
               self.issues.append(f"Found {orphaned_movements} stock movements with invalid item references")
           
           cursor.close()
   
       def check_required_fields(self):
           """Check for missing required data"""
           print("Checking required fields...")
           
           cursor = self.conn.cursor()
           
           # Items missing required fields
           cursor.execute("""
               SELECT COUNT(*) FROM items 
               WHERE name IS NULL OR name = '' OR sku IS NULL OR sku = ''
           """)
           invalid_items = cursor.fetchone()[0]
           if invalid_items > 0:
               self.issues.append(f"Found {invalid_items} items missing required fields")
           
           # Users missing email
           cursor.execute("""
               SELECT COUNT(*) FROM users 
               WHERE email IS NULL OR email = ''
           """)
           invalid_users = cursor.fetchone()[0]
           if invalid_users > 0:
               self.issues.append(f"Found {invalid_users} users missing email addresses")
           
           cursor.close()
   
       def check_data_quality(self):
           """Check data quality issues"""
           print("Checking data quality...")
           
           cursor = self.conn.cursor()
           
           # Items with negative stock
           cursor.execute("""
               SELECT COUNT(*) FROM items 
               WHERE current_stock < 0
           """)
           negative_stock = cursor.fetchone()[0]
           if negative_stock > 0:
               self.issues.append(f"Found {negative_stock} items with negative stock")
           
           # Items with invalid prices
           cursor.execute("""
               SELECT COUNT(*) FROM items 
               WHERE price IS NULL OR price < 0
           """)
           invalid_prices = cursor.fetchone()[0]
           if invalid_prices > 0:
               self.issues.append(f"Found {invalid_prices} items with invalid prices")
           
           cursor.close()
   
       def check_duplicates(self):
           """Check for duplicate data"""
           print("Checking for duplicates...")
           
           cursor = self.conn.cursor()
           
           # Duplicate SKUs
           cursor.execute("""
               SELECT COUNT(*) FROM (
                   SELECT sku FROM items 
                   GROUP BY sku 
                   HAVING COUNT(*) > 1
               ) t
           """)
           duplicate_skus = cursor.fetchone()[0]
           if duplicate_skus > 0:
               self.issues.append(f"Found {duplicate_skus} duplicate SKUs")
           
           # Duplicate user emails
           cursor.execute("""
               SELECT COUNT(*) FROM (
                   SELECT email FROM users 
                   GROUP BY email 
                   HAVING COUNT(*) > 1
               ) t
           """)
           duplicate_emails = cursor.fetchone()[0]
           if duplicate_emails > 0:
               self.issues.append(f"Found {duplicate_emails} duplicate user emails")
           
           cursor.close()
   
       def check_stock_consistency(self):
           """Check stock movement consistency"""
           print("Checking stock consistency...")
           
           cursor = self.conn.cursor()
           
           # Check if calculated stock matches current stock
           cursor.execute("""
               WITH calculated_stock AS (
                   SELECT 
                       i.id,
                       i.name,
                       i.current_stock,
                       COALESCE(SUM(
                           CASE 
                               WHEN sm.type = 'in' THEN sm.quantity
                               WHEN sm.type = 'out' THEN -sm.quantity
                               ELSE 0
                           END
                       ), 0) as calculated_stock
                   FROM items i
                   LEFT JOIN stock_movements sm ON i.id = sm.item_id
                   GROUP BY i.id, i.name, i.current_stock
               )
               SELECT COUNT(*) 
               FROM calculated_stock 
               WHERE current_stock != calculated_stock
           """)
           inconsistent_stock = cursor.fetchone()[0]
           if inconsistent_stock > 0:
               self.issues.append(f"Found {inconsistent_stock} items with inconsistent stock calculations")
           
           cursor.close()
   
       def generate_report(self) -> str:
           """Generate verification report"""
           if not self.issues:
               return "✅ Migration verification passed - no issues found"
           
           report = "❌ Migration verification found issues:\n\n"
           for i, issue in enumerate(self.issues, 1):
               report += f"{i}. {issue}\n"
           
           return report
   
       def get_summary_stats(self) -> Dict[str, int]:
           """Get summary statistics"""
           cursor = self.conn.cursor()
           
           stats = {}
           
           tables = ['categories', 'items', 'users', 'stock_movements', 'sales']
           for table in tables:
               cursor.execute(f"SELECT COUNT(*) FROM {table}")
               stats[table] = cursor.fetchone()[0]
           
           cursor.close()
           return stats
   
       def close(self):
           """Close database connection"""
           self.conn.close()
   
   def main():
       database_url = os.environ.get('DATABASE_URL')
       if not database_url:
           print("Error: DATABASE_URL environment variable not set")
           sys.exit(1)
       
       verifier = MigrationVerifier(database_url)
       
       try:
           # Get summary statistics
           stats = verifier.get_summary_stats()
           print("Migration Summary:")
           for table, count in stats.items():
               print(f"  {table}: {count:,} records")
           print()
           
           # Run verification
           success = verifier.verify_all()
           
           # Generate report
           report = verifier.generate_report()
           print(report)
           
           # Exit with appropriate code
           sys.exit(0 if success else 1)
           
       finally:
           verifier.close()
   
   if __name__ == '__main__':
       main()

**Usage:**

.. code-block:: bash

   # Run verification after migration
   export DATABASE_URL="postgresql://user:pass@localhost:5432/university_inventory"
   python verify_migration.py

Complete Migration Pipeline
---------------------------

**Full Migration Script:**

.. code-block:: bash

   #!/bin/bash
   # File: complete_migration.sh
   # Purpose: Complete end-to-end migration pipeline
   
   set -e
   
   # Configuration
   LEGACY_TYPE=${1:-mysql}
   LEGACY_HOST=${2:-legacy-db.company.com}
   LEGACY_USER=${3:-inventory_reader}
   LEGACY_PASS=${4:-password}
   LEGACY_DB=${5:-legacy_inventory}
   TARGET_DB_URL=${DATABASE_URL:-postgresql://user:pass@localhost:5432/university_inventory}
   
   WORK_DIR="./migration_$(date +%Y%m%d_%H%M%S)"
   
   echo "=== LUStores Complete Migration Pipeline ==="
   echo "Work Directory: $WORK_DIR"
   echo "Legacy System: $LEGACY_TYPE://$LEGACY_HOST/$LEGACY_DB"
   echo "Target System: $TARGET_DB_URL"
   echo
   
   # Create work directory
   mkdir -p "$WORK_DIR"
   cd "$WORK_DIR"
   
   # Step 1: Extract data from legacy system
   echo "Step 1: Extracting data from legacy system..."
   python ../extract_legacy_data.py \
       --type "$LEGACY_TYPE" \
       --host "$LEGACY_HOST" \
       --user "$LEGACY_USER" \
       --password "$LEGACY_PASS" \
       --database "$LEGACY_DB" \
       --output-dir "."
   
   # Step 2: Transform data
   echo "Step 2: Transforming data..."
   python ../transform_legacy_data.py
   
   # Step 3: Backup target database
   echo "Step 3: Creating backup of target database..."
   pg_dump "$TARGET_DB_URL" > "pre_migration_backup.sql"
   
   # Step 4: Import transformed data
   echo "Step 4: Importing data to LUStores..."
   ../import_to_lustores.sh "."
   
   # Step 5: Verify migration
   echo "Step 5: Verifying migration..."
   DATABASE_URL="$TARGET_DB_URL" python ../verify_migration.py
   
   # Step 6: Create post-migration backup
   echo "Step 6: Creating post-migration backup..."
   pg_dump "$TARGET_DB_URL" > "post_migration_backup.sql"
   
   echo
   echo "=== Migration Completed Successfully ==="
   echo "Work directory: $WORK_DIR"
   echo "Pre-migration backup: $WORK_DIR/pre_migration_backup.sql"
   echo "Post-migration backup: $WORK_DIR/post_migration_backup.sql"
   echo
   echo "Next steps:"
   echo "1. Test the application thoroughly"
   echo "2. Train users on the new system"
   echo "3. Decommission legacy system"
   echo "4. Set up regular backups"

This comprehensive set of migration tools provides everything needed to migrate from virtually any SQL-based legacy inventory system to LUStores. The scripts are designed to be robust, handle common issues, and provide detailed logging and verification.
