import { supabaseAdmin } from '@/lib/supabase';
import { getTashkentTime, getTashkentDateString } from '@/lib/timezone';

/**
 * Determine if an employee is late for their shift.
 *
 * Resolution order for the late threshold:
 * 1. Check shift_assignments for a published assignment today with custom start_time
 * 2. Fall back to the shifts table (start_hour + late_threshold_minutes)
 * 3. Final fallback: hardcoded day=9:15, night=18:15 (only if DB query fails)
 *
 * This replaces the old isLate() which hardcoded 9:15/18:15 and ignored
 * custom shift times, causing inconsistent late status for day shift workers.
 */
export async function calculateIsLate(
  employeeId: string,
  shiftId: string,
  today?: string
): Promise<boolean> {
  const tashkent = getTashkentTime();
  const currentHour = tashkent.getHours();
  const currentMinute = tashkent.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;
  const dateStr = today || getTashkentDateString();

  // Step 1: Check if employee has a shift_assignment for today with custom start_time
  if (supabaseAdmin) {
    try {
      const { data: assignment } = await supabaseAdmin
        .from('shift_assignments')
        .select('start_time, shift_type, shift_schedules(status)')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .limit(1)
        .maybeSingle();

      if (assignment?.start_time) {
        // Custom start_time found (e.g., "10:00" or "09:30")
        // Parse HH:MM format and add 15 minutes grace period
        const [h, m] = assignment.start_time.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const thresholdMinutes = h * 60 + m + 15; // start_time + 15 min grace
          return currentMinutes >= thresholdMinutes;
        }
      }

      // If assignment exists but no custom start_time, use its shift_type
      // to look up the shifts table
      if (assignment?.shift_type) {
        const effectiveShiftId = assignment.shift_type;
        const threshold = await getShiftThreshold(effectiveShiftId);
        if (threshold !== null) {
          return currentMinutes >= threshold;
        }
      }
    } catch (err) {
      // Log but don't fail — fall through to shifts table lookup
      console.error('Error checking shift assignment:', err);
    }
  }

  // Step 2: Look up the shifts table for start_hour + late_threshold_minutes
  const threshold = await getShiftThreshold(shiftId);
  if (threshold !== null) {
    return currentMinutes >= threshold;
  }

  // Step 3: Final fallback (only if DB unavailable)
  const fallbackThreshold = shiftId === 'night' ? 18 * 60 + 15 : 9 * 60 + 15;
  return currentMinutes >= fallbackThreshold;
}

/**
 * Query the shifts table for a shift's late threshold in total minutes.
 * Returns start_hour * 60 + late_threshold_minutes, or null if not found.
 */
async function getShiftThreshold(shiftId: string): Promise<number | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data: shift } = await supabaseAdmin
      .from('shifts')
      .select('start_hour, late_threshold_minutes')
      .eq('id', shiftId)
      .maybeSingle();

    if (shift && shift.start_hour != null && shift.late_threshold_minutes != null) {
      return shift.start_hour * 60 + shift.late_threshold_minutes;
    }
  } catch (err) {
    console.error('Error fetching shift threshold:', err);
  }

  return null;
}

/**
 * Determine the correct shift for an employee.
 *
 * Resolution order:
 * 1. Provided shift ID (from client/Telegram mini-app)
 * 2. Employee's shift_assignment for today (from published schedule)
 * 3. Employee's default_shift from their profile
 * 4. Auto-detect from employee's position field
 *    (only uses position keywords, NOT check-in time — time-based detection
 *     caused day shift workers checking in late to be misclassified as night)
 */
export async function resolveShift(
  providedShiftId: string | undefined,
  employeeId: string,
  defaultShift: string | null,
  position: string | null,
  today?: string
): Promise<string> {
  // 1. Use explicitly provided shift ID
  if (providedShiftId) {
    return providedShiftId;
  }

  // 2. Check shift_assignments for today
  if (supabaseAdmin) {
    const dateStr = today || getTashkentDateString();
    try {
      const { data: assignment } = await supabaseAdmin
        .from('shift_assignments')
        .select('shift_type')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .limit(1)
        .maybeSingle();

      if (assignment?.shift_type) {
        return assignment.shift_type;
      }
    } catch (err) {
      console.error('Error checking shift assignment for resolution:', err);
    }
  }

  // 3. Use employee's default_shift
  if (defaultShift) {
    return defaultShift;
  }

  // 4. Auto-detect from position (NO time-based detection)
  // Only match explicit night shift keywords in the position title
  if (position && /\b(night|ночн|tun(gi)?)\b/i.test(position)) {
    return 'night';
  }

  return 'day';
}
