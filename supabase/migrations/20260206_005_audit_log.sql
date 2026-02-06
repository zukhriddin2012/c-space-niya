-- Sprint 4: Audit log table for security event tracking

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES employees(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  severity TEXT DEFAULT 'info'
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_log(severity);

-- Partition hint: if audit_log grows large, consider range partitioning by timestamp
-- CREATE TABLE audit_log_2026_02 PARTITION OF audit_log FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

COMMENT ON TABLE audit_log IS 'Security audit log for tracking authentication events, admin actions, and security incidents.';
COMMENT ON COLUMN audit_log.action IS 'Event type: login, login_failed, password_change, token_revoke, admin_sql, etc.';
COMMENT ON COLUMN audit_log.severity IS 'info, warning, critical';
COMMENT ON COLUMN audit_log.details IS 'Additional context as JSONB. MUST NOT contain passwords or sensitive data.';
