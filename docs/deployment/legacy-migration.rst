Legacy System Migration Guide
=============================

This comprehensive guide provides step-by-step instructions for migrating from an existing SQL-based inventory system to the new LUStores University Inventory Management System.

Overview
--------

The LUStores system replaces legacy inventory systems with a modern, web-based solution. This migration guide covers:

- Pre-migration assessment and planning
- Data extraction from legacy systems
- Schema mapping and transformation
- Data import procedures
- Post-migration validation and testing
- Rollback procedures

Migration Planning
------------------

Pre-Migration Assessment
~~~~~~~~~~~~~~~~~~~~~~~~

Before starting the migration, assess your legacy system:

**System Information Gathering:**

.. code-block:: text

   Database Platform: _______________
   Database Version: ________________
   Schema Name/Database: ____________
   Primary Tables of Interest:
   - Items/Inventory: _______________
   - Categories: ____________________
   - Users: _________________________
   - Stock Movements: _______________
   - Sales/Transactions: ____________

**Data Volume Assessment:**

.. code-block:: sql

   -- Run these queries in your legacy system to assess data volume
   SELECT COUNT(*) as item_count FROM [your_items_table];
   SELECT COUNT(*) as category_count FROM [your_categories_table];
   SELECT COUNT(*) as user_count FROM [your_users_table];
   SELECT COUNT(*) as movement_count FROM [your_movements_table];

**Critical Data Identification:**

1. **Essential Data (Must migrate):**
   - Current inventory items and stock levels
   - Active categories and their structure
   - User accounts and role assignments
   - Critical stock movement history (last 12 months)

2. **Important Data (Should migrate):**
   - Complete stock movement history
   - Sales transaction records
   - Supplier/vendor information
   - Asset tags and serial numbers

3. **Optional Data (Nice to migrate):**
   - Historical reports and analytics
   - Archived or deleted items
   - System logs and audit trails

Migration Timeline
~~~~~~~~~~~~~~~~~~

**Recommended Timeline (4-6 weeks):**

.. code-block:: text

   Week 1: Assessment and Planning
   - Legacy system analysis
   - Schema mapping
   - Test environment setup
   
   Week 2-3: Data Extraction and Transformation
   - Export legacy data
   - Transform to LUStores format
   - Test imports on staging
   
   Week 4: Production Migration
   - Final data export
   - Production import
   - User acceptance testing
   
   Week 5-6: Post-Migration
   - User training
   - System optimization
   - Documentation updates

Legacy System Analysis
----------------------

Common Legacy Database Schemas
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Typical Legacy Inventory Tables:**

.. code-block:: sql

   -- Common legacy table structures
   CREATE TABLE inventory_items (
       item_id INT PRIMARY KEY,
       item_name VARCHAR(255),
       item_code VARCHAR(50),
       description TEXT,
       category_id INT,
       unit_price DECIMAL(10,2),
       quantity_on_hand INT,
       reorder_level INT,
       created_date DATETIME,
       last_updated DATETIME
   );
   
   CREATE TABLE categories (
       category_id INT PRIMARY KEY,
       category_name VARCHAR(100),
       description TEXT,
       parent_category_id INT
   );
   
   CREATE TABLE users (
       user_id INT PRIMARY KEY,
       username VARCHAR(50),
       email VARCHAR(255),
       full_name VARCHAR(255),
       user_role VARCHAR(20),
       is_active BOOLEAN,
       created_date DATETIME
   );

**Schema Discovery Queries:**

Use these queries to understand your legacy database structure:

.. code-block:: sql

   -- Discover all tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'your_database_name';
   
   -- Discover table columns
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns 
   WHERE table_name = 'your_table_name';
   
   -- Discover relationships
   SELECT constraint_name, table_name, column_name, 
          referenced_table_name, referenced_column_name
   FROM information_schema.key_column_usage 
   WHERE referenced_table_name IS NOT NULL;

Data Extraction
---------------

SQL Export Scripts
~~~~~~~~~~~~~~~~~~

**Complete Data Export:**

