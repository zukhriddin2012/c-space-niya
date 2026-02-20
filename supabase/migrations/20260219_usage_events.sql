-- ============================================
-- CSN-186: System Adoption — Usage Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                -- auth.users id or 'kiosk:{branchId}'
  module TEXT NOT NULL,                 -- e.g. 'employees', 'attendance', 'payroll'
  action_type TEXT NOT NULL,            -- e.g. 'view', 'create', 'edit', 'delete', 'export', 'approve'
  endpoint TEXT,                        -- API path, e.g. '/api/employees'
  branch_id UUID,                       -- for branch-level aggregation
  metadata JSONB DEFAULT '{}',          -- optional: resource_id, operatorId, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query patterns:

-- 1. "All events for a user in last N days" (user scores)
CREATE INDEX idx_usage_events_user_created
  ON usage_events (user_id, created_at DESC);

-- 2. "All events for a module in last N days" (module scores)
CREATE INDEX idx_usage_events_module_created
  ON usage_events (module, created_at DESC);

-- 3. "All events in a time range" (platform score)
CREATE INDEX idx_usage_events_created
  ON usage_events (created_at DESC);

-- 4. "All events for a branch in last N days" (branch scores)
CREATE INDEX idx_usage_events_branch_created
  ON usage_events (branch_id, created_at DESC)
  WHERE branch_id IS NOT NULL;

-- 5. Dedupe: prevent identical events within short window
CREATE INDEX idx_usage_events_dedupe
  ON usage_events (user_id, module, action_type, endpoint, created_at DESC);

COMMENT ON TABLE usage_events IS 'CSN-186: Tracks API and frontend usage events for adoption scoring';
COMMENT ON COLUMN usage_events.user_id IS 'auth.users UUID or kiosk:{branchId} for kiosk sessions';
COMMENT ON COLUMN usage_events.module IS 'Business module name (employees, attendance, payroll, etc.)';
COMMENT ON COLUMN usage_events.action_type IS 'Action category: view, create, edit, delete, export, approve';
COMMENT ON COLUMN usage_events.branch_id IS 'Branch context for branch-level aggregation';
