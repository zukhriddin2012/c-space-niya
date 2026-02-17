-- Migration: Branch Profit-Sharing Deals
-- PR2-059: Finance Consolidation
-- Date: 2026-02-17

-- ============================================
-- BRANCH PROFIT DEALS TABLE
-- ============================================
-- Stores profit-sharing agreements between C-Space and branch investors.
-- Each branch has exactly one active deal at a time (effective_until IS NULL).
-- When a deal is renegotiated, the old deal gets an effective_until date
-- and a new row is created. Historical reports use the deal that was active
-- during the queried period.

CREATE TABLE IF NOT EXISTS branch_profit_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id VARCHAR NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  investor_name VARCHAR(200) NOT NULL,
  cspace_percentage DECIMAL(5,2) NOT NULL,
  investor_percentage DECIMAL(5,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE,  -- NULL = currently active deal
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),

  -- Percentages must sum to 100
  CONSTRAINT chk_profit_split_sum
    CHECK (cspace_percentage + investor_percentage = 100),

  -- Percentages must be non-negative
  CONSTRAINT chk_cspace_pct_range
    CHECK (cspace_percentage >= 0 AND cspace_percentage <= 100),
  CONSTRAINT chk_investor_pct_range
    CHECK (investor_percentage >= 0 AND investor_percentage <= 100),

  -- effective_until must be after effective_from
  CONSTRAINT chk_date_range
    CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- Only one active deal (effective_until IS NULL) per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_profit_deals_active
  ON branch_profit_deals(branch_id)
  WHERE effective_until IS NULL;

-- Query by branch + date range (for historical period lookups)
CREATE INDEX IF NOT EXISTS idx_branch_profit_deals_branch_dates
  ON branch_profit_deals(branch_id, effective_from, effective_until);

-- Query all active deals
CREATE INDEX IF NOT EXISTS idx_branch_profit_deals_active_all
  ON branch_profit_deals(effective_until)
  WHERE effective_until IS NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE branch_profit_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON branch_profit_deals FOR ALL USING (true);