.. code-block:: sql

   -- Categories Export
   SELECT 
       category_id as legacy_id,
       category_name as name,
       description,
       COALESCE(parent_category_id, 0) as parent_id,
       'fas fa-box' as icon,
       'blue' as color,
       created_date
   FROM categories
   ORDER BY category_id;
   
   -- Items Export
   SELECT 
       item_id as legacy_id,
       item_name as name,
       item_code as sku,
       description,
       category_id as legacy_category_id,
       unit_price as price,
       quantity_on_hand as current_stock,
       reorder_level as minimum_stock,
       CASE WHEN is_active = 1 THEN true ELSE false END as is_active,
       created_date,
       last_updated
   FROM inventory_items
   ORDER BY item_id;
   
   -- Users Export
   SELECT 
       user_id as legacy_id,
       username,
       email,
       full_name,
       CASE 
           WHEN user_role = 'admin' THEN 'admin'
           WHEN user_role = 'manager' THEN 'manager'
           ELSE 'user'
       END as role,
       is_active,
       created_date
   FROM users
   ORDER BY user_id;

**Stock Movements Export:**

.. code-block:: sql

   -- Stock movements (if available)
   SELECT 
       movement_id as legacy_id,
       item_id as legacy_item_id,
       movement_type as type,
       quantity,
       previous_quantity as previous_stock,
       new_quantity as new_stock,
       movement_reason as reason,
       performed_by_user_id as legacy_user_id,
       movement_date as created_at
   FROM stock_movements
   WHERE movement_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
   ORDER BY movement_date;

**CSV Export Commands:**

.. code-block:: bash

   # MySQL/MariaDB export
   mysql -h hostname -u username -p database_name \
     -e "SELECT ... FROM categories" \
     > categories_export.csv
   
   # PostgreSQL export
   psql -h hostname -U username -d database_name \
     -c "\COPY (SELECT ... FROM categories) TO 'categories_export.csv' CSV HEADER"
   
   # SQL Server export
   sqlcmd -S servername -d database_name \
     -Q "SELECT ... FROM categories" \
     -o "categories_export.csv" -h-1 -s"," -w 999

Schema Mapping
--------------

LUStores Target Schema
~~~~~~~~~~~~~~~~~~~~~~

**Target table structures in LUStores:**

.. code-block:: sql

   -- LUStores categories table
   CREATE TABLE categories (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100) NOT NULL UNIQUE,
       description TEXT,
       icon VARCHAR(50) NOT NULL DEFAULT 'fas fa-box',
       color VARCHAR(50) NOT NULL DEFAULT 'blue',
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );
   
   -- LUStores items table
   CREATE TABLE items (
       id SERIAL PRIMARY KEY,
       name VARCHAR(200) NOT NULL,
       sku VARCHAR(100) NOT NULL UNIQUE,
       description TEXT,
       category_id INTEGER NOT NULL REFERENCES categories(id),
       price DECIMAL(10,2) NOT NULL,
       vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
       vat_included BOOLEAN NOT NULL DEFAULT true,
       current_stock INTEGER NOT NULL DEFAULT 0,
       minimum_stock INTEGER NOT NULL DEFAULT 0,
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_by VARCHAR NOT NULL REFERENCES users(id),
       updated_by VARCHAR REFERENCES users(id),
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );
   
   -- LUStores users table
   CREATE TABLE users (
       id VARCHAR PRIMARY KEY,
       email VARCHAR NOT NULL UNIQUE,
       password_hash VARCHAR,
       first_name VARCHAR,
       last_name VARCHAR,
       role VARCHAR NOT NULL DEFAULT 'user',
       is_active BOOLEAN NOT NULL DEFAULT true,
       must_change_password BOOLEAN NOT NULL DEFAULT false,
       last_login TIMESTAMP,
       profile_image_url VARCHAR,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );

Field Mapping Guide
~~~~~~~~~~~~~~~~~~~

**Categories Mapping:**

.. code-block:: text

   Legacy Field          → LUStores Field      Notes
   ===============================================
   category_id           → (reference only)    Keep for item mapping
   category_name         → name               Direct mapping
   description           → description        Direct mapping
   parent_category_id    → (not supported)    Flatten hierarchy
   created_date          → created_at         Convert to timestamp
   (none)                → icon               Default: 'fas fa-box'
   (none)                → color              Default: 'blue'

**Items Mapping:**

.. code-block:: text

   Legacy Field          → LUStores Field      Notes
   ===============================================
   item_id               → (reference only)    Keep for movement mapping
   item_name             → name               Direct mapping
   item_code/sku         → sku                Must be unique
   description           → description        Direct mapping
   category_id           → category_id        Map via categories
   unit_price            → price              Direct mapping
   quantity_on_hand      → current_stock      Direct mapping
   reorder_level         → minimum_stock      Direct mapping
   is_active             → is_active          Convert boolean
   created_date          → created_at         Convert timestamp
   (none)                → vat_rate           Default: 0.2000 (20%)
   (none)                → vat_included       Default: true
   (none)                → created_by         Set to migration user
   (none)                → updated_by         Set to migration user

