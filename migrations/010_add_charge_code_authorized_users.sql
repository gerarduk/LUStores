-- Add charge_code_authorized_users table to track who is authorized to use each charge code
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

COMMENT ON TABLE charge_code_authorized_users IS 'Tracks authorized users for each charge code for verification purposes';
COMMENT ON COLUMN charge_code_authorized_users.charge_code IS 'The charge code this authorization is for';
COMMENT ON COLUMN charge_code_authorized_users.user_name IS 'Name of the authorized person';
COMMENT ON COLUMN charge_code_authorized_users.email IS 'Optional email for reference';
COMMENT ON COLUMN charge_code_authorized_users.department IS 'Optional department information';
COMMENT ON COLUMN charge_code_authorized_users.notes IS 'Optional notes about this authorization';
