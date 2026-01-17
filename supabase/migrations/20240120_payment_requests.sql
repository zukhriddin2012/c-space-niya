-- Payment Requests Table
-- Handles both advance payments (requested by employees) and wage payments
-- HR creates requests, GM approves them

CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('advance', 'wage')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- For advance payments - can be for specific employees
  -- For wage payments - typically for all employees (remaining after advances)
  legal_entity_id VARCHAR(50) REFERENCES legal_entities(id),

  -- Amounts
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,

  -- Status workflow: draft -> pending_approval -> approved -> paid
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'paid')),

  -- Tracking
  created_by VARCHAR(50) NOT NULL, -- User ID who created (HR)
  submitted_at TIMESTAMPTZ, -- When submitted for approval

  approved_by VARCHAR(50), -- User ID who approved (GM)
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(100), -- Bank reference or transaction ID

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment request items - individual employee payments within a request
CREATE TABLE IF NOT EXISTS payment_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  employee_id UUID NOT NULL REFERENCES employees(id),
  legal_entity_id VARCHAR(50) REFERENCES legal_entities(id),

  -- For advance: requested amount
  -- For wage: net_salary - advance_paid
  amount DECIMAL(15, 2) NOT NULL,

  -- For wage calculations
  net_salary DECIMAL(15, 2), -- Full net salary
  advance_paid DECIMAL(15, 2) DEFAULT 0, -- Already paid as advance this month

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_year_month ON payment_requests(year, month);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_type ON payment_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_payment_request_items_request ON payment_request_items(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_items_employee ON payment_request_items(employee_id);

-- Add advance_paid column to payslips to track how much was paid as advance
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS wage_paid DECIMAL(15, 2) DEFAULT 0;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON payment_requests;
CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_requests_updated_at();

-- Comments
COMMENT ON TABLE payment_requests IS 'Payment requests for advance and wage payments, with approval workflow';
COMMENT ON TABLE payment_request_items IS 'Individual employee payments within a payment request';
COMMENT ON COLUMN payment_requests.request_type IS 'advance = partial payment requested by employee, wage = remaining payment after advances';
COMMENT ON COLUMN payment_request_items.advance_paid IS 'Amount already paid as advance for this employee this month';
