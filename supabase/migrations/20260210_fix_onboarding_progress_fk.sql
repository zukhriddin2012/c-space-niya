-- Migration: Fix onboarding_progress FK constraint
-- BUG-003: user_id references auth.users(id) but app uses custom JWT where user.id = employees.id
-- This causes FK violations because the application's user IDs are employee UUIDs, not Supabase Auth UUIDs
-- Date: 2026-02-10

-- Drop the incorrect FK to auth.users
ALTER TABLE onboarding_progress DROP CONSTRAINT IF EXISTS onboarding_progress_user_id_fkey;

-- Add correct FK to employees table
ALTER TABLE onboarding_progress ADD CONSTRAINT onboarding_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE;
