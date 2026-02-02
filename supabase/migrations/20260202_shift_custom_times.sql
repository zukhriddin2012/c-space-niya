-- Add custom start/end times to shift assignments
-- Allows part-time shifts like 09:00-13:00 or 13:00-18:00

ALTER TABLE shift_assignments
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comment explaining the fields
COMMENT ON COLUMN shift_assignments.start_time IS 'Custom start time (optional). If null, uses default shift time.';
COMMENT ON COLUMN shift_assignments.end_time IS 'Custom end time (optional). If null, uses default shift time.';
