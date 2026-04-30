-- Migration: Add show_picking_list preference to users table
-- Date: 2026-01-12
-- Description: Adds a boolean field to control whether users see picking lists after completing sales

-- Add the show_picking_list column with default value of true
ALTER TABLE users
ADD COLUMN IF NOT EXISTS show_picking_list BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN users.show_picking_list IS 'User preference: whether to display item locations and picking list after completing sales';

-- Create index for faster queries (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_users_show_picking_list ON users(show_picking_list);

-- Verification query (uncomment to test)
-- SELECT id, email, show_picking_list FROM users LIMIT 5;
