-- Add account_number field to suppliers for tracking vendor account references
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS account_number VARCHAR(25);

COMMENT ON COLUMN suppliers.account_number IS 'Vendor account number or reference code';
