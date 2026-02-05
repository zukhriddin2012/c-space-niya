-- Migration: Add auth_user_id column to employees table
-- Date: 2026-02-05
-- Description: Links employees to their Supabase auth user accounts
-- This allows looking up employees by their auth user ID instead of just email,
-- which fixes issues where the login email differs from the employee record email

-- Add auth_user_id column to link employees to their auth accounts
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Add unique index to ensure one employee per auth user
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_auth_user_id
ON employees(auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN employees.auth_user_id IS 'Links to auth.users.id - the Supabase auth user ID for this employee';

-- Create a function to automatically link an employee when they first log in
-- This updates the auth_user_id when an employee logs in with a matching email
CREATE OR REPLACE FUNCTION link_employee_on_login()
RETURNS TRIGGER AS $$
BEGIN
  -- If employee doesn't have auth_user_id linked yet, try to link by email match
  UPDATE employees
  SET auth_user_id = NEW.id
  WHERE email = NEW.email
    AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on auth.users requires superuser access
-- Run this manually if you have access:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION link_employee_on_login();
