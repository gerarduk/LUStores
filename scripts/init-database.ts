// Database initialization script for tests and development
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/test_inventory'
  });
  
  const db = drizzle(pool, { schema });
  
  try {
    console.log('🚀 Initializing database schema...');
    console.log('📡 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // For test/development, we'll drop and recreate all tables
    // This ensures a clean state for testing
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.log('🔄 Dropping existing tables for clean state...');
      
      // Drop tables in reverse dependency order
      const dropQueries = [
        'DROP TABLE IF EXISTS sale_items CASCADE',
        'DROP TABLE IF EXISTS quote_items CASCADE', 
        'DROP TABLE IF EXISTS order_items CASCADE',
        'DROP TABLE IF EXISTS stock_movements CASCADE',
        'DROP TABLE IF EXISTS sales CASCADE',
        'DROP TABLE IF EXISTS quotes CASCADE',
        'DROP TABLE IF EXISTS orders CASCADE',
        'DROP TABLE IF EXISTS notes CASCADE',
        'DROP TABLE IF EXISTS items CASCADE',
        'DROP TABLE IF EXISTS categories CASCADE',
        'DROP TABLE IF EXISTS suppliers CASCADE',
        'DROP TABLE IF EXISTS sources CASCADE',
        'DROP TABLE IF EXISTS charge_code_exclusions CASCADE',
        'DROP TABLE IF EXISTS chargecodes CASCADE',
        'DROP TABLE IF EXISTS user_permissions CASCADE',
        'DROP TABLE IF EXISTS permission_definitions CASCADE',
        'DROP TABLE IF EXISTS users CASCADE',
        'DROP TABLE IF EXISTS system_settings CASCADE',
        'DROP TABLE IF EXISTS sessions CASCADE',
      ];
      
      for (const query of dropQueries) {
        try {
          await pool.query(query);
        } catch (error) {
          // Ignore errors for non-existent tables
          console.log(`ℹ️ ${query} - ${error.message}`);
        }
      }
    }
    
    // Create all tables using the schema
    console.log('🔨 Creating tables from schema...');
    
    // Sessions table (required for session management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    `);
    
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
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
    `);
    // Notes table for system-wide notes that can be attached to items, suppliers, orders, and charge codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        reference_type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(100) NOT NULL,
        created_by VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notes_reference ON notes(reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
      CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    `);
    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50) NOT NULL DEFAULT 'fas fa-box',
        color VARCHAR(50) NOT NULL DEFAULT 'blue',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
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
        unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
        location VARCHAR(200),
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes_id INTEGER REFERENCES notes(id) DEFAULT null,
        created_by VARCHAR REFERENCES users(id),
        updated_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Suppliers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR PRIMARY KEY NOT NULL,
        name VARCHAR(200) NOT NULL,
        contact VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(20),
        address TEXT,
        notes_id INTEGER REFERENCES notes(id) DEFAULT null,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Sources table (item-supplier relationships)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        price DECIMAL(10,2),
        notes_id INTEGER REFERENCES notes(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Charge codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chargecodes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        description TEXT,
        department VARCHAR(100),
        cost_centre VARCHAR(100),
        notes_id INTEGER REFERENCES notes(id) DEFAULT null,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        sale_id VARCHAR(50) NOT NULL UNIQUE,
        charge_code VARCHAR(100) NOT NULL,
        subtotal_amount DECIMAL(12,2) NOT NULL,
        vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(12,2) NOT NULL,
        vat_applied BOOLEAN NOT NULL DEFAULT true,
        customer_info JSONB,
        notes_id INTEGER REFERENCES notes(id) DEFAULT null,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        is_paid BOOLEAN NOT NULL DEFAULT false,
        processed_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Sale items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id),
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
    `);
    
    // Quotes table
    await pool.query(`
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
        notes_id INTEGER REFERENCES notes(id) DEFAULT null,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        session_id VARCHAR(255),
        last_accessed_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        created_by VARCHAR REFERENCES users(id),
        processed_by VARCHAR REFERENCES users(id),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Indexes for efficient session-based draft quote management
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_session_user ON quotes(session_id, created_by);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_expiry ON quotes(expires_at) WHERE status = 'draft';
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_status_session ON quotes(status, session_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_last_accessed ON quotes(last_accessed_at);
    `);
    
    // Quote items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quote_items (
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
    `);
    
    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_reference VARCHAR(100),
        order_date DATE NOT NULL,
        expected_delivery_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        notes TEXT,
        notes_id INTEGER REFERENCES notes(id) DEFAULT null,
        total_amount DECIMAL(10,2) DEFAULT 0,
        created_by VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Order items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        item_id INTEGER REFERENCES items(id),
        item_name VARCHAR(200) NOT NULL,
        item_sku VARCHAR(100) NOT NULL,
        item_description TEXT,
        category_id INTEGER REFERENCES categories(id),
        unit_cost DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        total_cost DECIMAL(12,2) NOT NULL,
        received BOOLEAN NOT NULL DEFAULT false,
        received_quantity INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Stock movements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        type VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        reason TEXT,
        performed_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Charge code exclusions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS charge_code_exclusions (
        id SERIAL PRIMARY KEY,
        charge_code VARCHAR NOT NULL REFERENCES chargecodes(code),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        created_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // System settings table
    await pool.query(`
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
    `);
    
    // Permission definitions table
    await pool.query(`
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
    `);
    
    // User permissions table
    await pool.query(`
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
    `);

    // Notes table for system-wide notes that can be attached to items, suppliers, orders, and charge codes
    
    
    console.log('✅ All tables created successfully');
    
    // Insert some basic test data for development/test environments
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.log('🌱 Seeding basic test data...');
      
      // Insert basic charge codes
      await pool.query(`
        INSERT INTO chargecodes (code, title) VALUES 
        ('TEST001', 'Test Department 1'),
        ('DEV002', 'Development Testing')
        ON CONFLICT (code) DO NOTHING;
      `);
      
      // Insert basic categories
      await pool.query(`
        INSERT INTO categories (name, description) VALUES 
        ('Electronics', 'Electronic components and devices'),
        ('Office Supplies', 'General office supplies'),
        ('Laboratory', 'Laboratory equipment and supplies')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('✅ Basic test data seeded');
    }
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase().catch(console.error);
}

export { initializeDatabase };
