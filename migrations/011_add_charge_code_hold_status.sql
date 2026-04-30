-- Add on-hold status to charge codes to temporarily suspend usage
ALTER TABLE chargecodes ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chargecodes ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE chargecodes ADD COLUMN IF NOT EXISTS held_at TIMESTAMP;
ALTER TABLE chargecodes ADD COLUMN IF NOT EXISTS held_by VARCHAR REFERENCES users(id);

-- Add index for querying on-hold charge codes
CREATE INDEX IF NOT EXISTS idx_chargecodes_on_hold ON chargecodes(on_hold);

COMMENT ON COLUMN chargecodes.on_hold IS 'Whether this charge code is temporarily suspended from use';
COMMENT ON COLUMN chargecodes.hold_reason IS 'Reason why the charge code is on hold (e.g., near budget limit)';
COMMENT ON COLUMN chargecodes.held_at IS 'When the charge code was put on hold';
COMMENT ON COLUMN chargecodes.held_by IS 'User who put the charge code on hold';
