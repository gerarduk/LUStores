-- Initialize the database with required tables
-- This file will be executed when the PostgreSQL container starts

-- Create sessions table for session storage
CREATE TABLE IF NOT EXISTS sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE sessions ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create application tables
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  password_hash VARCHAR, -- null for SSO users
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_login TIMESTAMP,
  profile_image_url VARCHAR,
  show_picking_list BOOLEAN NOT NULL DEFAULT true, -- User preference for displaying picking lists
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notes table for system-wide notes that can be attached to items, suppliers, orders, and charge codes
-- Must be created before tables that reference it
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  reference_type VARCHAR(50) NOT NULL, -- 'item', 'supplier', 'order', 'chargecode'
  reference_id VARCHAR(100) NOT NULL, -- ID of the referenced entity
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notes_reference ON notes(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description VARCHAR,
  icon VARCHAR,
  color VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.20,
  vat_included BOOLEAN NOT NULL DEFAULT true,
  current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
  location VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT true,
  low_stock_acknowledged_at TIMESTAMP,
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  created_by VARCHAR REFERENCES users(id),
  updated_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  type VARCHAR(20) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  previous_stock NUMERIC(10,2) NOT NULL,
  new_stock NUMERIC(10,2) NOT NULL,
  reason TEXT,
  performed_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  sale_id VARCHAR(50) NOT NULL UNIQUE,
  charge_code VARCHAR(100) NOT NULL,
  subtotal_amount DECIMAL(12,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  vat_applied BOOLEAN NOT NULL DEFAULT true,
  customer_info JSONB,
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  processed_by VARCHAR REFERENCES users(id),
  delivered_to VARCHAR(200),  -- Name of person who received the items
  delivered_to_email VARCHAR(200),  -- Email of recipient
  delivered_at TIMESTAMP,  -- When recipient was recorded
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  item_name VARCHAR(200) NOT NULL,
  item_sku VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,4) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity NUMERIC(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  total_with_vat DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL UNIQUE,
  quote_name VARCHAR(200),
  charge_code VARCHAR(100) NOT NULL,
  subtotal_amount DECIMAL(12,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  vat_applied BOOLEAN NOT NULL DEFAULT true,
  customer_info JSONB,
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  session_id VARCHAR(255),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  processed_by VARCHAR REFERENCES users(id),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient session-based draft quote management
CREATE INDEX IF NOT EXISTS idx_quotes_session_user ON quotes(session_id, created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_expiry ON quotes(expires_at) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_quotes_status_session ON quotes(status, session_id);
CREATE INDEX IF NOT EXISTS idx_quotes_last_accessed ON quotes(last_accessed_at);

CREATE TABLE IF NOT EXISTS quote_items (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  item_name VARCHAR(200) NOT NULL,
  item_sku VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,4) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity NUMERIC(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  total_with_vat DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  contact VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  address VARCHAR,
  account_number VARCHAR(25),
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id VARCHAR NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  price DECIMAL(10,2),
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  supplier_id VARCHAR REFERENCES suppliers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  total_amount DECIMAL(12,2),
  delivery_charge DECIMAL(10,2) DEFAULT 0,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  received_by VARCHAR REFERENCES users(id),
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  item_id INTEGER REFERENCES items(id),
  item_name VARCHAR(200) NOT NULL,
  item_sku VARCHAR(100) NOT NULL,
  vendor_sku VARCHAR(100),
  item_description TEXT,
  category_id INTEGER REFERENCES categories(id),
  unit_cost DECIMAL(10,2) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  received BOOLEAN NOT NULL DEFAULT false,
  received_quantity NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chargecodes (
  code VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  authorised_by VARCHAR REFERENCES users(id),
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  pin VARCHAR,
  cost_centre VARCHAR,
  activity VARCHAR(200),
  cat3 VARCHAR(200),
  notes_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  on_hold BOOLEAN NOT NULL DEFAULT FALSE,
  hold_reason TEXT,
  held_at TIMESTAMP,
  held_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for querying on-hold charge codes
CREATE INDEX IF NOT EXISTS idx_chargecodes_on_hold ON chargecodes(on_hold);

-- Authorized users for charge codes (for verification purposes)
CREATE TABLE IF NOT EXISTS charge_code_authorized_users (
  id SERIAL PRIMARY KEY,
  charge_code VARCHAR NOT NULL REFERENCES chargecodes(code) ON DELETE CASCADE,
  user_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  department VARCHAR(200),
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_charge_code_authorized_users_charge_code ON charge_code_authorized_users(charge_code);
CREATE INDEX IF NOT EXISTS idx_charge_code_authorized_users_user_name ON charge_code_authorized_users(user_name);

CREATE TABLE IF NOT EXISTS charge_code_exclusions (
  id SERIAL PRIMARY KEY,
  charge_code VARCHAR NOT NULL REFERENCES chargecodes(code),
  item_id INTEGER REFERENCES items(id),
  category_id INTEGER REFERENCES categories(id),
  sku_pattern VARCHAR,
  name_pattern VARCHAR,
  exclusion_type VARCHAR(20) NOT NULL DEFAULT 'item',
  reason TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notes table and indexes have been moved to earlier in the file

-- Indexes for items table to improve query performance
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
CREATE INDEX IF NOT EXISTS idx_items_active_category ON items(is_active, category_id);
CREATE INDEX IF NOT EXISTS idx_items_low_stock_ack ON items(low_stock_acknowledged_at) WHERE low_stock_acknowledged_at IS NOT NULL;
-- Critical index for low stock alerts query (used by /api/system/alerts)
CREATE INDEX IF NOT EXISTS idx_items_low_stock_check ON items(is_active, current_stock, minimum_stock) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  default_roles JSONB NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Insert default permission definitions
INSERT INTO permission_definitions (name, description, category, default_roles, is_system) VALUES
('inventory.view', 'View inventory items and stock levels', 'Inventory', '["user", "superuser", "admin"]', true),
('inventory.add', 'Add new inventory items', 'Inventory', '["superuser", "admin"]', true),
('inventory.edit', 'Edit existing inventory items', 'Inventory', '["superuser", "admin"]', true),
('inventory.delete', 'Delete inventory items', 'Inventory', '["admin"]', true),
('sales.view', 'View sales records', 'Sales', '["user", "superuser", "admin"]', true),
('sales.create', 'Create new sales', 'Sales', '["user", "superuser", "admin"]', true),
('sales.edit', 'Edit existing sales', 'Sales', '["superuser", "admin"]', true),
('sales.delete', 'Delete sales records', 'Sales', '["admin"]', true),
('sales.refund', 'Process sales refunds', 'Sales', '["admin"]', true),
('quotes.view', 'View quotes', 'Quotes', '["user", "superuser", "admin"]', true),
('quotes.create', 'Create new quotes', 'Quotes', '["user", "superuser", "admin"]', true),
('quotes.edit', 'Edit existing quotes', 'Quotes', '["superuser", "admin"]', true),
('quotes.convert', 'Convert quotes to sales', 'Quotes', '["superuser", "admin"]', true),
('orders.view', 'View orders', 'Orders', '["user", "superuser", "admin"]', true),
('orders.create', 'Create new orders', 'Orders', '["superuser", "admin"]', true),
('orders.edit', 'Edit existing orders', 'Orders', '["superuser", "admin"]', true),
('orders.receive', 'Receive orders', 'Orders', '["superuser", "admin"]', true),
('vendors.view', 'View vendor information', 'Vendors', '["user", "superuser", "admin"]', true),
('vendors.manage', 'Manage vendor information', 'Vendors', '["superuser", "admin"]', true),
('categories.view', 'View categories', 'Categories', '["user", "superuser", "admin"]', true),
('categories.add', 'Add new categories', 'Categories', '["admin"]', true),
('categories.manage', 'Manage categories', 'Categories', '["admin"]', true),
('reports.view', 'View reports', 'Reports', '["superuser", "admin"]', true),
('reports.advanced', 'Access advanced reporting features', 'Reports', '["superuser", "admin"]', true),
('backup.create', 'Create system backups', 'System', '["admin"]', true),
('backup.restore', 'Restore system backups', 'System', '["admin"]', true),
('users.view', 'View user accounts', 'Users', '["admin"]', true),
('users.add', 'Add new user accounts', 'Users', '["admin"]', true),
('users.manage', 'Manage user accounts', 'Users', '["admin"]', true),
('users.manage_permissions', 'Manage user permissions', 'Users', '["admin"]', true),
('settings.view', 'View system settings', 'Settings', '["admin"]', true),
('settings.edit', 'Edit system settings', 'Settings', '["admin"]', true),
('permissions.view', 'View permissions', 'Permissions', '["admin"]', true),
('permissions.manage', 'Manage user permissions', 'Permissions', '["admin"]', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings (only meaningful and practical settings)
INSERT INTO system_settings (key, value, description, category, is_system) VALUES
-- Permission settings
('permissions.quote_to_sale_roles', '["superuser", "admin"]', 'Roles allowed to convert quotes to sales', 'permissions', true),
('permissions.manage_categories_roles', '["admin"]', 'Roles allowed to manage categories', 'permissions', true),
('permissions.add_vendor_roles', '["superuser", "admin"]', 'Roles allowed to add vendors', 'permissions', true),
('permissions.database_backup_roles', '["admin"]', 'Roles allowed to create database backups', 'permissions', true),
('permissions.generate_reports_roles', '["superuser", "admin"]', 'Roles allowed to generate reports', 'permissions', true),
('permissions.enforce', 'true', 'Whether to enforce permission checks', 'permissions', true),
-- Security settings
('security.password_min_length', '8', 'Minimum password length', 'security', true),
('security.session_secure', 'true', 'Require secure session cookies', 'security', true),
('security.login_attempts_max', '5', 'Maximum failed login attempts before lockout', 'security', true),
-- Notification settings
('notifications.show_low_stock', 'true', 'Show low stock notifications', 'notifications', true),
('notifications.email_enabled', 'false', 'Enable email notifications', 'notifications', true)
ON CONFLICT (key) DO NOTHING;

-- Add test data for running tests
INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES
('admin_001', 'admin@university.edu', '$2b$12$O.xpd3Qc7uRGRBfBA.lBS.PoJdCKIRztlp9nzbtZ/o00m5MhJ6eGi', 'Admin', 'University', 'admin'),
('test-admin', 'admin@test.com', '$2b$12$KePIKhFQ9WWtyRdgcCGhfuKvSBbY0jYC0M1VhEvEXOWxdapTQWz16', 'Test', 'Admin', 'admin'),
('test-user', 'user@test.com', '$2b$12$KePIKhFQ9WWtyRdgcCGhfuKvSBbY0jYC0M1VhEvEXOWxdapTQWz16', 'Test', 'User', 'user'),
('test-superuser', 'superuser@test.com', '$2b$12$KePIKhFQ9WWtyRdgcCGhfuKvSBbY0jYC0M1VhEvEXOWxdapTQWz16', 'Test', 'Superuser', 'superuser')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Electronic devices and components'),
(2, 'Stationery', 'Office and school supplies'),
(3, 'Furniture', 'Office and laboratory furniture')
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, name, sku, description, category_id, price, current_stock, minimum_stock, unit, location, notes_id, created_by) VALUES
(1, 'Test Item 1', 'TEST001', 'Test item for automated tests', 1, 50.00, 100, 10, 'pieces', 'Lab Room A, Shelf 1', NULL, 'test-admin'),
(2, 'Test Item 2', 'TEST002', 'Another test item', 1, 25.00, 50, 5, 'pieces', 'Storage Room B', NULL, 'test-admin'),
(3, 'Test VAT Item', 'VAT001', 'Test item with VAT', 2, 120.00, 30, 5, 'boxes', 'Office Cupboard', NULL, 'test-admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chargecodes (code, title, authorised_by) VALUES
('TEST001', 'Test Charge Code 1', 'test-admin'),
('TEST002', 'Test Charge Code 2', 'test-admin'),
('DEPT001', 'Department Test Code', 'test-admin')
ON CONFLICT (code) DO NOTHING;

-- Charge code assignments table (for permission system)
CREATE TABLE IF NOT EXISTS charge_code_assignments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charge_code VARCHAR(50) NOT NULL REFERENCES chargecodes(code) ON DELETE CASCADE,
  assigned_by VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT unique_user_charge_code UNIQUE (user_id, charge_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_charge_code_assignments_user_id ON charge_code_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_charge_code_assignments_charge_code ON charge_code_assignments(charge_code);

-- Comments for documentation
COMMENT ON TABLE charge_code_assignments IS 'Links users to specific charge codes they are authorized to use';
COMMENT ON COLUMN charge_code_assignments.user_id IS 'User who is assigned the charge code';
COMMENT ON COLUMN charge_code_assignments.charge_code IS 'The charge code assigned to the user';
COMMENT ON COLUMN charge_code_assignments.assigned_by IS 'Admin user who made the assignment';
COMMENT ON COLUMN charge_code_assignments.notes IS 'Optional notes about why this assignment was made';

-- Reset sequences to ensure consistent test data
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));