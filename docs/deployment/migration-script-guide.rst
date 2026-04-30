===================================
Data Migration Script Guide
===================================

.. note::
   This guide documents the Python-based ``data_migration_script.py`` for migrating
   from the legacy PHP Physics Stores system (MySQL) to the modern LUStores system (PostgreSQL).

Overview
========

The ``data_migration_script.py`` is a specialized migration tool designed to handle the specific migration from:

- **Source**: MySQL-based ``physicsstores`` database (Legacy PHP system)
- **Target**: PostgreSQL-based ``university_inventory`` database (Modern LUStores)

Script Location
---------------

::

    /data/LUStores/scripts/data_migration_script.py

Features
========

✅ **Automated Schema Migration**
   - Automatically applies any pending SQL migrations from ``/migrations/`` directory
   - Tracks applied migrations to avoid duplicates

✅ **Data Preservation**
   - Preserves existing admin users during migration
   - Creates fallback "Legacy System" user for data integrity
   - Maintains referential integrity across all tables

✅ **Comprehensive Logging**
   - Detailed migration logs saved to ``data_migration.log``
   - Real-time console output with progress indicators
   - Error tracking and statistics

✅ **Data Transformation**
   - Maps legacy MySQL schema to modern PostgreSQL schema
   - Handles password hashing with bcrypt
   - Converts data types and formats automatically

Prerequisites
=============

System Requirements
-------------------

**On the migration machine** (can be local or VM):

- Python 3.8+
- Required Python packages::

    pip install psycopg2-binary pymysql bcrypt

**Access Requirements**:

- SSH/network access to legacy MySQL database
- SSH/network access to target PostgreSQL database
- Read permissions on legacy database
- Write permissions on target database

Schema Export File
------------------

The script requires a schema mapping file::

    /data/LUStores/migrations/database_schemas_export_20250911_152208.json

This JSON file contains the schema structure of both source and target databases.

Migration Process
=================

Data Flow Diagram
-----------------

.. mermaid::

   graph LR
       subgraph "Legacy System"
           MYSQL[(MySQL<br/>physicsstores)]
           TABLES["Tables:<br/>• users<br/>• stock<br/>• supplier<br/>• orders<br/>• issues<br/>• charge"]
       end

       subgraph "Migration Script"
           SCRIPT[data_migration_script.py]
           TRANSFORM[Data Transformation<br/>& Mapping]
           VALIDATE[Validation &<br/>Error Handling]
       end

       subgraph "Modern System"
           POSTGRES[(PostgreSQL<br/>university_inventory)]
           NEWTABLES["Tables:<br/>• users<br/>• items<br/>• suppliers<br/>• orders + order_items<br/>• sales + sale_items<br/>• chargecodes"]
       end

       MYSQL --> TABLES
       TABLES --> SCRIPT
       SCRIPT --> TRANSFORM
       TRANSFORM --> VALIDATE
       VALIDATE --> NEWTABLES
       NEWTABLES --> POSTGRES

       style MYSQL fill:#ff6b6b
       style POSTGRES fill:#6bcf7f
       style SCRIPT fill:#4d96ff

Table Mappings
==============

The script performs the following table migrations:

.. list-table:: Migration Mapping
   :header-rows: 1
   :widths: 25 25 50

   * - Legacy Table
     - Target Table(s)
     - Notes
   * - ``users``
     - ``users``
     - Role mapping: LEVEL ≥10→admin, ≥5→manager, else→user
   * - ``stock``
     - ``items``
     - All items assigned to "General" category
   * - ``supplier``
     - ``suppliers``
     - Direct mapping with address concatenation
   * - ``charge``
     - ``chargecodes``
     - COSTCENTRE becomes primary code
   * - ``orders``
     - ``orders`` + ``order_items``
     - Denormalized→normalized structure
   * - ``issues``
     - ``sales`` + ``sale_items``
     - Stock issues converted to sales records

Field Transformations
=====================

Users Table
-----------

.. code-block:: text

   Legacy (MySQL)                  Target (PostgreSQL)
   ──────────────                  ───────────────────
   USERNAME                     →  email (with @physics.lancs.ac.uk if missing @)
   USERPASSWORD                 →  password_hash (bcrypt hashed)
   USERNAME                     →  first_name
   'User'                       →  last_name
   LEVEL (10+/5+/other)         →  role (admin/manager/user)
   (always)                     →  is_active = true
   (always)                     →  must_change_password = true

