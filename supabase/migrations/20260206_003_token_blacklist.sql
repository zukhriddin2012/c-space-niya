-- SEC-017: Token blacklist for immediate JWT revocation
-- Used when employee is terminated, changes password, or admin forces logout

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  blacklisted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_blacklist_user ON token_blacklist(user_id);

-- Auto-cleanup: delete expired entries (tokens that would have expired anyway)
-- Run this as a cron job or Supabase pg_cron:
-- SELECT cron.schedule('cleanup-blacklist', '0 2 * * *', $$DELETE FROM token_blacklist WHERE expires_at < now()$$);

COMMENT ON TABLE token_blacklist IS 'SEC-017: JTI-based token blacklist for immediate revocation of access tokens.';
COMMENT ON COLUMN token_blacklist.reason IS 'Why was this token blacklisted: logout, terminated, password_change, admin_revoke';
