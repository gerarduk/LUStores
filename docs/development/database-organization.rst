Database Organization and Schema
==================================

This guide provides comprehensive documentation of the database structure, relationships, migration system, and data integrity constraints for developers.

.. contents:: Contents
   :local:
   :depth: 2

---

Database Overview
-----------------

Technology Stack
~~~~~~~~~~~~~~~~

**Database**: PostgreSQL 15+
   - Chosen for: ACID compliance, JSON support, robust indexing, university standard

**ORM**: Drizzle ORM
   - Type-safe schema definitions
   - Migration support
   - SQL-first approach

**Schema Location**: ``/shared/schema.ts``
   - Single source of truth for database structure
   - TypeScript types generated from schema
   - Used by both server and client

---

Schema Overview and ERD
-----------------------

Interactive ERD Viewer
~~~~~~~~~~~~~~~~~~~~~~

The system includes an **interactive Entity Relationship Diagram** accessible in the application:

1. Navigate to **Settings** → **Database Schema** (admin only)
2. Click **"Entity Relationship Diagram"** tab
3. Interactive SVG diagram shows:
   - All tables with columns
   - Primary keys (🔑)
   - Foreign keys (🔗)
   - Relationships with crow's foot notation
   - Color-coded by relationship type

**ERD File**: ``/client/src/components/DatabaseERD.tsx``

Core Tables
~~~~~~~~~~~

The database consists of **15 core tables** organized into functional groups:

**1. User Management** (3 tables):
   - ``users`` - User accounts and authentication
   - ``permissions`` - 45 granular permissions
   - ``charge_code_assignments`` - User charge code authorization (permission system)

**2. Inventory** (4 tables):
   - ``items`` - Inventory items with location/unit fields
   - ``categories`` - Hierarchical item organization
   - ``stock_movements`` - Complete audit trail for all stock changes
   - ``notes`` - Flexible notes system (linked to multiple entities)

**3. Sales & Quotes** (4 tables):
   - ``quotes`` - Draft and saved quotes
   - ``quote_items`` - Items in quotes with snapshots
   - ``sales`` - Completed sales
   - ``sale_items`` - Items in sales with snapshots

**4. Procurement** (4 tables):
   - ``orders`` - Purchase orders
   - ``order_items`` - Items in orders
   - ``suppliers`` - Vendor information
   - ``sources`` - Item-supplier relationships (many-to-many)

**5. Financial Control** (3 tables):
   - ``chargecodes`` - Budget codes for sales
   - ``charge_code_exclusions`` - Category restrictions per code
   - ``charge_code_assignments`` - User authorization per code

---

Table Schemas (Detailed)
-------------------------

Users Table
~~~~~~~~~~~

**Purpose**: User accounts, authentication, and role-based access control

**Schema**:

.. code-block:: typescript

   users {
     id: varchar (PK) - Unique user ID
     email: varchar (unique) - Login email / username
     name: varchar - Full name
     role: varchar - 'user', 'superuser' (manager), 'admin'
     hashedPassword: varchar - bcrypt hashed password
     createdAt: timestamp - Account creation
     updatedAt: timestamp - Last modification
   }

**Indexes**:
   - PRIMARY KEY (id)
   - UNIQUE (email)

**Relationships**:
   - → charge_code_assignments (user_id, assigned_by)
   - → notes (created_by)
   - → items (created_by, updated_by)
   - → sales (processed_by)
   - → quotes (created_by, processed_by)
   - → orders (created_by)
   - → stock_movements (performed_by)
   - → chargecodes (authorised_by)

**Key Constraints**:
   - Email must be valid format
   - Role must be one of: 'user', 'superuser', 'admin'
   - Passwords min 8 characters (enforced in application)

Items Table
~~~~~~~~~~~

**Purpose**: Inventory items with location tracking and measurement units

**Schema**:

.. code-block:: typescript

   items {
     id: serial (PK) - Auto-increment item ID
     name: varchar - Item name/description
     sku: varchar (unique) - Stock keeping unit
     category_id: integer (FK) → categories.id - Item category
     price: decimal(10,2) - Sale price (GBP)
     vatRate: decimal(5,4) - VAT rate (e.g., 0.2000 for 20%)
     vatIncluded: boolean - true = price includes VAT
     currentStock: decimal(10,2) - Current stock level
     minimumStock: decimal(10,2) - Low-stock threshold
     location: varchar - Physical storage location **[ADDED 2025]**
     unit: varchar - Measurement unit (pieces, kg, meters) **[ADDED 2025]**
     description: text - Detailed description
     notes_id: integer (FK) → notes.id (nullable) - Linked notes
     isActive: boolean - Soft delete flag
     createdAt: timestamp
     updatedAt: timestamp
     created_by: varchar (FK) → users.id
     updated_by: varchar (FK) → users.id (nullable)
   }