Items Table
-----------

.. code-block:: text

   Legacy (MySQL)                  Target (PostgreSQL)
   ──────────────                  ───────────────────
   DESC1                        →  name
   CODE                         →  sku
   DESC1 + DESC2                →  description
   (all items)                  →  category_id = "General" category
   PRICE                        →  price
   0.20                         →  vat_rate (20% VAT)
   false                        →  vat_included
   BALANCE                      →  current_stock
   MIN                          →  minimum_stock
   HIDDEN != 'Y'                →  is_active

Suppliers Table
---------------

.. code-block:: text

   Legacy (MySQL)                  Target (PostgreSQL)
   ──────────────                  ───────────────────
   CODE                         →  id
   NAME                         →  name
   (none)                       →  contact (null)
   (none)                       →  email (null)
   TELEPHONE                    →  phone
   ADDRESS1-4 (concatenated)    →  address

Orders & Order Items
--------------------

.. code-block:: text

   Legacy (MySQL)                  Target (PostgreSQL)
   ──────────────                  ───────────────────

   Orders (denormalized):
   ORDER_NO                     →  orders.order_id
   SUPPLIER                     →  orders.supplier_id
   DATE                         →  orders.status (if set: completed, else: pending)
   SUM(VALUE)                   →  orders.total_amount

   Order Items (created from order rows):
   STOCK_CODE                   →  order_items.item_sku
   PRICE                        →  order_items.unit_cost
   QTY                          →  order_items.quantity
   VALUE                        →  order_items.total_cost
   RECD_DATE != null            →  order_items.received = true

Issues → Sales Migration
------------------------

.. code-block:: text

   Legacy (MySQL)                  Target (PostgreSQL)
   ──────────────                  ───────────────────

   Sales (created from issues):
   STOCK_CODE + DATE + counter  →  sales.sale_id (LEGACY-CODE-DATE-NNNNNN)
   'GENERAL'                    →  sales.charge_code
   (calculated)                 →  sales.subtotal_amount
   (calculated at 20% VAT)      →  sales.vat_amount
   (total inc VAT)              →  sales.total_amount
   'completed'                  →  sales.status

   Customer Info (JSON):
   ISSUEDTO                     →  customer_info.name
   REASON                       →  customer_info.reason
   COSTCENTRE, ACTIVITY, etc.   →  customer_info.legacy_data

Usage Guide
===========

Basic Usage
-----------

Command-line syntax::

    python scripts/data_migration_script.py \
        --schema-file migrations/database_schemas_export_20250911_152208.json \
        --source-host legacy-db.university.edu \
        --source-port 3306 \
        --source-user readonly_user \
        --source-password 'legacy_password' \
        --source-database physicsstores \
        --target-host localhost \
        --target-port 5432 \
        --target-user postgres \
        --target-password 'postgres_password' \
        --target-database university_inventory

Step-by-Step Migration
-----------------------

**Step 1: Prepare Backup**

Before running migration, backup the target database::

    docker compose -f docker-compose.prod.yml exec -T db \
        pg_dump -U postgres university_inventory \
        | gzip > "backups/pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

**Step 2: Verify Access**

Test connections to both databases::

    # Test MySQL connection
    mysql -h legacy-db.university.edu -u readonly_user -p physicsstores \
        -e "SELECT COUNT(*) FROM stock;"

    # Test PostgreSQL connection
    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory -c "SELECT version();"

**Step 3: Run Migration**

Execute the migration script::

    cd /data/LUStores

    python scripts/data_migration_script.py \
        --schema-file migrations/database_schemas_export_20250911_152208.json \
        --source-host YOUR_LEGACY_HOST \
        --source-user YOUR_LEGACY_USER \
        --source-password 'YOUR_LEGACY_PASSWORD' \
        --source-database physicsstores \
        --target-host localhost \
        --target-port 5432 \
        --target-user postgres \
        --target-password 'YOUR_POSTGRES_PASSWORD' \
        --target-database university_inventory

**Step 4: Monitor Progress**

