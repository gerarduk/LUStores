Data Import and Export Guide
============================

This guide covers various methods for importing and exporting data in the LUStores system, including CSV bulk imports, database imports, and system-to-system migrations.

Overview
--------

LUStores supports multiple data import and export methods:

- **CSV Bulk Import**: For adding many items at once via web interface
- **Direct Database Import**: For large-scale migrations using SQL
- **API-Based Import**: For system integrations
- **Manual Data Entry**: For small datasets
- **Backup/Restore**: For complete system migration

CSV Bulk Import
---------------

Preparing CSV Files
~~~~~~~~~~~~~~~~~~~

**Required CSV Format for Items:**

.. code-block:: csv

   name,sku,description,categoryName,price,currentStock,minimumStock
   "Dell OptiPlex 3080","DELL-OPT-3080-001","Desktop computer for office use","IT Equipment","899.99","15","5"
   "Office Chair - Ergonomic","CHAIR-ERG-001","Adjustable office chair with lumbar support","Office Supplies","299.99","8","3"
   "Laboratory Scale","SCALE-LAB-001","Precision digital scale for lab use","Laboratory Equipment","1299.99","2","1"

**CSV Field Descriptions:**

.. code-block:: text

   Field Name       Required  Type     Description
   ===============================================
   name             Yes       String   Item display name (max 200 chars)
   sku              Yes       String   Unique stock keeping unit (max 100 chars)
   description      No        String   Detailed item description
   categoryName     Yes       String   Must match existing category name exactly
   price            Yes       Decimal  Unit price (no currency symbols)
   currentStock     Yes       Integer  Current quantity in stock
   minimumStock     No        Integer  Reorder threshold (default: 0)

**Advanced CSV Format (with VAT and user info):**

.. code-block:: csv

   name,sku,description,categoryName,price,vatRate,vatIncluded,currentStock,minimumStock,isActive
   "Advanced Projector","PROJ-ADV-001","4K projection system","Audio/Visual","2499.99","0.20","true","3","1","true"
   "Basic Calculator","CALC-001","Standard desktop calculator","Office Supplies","29.99","0.20","true","25","10","true"

CSV Import Process
~~~~~~~~~~~~~~~~~~

**Step-by-Step Web Interface Import:**

1. **Prepare Categories First:**
   
   .. code-block:: text
   
      Navigate to Categories → Add Category
      Create all categories that will be referenced in your CSV

2. **Upload CSV File:**
   
   .. code-block:: text
   
      Navigate to Inventory → Bulk Import
      Select your prepared CSV file
      Choose import options

3. **Validate Import:**
   
   .. code-block:: text
   
      Review the preview of data to be imported
      Check for any validation errors
      Correct issues and re-upload if necessary

4. **Execute Import:**
   
   .. code-block:: text
   
      Click "Import Items"
      Monitor progress bar
      Review import results and error log

**Common CSV Validation Errors:**

.. code-block:: text

   Error: "Missing required fields"
   Solution: Ensure all required columns are present and have values
   
   Error: "Category 'XYZ' not found"
   Solution: Create the category first or use exact category names
   
   Error: "Duplicate SKU 'ABC123'"
   Solution: Ensure all SKUs are unique across the system
   
   Error: "Invalid price format"
   Solution: Use decimal numbers without currency symbols

Database Direct Import
----------------------

Large Scale Data Import
~~~~~~~~~~~~~~~~~~~~~~~

For importing thousands of items, direct database import is more efficient:

**1. Prepare Staging Tables:**

.. code-block:: sql

   -- Create temporary staging tables
   CREATE TEMP TABLE staging_categories (
       legacy_id INTEGER,
       name VARCHAR(100),
       description TEXT,
       icon VARCHAR(50) DEFAULT 'fas fa-box',
       color VARCHAR(50) DEFAULT 'blue'
   );
   
   CREATE TEMP TABLE staging_items (
       legacy_id INTEGER,
       name VARCHAR(200),
       sku VARCHAR(100),
       description TEXT,
       category_name VARCHAR(100),
       price DECIMAL(10,2),
       vat_rate DECIMAL(5,4) DEFAULT 0.2000,
       vat_included BOOLEAN DEFAULT true,
       current_stock INTEGER DEFAULT 0,
       minimum_stock INTEGER DEFAULT 0,
       is_active BOOLEAN DEFAULT true
   );