**Users Mapping:**

.. code-block:: text

   Legacy Field          → LUStores Field      Notes
   ===============================================
   user_id               → (reference only)    Keep for movements
   username              → id                 Use as primary key
   email                 → email              Direct mapping
   full_name             → first_name +       Split name
                           last_name
   user_role             → role               Map values: admin/manager/user
   is_active             → is_active          Direct mapping
   (none)                → password_hash      Generate temp password
   (none)                → must_change_password  Set to true

Data Transformation
-------------------

SQL Transformation Scripts
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Categories transformation:**

.. code-block:: sql

   -- Transform categories data
   WITH transformed_categories AS (
     SELECT 
       ROW_NUMBER() OVER (ORDER BY category_id) as new_id,
       category_id as legacy_id,
       category_name as name,
       COALESCE(description, '') as description,
       'fas fa-box' as icon,
       CASE 
         WHEN category_id % 6 = 0 THEN 'blue'
         WHEN category_id % 6 = 1 THEN 'green'
         WHEN category_id % 6 = 2 THEN 'purple'
         WHEN category_id % 6 = 3 THEN 'orange'
         WHEN category_id % 6 = 4 THEN 'red'
         ELSE 'gray'
       END as color,
       NOW() as created_at,
       NOW() as updated_at
     FROM legacy_categories
     WHERE category_name IS NOT NULL
   )
   SELECT * FROM transformed_categories;

**Items transformation:**

.. code-block:: sql

   -- Transform items data
   WITH transformed_items AS (
     SELECT 
       item_name as name,
       COALESCE(item_code, CONCAT('ITEM-', LPAD(item_id, 6, '0'))) as sku,
       COALESCE(description, '') as description,
       cat_map.new_category_id as category_id,
       COALESCE(unit_price, 0.00) as price,
       0.2000 as vat_rate,
       true as vat_included,
       COALESCE(quantity_on_hand, 0) as current_stock,
       COALESCE(reorder_level, 0) as minimum_stock,
       COALESCE(is_active, true) as is_active,
       'migration_admin' as created_by,
       'migration_admin' as updated_by,
       COALESCE(created_date, NOW()) as created_at,
       COALESCE(last_updated, NOW()) as updated_at
     FROM legacy_items li
     JOIN category_mapping cat_map ON li.category_id = cat_map.legacy_category_id
     WHERE item_name IS NOT NULL
       AND item_name != ''
   )
   SELECT * FROM transformed_items;

**Users transformation:**

.. code-block:: sql

   -- Transform users data
   WITH transformed_users AS (
     SELECT 
       COALESCE(username, CONCAT('user_', user_id)) as id,
       email,
       '$2b$10$defaulthash...' as password_hash,
       TRIM(SUBSTRING_INDEX(full_name, ' ', 1)) as first_name,
       TRIM(SUBSTRING(full_name, LOCATE(' ', full_name) + 1)) as last_name,
       CASE 
         WHEN user_role IN ('admin', 'administrator') THEN 'admin'
         WHEN user_role IN ('manager', 'supervisor') THEN 'manager'
         ELSE 'user'
       END as role,
       COALESCE(is_active, true) as is_active,
       true as must_change_password,
       null as last_login,
       null as profile_image_url,
       COALESCE(created_date, NOW()) as created_at,
       NOW() as updated_at
     FROM legacy_users
     WHERE email IS NOT NULL
       AND email != ''
   )
   SELECT * FROM transformed_users;

Migration Scripts
-----------------

Pre-Migration Setup
~~~~~~~~~~~~~~~~~~~

**1. Create Migration User:**

.. code-block:: sql

   -- Create temporary migration admin user
   INSERT INTO users (
     id, email, password_hash, first_name, last_name, 
     role, is_active, must_change_password, created_at, updated_at
   ) VALUES (
     'migration_admin',
     'migration@university.edu',
     '$2b$10$8K1p/a0dqailSurF.ONj2uyaLiI6Hqh4LAks.5wvW.3BlxtZjO96O',
     'Migration',
     'Administrator',
     'admin',
     true,
     false,
     NOW(),
     NOW()
   );

