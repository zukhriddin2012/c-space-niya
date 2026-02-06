-- ROLLBACK for 20260206_006_rls_policies.sql
-- Use this ONLY if RLS policies are causing issues.

-- Remove policies
DROP POLICY IF EXISTS "anon_no_access_employees" ON employees;
DROP POLICY IF EXISTS "service_role_full_access_employees" ON employees;
DROP POLICY IF EXISTS "anon_no_access_attendance" ON attendance;
DROP POLICY IF EXISTS "service_role_full_access_attendance" ON attendance;
DROP POLICY IF EXISTS "anon_no_access_refresh_tokens" ON refresh_tokens;
DROP POLICY IF EXISTS "service_role_full_access_refresh_tokens" ON refresh_tokens;
DROP POLICY IF EXISTS "anon_no_access_token_blacklist" ON token_blacklist;
DROP POLICY IF EXISTS "service_role_full_access_token_blacklist" ON token_blacklist;
DROP POLICY IF EXISTS "anon_no_access_audit_log" ON audit_log;
DROP POLICY IF EXISTS "service_role_full_access_audit_log" ON audit_log;
DROP POLICY IF EXISTS "anon_no_access_candidate_documents" ON candidate_documents;
DROP POLICY IF EXISTS "service_role_full_access_candidate_documents" ON candidate_documents;

-- Disable RLS
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents DISABLE ROW LEVEL SECURITY;