**Indexes**:
   - PRIMARY KEY (id)
   - UNIQUE (sku)
   - INDEX (category_id)
   - INDEX (isActive)
   - INDEX (currentStock) - For low-stock queries

**Critical Fields**:

**location** (Physical Tracking):
   - Format: "Building/Room, Area, Specific Location"
   - Example: "Lab Store, Shelf 3A, Bin 05"
   - Shown on picking lists when processing sales
   - Admin-only visibility in inventory list
   - Free text for flexibility

**unit** (Measurement Type):
   - Specifies how quantities are measured
   - Example values: "pieces", "meters", "kg", "liters"
   - Allows fractional quantities (2.5 meters)
   - Prevents interpretation errors
   - Included in sale item snapshots

**vatIncluded** (Price Interpretation):
   - true: Price £120 means customer pays £120 (VAT backwards-calculated)
   - false: Price £100 + 20% VAT = £120 total (VAT forward-calculated)
   - Critical for correct pricing

Sales and Quotes Tables
~~~~~~~~~~~~~~~~~~~~~~~~

**Purpose**: Two-tier system for quotes (draft/saved) and completed sales

**quotes** Table:

.. code-block:: typescript

   quotes {
     id: serial (PK)
     quote_name: varchar (nullable) - Name for saved quotes
     customer_name: varchar (nullable)
     customer_email: varchar (nullable)
     customer_department: varchar (nullable)
     charge_code: varchar (nullable) - For draft quotes
     status: varchar - 'draft', 'saved', 'completed'
     session_id: varchar (nullable) - For draft quotes (4hr expiry)
     created_by: varchar (FK) → users.id
     processed_by: varchar (FK) → users.id (nullable)
     created_at: timestamp
     processed_at: timestamp (nullable)
     notes_id: integer (FK) → notes.id (nullable)
   }

**quote_items** Table:

.. code-block:: typescript

   quote_items {
     id: serial (PK)
     quote_id: integer (FK) → quotes.id (ON DELETE CASCADE)
     item_id: integer (FK) → items.id
     item_name: varchar - Snapshot
     item_sku: varchar - Snapshot
     quantity: decimal(10,2)
     unit_price: decimal(10,2) - Snapshot
     vat_rate: decimal(5,4) - Snapshot
     subtotal: decimal(10,2)
     total_with_vat: decimal(10,2)
   }

**sales** Table:

.. code-block:: typescript

   sales {
     id: varchar (PK) - Generated ID (e.g., S202501291234)
     charge_code: varchar - REQUIRED, validated
     customer_name: varchar (nullable)
     customer_email: varchar (nullable)
     customer_department: varchar (nullable)
     status: varchar - 'completed', 'paid'
     is_paid: boolean - Payment reconciliation flag
     total_amount: decimal(10,2)
     processed_by: varchar (FK) → users.id
     created_at: timestamp
     notes_id: integer (FK) → notes.id (nullable)
   }

**sale_items** Table:

.. code-block:: typescript

   sale_items {
     id: serial (PK)
     sale_id: varchar (FK) → sales.id (ON DELETE CASCADE)
     item_id: integer (FK) → items.id
     item_name: varchar - Immutable snapshot
     item_sku: varchar - Immutable snapshot
     quantity: decimal(10,2)
     unit_price: decimal(10,2) - Price at sale time
     vat_rate: decimal(5,4) - VAT at sale time
     subtotal: decimal(10,2)
     total_with_vat: decimal(10,2)
   }

**Key Concepts**:

**Snapshots**:
   - Quote/sale items capture ``item_name``, ``item_sku``, ``unit_price``, ``vat_rate``
   - Immutable historical record
   - Prevents confusion if item details change later

**Draft vs Saved Quotes**:
   - Draft: ``status = 'draft'``, ``session_id`` populated, 4hr expiry
   - Saved: ``status = 'saved'``, ``quote_name`` populated, persistent

