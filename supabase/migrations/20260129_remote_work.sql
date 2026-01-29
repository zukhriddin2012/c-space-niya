-- Add remote work capability to employees
-- This allows certain employees to check in remotely without GPS verification

ALTER TABLE employees ADD COLUMN IF NOT EXISTS remote_work_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN employees.remote_work_enabled IS 'If true, employee can check in remotely without GPS verification';

-- Add remote_checkin flag to attendance for tracking
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;

COMMENT ON COLUMN attendance.is_remote IS 'If true, this check-in was done remotely (not in office)';