**2. Load Data into Staging:**

.. code-block:: sql

   -- Load from CSV files
   \COPY staging_categories(legacy_id,name,description) FROM 'categories.csv' CSV HEADER;
   \COPY staging_items(legacy_id,name,sku,description,category_name,price,current_stock,minimum_stock) FROM 'items.csv' CSV HEADER;

**3. Transform and Import:**

.. code-block:: sql

   -- Import categories first
   INSERT INTO categories (name, description, icon, color, created_at, updated_at)
   SELECT DISTINCT 
       name,
       COALESCE(description, ''),
       COALESCE(icon, 'fas fa-box'),
       COALESCE(color, 'blue'),
       NOW(),
       NOW()
   FROM staging_categories
   WHERE name NOT IN (SELECT name FROM categories);
   
   -- Import items with category mapping
   INSERT INTO items (
       name, sku, description, category_id, price, vat_rate, vat_included,
       current_stock, minimum_stock, is_active, created_by, updated_by,
       created_at, updated_at
   )
   SELECT 
       si.name,
       si.sku,
       COALESCE(si.description, ''),
       c.id,
       si.price,
       COALESCE(si.vat_rate, 0.2000),
       COALESCE(si.vat_included, true),
       COALESCE(si.current_stock, 0),
       COALESCE(si.minimum_stock, 0),
       COALESCE(si.is_active, true),
       'bulk_import_admin',
       'bulk_import_admin',
       NOW(),
       NOW()
   FROM staging_items si
   JOIN categories c ON c.name = si.category_name
   WHERE si.sku NOT IN (SELECT sku FROM items);

User Data Import
~~~~~~~~~~~~~~~~

**User CSV Format:**

.. code-block:: csv

   id,email,firstName,lastName,role,isActive
   "jdoe","john.doe@university.edu","John","Doe","user","true"
   "msmith","mary.smith@university.edu","Mary","Smith","manager","true"
   "aadmin","admin@university.edu","Admin","User","admin","true"

**User Import SQL:**

.. code-block:: sql

   -- Import users with temporary passwords
   INSERT INTO users (
       id, email, password_hash, first_name, last_name, role, 
       is_active, must_change_password, created_at, updated_at
   )
   SELECT 
       id,
       email,
       '$2b$10$defaulthash...',  -- Default hash requiring password change
       first_name,
       last_name,
       COALESCE(role, 'user'),
       COALESCE(is_active, true),
       true,  -- Force password change on first login
       NOW(),
       NOW()
   FROM staging_users
   WHERE email NOT IN (SELECT email FROM users);

API-Based Import
----------------

Programmatic Data Import
~~~~~~~~~~~~~~~~~~~~~~~~

**Using REST API for imports:**

.. code-block:: bash

   # Authentication
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@university.edu","password":"admin123"}' \
     -c cookies.txt

   # Create category
   curl -X POST http://localhost:3000/api/categories \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "name": "Imported Equipment",
       "description": "Equipment imported via API",
       "icon": "fas fa-laptop",
       "color": "green"
     }'

   # Import item
   curl -X POST http://localhost:3000/api/items \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "name": "Laptop Dell XPS 13",
       "sku": "DELL-XPS13-001",
       "description": "Developer laptop",
       "categoryId": 1,
       "price": "1299.99",
       "currentStock": 5,
       "minimumStock": 2
     }'

**Python Import Script Example:**

