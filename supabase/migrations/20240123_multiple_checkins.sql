-- Migration: Allow multiple check-ins per day
-- This migration removes the unique constraint on (employee_id, date)
-- to allow employees to check-in and check-out multiple times per day

-- Step 1: Drop the unique constraint on attendance table
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_date_key;

-- Step 2: Create a new index for faster lookups (non-unique)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date_multi ON attendance(employee_id, date, check_in DESC);

-- Step 3: Update the record_check_in function to insert new records instead of upsert
CREATE OR REPLACE FUNCTION record_check_in(
  p_employee_id UUID,
  p_branch_id TEXT,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_shift_id TEXT DEFAULT 'day'
)
RETURNS JSON AS $$
DECLARE
  v_record attendance;
  v_shift shifts;
  v_is_late BOOLEAN;
  v_current_hour INTEGER;
  v_current_minute INTEGER;
  v_active_checkin attendance;
BEGIN
  -- Check if there's an active (unclosed) check-in
  SELECT * INTO v_active_checkin FROM attendance
  WHERE employee_id = p_employee_id
    AND date = CURRENT_DATE
    AND check_out IS NULL
  ORDER BY check_in DESC
  LIMIT 1;

  IF v_active_checkin IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Already have an active check-in. Please check out first.'
    );
  END IF;

  -- Get shift info
  SELECT * INTO v_shift FROM shifts WHERE id = p_shift_id;

  -- Get current time
  v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Tashkent');
  v_current_minute := EXTRACT(MINUTE FROM NOW() AT TIME ZONE 'Asia/Tashkent');

  -- Check if late
  v_is_late := v_current_hour > v_shift.start_hour OR
               (v_current_hour = v_shift.start_hour AND v_current_minute > v_shift.late_threshold_minutes);

  -- Insert new attendance record (allow multiple per day)
  INSERT INTO attendance (
    employee_id, date, check_in, check_in_timestamp, check_in_branch_id,
    check_in_latitude, check_in_longitude, shift_id, status
  ) VALUES (
    p_employee_id, CURRENT_DATE,
    (NOW() AT TIME ZONE 'Asia/Tashkent')::TIME,
    NOW(),
    p_branch_id, p_latitude, p_longitude, p_shift_id,
    CASE WHEN v_is_late THEN 'late' ELSE 'present' END
  )
  RETURNING * INTO v_record;

  RETURN json_build_object(
    'success', true,
    'record', row_to_json(v_record),
    'is_late', v_is_late
  );
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update the record_check_out function to find the active check-in
CREATE OR REPLACE FUNCTION record_check_out(
  p_employee_id UUID,
  p_branch_id TEXT,
  p_latitude DECIMAL,
  p_longitude DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_record attendance;
  v_shift shifts;
  v_is_early BOOLEAN;
  v_total_hours DECIMAL;
  v_current_hour INTEGER;
BEGIN
  -- Get the active (unclosed) check-in for today
  SELECT * INTO v_record FROM attendance
  WHERE employee_id = p_employee_id
    AND date = CURRENT_DATE
    AND check_out IS NULL
  ORDER BY check_in DESC
  LIMIT 1;

  IF v_record IS NULL OR v_record.check_in IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active check-in record found');
  END IF;

  -- Get shift info
  SELECT * INTO v_shift FROM shifts WHERE id = v_record.shift_id;

  -- Get current hour
  v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Tashkent');

  -- Check if early leave
  IF v_shift.id = 'night' THEN
    v_is_early := v_current_hour >= 9 AND v_current_hour < 18;
  ELSE
    v_is_early := v_current_hour < v_shift.end_hour;
  END IF;

  -- Calculate total hours
  v_total_hours := EXTRACT(EPOCH FROM (NOW() - v_record.check_in_timestamp)) / 3600;

  -- Update the specific record (by id)
  UPDATE attendance SET
    check_out = (NOW() AT TIME ZONE 'Asia/Tashkent')::TIME,
    check_out_timestamp = NOW(),
    check_out_branch_id = p_branch_id,
    check_out_latitude = p_latitude,
    check_out_longitude = p_longitude,
    total_hours = ROUND(v_total_hours::DECIMAL, 1),
    status = CASE
      WHEN v_is_early AND status != 'late' THEN 'early_leave'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_record.id
  RETURNING * INTO v_record;

  RETURN json_build_object(
    'success', true,
    'record', row_to_json(v_record),
    'is_early_leave', v_is_early,
    'total_hours', v_total_hours
  );
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the today_attendance view to show all records
CREATE OR REPLACE VIEW today_attendance AS
SELECT
  a.*,
  e.full_name,
  e.employee_id as emp_id,
  e.position,
  b1.name as check_in_branch_name,
  b2.name as check_out_branch_name
FROM attendance a
JOIN employees e ON a.employee_id = e.id
LEFT JOIN branches b1 ON a.check_in_branch_id = b1.id
LEFT JOIN branches b2 ON a.check_out_branch_id = b2.id
WHERE a.date = CURRENT_DATE
ORDER BY a.check_in DESC;
