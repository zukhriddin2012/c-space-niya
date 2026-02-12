-- ============================================
-- PR2-066: Cash Management for Reception Mode
-- Migration: 20260212_cash_management.sql
-- ============================================
-- Covers: AT-1 (inkasso flag), AT-3 (branch settings),
--         AT-6 (inkasso deliveries), AT-7 (cash transfers),
--         AT-8 (dividend spend requests)
-- ============================================

-- ============================================
-- 1. ALTER transactions — Add is_inkasso column (AT-1)
-- ============================================
-- NULL = non-cash payment (not applicable)
-- FALSE = cash, not inkasso (default for cash)
-- TRUE = cash, inkasso (has official receipt)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_inkasso BOOLEAN DEFAULT NULL;

-- Partial index: only cash transactions with inkasso flag
CREATE INDEX IF NOT EXISTS idx_transactions_inkasso
  ON transactions (branch_id, transaction_date DESC)
  WHERE is_inkasso IS NOT NULL;

-- Index for undelivered inkasso lookup (AT-6)
CREATE INDEX IF NOT EXISTS idx_transactions_inkasso_undelivered
  ON transactions (branch_id, transaction_date DESC)
  WHERE is_inkasso = TRUE;

COMMENT ON COLUMN transactions.is_inkasso IS 'NULL=non-cash, FALSE=cash-no-receipt, TRUE=cash-with-official-receipt';

-- ============================================
-- 2. ALTER branches — Add cash management settings (AT-3)
-- ============================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS cash_opex_percentage DECIMAL(5,2) DEFAULT 20.0
    CONSTRAINT chk_cash_opex_pct CHECK (cash_opex_percentage >= 0 AND cash_opex_percentage <= 100),
  ADD COLUMN IF NOT EXISTS cash_marketing_percentage DECIMAL(5,2) DEFAULT 2.5
    CONSTRAINT chk_cash_marketing_pct CHECK (cash_marketing_percentage IN (2.5, 5.0)),
  ADD COLUMN IF NOT EXISTS cash_transfer_threshold DECIMAL(18,2) DEFAULT 5000000;

COMMENT ON COLUMN branches.cash_opex_percentage IS 'OpEx allocation % of non-inkasso cash (fixed at 20, stored for flexibility)';
COMMENT ON COLUMN branches.cash_marketing_percentage IS 'Marketing/Charity allocation % (2.5 or 5.0, branch-dependent)';
COMMENT ON COLUMN branches.cash_transfer_threshold IS 'Non-inkasso cash threshold before GM should collect (default 5M UZS)';

-- ============================================
-- 3. CREATE inkasso_deliveries + inkasso_delivery_items (AT-6)
-- ============================================

CREATE TABLE IF NOT EXISTS inkasso_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id VARCHAR NOT NULL REFERENCES branches(id),
  delivered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivered_by UUID NOT NULL REFERENCES employees(id),
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inkasso_deliveries_branch
  ON inkasso_deliveries (branch_id, delivered_date DESC);

CREATE TABLE IF NOT EXISTS inkasso_delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES inkasso_deliveries(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id)  -- Each transaction can only be delivered once
);

CREATE INDEX IF NOT EXISTS idx_inkasso_delivery_items_delivery
  ON inkasso_delivery_items (delivery_id);
CREATE INDEX IF NOT EXISTS idx_inkasso_delivery_items_transaction
  ON inkasso_delivery_items (transaction_id);

-- RLS
ALTER TABLE inkasso_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inkasso_delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON inkasso_deliveries FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON inkasso_delivery_items FOR ALL USING (true);

GRANT ALL ON inkasso_deliveries TO authenticated;
GRANT ALL ON inkasso_delivery_items TO authenticated;

-- ============================================
-- 4. CREATE cash_transfers (AT-7)
-- ============================================

CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id VARCHAR NOT NULL REFERENCES branches(id),
  dividend_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  marketing_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL GENERATED ALWAYS AS (dividend_amount + marketing_amount) STORED,
  transferred_by UUID NOT NULL REFERENCES employees(id),
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_transfers_branch
  ON cash_transfers (branch_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_date
  ON cash_transfers (transfer_date DESC);

-- RLS
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON cash_transfers FOR ALL USING (true);
GRANT ALL ON cash_transfers TO authenticated;

-- ============================================
-- 5. CREATE dividend_spend_requests (AT-8)
-- ============================================

DO $$ BEGIN
  CREATE TYPE dividend_spend_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS dividend_spend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id VARCHAR NOT NULL REFERENCES branches(id),

  -- Expense details (stored at request time; expense created after approval)
  expense_subject TEXT NOT NULL,
  expense_amount DECIMAL(18,2) NOT NULL,
  expense_type_id UUID NOT NULL REFERENCES expense_types(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Funding breakdown
  opex_portion DECIMAL(18,2) NOT NULL DEFAULT 0,
  dividend_portion DECIMAL(18,2) NOT NULL,

  reason TEXT NOT NULL,

  -- Requestor
  requested_by UUID NOT NULL REFERENCES employees(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Review
  status dividend_spend_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,

  -- Linked expense (created after approval)
  expense_id UUID REFERENCES expenses(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dividend_spend_requests_branch
  ON dividend_spend_requests (branch_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_spend_requests_status
  ON dividend_spend_requests (status)
  WHERE status = 'pending';

-- D-9: Index for reviewer lookup on pending requests
CREATE INDEX IF NOT EXISTS idx_dividend_spend_requests_reviewer
  ON dividend_spend_requests (reviewed_by)
  WHERE status = 'pending';

-- RLS
ALTER TABLE dividend_spend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON dividend_spend_requests FOR ALL USING (true);
GRANT ALL ON dividend_spend_requests TO authenticated;
