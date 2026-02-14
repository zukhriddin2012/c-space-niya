-- ============================================================
-- CSN-029: Multi-Branch Access for Employees
-- Migration: Add assignment_type, notes to branch_employee_assignments
--            Add auto_granted_from to reception_branch_access
-- ============================================================

-- AT-1: Add assignment_type and notes columns to branch_employee_assignments
ALTER TABLE branch_employee_assignments
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) NOT NULL DEFAULT 'temporary'
    CHECK (assignment_type IN ('temporary', 'regular', 'permanent_transfer')),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for filtering by assignment type
CREATE INDEX IF NOT EXISTS idx_branch_assignments_type
  ON branch_employee_assignments(assignment_type)
  WHERE removed_at IS NULL;

-- AT-3: Add auto_granted_from to reception_branch_access (links back to assignment)
ALTER TABLE reception_branch_access
  ADD COLUMN IF NOT EXISTS auto_granted_from UUID REFERENCES branch_employee_assignments(id)
    ON DELETE SET NULL;

-- Index for finding auto-granted access entries (for cleanup on assignment removal)
CREATE INDEX IF NOT EXISTS idx_branch_access_auto_granted
  ON reception_branch_access(auto_granted_from)
  WHERE auto_granted_from IS NOT NULL;

-- AT-8: Index for efficient expiry checks
CREATE INDEX IF NOT EXISTS idx_branch_assignments_ends_at
  ON branch_employee_assignments(ends_at)
  WHERE removed_at IS NULL AND ends_at IS NOT NULL;
