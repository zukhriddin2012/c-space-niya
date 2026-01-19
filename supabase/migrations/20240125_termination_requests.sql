-- Termination Requests Migration
-- Creates table for managing employee termination requests with GM approval workflow

-- Create the termination_requests table
CREATE TABLE IF NOT EXISTS termination_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES employees(id),
  reason TEXT NOT NULL,
  termination_date DATE NOT NULL,  -- Planned last working day
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_by UUID REFERENCES employees(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_termination_requests_employee ON termination_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_termination_requests_status ON termination_requests(status);
CREATE INDEX IF NOT EXISTS idx_termination_requests_requested_by ON termination_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_termination_requests_created ON termination_requests(created_at DESC);

-- Add constraint for status values
ALTER TABLE termination_requests
ADD CONSTRAINT chk_termination_request_status
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_termination_requests_updated_at ON termination_requests;
CREATE TRIGGER update_termination_requests_updated_at
    BEFORE UPDATE ON termination_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE termination_requests IS 'Tracks employee termination requests requiring GM approval';
COMMENT ON COLUMN termination_requests.employee_id IS 'The employee to be terminated';
COMMENT ON COLUMN termination_requests.requested_by IS 'HR manager who initiated the termination request';
COMMENT ON COLUMN termination_requests.reason IS 'Reason for termination';
COMMENT ON COLUMN termination_requests.termination_date IS 'Planned last working day for the employee';
COMMENT ON COLUMN termination_requests.status IS 'Current status: pending, approved, rejected, or cancelled';
COMMENT ON COLUMN termination_requests.approved_by IS 'GM who approved/rejected the request';
