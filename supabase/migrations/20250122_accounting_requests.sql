-- Migration: Accounting Request Management System
-- Version: 1.0
-- Date: 2026-01-22
-- Description: Creates tables for accounting requests (reconciliation, payment, confirmation)

-- ============================================
-- 1. MAIN ACCOUNTING REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(20) UNIQUE NOT NULL, -- ACC-202601-0001

  -- Type & Status
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('reconciliation', 'payment', 'confirmation')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'needs_info', 'pending_approval', 'approved', 'completed', 'rejected', 'cancelled')),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),

  -- Requester Info
  requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  branch_id VARCHAR NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,

  -- Entity Info
  from_entity_id VARCHAR NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,

  -- Common Fields
  title VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT,

  -- ============================================
  -- Reconciliation Request Fields
  -- ============================================
  tenant_name VARCHAR(255),
  tenant_inn VARCHAR(20),
  contract_number VARCHAR(100),
  contract_start_date DATE,
  contract_end_date DATE,
  reconciliation_period_start DATE,
  reconciliation_period_end DATE,

  -- ============================================
  -- Payment Request Fields
  -- ============================================
  recipient_name VARCHAR(255),
  recipient_inn VARCHAR(20),
  amount DECIMAL(15,2),
  payment_category VARCHAR(50) CHECK (payment_category IS NULL OR payment_category IN (
    'office_supplies', 'rent', 'utilities', 'services',
    'equipment', 'marketing', 'salary_hr', 'other'
  )),
  payment_purpose TEXT,
  invoice_number VARCHAR(100),

  -- ============================================
  -- Confirmation Request Fields
  -- ============================================
  client_name VARCHAR(255),
  client_inn VARCHAR(20),
  expected_amount DECIMAL(15,2),
  expected_date DATE,

  -- ============================================
  -- Response Fields (for confirmation type)
  -- ============================================
  confirmation_response VARCHAR(20) CHECK (confirmation_response IS NULL OR confirmation_response IN ('paid', 'not_paid', 'partial')),
  confirmed_amount DECIMAL(15,2),
  payment_date DATE,
  response_notes TEXT,

  -- ============================================
  -- Processing Fields
  -- ============================================
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- ============================================
  -- Approval Fields
  -- ============================================
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_level VARCHAR(20) CHECK (approval_level IS NULL OR approval_level IN ('chief_accountant', 'executive')),
  current_approval_step INTEGER DEFAULT 0,

  -- ============================================
  -- Resolution Fields
  -- ============================================
  resolution_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- ============================================
  -- Rejection Fields
  -- ============================================
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- ============================================
  -- Edit Request Fields
  -- ============================================
  edit_requested BOOLEAN DEFAULT FALSE,
  edit_request_reason TEXT,
  edit_requested_at TIMESTAMP WITH TIME ZONE,

  -- ============================================
  -- Cancellation Fields
  -- ============================================
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  cancellation_reason TEXT,

  -- ============================================
  -- SLA Fields
  -- ============================================
  sla_deadline TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN DEFAULT FALSE,
  sla_warning_sent BOOLEAN DEFAULT FALSE,

  -- ============================================
  -- Timestamps
  -- ============================================
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for accounting_requests
CREATE INDEX idx_accounting_requests_status ON accounting_requests(status);
CREATE INDEX idx_accounting_requests_type ON accounting_requests(request_type);
CREATE INDEX idx_accounting_requests_requester ON accounting_requests(requester_id);
CREATE INDEX idx_accounting_requests_branch ON accounting_requests(branch_id);
CREATE INDEX idx_accounting_requests_assigned ON accounting_requests(assigned_to);
CREATE INDEX idx_accounting_requests_created ON accounting_requests(created_at DESC);
CREATE INDEX idx_accounting_requests_sla ON accounting_requests(sla_deadline) WHERE status NOT IN ('completed', 'rejected', 'cancelled');
CREATE INDEX idx_accounting_requests_pending_approval ON accounting_requests(status, approval_level) WHERE status = 'pending_approval';

-- ============================================
-- 2. APPROVAL WORKFLOW TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_request_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES accounting_requests(id) ON DELETE CASCADE,

  approval_step INTEGER NOT NULL, -- 1 = Chief Accountant, 2 = GM/CEO
  approval_level VARCHAR(20) NOT NULL CHECK (approval_level IN ('chief_accountant', 'executive')),

  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Approval
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Rejection
  rejected_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  comments TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique approval step per request
  UNIQUE(request_id, approval_step)
);

-- Indexes for approvals
CREATE INDEX idx_approvals_request ON accounting_request_approvals(request_id);
CREATE INDEX idx_approvals_status ON accounting_request_approvals(status);
CREATE INDEX idx_approvals_pending ON accounting_request_approvals(approval_level, status) WHERE status = 'pending';

-- ============================================
-- 3. COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_request_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES accounting_requests(id) ON DELETE CASCADE,

  author_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,

  -- Internal comments visible only to accounting team
  is_internal BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX idx_comments_request ON accounting_request_comments(request_id);
CREATE INDEX idx_comments_created ON accounting_request_comments(created_at DESC);