**Completed vs Paid Sales**:
   - Completed: ``status = 'completed'``, stock deducted, ``is_paid = false``
   - Paid: ``is_paid = true``, accounting reconciliation complete

Charge Code Tables (Permission System)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**chargecodes** Table:

.. code-block:: typescript

   chargecodes {
     code: varchar (PK) - Unique code (e.g., "CS-2025-Q1")
     description: varchar
     validFrom: date (nullable) - Start of validity
     validUntil: date (nullable) - End of validity
     isOnHold: boolean - Temporary freeze
     holdReason: varchar (nullable) - Why on hold
     pin: varchar (nullable) - Optional PIN protection
     authorised_by: varchar (FK) → users.id (nullable)
     notes_id: integer (FK) → notes.id (nullable)
     createdAt: timestamp
   }

**charge_code_exclusions** Table:

.. code-block:: typescript

   charge_code_exclusions {
     id: serial (PK)
     charge_code: varchar (FK) → chargecodes.code (ON DELETE CASCADE)
     category_id: integer (FK) → categories.id (ON DELETE CASCADE)
     item_id: integer (FK) → items.id (ON DELETE CASCADE, nullable)
     created_by: varchar (FK) → users.id
     createdAt: timestamp
     UNIQUE (charge_code, category_id, item_id)
   }

**Purpose**: Prevent certain charge codes from being used with certain item categories

**Example**: "Office Supplies" charge code cannot be used to purchase "IT Equipment"

**charge_code_assignments** Table **[ADDED 2025]**:

.. code-block:: typescript

   charge_code_assignments {
     id: serial (PK)
     user_id: varchar (FK) → users.id (ON DELETE CASCADE)
     charge_code: varchar (FK) → chargecodes.code (ON DELETE CASCADE)
     assigned_by: varchar (FK) → users.id (nullable)
     assigned_at: timestamp - Default NOW()
     notes: text (nullable)
     UNIQUE (user_id, charge_code)
   }

**Purpose**: Maps users to authorized charge codes (permission system)

**Indexes**:
   - INDEX (user_id) - Fast lookup of user's codes
   - INDEX (charge_code) - Fast lookup of code's users

**Usage**:
   - Basic users restricted to assigned codes only
   - Managers/admins have access to all codes (no restrictions)

Stock Movements Table (Audit Trail)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Purpose**: Complete audit trail for all inventory movements (compliance)

**Schema**:

.. code-block:: typescript

   stock_movements {
     id: serial (PK)
     item_id: integer (FK) → items.id (ON DELETE CASCADE)
     type: varchar - 'in', 'out', 'adjustment'
     quantity: decimal(10,2) - Change amount (+ or -)
     previous_stock: decimal(10,2) - Stock before
     new_stock: decimal(10,2) - Stock after
     reason: text - Detailed explanation
     performed_by: varchar (FK) → users.id
     timestamp: timestamp - Default NOW()
   }

**Indexes**:
   - PRIMARY KEY (id)
   - INDEX (item_id) - Fast item history lookup
   - INDEX (timestamp) - Chronological queries

**Movement Types**:
   - ``in``: Stock received (from purchase orders)
   - ``out``: Stock sold (from sales)
   - ``adjustment``: Manual correction (physical count, damage, etc.)

**Reason Examples**:
   - "Received Order #O202501151230"
   - "Sale #S202501201445"
   - "Physical count found 2 damaged units"

**Compliance**: Every stock change MUST have a stock movement record

---

Table Relationships and Dependencies
-------------------------------------

Relationship Types
~~~~~~~~~~~~~~~~~~

**One-to-Many** (most common):
   - One parent → many children
   - Example: One category → many items
   - Implemented with foreign key on child table

**Many-to-Many**:
   - Through junction table
   - Example: Items ↔ Suppliers (via ``sources`` table)

**One-to-One** (optional):
   - Shared notes system
   - Example: Category → notes (nullable)

Foreign Key Cascade Rules
~~~~~~~~~~~~~~~~~~~~~~~~~~

**ON DELETE CASCADE**:
   - When parent deleted, children automatically deleted
   - Used for: quote_items, sale_items, order_items, stock_movements
   - Prevents orphaned records

