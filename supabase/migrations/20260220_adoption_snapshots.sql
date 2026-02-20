-- CSN-186 Phase 2: Daily pre-computed adoption score snapshots
-- Stores one row per (date, period) for trend chart data

CREATE TABLE IF NOT EXISTS adoption_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('7d', '30d', '90d')),
  score INTEGER NOT NULL DEFAULT 0,
  breadth INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  frequency INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  action_count INTEGER NOT NULL DEFAULT 0,
  module_scores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_snapshot_date_period UNIQUE (snapshot_date, period)
);

-- Primary query: "Get last N snapshots for a period" (trend chart)
CREATE INDEX idx_adoption_snapshots_period_date
  ON adoption_snapshots (period, snapshot_date DESC);

COMMENT ON TABLE adoption_snapshots IS 'CSN-186: Daily pre-computed adoption scores for trend tracking';