-- ============================================
-- 4. ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_request_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES accounting_requests(id) ON DELETE CASCADE,

  uploaded_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,

  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  file_url TEXT NOT NULL, -- Supabase storage URL

  -- Type of attachment
  attachment_type VARCHAR(20) DEFAULT 'supporting' CHECK (attachment_type IN ('supporting', 'result', 'proof')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for attachments
CREATE INDEX idx_attachments_request ON accounting_request_attachments(request_id);

-- ============================================
-- 5. AUDIT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_request_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES accounting_requests(id) ON DELETE CASCADE,

  actor_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  action VARCHAR(50) NOT NULL,

  -- Field changes
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Additional details as JSON
  details JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for history
CREATE INDEX idx_history_request ON accounting_request_history(request_id);
CREATE INDEX idx_history_created ON accounting_request_history(created_at DESC);
CREATE INDEX idx_history_action ON accounting_request_history(action);

-- ============================================
-- 6. REQUEST NUMBER SEQUENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_request_sequences (
  id SERIAL PRIMARY KEY,
  year_month VARCHAR(6) NOT NULL UNIQUE, -- YYYYMM
  last_number INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. FUNCTION: Generate Request Number
-- ============================================
CREATE OR REPLACE FUNCTION generate_accounting_request_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  current_ym VARCHAR(6);
  next_num INTEGER;
  result VARCHAR(20);
BEGIN
  -- Get current year-month
  current_ym := TO_CHAR(NOW(), 'YYYYMM');

  -- Insert or update sequence
  INSERT INTO accounting_request_sequences (year_month, last_number, updated_at)
  VALUES (current_ym, 1, NOW())
  ON CONFLICT (year_month)
  DO UPDATE SET
    last_number = accounting_request_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_num;

  -- Format: ACC-YYYYMM-XXXX
  result := 'ACC-' || current_ym || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. FUNCTION: Calculate SLA Deadline
-- ============================================
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  p_priority VARCHAR(10),
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  business_days INTEGER;
  deadline TIMESTAMP WITH TIME ZONE;
  days_added INTEGER := 0;
BEGIN
  -- Set business days based on priority
  IF p_priority = 'urgent' THEN
    business_days := 1;
  ELSE
    business_days := 3;
  END IF;

  deadline := p_created_at;

  -- Add business days (skip weekends)
  WHILE days_added < business_days LOOP
    deadline := deadline + INTERVAL '1 day';
    -- Check if it's a weekday (1=Monday, 7=Sunday in ISO)
    IF EXTRACT(ISODOW FROM deadline) < 6 THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;

  -- Set time to end of business day (18:00 UZT = UTC+5)
  deadline := DATE_TRUNC('day', deadline) + INTERVAL '18 hours';

  RETURN deadline;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGER: Auto-generate request number
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_accounting_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_request_number
  BEFORE INSERT ON accounting_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_request_number();

-- ============================================
-- 10. TRIGGER: Auto-set SLA deadline
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := calculate_sla_deadline(NEW.priority, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sla_deadline
  BEFORE INSERT ON accounting_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_sla_deadline();

-- ============================================
-- 11. TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounting_requests_timestamp
  BEFORE UPDATE ON accounting_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER update_approvals_timestamp
  BEFORE UPDATE ON accounting_request_approvals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER update_comments_timestamp
  BEFORE UPDATE ON accounting_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

-- ============================================
-- 12. TRIGGER: Set approval requirements for payments
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_payment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for payment requests
  IF NEW.request_type = 'payment' AND NEW.amount IS NOT NULL THEN
    IF NEW.amount >= 10000000 THEN
      -- 10M+ needs Chief Accountant + Executive
      NEW.requires_approval := TRUE;
      NEW.approval_level := 'executive';
    ELSIF NEW.amount >= 2000000 THEN
      -- 2M-10M needs Chief Accountant only
      NEW.requires_approval := TRUE;
      NEW.approval_level := 'chief_accountant';
    ELSE
      -- Under 2M, no approval needed
      NEW.requires_approval := FALSE;
      NEW.approval_level := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_approval
  BEFORE INSERT OR UPDATE OF amount ON accounting_requests
  FOR EACH ROW
  WHEN (NEW.request_type = 'payment')
  EXECUTE FUNCTION trigger_set_payment_approval();

-- ============================================
-- 13. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE accounting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_request_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all for authenticated users (we'll handle permissions in the app)
CREATE POLICY "Enable all for authenticated users" ON accounting_requests
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON accounting_request_approvals
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON accounting_request_comments
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON accounting_request_attachments
  FOR ALL USING (true);

CREATE POLICY "Enable all for authenticated users" ON accounting_request_history
  FOR ALL USING (true);

-- ============================================
-- 14. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON accounting_requests TO authenticated;
GRANT ALL ON accounting_request_approvals TO authenticated;
GRANT ALL ON accounting_request_comments TO authenticated;
GRANT ALL ON accounting_request_attachments TO authenticated;
GRANT ALL ON accounting_request_history TO authenticated;
GRANT ALL ON accounting_request_sequences TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE accounting_request_sequences_id_seq TO authenticated;