The script provides real-time output::

    [2025-01-22 14:30:15] - INFO - Starting complete data migration...
    [2025-01-22 14:30:15] - INFO - Source: physicsstores (mysql)
    [2025-01-22 14:30:15] - INFO - Target: university_inventory (postgres)
    [2025-01-22 14:30:16] - INFO - Step 0: Verifying and applying database migrations...
    [2025-01-22 14:30:18] - INFO - Step 1: Clearing target database...
    [2025-01-22 14:30:20] - INFO - Step 3: Migrating categories...
    [2025-01-22 14:30:21] - INFO - Step 4: Migrating suppliers...
    [2025-01-22 14:30:45] - INFO - Migrated supplier: Acme Corp -> ID ACME001
    [2025-01-22 14:31:15] - INFO - Step 5: Migrating items...
    [2025-01-22 14:32:30] - INFO - Migrated item: LAB-001 -> ID 1523
    ...
    [2025-01-22 14:45:00] - INFO - Migration completed successfully!

**Step 5: Review Log File**

Check the detailed log::

    tail -100 data_migration.log

**Step 6: Verify Migration**

Run verification queries:

.. code-block:: sql

   -- Check migrated counts
   SELECT 'users' as table, COUNT(*) as count FROM users
   UNION ALL
   SELECT 'items', COUNT(*) FROM items
   UNION ALL
   SELECT 'suppliers', COUNT(*) FROM suppliers
   UNION ALL
   SELECT 'orders', COUNT(*) FROM orders
   UNION ALL
   SELECT 'chargecodes', COUNT(*) FROM chargecodes
   UNION ALL
   SELECT 'sales', COUNT(*) FROM sales;

Migration Sequence
==================

The script follows this exact order (critical for foreign key dependencies):

.. mermaid::

   graph TD
       START([Start Migration])
       STEP0[Step 0: Apply SQL Migrations]
       STEP1[Step 1: Clear Target Database<br/>Preserve Admin Users]
       STEP2[Step 2: Skip User Migration<br/>Create Legacy System User]
       STEP3[Step 3: Migrate Categories<br/>Create default categories]
       STEP4[Step 4: Migrate Suppliers]
       STEP5[Step 5: Migrate Items]
       STEP6[Step 6: Migrate Chargecodes]
       STEP7[Step 7: Migrate Orders & Order Items]
       STEP8[Step 8: Migrate Issues as Sales]
       STEP9[Step 9: Restore Admin Users]
       SUMMARY[Print Migration Summary]
       DONE([Migration Complete])

       START --> STEP0
       STEP0 --> STEP1
       STEP1 --> STEP2
       STEP2 --> STEP3
       STEP3 --> STEP4
       STEP4 --> STEP5
       STEP5 --> STEP6
       STEP6 --> STEP7
       STEP7 --> STEP8
       STEP8 --> STEP9
       STEP9 --> SUMMARY
       SUMMARY --> DONE

       style START fill:#4d96ff
       style STEP1 fill:#ffd93d
       style STEP5 fill:#ffd93d
       style DONE fill:#6bcf7f

Migration Statistics
====================

After completion, the script prints a summary::

    ============================================================
    MIGRATION SUMMARY
    ============================================================
    users              :      0 migrated,      0 errors,      5 skipped
    categories         :      6 migrated,      0 errors,      0 skipped
    suppliers          :     45 migrated,      0 errors,      0 skipped
    items              :   1523 migrated,      0 errors,     12 skipped
    chargecodes        :     89 migrated,      0 errors,      3 skipped
    orders             :    234 migrated,      0 errors,      1 skipped
    order_items        :    567 migrated,      0 errors,      2 skipped
    stock_movements    :   3421 migrated,      0 errors,     15 skipped
    ------------------------------------------------------------
    TOTAL              :   5885 migrated,      0 errors
    Success rate: 99.5%
    ============================================================

Understanding the Output
------------------------

- **migrated**: Successfully transferred to target database
- **skipped**: Skipped due to duplicates or missing required fields
- **errors**: Failed during migration (should be 0 for successful migration)

Troubleshooting
===============

Common Errors
-------------

Connection Refused
~~~~~~~~~~~~~~~~~~

**Error**::

    pymysql.err.OperationalError: (2003, "Can't connect to MySQL server...")

**Solutions**:

1. Verify source database host is accessible::

    ping legacy-db.university.edu

2. Check firewall allows MySQL port 3306
3. Verify credentials are correct
4. Check if MySQL allows remote connections

Authentication Failed
~~~~~~~~~~~~~~~~~~~~~

**Error**::

    psycopg2.OperationalError: FATAL: password authentication failed

**Solutions**:

