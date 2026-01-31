-- ============================================
-- COMPLETE RESET AND REIMPORT SCRIPT
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- STEP 1: DELETE ALL EXISTING TRANSACTIONS
DELETE FROM transactions;

-- Verify deletion
DO $$
BEGIN
  RAISE NOTICE 'Transactions deleted. Count should be 0:';
END $$;

SELECT COUNT(*) as transactions_after_delete FROM transactions;
