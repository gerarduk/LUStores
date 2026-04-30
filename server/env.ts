// Load environment variables before any other imports
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Export environment variables for type safety
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT || '5000',
  SESSION_SECRET: process.env.SESSION_SECRET,
  DEV_ADMIN_OVERRIDE: process.env.DEV_ADMIN_OVERRIDE === 'true',
} as const;