1. Verify PostgreSQL password in ``.env.prod`` matches command
2. Check PostgreSQL ``pg_hba.conf`` allows connections
3. Ensure user has sufficient privileges

Duplicate Key Violations
~~~~~~~~~~~~~~~~~~~~~~~~~

**Error**::

    psycopg2.errors.UniqueViolation: duplicate key value violates unique constraint

**Solutions**:

1. The script should have cleared the database first (Step 1)
2. If running multiple times, ensure database is cleared between runs
3. Check for pre-existing data that shouldn't be there

Out of Memory
~~~~~~~~~~~~~

**Error**::

    MemoryError: Unable to allocate array

**Solutions**:

1. Increase available RAM
2. Process large tables in batches (modify script)
3. Close other applications during migration

Schema File Not Found
~~~~~~~~~~~~~~~~~~~~~~

**Error**::

    FileNotFoundError: [Errno 2] No such file or directory: 'migrations/database_schemas_export...'

**Solutions**:

1. Ensure you're running from ``/data/LUStores`` directory
2. Verify schema file exists::

    ls -la migrations/database_schemas_export_*.json

3. Use absolute path if needed

Partial Migration Recovery
===========================

If migration fails partway through:

**Option 1: Restore and Retry** (Recommended)

::

    # Stop application
    docker compose -f docker-compose.prod.yml stop app

    # Restore backup
    gunzip -c backups/pre_migration_TIMESTAMP.sql.gz | \
        docker compose -f docker-compose.prod.yml exec -T db \
        psql -U postgres -d university_inventory

    # Fix the issue, then retry migration

**Option 2: Continue from Failure Point**

The script tracks which tables succeeded. You can manually complete remaining tables if needed (advanced users only).

Post-Migration Tasks
====================

1. **Verify Data Integrity**

   Run validation queries to ensure data is correct

2. **Reset Admin Password**

   ::

       docker compose -f docker-compose.prod.yml exec app \
           npm run admin:reset-password admin@university.edu

3. **Test Application**

   - Log in with admin account
   - Verify items are visible
   - Test search functionality
   - Create a test order

4. **Create Post-Migration Backup**

   ::

       docker compose -f docker-compose.prod.yml exec -T db \
           pg_dump -U postgres university_inventory \
           | gzip > "backups/post_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

5. **Archive Legacy System**

   Once verified successful:

   - Take final backup of legacy system
   - Document legacy system shutdown date
   - Preserve access for auditing purposes

Best Practices
==============

Before Migration
----------------

- ☑ **Test on staging first** - Never run directly on production
- ☑ **Backup everything** - Both source and target databases
- ☑ **Schedule downtime** - Plan for 2-4 hours depending on data size
- ☑ **Verify schema file** - Ensure it matches both databases
- ☑ **Check disk space** - Ensure sufficient space for migration
- ☑ **Notify users** - Inform them of the migration window

During Migration
----------------

- ☑ **Monitor logs** - Watch for errors in real-time
- ☑ **Don't interrupt** - Let the script complete fully
- ☑ **Check resource usage** - Monitor CPU, memory, disk I/O
- ☑ **Save migration log** - Keep ``data_migration.log`` for records

After Migration
---------------

- ☑ **Verify counts** - Ensure record counts match expected
- ☑ **Test functionality** - Test all critical features
- ☑ **Review skipped records** - Investigate why records were skipped
- ☑ **Document issues** - Note any problems encountered
- ☑ **Train users** - Ensure team knows about any changes

Performance Considerations
==========================

For large datasets (>100,000 records):

- Migration may take several hours
- Consider running during off-hours
- Monitor database server performance
- Ensure adequate disk space for transaction logs
- Consider increasing PostgreSQL ``shared_buffers`` temporarily

Estimated Times
---------------

.. list-table:: Migration Time Estimates
   :header-rows: 1
   :widths: 30 35 35

   * - Records
     - Estimated Time
     - Recommended RAM
   * - < 10,000
     - 5-15 minutes
     - 2GB
   * - 10,000 - 50,000
     - 15-45 minutes
     - 4GB
   * - 50,000 - 100,000
     - 45-90 minutes
     - 8GB
   * - > 100,000
     - 2-4 hours
     - 16GB+

Related Documentation
=====================

- :doc:`legacy-migration` - General migration guide
- :doc:`/operations/backup-restore` - Backup and restore procedures
- :doc:`/reference/database-schema` - Target database schema reference
- :doc:`/deployment/production` - Production deployment guide