**2. Disable Constraints (Temporarily):**

.. code-block:: sql

   -- Disable foreign key checks for migration
   SET foreign_key_checks = 0;  -- MySQL
   -- OR
   SET session_replication_role = replica;  -- PostgreSQL

Migration Import Scripts
~~~~~~~~~~~~~~~~~~~~~~~~

**Categories Import:**

.. code-block:: sql

   -- Step 1: Import categories
   INSERT INTO categories (name, description, icon, color, created_at, updated_at)
   SELECT DISTINCT
     category_name,
     COALESCE(description, ''),
     'fas fa-box',
     'blue',
     NOW(),
     NOW()
   FROM staging_categories
   WHERE category_name IS NOT NULL
     AND category_name NOT IN (SELECT name FROM categories);

**Items Import:**

.. code-block:: sql

   -- Step 2: Import items (after categories)
   INSERT INTO items (
     name, sku, description, category_id, price, vat_rate, vat_included,
     current_stock, minimum_stock, is_active, created_by, updated_by,
     created_at, updated_at
   )
   SELECT 
     si.item_name,
     si.item_code,
     COALESCE(si.description, ''),
     c.id,
     COALESCE(si.unit_price, 0.00),
     0.2000,
     true,
     COALESCE(si.quantity_on_hand, 0),
     COALESCE(si.reorder_level, 0),
     COALESCE(si.is_active, true),
     'migration_admin',
     'migration_admin',
     COALESCE(si.created_date, NOW()),
     NOW()
   FROM staging_items si
   JOIN categories c ON c.name = si.category_name
   WHERE si.item_name IS NOT NULL
     AND si.item_code NOT IN (SELECT sku FROM items);

**Stock Movements Import:**

.. code-block:: sql

   -- Step 3: Import stock movements (if available)
   INSERT INTO stock_movements (
     item_id, type, quantity, previous_stock, new_stock,
     reason, performed_by, created_at
   )
   SELECT 
     i.id,
     CASE 
       WHEN sm.movement_type = 'IN' THEN 'in'
       WHEN sm.movement_type = 'OUT' THEN 'out'
       ELSE 'adjustment'
     END,
     sm.quantity,
     sm.previous_quantity,
     sm.new_quantity,
     COALESCE(sm.movement_reason, 'Legacy data migration'),
     'migration_admin',
     sm.movement_date
   FROM staging_movements sm
   JOIN items i ON i.sku = sm.item_code
   WHERE sm.movement_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH);

Post-Migration Tasks
--------------------

Data Validation
~~~~~~~~~~~~~~~

**Validation Queries:**

.. code-block:: sql

   -- Verify category migration
   SELECT COUNT(*) as migrated_categories FROM categories;
   SELECT COUNT(*) as source_categories FROM staging_categories;
   
   -- Verify item migration
   SELECT COUNT(*) as migrated_items FROM items;
   SELECT COUNT(*) as source_items FROM staging_items;
   
   -- Check for missing SKUs
   SELECT COUNT(*) as duplicate_skus 
   FROM items 
   GROUP BY sku 
   HAVING COUNT(*) > 1;
   
   -- Verify stock levels
   SELECT 
     SUM(current_stock) as total_migrated_stock,
     COUNT(*) as items_with_stock
   FROM items 
   WHERE current_stock > 0;
   
   -- Check category assignments
   SELECT c.name, COUNT(i.id) as item_count
   FROM categories c
   LEFT JOIN items i ON c.id = i.category_id
   GROUP BY c.id, c.name
   ORDER BY item_count DESC;

**Data Quality Checks:**

.. code-block:: sql

   -- Find items without categories
   SELECT name, sku FROM items WHERE category_id IS NULL;
   
   -- Find duplicate SKUs
   SELECT sku, COUNT(*) as count 
   FROM items 
   GROUP BY sku 
   HAVING COUNT(*) > 1;
   
   -- Find items with invalid prices
   SELECT name, sku, price 
   FROM items 
   WHERE price < 0 OR price IS NULL;
   
   -- Find users without email
   SELECT id, first_name, last_name 
   FROM users 
   WHERE email IS NULL OR email = '';

Cleanup Tasks
~~~~~~~~~~~~~

**Remove Migration Artifacts:**

