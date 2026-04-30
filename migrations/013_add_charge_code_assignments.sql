-- Migration: Add charge code assignments table
-- Description: Links users to specific charge codes they can use for sales

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
