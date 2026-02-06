-- SEC-023: Enable Row Level Security on sensitive tables
-- Note: All API routes use supabaseAdmin (service_role) which bypasses RLS.
-- RLS protects against direct anon-key abuse.
-- FIX (OPS-026): Added DROP POLICY IF EXISTS for idempotency.

-- Employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_no_access_employees" ON employees;
CREATE POLICY "anon_no_access_employees" ON employees FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "service_role_full_access_employees" ON employees;
CREATE POLICY "service_role_full_access_employees" ON employees FOR ALL TO service_role USING (true);

-- Attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_no_access_attendance" ON attendance;
CREATE POLICY "anon_no_access_attendance" ON attendance FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "service_role_full_access_attendance" ON attendance;
CREATE POLICY "service_role_full_access_attendance" ON attendance FOR ALL TO service_role USING (true);

-- Refresh tokens table
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_no_access_refresh_tokens" ON refresh_tokens;
CREATE POLICY "anon_no_access_refresh_tokens" ON refresh_tokens FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "service_role_full_access_refresh_tokens" ON refresh_tokens;
CREATE POLICY "service_role_full_access_refresh_tokens" ON refresh_tokens FOR ALL TO service_role USING (true);

-- Token blacklist
ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_no_access_token_blacklist" ON token_blacklist;
CREATE POLICY "anon_no_access_token_blacklist" ON token_blacklist FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "service_role_full_access_token_blacklist" ON token_blacklist;
CREATE POLICY "service_role_full_access_token_blacklist" ON token_blacklist FOR ALL TO service_role USING (true);

-- Audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_no_access_audit_log" ON audit_log;
CREATE POLICY "anon_no_access_audit_log" ON audit_log FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "service_role_full_access_audit_log" ON audit_log;
CREATE POLICY "service_role_full_access_audit_log" ON audit_log FOR ALL TO service_role USING (true);

-- Candidate documents (contains access passwords)
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_no_access_candidate_documents" ON candidate_documents;
CREATE POLICY "anon_no_access_candidate_documents" ON candidate_documents FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "service_role_full_access_candidate_documents" ON candidate_documents;
CREATE POLICY "service_role_full_access_candidate_documents" ON candidate_documents FOR ALL TO service_role USING (true);

COMMENT ON POLICY "anon_no_access_employees" ON employees IS 'SEC-023: Block all direct anon-key access to employees table.';