**ON DELETE RESTRICT** (default):
   - Cannot delete parent if children exist
   - Used for: categories (can't delete if items reference it)

**Nullable Foreign Keys**:
   - Optional relationships
   - Example: ``items.notes_id`` (items don't require notes)

Migration Dependency Order
~~~~~~~~~~~~~~~~~~~~~~~~~~

When migrating data or creating fresh database, follow this order:

**Tier 1 - No Dependencies**:
   1. ``users`` - Base user accounts

**Tier 2 - Core References**:
   2. ``notes`` - Depends on users (created_by)
   3. ``categories`` - Depends on notes (notes_id)
   4. ``suppliers`` - Depends on notes (notes_id)
   5. ``permissions`` - Independent permission list

**Tier 3 - Primary Data**:
   6. ``chargecodes`` - Depends on users (authorised_by), notes
   7. ``items`` - Depends on categories, users, notes

**Tier 4 - Junction/Assignment Tables**:
   8. ``sources`` - Depends on items, suppliers
   9. ``charge_code_exclusions`` - Depends on chargecodes, categories, items
   10. ``charge_code_assignments`` - **Depends on users, chargecodes** [ADDED 2025]

**Tier 5 - Transactional Data**:
   11. ``quotes`` → ``quote_items`` - Depends on users, items
   12. ``sales`` → ``sale_items`` - Depends on users, items, chargecodes
   13. ``orders`` → ``order_items`` - Depends on users, suppliers, items
   14. ``stock_movements`` - Depends on items, users

.. important::
   **Critical**: Always migrate in this order to avoid foreign key constraint violations!

---

Migration System
----------------

Migration File Structure
~~~~~~~~~~~~~~~~~~~~~~~~

**Location**: ``/migrations/``

**Naming Convention**: ``###_description.sql``

**Examples**:
   - ``001_initial_schema.sql``
   - ``012_add_location_unit_to_items.sql``
   - ``013_add_charge_code_assignments.sql``

**Sequential Numbering**: Ensures correct application order

Migration Tracking
~~~~~~~~~~~~~~~~~~

**applied_migrations Table**:

.. code-block:: sql

   CREATE TABLE IF NOT EXISTS applied_migrations (
     id SERIAL PRIMARY KEY,
     migration_name VARCHAR(255) UNIQUE NOT NULL,
     applied_at TIMESTAMP DEFAULT NOW()
   );

**Purpose**: Tracks which migrations have been applied

**Usage**: Migration script checks this table before running each migration

Migration Script
~~~~~~~~~~~~~~~~

**File**: ``/data_migration_script.py``

**Functions**:

1. **Auto-Detection**: Scans ``/migrations/`` directory
2. **Sequential Application**: Applies migrations in numbered order
3. **Idempotent**: Won't re-apply already applied migrations
4. **Error Handling**: Rolls back on failure

**Running Migrations**:

.. code-block:: bash

   # Manual migration run
   python3 data_migration_script.py

   # Automatic (Docker startup)
   # Runs automatically in init.sql during container startup

Docker Integration
~~~~~~~~~~~~~~~~~~

**init.sql** (Docker Initialization):
   - Creates all tables if they don't exist
   - Runs on fresh Docker container startup
   - Location: ``/init.sql``

**Production Deployments**:
   - Use ``data_migration_script.py`` for existing databases
   - Migration files auto-detected and applied
   - Safe for production (checks ``applied_migrations`` table)

Writing New Migrations
~~~~~~~~~~~~~~~~~~~~~~~

**Best Practices**:

1. **Sequential Numbering**: Find highest number, increment
2. **Descriptive Name**: Clear purpose (e.g., ``014_add_index_to_items_sku.sql``)
3. **Idempotent**: Use ``IF NOT EXISTS`` where possible
4. **Test First**: Run on development database before production
5. **Rollback Plan**: Document how to reverse if needed

**Example Migration**:

.. code-block:: sql

   -- File: 014_add_index_to_items_sku.sql
   -- Description: Add index on items.sku for faster searches

   -- Create index if it doesn't exist
   CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);

   -- Record migration
   INSERT INTO applied_migrations (migration_name)
   VALUES ('014_add_index_to_items_sku.sql')
   ON CONFLICT (migration_name) DO NOTHING;

---

Indexing Strategy
-----------------

Primary Indexes
~~~~~~~~~~~~~~~

**Auto-Created**:
   - All primary keys (``id``, ``code``, etc.)
   - All unique constraints (``email``, ``sku``, etc.)

**Performance Impact**: O(log n) lookups on indexed columns

Foreign Key Indexes
~~~~~~~~~~~~~~~~~~~

**Critical for Performance**:

.. code-block:: sql

   CREATE INDEX idx_items_category_id ON items(category_id);
   CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
   CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
   CREATE INDEX idx_charge_code_assignments_user_id ON charge_code_assignments(user_id);

**Why**: Foreign keys used frequently in JOINs

Query Optimization Indexes
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Common Queries**:

.. code-block:: sql

   -- Low stock queries
   CREATE INDEX idx_items_current_stock ON items(currentStock);

   -- Active items filter
   CREATE INDEX idx_items_is_active ON items(isActive);

   -- Chronological stock movements
   CREATE INDEX idx_stock_movements_timestamp ON stock_movements(timestamp);

---

Data Integrity Constraints
---------------------------

NOT NULL Constraints
~~~~~~~~~~~~~~~~~~~~

**Critical Fields**:
   - User: email, role, hashedPassword
   - Item: name, sku, price, currentStock
   - Sale: charge_code (REQUIRED!)
   - Stock Movement: item_id, type, reason

**Purpose**: Prevent incomplete records

UNIQUE Constraints
~~~~~~~~~~~~~~~~~~

**Enforced Uniqueness**:
   - ``users.email`` - One account per email
   - ``items.sku`` - One item per SKU
   - ``chargecodes.code`` - One charge code per code string
   - ``(user_id, charge_code)`` in charge_code_assignments

**Purpose**: Data quality and referential integrity

CHECK Constraints
~~~~~~~~~~~~~~~~~

**Application-Level** (not database-enforced in current schema):
   - Role must be: 'user', 'superuser', 'admin'
   - Stock movement type: 'in', 'out', 'adjustment'
   - Quote status: 'draft', 'saved', 'completed'

**Validated in**: Application code before insert/update

Referential Integrity
~~~~~~~~~~~~~~~~~~~~~

**Foreign Keys**:
   - Enforced by PostgreSQL
   - CASCADE deletes prevent orphans
   - Cannot insert child without parent

---

Database Performance
--------------------

Connection Pooling
~~~~~~~~~~~~~~~~~~

**Configuration**: ``server/storage.ts``

**Pool Settings**:
   - Min connections: 2
   - Max connections: 10
   - Idle timeout: 30 seconds

**Why**: Reuse connections, reduce overhead

Query Optimization
~~~~~~~~~~~~~~~~~~

**Prepared Statements**:
   - All queries use parameterized statements
   - Prevents SQL injection
   - Query plan caching

**SELECT Optimization**:
   - Only select needed columns (avoid ``SELECT *``)
   - Use appropriate indexes
   - Limit result sets with ``LIMIT``

Transaction Management
~~~~~~~~~~~~~~~~~~~~~~

**Atomic Operations**:

.. code-block:: typescript

   // Example: Processing quote into sale
   await db.transaction(async (tx) => {
     // 1. Create sale
     const sale = await tx.insert(sales).values({...});

     // 2. Create sale items
     await tx.insert(saleItems).values([...]);

     // 3. Deduct stock
     await tx.update(items).set({currentStock: ...});

     // 4. Create stock movements
     await tx.insert(stockMovements).values([...]);

     // All or nothing!
   });

**Purpose**: ACID guarantees, prevents partial updates

---

Backup and Recovery
-------------------

See: :doc:`/operations/system-recovery` for detailed backup procedures

**Quick Backup**:

.. code-block:: bash

   docker exec lustores_db pg_dump -U postgres inventory > backup.sql

**Restore**:

.. code-block:: bash

   cat backup.sql | docker exec -i lustores_db psql -U postgres inventory

---

Additional Resources
--------------------

**Related Documentation**:
   - :doc:`/reference/database-schema` - Full schema reference
   - :doc:`/explanations/concepts` - Business logic and data model
   - :doc:`/operations/system-recovery` - Backup and restore procedures
   - :doc:`/admin/backup-restore` - Detailed backup guide

**In-App Tools**:
   - **Database ERD**: Settings → Database Schema → ERD tab
   - **Database Schema Viewer**: Settings → Database Schema → Schema Details tab
   - **Migration Guide**: Settings → Database Schema → Migration Guide tab

**External Resources**:
   - `PostgreSQL Documentation <https://www.postgresql.org/docs/15/>`_
   - `Drizzle ORM Documentation <https://orm.drizzle.team/>`_
