-- SEC-015: Rate limiting entries (optional DB-backed rate limiting)
-- NOTE: Primary rate limiting uses in-memory Map (ADR-001).
-- This table is a fallback for multi-instance deployments.

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_entries(window_start);

-- Auto-cleanup: delete stale entries older than 1 hour
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', $$DELETE FROM rate_limit_entries WHERE window_start < now() - interval '1 hour'$$);

COMMENT ON TABLE rate_limit_entries IS 'SEC-015: DB-backed rate limiting (fallback). Primary limiter is in-memory.';
