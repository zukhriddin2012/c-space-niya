-- Add plaintext branch password column for sharing via Telegram
-- The kiosk password is a shared branch access code (not a personal secret),
-- so storing a retrievable copy is acceptable for distribution purposes.

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS reception_password_plain TEXT DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN branches.reception_password_plain IS 'Plaintext kiosk password for sharing with employees (e.g. via Telegram). Updated alongside reception_password_hash.';
