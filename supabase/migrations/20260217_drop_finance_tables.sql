-- Migration: Drop legacy Finance Module tables
-- PR2-059: Finance Consolidation — Phase 3 Cleanup
-- COO confirmed no historical data preservation needed

-- Drop trigger first
DROP TRIGGER IF EXISTS create_journal_on_transaction ON finance_transactions;

-- Drop functions
DROP FUNCTION IF EXISTS create_journal_from_transaction() CASCADE;
DROP FUNCTION IF EXISTS get_account_balance(UUID) CASCADE;

-- Drop tables in dependency order (child → parent)
DROP TABLE IF EXISTS finance_journal_lines CASCADE;
DROP TABLE IF EXISTS finance_journal_entries CASCADE;
DROP TABLE IF EXISTS finance_safe_transactions CASCADE;
DROP TABLE IF EXISTS finance_safes CASCADE;
DROP TABLE IF EXISTS finance_allocations CASCADE;
DROP TABLE IF EXISTS finance_receivables CASCADE;
DROP TABLE IF EXISTS finance_import_batches CASCADE;
DROP TABLE IF EXISTS finance_service_mappings CASCADE;
DROP TABLE IF EXISTS finance_expense_mappings CASCADE;
DROP TABLE IF EXISTS finance_transactions CASCADE;
DROP TABLE IF EXISTS finance_customers CASCADE;
DROP TABLE IF EXISTS finance_accounts CASCADE;

-- Remove finance-specific columns from branches table
ALTER TABLE branches
  DROP COLUMN IF EXISTS special_fund_percentage,
  DROP COLUMN IF EXISTS allocation_threshold,
  DROP COLUMN IF EXISTS expense_auto_approval_limit;
