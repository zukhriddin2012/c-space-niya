-- Migration: Reception Mode - Branch Access Control
-- Version: 1.0
-- Date: 2026-01-31
-- Description: Enables multi-branch access for Reception Mode users
--              Users can be granted access to additional branches beyond their assigned branch

-- ============================================
-- 1. RECEPTION BRANCH ACCESS TABLE
-- ============================================
-- This table tracks which branches a user can access in Reception Mode
-- The user's assigned branch (employees.branch_id) is always included automatically
-- This table only stores ADDITIONAL branch access grants

CREATE TABLE IF NOT EXISTS reception_branch_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES employees(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,  -- Optional notes about why access was granted
  UNIQUE(user_id, branch_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reception_branch_access_user ON reception_branch_access(user_id);
CREATE INDEX IF NOT EXISTS idx_reception_branch_access_branch ON reception_branch_access(branch_id);
CREATE INDEX IF NOT EXISTS idx_reception_branch_access_granted_by ON reception_branch_access(granted_by);

-- ============================================
-- 2. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE reception_branch_access IS 'Stores additional branch access grants for Reception Mode users. User''s assigned branch is always included automatically.';
COMMENT ON COLUMN reception_branch_access.user_id IS 'Employee who has been granted access';
COMMENT ON COLUMN reception_branch_access.branch_id IS 'Branch the user has access to (in addition to their assigned branch)';
COMMENT ON COLUMN reception_branch_access.granted_by IS 'Employee who granted the access (HR, GM, or Branch Manager)';
COMMENT ON COLUMN reception_branch_access.granted_at IS 'When the access was granted';
COMMENT ON COLUMN reception_branch_access.notes IS 'Optional notes about why access was granted';

-- ============================================
-- 3. RLS POLICIES
-- ============================================
-- Enable RLS
ALTER TABLE reception_branch_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own branch access
CREATE POLICY "Users can view own branch access"
  ON reception_branch_access FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: HR/GM/CEO can view all branch access
CREATE POLICY "Admins can view all branch access"
  ON reception_branch_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role IN ('hr', 'general_manager', 'ceo')
    )
  );

-- Policy: Branch Managers can view access for their branch
CREATE POLICY "Branch managers can view branch access"
  ON reception_branch_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'branch_manager'
      AND branch_id = reception_branch_access.branch_id
    )
  );

-- Policy: HR/GM/CEO can insert branch access
CREATE POLICY "Admins can grant branch access"
  ON reception_branch_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role IN ('hr', 'general_manager', 'ceo')
    )
  );

-- Policy: Branch Managers can insert access for their branch only
CREATE POLICY "Branch managers can grant access to their branch"
  ON reception_branch_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'branch_manager'
      AND branch_id = reception_branch_access.branch_id
    )
  );

-- Policy: HR/GM/CEO can delete any branch access
CREATE POLICY "Admins can revoke branch access"
  ON reception_branch_access FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role IN ('hr', 'general_manager', 'ceo')
    )
  );

-- Policy: Branch Managers can delete access for their branch only
CREATE POLICY "Branch managers can revoke access to their branch"
  ON reception_branch_access FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'branch_manager'
      AND branch_id = reception_branch_access.branch_id
    )
  );
