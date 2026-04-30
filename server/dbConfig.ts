// Database configuration that works with both local PostgreSQL and Neon
// Import environment variables first to ensure they're loaded
import { ENV } from './env';
import { drizzle } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '@shared/schema'
import pg from "pg";
const { Pool } = pg;
const DATABASE_URL = ENV.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Determine if we're using Neon (production) or local PostgreSQL (development)
const isNeonDatabase = DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('neon.db');

let db: any;

if (isNeonDatabase) {
  // Use Neon serverless driver for production
  // Disable prepared statements for serverless/HTTP connections
  const sql = neon(DATABASE_URL);
  db = drizzleNeon(sql, { 
    schema,
    casing: 'snake_case', // Use snake_case for better compatibility
  });
  console.log('🔗 Using Neon serverless database driver (prepared statements disabled)');
} else {
  // Use standard PostgreSQL driver for local development
  // Prepared statements work fine with persistent connections
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // 30 seconds - increased for slower networks
    statement_timeout: 30000, // 30 seconds for query execution
  });
  
  // Add error handler to prevent crashes
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });
  
  db = drizzle(pool, { 
    schema,
    casing: 'snake_case', // Use snake_case for consistency
  });
  console.log('🔗 Using PostgreSQL pool driver (prepared statements enabled)');
}

export { db };