.. code-block:: python

   import requests
   import json
   import csv
   
   # Configuration
   BASE_URL = "http://localhost:3000/api"
   session = requests.Session()
   
   # Login
   login_response = session.post(f"{BASE_URL}/auth/login", json={
       "email": "admin@university.edu",
       "password": "admin123"
   })
   
   if login_response.status_code != 200:
       print("Login failed")
       exit(1)
   
   # Import categories
   with open('categories.csv', 'r') as file:
       reader = csv.DictReader(file)
       for row in reader:
           category_data = {
               "name": row['name'],
               "description": row['description'],
               "icon": row.get('icon', 'fas fa-box'),
               "color": row.get('color', 'blue')
           }
           
           response = session.post(f"{BASE_URL}/categories", json=category_data)
           if response.status_code == 201:
               print(f"Created category: {row['name']}")
           else:
               print(f"Failed to create category: {row['name']} - {response.text}")
   
   # Get categories for mapping
   categories_response = session.get(f"{BASE_URL}/categories")
   categories = {cat['name']: cat['id'] for cat in categories_response.json()}
   
   # Import items
   with open('items.csv', 'r') as file:
       reader = csv.DictReader(file)
       for row in reader:
           if row['categoryName'] not in categories:
               print(f"Category not found: {row['categoryName']}")
               continue
               
           item_data = {
               "name": row['name'],
               "sku": row['sku'],
               "description": row['description'],
               "categoryId": categories[row['categoryName']],
               "price": row['price'],
               "currentStock": int(row['currentStock']),
               "minimumStock": int(row.get('minimumStock', 0))
           }
           
           response = session.post(f"{BASE_URL}/items", json=item_data)
           if response.status_code == 201:
               print(f"Created item: {row['name']}")
           else:
               print(f"Failed to create item: {row['name']} - {response.text}")

Data Export
-----------

CSV Export
~~~~~~~~~~

**Export Categories:**

.. code-block:: sql

   \COPY (
       SELECT name, description, icon, color, created_at
       FROM categories
       ORDER BY name
   ) TO 'categories_export.csv' CSV HEADER;

**Export Items:**

.. code-block:: sql

   \COPY (
       SELECT 
           i.name,
           i.sku,
           i.description,
           c.name as category_name,
           i.price,
           i.vat_rate,
           i.vat_included,
           i.current_stock,
           i.minimum_stock,
           i.is_active,
           i.created_at,
           i.updated_at
       FROM items i
       JOIN categories c ON i.category_id = c.id
       ORDER BY i.name
   ) TO 'items_export.csv' CSV HEADER;

**Export Stock Movements:**

.. code-block:: sql

   \COPY (
       SELECT 
           i.name as item_name,
           i.sku,
           sm.type,
           sm.quantity,
           sm.previous_stock,
           sm.new_stock,
           sm.reason,
           sm.performed_by,
           sm.created_at
       FROM stock_movements sm
       JOIN items i ON sm.item_id = i.id
       WHERE sm.created_at >= NOW() - INTERVAL '12 months'
       ORDER BY sm.created_at DESC
   ) TO 'stock_movements_export.csv' CSV HEADER;

Full Database Export
~~~~~~~~~~~~~~~~~~~~

**Complete Database Backup:**

.. code-block:: bash

   # PostgreSQL full backup
   pg_dump $DATABASE_URL > full_database_backup.sql
   
   # PostgreSQL data-only backup
   pg_dump --data-only $DATABASE_URL > data_only_backup.sql
   
   # PostgreSQL schema-only backup
   pg_dump --schema-only $DATABASE_URL > schema_only_backup.sql

**Selective Table Export:**

.. code-block:: bash

   # Export specific tables
   pg_dump $DATABASE_URL -t categories -t items -t users > core_tables_backup.sql
   
   # Export with custom format (compressed)
   pg_dump -Fc $DATABASE_URL > compressed_backup.backup

System-to-System Migration
--------------------------

Complete System Migration
~~~~~~~~~~~~~~~~~~~~~~~~~

**Migration Checklist:**

.. code-block:: text

   Pre-Migration:
   □ Source system database backup
   □ Target system installation complete
   □ Network connectivity verified
   □ Migration user accounts created
   □ Downtime window scheduled
   
   Migration Steps:
   □ Extract data from source system
   □ Transform data to target format
   □ Create categories in target system
   □ Import users with temporary passwords
   □ Import items with stock levels
   □ Import historical stock movements
   □ Validate data integrity
   □ Update stock levels if needed
   
   Post-Migration:
   □ User acceptance testing
   □ Performance verification
   □ Backup of migrated system
   □ User training
   □ Legacy system decommission

**Migration Verification Script:**

