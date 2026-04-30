Database Schema Reference
==========================

This document provides comprehensive documentation for the LUStores database schema, including all tables, relationships, and data types.

Overview
--------

The LUStores application uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema is defined in ``shared/schema.ts`` and uses the following key design principles:

- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Audit Trails**: All critical operations are logged with user and timestamp information  
- **Soft Deletes**: Items are marked as inactive rather than permanently deleted
- **Flexible Permissions**: Granular permission system for different user roles
- **VAT Support**: Built-in VAT calculation and tracking for sales

Core Tables
-----------

Users Table
~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE users (
     id VARCHAR PRIMARY KEY,
     email VARCHAR UNIQUE NOT NULL,
     password_hash VARCHAR,  -- NULL for SSO users
     first_name VARCHAR,
     last_name VARCHAR,
     role VARCHAR NOT NULL DEFAULT 'user',  -- 'user', 'manager', 'admin', 'superuser'
     is_active BOOLEAN NOT NULL DEFAULT true,
     must_change_password BOOLEAN NOT NULL DEFAULT false,
     last_login TIMESTAMP,
     profile_image_url VARCHAR,
     show_picking_list BOOLEAN NOT NULL DEFAULT true,  -- User preference for displaying picking lists
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

**Key Features:**
- Supports both local authentication (with password hash) and SSO (password_hash = NULL)
- Role-based access control with four levels: user, manager, admin, superuser
- Audit fields for tracking login activity

Categories Table
~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE categories (
     id SERIAL PRIMARY KEY,
     name VARCHAR(100) UNIQUE NOT NULL,
     description TEXT,
     icon VARCHAR(50) NOT NULL DEFAULT 'fas fa-box',
     color VARCHAR(50) NOT NULL DEFAULT 'blue',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

**Key Features:**
- Visual customization with icons and colors for UI display
- Unique category names prevent duplicates
- Default values ensure consistent appearance

Items Table
~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE items (
     id SERIAL PRIMARY KEY,
     name VARCHAR(200) NOT NULL,
     sku VARCHAR(100) UNIQUE NOT NULL,
     description TEXT,
     category_id INTEGER NOT NULL REFERENCES categories(id),
     price DECIMAL(10,2) NOT NULL,
     vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,  -- 20% VAT default
     vat_included BOOLEAN NOT NULL DEFAULT true,
     current_stock INTEGER NOT NULL DEFAULT 0,
     minimum_stock INTEGER NOT NULL DEFAULT 0,
     is_active BOOLEAN NOT NULL DEFAULT true,
     created_by VARCHAR REFERENCES users(id),
     updated_by VARCHAR REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

**Key Features:**
- SKU (Stock Keeping Unit) must be unique across all items
- Built-in VAT rate and calculation support
- Stock level tracking with minimum threshold alerts
- Soft delete using ``is_active`` flag
- Full audit trail with created_by and updated_by fields

Stock Movements Table
~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE stock_movements (
     id SERIAL PRIMARY KEY,
     item_id INTEGER NOT NULL REFERENCES items(id),
     type VARCHAR(20) NOT NULL,  -- 'in', 'out', 'adjustment'
     quantity INTEGER NOT NULL,
     previous_stock INTEGER NOT NULL,
     new_stock INTEGER NOT NULL,
     reason TEXT,
     performed_by VARCHAR REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW()
   );

**Movement Types:**
- **in**: Stock received (adds to current stock)
- **out**: Stock issued (subtracts from current stock)
- **adjustment**: Manual correction (sets stock to exact quantity)

Notes Table
~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE notes (
     id SERIAL PRIMARY KEY,
     text TEXT NOT NULL,
     reference_type VARCHAR(50) NOT NULL,  -- 'item', 'sale', 'order', 'charge_code', 'vendor'
     reference_id VARCHAR(255) NOT NULL,  -- ID of the referenced entity
     created_by VARCHAR REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_notes_reference ON notes(reference_type, reference_id);
   CREATE INDEX idx_notes_created_by ON notes(created_by);

**Key Features:**
- Flexible annotation system for any entity type
- Polymorphic reference design (reference_type + reference_id)
- Full audit trail with creator and timestamps
- Efficient querying with composite index on reference fields

**Supported Reference Types:**
- **item**: Notes on inventory items (stock issues, supplier notes, etc.)
- **sale**: Notes on completed sales (special instructions, customer feedback)
- **order**: Notes on purchase orders (delivery instructions, supplier communications)
- **charge_code**: Notes on charge codes (usage restrictions, budget notes)
- **vendor**: Notes on suppliers/vendors (contact notes, quality issues)

**Use Cases:**
- Track item-specific issues or handling instructions
- Record customer requests or delivery notes for sales
- Document supplier communications for orders
- Add usage restrictions or budget notes for charge codes
- Record vendor quality issues or preferred contact methods

Sales and Quotes Tables
-----------------------

Sales Table
~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE sales (
     id SERIAL PRIMARY KEY,
     sale_id VARCHAR(50) UNIQUE NOT NULL,  -- Generated ID like S202501291234
     charge_code VARCHAR(100) NOT NULL,
     subtotal_amount DECIMAL(12,2) NOT NULL,  -- Amount before VAT
     vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
     total_amount DECIMAL(12,2) NOT NULL,  -- Total including VAT
     vat_applied BOOLEAN NOT NULL DEFAULT true,
     customer_info JSONB,
     notes TEXT,
     status VARCHAR(20) NOT NULL DEFAULT 'completed',
     is_paid BOOLEAN NOT NULL DEFAULT false,  -- Payment reconciliation status
     delivered_to VARCHAR(200),  -- Name of recipient who received items
     delivered_to_email VARCHAR(200),  -- Email of recipient
     delivered_at TIMESTAMP,  -- When delivery was confirmed
     processed_by VARCHAR REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

Sale Items Table
~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE sale_items (
     id SERIAL PRIMARY KEY,
     sale_id INTEGER NOT NULL REFERENCES sales(id),
     item_id INTEGER NOT NULL REFERENCES items(id),
     item_name VARCHAR(200) NOT NULL,  -- Snapshot at time of sale
     item_sku VARCHAR(100) NOT NULL,   -- Snapshot at time of sale
     unit_price DECIMAL(10,2) NOT NULL,
     vat_rate DECIMAL(5,4) NOT NULL,
     vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
     quantity INTEGER NOT NULL,
     subtotal DECIMAL(12,2) NOT NULL,
     total_with_vat DECIMAL(12,2) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

Quotes Table
~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE quotes (
     id SERIAL PRIMARY KEY,
     quote_id VARCHAR(50) UNIQUE NOT NULL,  -- Generated ID like Q202501291234
     charge_code VARCHAR(100) NOT NULL,
     subtotal_amount DECIMAL(12,2) NOT NULL,
     vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
     total_amount DECIMAL(12,2) NOT NULL,
     vat_applied BOOLEAN NOT NULL DEFAULT true,
     customer_info JSONB,
     notes TEXT,
     status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft', 'processed', 'deleted'
     created_by VARCHAR REFERENCES users(id),
     processed_by VARCHAR REFERENCES users(id),
     processed_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

Quote Items Table
~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE quote_items (
     id SERIAL PRIMARY KEY,
     quote_id INTEGER NOT NULL REFERENCES quotes(id),
     item_id INTEGER NOT NULL REFERENCES items(id),
     item_name VARCHAR(200) NOT NULL,
     item_sku VARCHAR(100) NOT NULL,
     unit_price DECIMAL(10,2) NOT NULL,
     vat_rate DECIMAL(5,4) NOT NULL,
     vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
     quantity INTEGER NOT NULL,
     subtotal DECIMAL(12,2) NOT NULL,
     total_with_vat DECIMAL(12,2) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

Procurement Tables
------------------

Suppliers Table
~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE suppliers (
     id VARCHAR PRIMARY KEY,
     name VARCHAR NOT NULL,
     contact VARCHAR,
     email VARCHAR,
     phone VARCHAR,
     address VARCHAR,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

Sources Table (Item-Supplier Relationship)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE sources (
     id SERIAL PRIMARY KEY,
     item_id INTEGER NOT NULL REFERENCES items(id),
     supplier_id VARCHAR NOT NULL REFERENCES suppliers(id),
     price DECIMAL(10,2),
     notes TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

Orders Table
~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE orders (
     id SERIAL PRIMARY KEY,
     order_id VARCHAR(50) UNIQUE NOT NULL,  -- Generated ID like O202501291234
     supplier_id VARCHAR REFERENCES suppliers(id),
     status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'received', 'cancelled'
     notes TEXT,
     total_amount DECIMAL(12,2),
     created_by VARCHAR REFERENCES users(id),
     received_by VARCHAR REFERENCES users(id),
     received_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

Order Items Table
~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE order_items (
     id SERIAL PRIMARY KEY,
     order_id INTEGER NOT NULL REFERENCES orders(id),
     item_id INTEGER REFERENCES items(id),  -- Optional for new items
     item_name VARCHAR(200) NOT NULL,
     item_sku VARCHAR(100) NOT NULL,
     item_description TEXT,
     category_id INTEGER REFERENCES categories(id),
     unit_cost DECIMAL(10,2) NOT NULL,
     quantity INTEGER NOT NULL,
     total_cost DECIMAL(12,2) NOT NULL,
     received BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW()
   );

Charge Codes and Exclusions
---------------------------

Charge Codes Table
~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE chargecodes (
     code VARCHAR PRIMARY KEY,
     title VARCHAR NOT NULL,
     authorised_by VARCHAR REFERENCES users(id),
     valid_from TIMESTAMP,
     valid_until TIMESTAMP,
     pin VARCHAR,
     cost_centre VARCHAR,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

Charge Code Exclusions Table
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE charge_code_exclusions (
     id SERIAL PRIMARY KEY,
     charge_code VARCHAR NOT NULL REFERENCES chargecodes(code),
     category_id INTEGER NOT NULL REFERENCES categories(id),
     created_by VARCHAR REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW()
   );

**Purpose**: Defines which categories a charge code cannot be used for, enabling budget control and compliance.

System Configuration Tables
---------------------------

System Settings Table
~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE system_settings (
     id SERIAL PRIMARY KEY,
     key VARCHAR(100) UNIQUE NOT NULL,
     value JSONB NOT NULL,
     description TEXT,
     category VARCHAR(50) NOT NULL DEFAULT 'general',
     is_system BOOLEAN NOT NULL DEFAULT false,  -- System settings cannot be deleted
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

User Permissions Table
~~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE user_permissions (
     id SERIAL PRIMARY KEY,
     user_id VARCHAR NOT NULL REFERENCES users(id),
     permission VARCHAR(100) NOT NULL,
     granted BOOLEAN NOT NULL DEFAULT true,
     granted_by VARCHAR NOT NULL REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(user_id, permission)
   );

Permission Definitions Table
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE permission_definitions (
     id SERIAL PRIMARY KEY,
     name VARCHAR(100) UNIQUE NOT NULL,
     description TEXT NOT NULL,
     category VARCHAR(50) NOT NULL,
     default_roles JSONB NOT NULL,  -- Array of roles that get this permission by default
     is_system BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

System Monitoring Tables
------------------------

System Tests Table
~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE system_tests (
     id SERIAL PRIMARY KEY,
     test_type VARCHAR(32) UNIQUE NOT NULL,  -- 'unit', 'integration', 'sales'
     status VARCHAR(32) NOT NULL,  -- 'running', 'completed', 'failed'
     output TEXT,
     start_time TIMESTAMP NOT NULL,
     end_time TIMESTAMP,
     duration INTEGER,  -- milliseconds
     updated_at TIMESTAMP DEFAULT NOW()
   );

**Purpose**: Stores the latest test results for system monitoring and health checks.

Session Storage Table
~~~~~~~~~~~~~~~~~~~~

.. code-block:: sql

   CREATE TABLE sessions (
     sid VARCHAR PRIMARY KEY,
     sess JSONB NOT NULL,
     expire TIMESTAMP NOT NULL
   );

   CREATE INDEX IDX_session_expire ON sessions(expire);

**Purpose**: Required for Replit Auth and session management. This table is mandatory and should not be dropped.

Entity Relationships
--------------------

Primary Relationships
~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   users ||--o{ items : created_by/updated_by
   users ||--o{ stock_movements : performed_by  
   users ||--o{ sales : processed_by
   users ||--o{ quotes : created_by/processed_by
   users ||--o{ orders : created_by/received_by
   users ||--o{ chargecodes : authorised_by
   users ||--o{ user_permissions : user_id/granted_by

   categories ||--o{ items : category_id
   categories ||--o{ charge_code_exclusions : category_id
   categories ||--o{ order_items : category_id

   items ||--o{ stock_movements : item_id
   items ||--o{ sale_items : item_id
   items ||--o{ quote_items : item_id
   items ||--o{ sources : item_id
   items ||--o{ order_items : item_id

   suppliers ||--o{ sources : supplier_id
   suppliers ||--o{ orders : supplier_id

   sales ||--o{ sale_items : sale_id
   quotes ||--o{ quote_items : quote_id
   orders ||--o{ order_items : order_id

   chargecodes ||--o{ charge_code_exclusions : charge_code

Data Types and Constraints
--------------------------

Common Data Types
~~~~~~~~~~~~~~~~

- **VARCHAR**: Variable-length strings with optional length limits
- **TEXT**: Unlimited length text fields
- **INTEGER/SERIAL**: Integer values, SERIAL for auto-incrementing primary keys
- **DECIMAL(p,s)**: Fixed-precision decimal numbers (precision, scale)
- **BOOLEAN**: True/false values
- **TIMESTAMP**: Date and time values
- **JSONB**: Binary JSON for flexible structured data

Key Constraints
~~~~~~~~~~~~~~

1. **Primary Keys**: All tables have auto-incrementing or explicit primary keys
2. **Unique Constraints**: SKUs, email addresses, charge codes must be unique
3. **Foreign Key Constraints**: Maintain referential integrity between related tables
4. **Check Constraints**: Validate data ranges and formats (implemented in application layer)
5. **Not Null Constraints**: Critical fields cannot be empty

Indexes
~~~~~~~

.. code-block:: sql

   -- Session management
   CREATE INDEX IDX_session_expire ON sessions(expire);
   
   -- Performance indexes for common queries
   CREATE INDEX idx_items_category ON items(category_id);
   CREATE INDEX idx_items_active ON items(is_active);
   CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
   CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
   CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

Schema Evolution
---------------

Migration Strategy
~~~~~~~~~~~~~~~~~

The schema uses Drizzle ORM migrations for version control:

1. **Migration Files**: Located in ``migrations/`` directory
2. **Incremental Changes**: Each migration represents a single schema change
3. **Rollback Support**: Migrations can be rolled back if needed
4. **Environment Sync**: Ensures development, testing, and production schemas match

Common Migration Operations
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: typescript

   // Add new column
   await db.schema.alterTable('items')
     .addColumn('new_field', 'varchar(100)')
     .execute();

   // Create new table
   await db.schema.createTable('new_table')
     .addColumn('id', 'serial', (col) => col.primaryKey())
     .addColumn('name', 'varchar(200)', (col) => col.notNull())
     .execute();

   // Add foreign key constraint
   await db.schema.alterTable('child_table')
     .addForeignKeyConstraint('fk_parent', ['parent_id'], 'parent_table', ['id'])
     .execute();

Best Practices
--------------

Schema Design Guidelines
~~~~~~~~~~~~~~~~~~~~~~~

1. **Consistent Naming**: Use snake_case for database fields, camelCase in TypeScript
2. **Audit Fields**: Include created_at, updated_at, created_by where appropriate
3. **Soft Deletes**: Use is_active flags instead of hard deletes for important data
4. **Referential Integrity**: Always use foreign key constraints
5. **Data Snapshots**: Store item details in sale/quote items for historical accuracy

Performance Considerations
~~~~~~~~~~~~~~~~~~~~~~~~~

1. **Indexing**: Add indexes for frequently queried fields
2. **Query Optimization**: Use appropriate joins and limit result sets
3. **Connection Pooling**: Configure connection pools for high-traffic scenarios
4. **Batch Operations**: Use transactions for multiple related operations

Security Measures
~~~~~~~~~~~~~~~~

1. **Role-Based Access**: Implement proper role checks at application level
2. **Input Validation**: Validate all inputs using Zod schemas
3. **SQL Injection Prevention**: Use parameterized queries through Drizzle ORM
4. **Audit Logging**: Track all critical data changes
5. **Data Encryption**: Encrypt sensitive fields like password hashes
