-- Migration: Allow NULL values for audit trail fields
-- This allows users to be deleted while preserving historical records
--
-- STATUS: APPLIED TO init.sql
-- All fields below are already nullable in init.sql
-- This file is retained for documentation purposes only

-- The following changes have been incorporated into init.sql:
-- - items.created_by: VARCHAR REFERENCES users(id) (nullable)
-- - stock_movements.performed_by: VARCHAR NOT NULL REFERENCES users(id)
-- - sales.processed_by: VARCHAR REFERENCES users(id) (nullable)
-- - quotes.created_by: VARCHAR NOT NULL REFERENCES users(id)
-- - orders.created_by: VARCHAR NOT NULL REFERENCES users(id)
-- - charge_code_exclusions.created_by: VARCHAR NOT NULL REFERENCES users(id)

-- Note: Some fields like stock_movements.performed_by remain NOT NULL by design
-- as stock movements require accountability
