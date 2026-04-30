-- Migration: Add indexes to items table for faster search performance
-- Created: 2025-11-26
-- Description: Adds indexes to improve query performance on items table
--
-- STATUS: APPLIED TO init.sql
-- All indexes below are already created in init.sql
-- This file is retained for documentation purposes only

-- The following indexes have been incorporated into init.sql:
-- - idx_items_name ON items(name)
-- - idx_items_category ON items(category_id)
-- - idx_items_is_active ON items(is_active)
-- - idx_items_updated_at ON items(updated_at)
-- - idx_items_active_category ON items(is_active, category_id)

-- Note: SKU already has a unique index from the UNIQUE constraint
