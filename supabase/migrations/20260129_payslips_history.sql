-- Add columns for historical salary tracking
-- This allows storing advance payments and wage breakdowns

ALTER TABLE payslips
ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS wage_paid DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payslips_year_month ON payslips(year, month);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_year ON payslips(employee_id, year);

-- Comment on columns
COMMENT ON COLUMN payslips.advance_paid IS 'Advance payment (Avans) for the month';
COMMENT ON COLUMN payslips.wage_paid IS 'Main salary payment (Oylik) for the month';
COMMENT ON COLUMN payslips.notes IS 'Additional notes or import source info';
