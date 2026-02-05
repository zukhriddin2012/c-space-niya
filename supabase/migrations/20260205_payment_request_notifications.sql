-- =====================================================
-- Migration: Add notification tracking to payment_requests
-- Task: PR2-017 - Wages Section Fixes
-- Date: 2026-02-05
-- Author: Platform Architect (Claude)
-- =====================================================

-- ==========================
-- 1. Add notification columns
-- ==========================
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_sent_by UUID;

-- Add comments for documentation
COMMENT ON COLUMN payment_requests.notification_sent_at IS 'Timestamp when Telegram notifications were sent to employees';
COMMENT ON COLUMN payment_requests.notification_sent_by IS 'User ID who triggered the notification';

-- ==========================
-- 2. Create audit table
-- ==========================
CREATE TABLE IF NOT EXISTS payment_request_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to request (no FK to allow logging deleted requests)
  payment_request_id UUID NOT NULL,

  -- Who performed the action
  actor_id UUID NOT NULL,

  -- What action was performed
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'created', 'submitted', 'approved', 'rejected',
    'paid', 'notified', 'deleted'
  )),

  -- Status change tracking
  old_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Additional context (JSON)
  details JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- 3. Create indexes
-- ==========================

-- Audit table indexes
CREATE INDEX IF NOT EXISTS idx_pr_audit_request
  ON payment_request_audit(payment_request_id);

CREATE INDEX IF NOT EXISTS idx_pr_audit_action
  ON payment_request_audit(action);

CREATE INDEX IF NOT EXISTS idx_pr_audit_created
  ON payment_request_audit(created_at DESC);

-- Notification query index (un-notified paid requests)
CREATE INDEX IF NOT EXISTS idx_pr_notification
  ON payment_requests(notification_sent_at)
  WHERE status = 'paid';

-- Duplicate prevention index (paid requests by period)
CREATE INDEX IF NOT EXISTS idx_pr_paid_period
  ON payment_requests(year, month, status)
  WHERE status = 'paid';

-- ==========================
-- 4. Add table comment
-- ==========================
COMMENT ON TABLE payment_request_audit IS
  'Audit trail for payment request actions. Preserves history even after deletion.';

-- ==========================
-- Migration complete
-- ==========================