.. code-block:: sql

   -- Data integrity verification
   SELECT 'Categories' as table_name, COUNT(*) as record_count FROM categories
   UNION ALL
   SELECT 'Items', COUNT(*) FROM items
   UNION ALL
   SELECT 'Users', COUNT(*) FROM users
   UNION ALL
   SELECT 'Stock Movements', COUNT(*) FROM stock_movements;
   
   -- Check for data quality issues
   SELECT 'Items without categories' as issue, COUNT(*)
   FROM items WHERE category_id IS NULL
   UNION ALL
   SELECT 'Duplicate SKUs', COUNT(*)
   FROM (SELECT sku FROM items GROUP BY sku HAVING COUNT(*) > 1) t
   UNION ALL
   SELECT 'Items with negative stock', COUNT(*)
   FROM items WHERE current_stock < 0
   UNION ALL
   SELECT 'Items with no price', COUNT(*)
   FROM items WHERE price IS NULL OR price <= 0;

Real-Time Sync Setup
~~~~~~~~~~~~~~~~~~~~

**For ongoing synchronization between systems:**

.. code-block:: python

   import schedule
   import time
   import requests
   import logging
   
   def sync_inventory():
       """Sync inventory levels between systems"""
       try:
           # Get current stock from source system
           source_data = get_source_inventory()
           
           # Update target system
           for item in source_data:
               update_target_item(item)
               
           logging.info(f"Synced {len(source_data)} items")
           
       except Exception as e:
           logging.error(f"Sync failed: {e}")
   
   def get_source_inventory():
       """Extract current inventory from source system"""
       # Implementation specific to source system
       pass
   
   def update_target_item(item):
       """Update item in LUStores system"""
       response = requests.put(
           f"{LUSTORES_URL}/api/items/{item['sku']}/stock",
           json={"quantity": item['current_stock']},
           headers={"Authorization": f"Bearer {api_token}"}
       )
       return response.status_code == 200
   
   # Schedule sync every hour
   schedule.every().hour.do(sync_inventory)
   
   while True:
       schedule.run_pending()
       time.sleep(60)

Troubleshooting
---------------

Common Import Issues
~~~~~~~~~~~~~~~~~~~~

**Performance Issues:**

.. code-block:: bash

   # For large imports, disable constraints temporarily
   psql $DATABASE_URL -c "SET session_replication_role = replica;"
   
   # Import data
   psql $DATABASE_URL -f large_import.sql
   
   # Re-enable constraints
   psql $DATABASE_URL -c "SET session_replication_role = DEFAULT;"

**Memory Issues:**

.. code-block:: bash

   # Process large files in chunks
   split -l 1000 large_file.csv chunk_
   
   # Import each chunk separately
   for file in chunk_*; do
       psql $DATABASE_URL -c "\COPY items(...) FROM '$file' CSV HEADER;"
   done

**Character Encoding Issues:**

.. code-block:: bash

   # Convert encoding before import
   iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
   
   # Or specify encoding in PostgreSQL
   \COPY items(...) FROM 'file.csv' CSV HEADER ENCODING 'WIN1252';

Best Practices
--------------

Import Guidelines
~~~~~~~~~~~~~~~~~

.. code-block:: text

   Before Import:
   - Always backup the target database
   - Test imports on staging environment first
   - Validate source data for completeness
   - Check for duplicate keys and constraints
   - Plan for rollback procedures
   
   During Import:
   - Monitor system resources
   - Import in logical order (categories → users → items → movements)
   - Use transactions for data consistency
   - Log all operations for troubleshooting
   - Validate each step before proceeding
   
   After Import:
   - Verify data integrity with queries
   - Test application functionality
   - Update statistics and indexes
   - Create post-import backup
   - Document any issues or modifications

**Data Quality Checklist:**

.. code-block:: sql

   -- Run these checks after any major import
   
   -- Check referential integrity
   SELECT COUNT(*) as orphaned_items
   FROM items i
   LEFT JOIN categories c ON i.category_id = c.id
   WHERE c.id IS NULL;
   
   -- Check for required fields
   SELECT COUNT(*) as items_missing_names
   FROM items
   WHERE name IS NULL OR TRIM(name) = '';
   
   -- Check for valid stock levels
   SELECT COUNT(*) as negative_stock_items
   FROM items
   WHERE current_stock < 0;
   
   -- Check for duplicate SKUs
   SELECT sku, COUNT(*) as duplicate_count
   FROM items
   GROUP BY sku
   HAVING COUNT(*) > 1;

This comprehensive import/export guide provides multiple approaches for data migration based on your specific needs and technical requirements.
