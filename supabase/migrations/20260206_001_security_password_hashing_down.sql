-- ROLLBACK for 20260206_001_security_password_hashing.sql
-- WARNING: Only run this if hash-passwords.ts has NOT been executed.
-- If passwords have been hashed, rolling back will lose the hashes.
-- The plaintext password column is retained for 2-week rollback safety.

ALTER TABLE employees DROP COLUMN IF EXISTS password_hash;
ALTER TABLE employees DROP COLUMN IF EXISTS must_reset_password;
ALTER TABLE employees DROP COLUMN IF EXISTS password_changed_at;
DROP INDEX IF EXISTS idx_employees_email_lower;
