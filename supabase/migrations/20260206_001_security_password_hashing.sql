-- SEC-001: Add password hashing columns to employees table
-- Keeps existing 'password' column for rollback safety during migration period (ADR-003)

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Index for faster lookup during auth
CREATE INDEX IF NOT EXISTS idx_employees_email_lower ON employees (LOWER(email));

COMMENT ON COLUMN employees.password_hash IS 'bcrypt hash (10 rounds). Old plaintext "password" column kept for rollback.';
COMMENT ON COLUMN employees.must_reset_password IS 'When true, user is forced to /auth/reset-password after login.';
COMMENT ON COLUMN employees.password_changed_at IS 'Timestamp of last password change. NULL = never changed (needs reset).';