.. code-block:: sql

   -- Re-enable constraints
   SET foreign_key_checks = 1;  -- MySQL
   -- OR
   SET session_replication_role = DEFAULT;  -- PostgreSQL
   
   -- Remove staging tables
   DROP TABLE IF EXISTS staging_categories;
   DROP TABLE IF EXISTS staging_items;
   DROP TABLE IF EXISTS staging_movements;
   
   -- Update statistics
   ANALYZE TABLE categories;
   ANALYZE TABLE items;
   ANALYZE TABLE users;
   ANALYZE TABLE stock_movements;

Configuration Updates
~~~~~~~~~~~~~~~~~~~~~

**Update System Settings:**

.. code-block:: bash

   # Update environment variables
   echo "MIGRATION_COMPLETED=$(date -Iseconds)" >> .env
   echo "LEGACY_SYSTEM_NAME=YourLegacySystem" >> .env
   
   # Initialize default admin password
   npm run admin:reset-password admin@university.edu

**Create Initial Backup:**

.. code-block:: bash

   # Create post-migration backup
   pg_dump $DATABASE_URL > "post_migration_backup_$(date +%Y%m%d_%H%M%S).sql"

Troubleshooting
---------------

Common Migration Issues
~~~~~~~~~~~~~~~~~~~~~~~

**Duplicate SKU Conflicts:**

.. code-block:: sql

   -- Find and resolve duplicate SKUs
   UPDATE items 
   SET sku = CONCAT(sku, '-DUP-', id)
   WHERE id IN (
     SELECT id FROM (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY sku ORDER BY id) as rn
       FROM items
     ) t WHERE rn > 1
   );

**Category Mapping Issues:**

.. code-block:: sql

   -- Create default category for unmapped items
   INSERT INTO categories (name, description, icon, color)
   VALUES ('Uncategorized', 'Items from legacy system without category mapping', 'fas fa-question', 'gray');
   
   -- Assign unmapped items to default category
   UPDATE items 
   SET category_id = (SELECT id FROM categories WHERE name = 'Uncategorized')
   WHERE category_id IS NULL;

**Character Encoding Problems:**

.. code-block:: bash

   # Convert file encoding before import
   iconv -f ISO-8859-1 -t UTF-8 legacy_export.csv > utf8_export.csv

**Large Data Volume Issues:**

.. code-block:: sql

   -- Import in batches
   INSERT INTO items (...)
   SELECT ...
   FROM staging_items
   WHERE id BETWEEN 1 AND 1000;
   
   -- Repeat for each batch

Rollback Procedures
-------------------

Emergency Rollback
~~~~~~~~~~~~~~~~~~

If migration fails and you need to rollback:

.. code-block:: bash

   # Stop the application
   docker-compose down
   
   # Restore pre-migration backup
   psql $DATABASE_URL < pre_migration_backup.sql
   
   # Restart application
   docker-compose up -d

**Partial Rollback (Data Only):**

.. code-block:: sql

   -- Remove migrated data while preserving schema
   DELETE FROM stock_movements WHERE performed_by = 'migration_admin';
   DELETE FROM items WHERE created_by = 'migration_admin';
   DELETE FROM categories WHERE name NOT IN ('IT Equipment', 'Office Supplies', 'Laboratory Equipment', 'Medical Supplies');
   DELETE FROM users WHERE id LIKE 'user_%' OR id = 'migration_admin';

Success Criteria
----------------

Migration Success Checklist
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   □ All critical data migrated successfully
   □ Data validation queries pass
   □ No duplicate SKUs or constraint violations
   □ User authentication works
   □ Stock levels are accurate
   □ Category structure is logical
   □ System performance is acceptable
   □ Backup created and verified
   □ User training completed
   □ Legacy system properly archived

**Key Metrics to Verify:**

.. code-block:: sql

   -- Final validation report
   SELECT 
     'Categories' as entity,
     COUNT(*) as migrated_count,
     (SELECT COUNT(*) FROM staging_categories) as source_count
   FROM categories
   
   UNION ALL
   
   SELECT 
     'Items',
     COUNT(*),
     (SELECT COUNT(*) FROM staging_items)
   FROM items
   
   UNION ALL
   
   SELECT 
     'Users',
     COUNT(*),
     (SELECT COUNT(*) FROM staging_users)
   FROM users
   WHERE id != 'migration_admin';

This migration guide provides a comprehensive framework for moving from any legacy SQL-based inventory system to LUStores. Adjust the specific SQL queries and procedures based on your legacy system's unique schema and requirements.
