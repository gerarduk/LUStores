-- Migration: Create archive_jobs table for data archiving system
-- Description: Tracks data archives (orders, sales, stock movements older than threshold)

CREATE TABLE IF NOT EXISTS archive_jobs (
  id SERIAL PRIMARY KEY,
  archive_name VARCHAR(255) NOT NULL,
  archive_path VARCHAR(500) NOT NULL,
  age_threshold_days INTEGER NOT NULL,
  records_archived JSONB NOT NULL DEFAULT '{}'::jsonb,
  archive_size_bytes BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_by VARCHAR(50) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_from_db BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(50) REFERENCES users(id),
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_archive_jobs_status ON archive_jobs(status);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_created_at ON archive_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_deleted_from_db ON archive_jobs(deleted_from_db);

-- Add system setting for default archive threshold
INSERT INTO system_settings (key, value, description, category, is_system)
VALUES (
  'archive_age_threshold_days',
  '2190'::jsonb,
  'Number of days after which data becomes eligible for archiving (default: 6 years = 2190 days)',
  'archiving',
  false
) ON CONFLICT (key) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE archive_jobs IS 'Tracks data archiving jobs including creation, download, and deletion status';
COMMENT ON COLUMN archive_jobs.records_archived IS 'JSON object with counts: {"orders": 50, "sales": 120, "stockMovements": 300, "pdfFiles": 45}';
COMMENT ON COLUMN archive_jobs.status IS 'Status: pending, in_progress, completed, failed';
COMMENT ON COLUMN archive_jobs.deleted_from_db IS 'Whether archived data has been deleted from active database';
